import { Body, Controller, Header, Logger, Post } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ApiTags } from "@nestjs/swagger";
import {
  getDb,
  orders,
  paymentAttempts,
  products,
  type Order,
  type OrderItem,
} from "@repo/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { EcpayPaymentService } from "./ecpay-payment.service";
import { EcpayInvoiceService } from "./ecpay-invoice.service";
import { EcpayLogisticsService } from "./ecpay-logistics.service";
import { MailService } from "../mail/mail.service";

@ApiTags("ECPay Webhooks")
@SkipThrottle()
@Controller("ecpay")
export class EcpayController {
  private readonly logger = new Logger(EcpayController.name);

  constructor(
    private readonly paymentService: EcpayPaymentService,
    private readonly invoiceService: EcpayInvoiceService,
    private readonly mailService: MailService,
    private readonly logisticsService: EcpayLogisticsService,
  ) {}

  /**
   * 綠界付款結果 Webhook（application/x-www-form-urlencoded）。
   * 驗簽通過且 RtnCode=1 → 更新訂單為已付款。
   * 綠界硬性規定：處理成功必須回傳 '1|OK'。
   */
  @Post("callback")
  @Header("Content-Type", "text/plain")
  async callback(@Body() payload: Record<string, string>): Promise<string> {
    this.logger.log(`📡 收到綠界 Webhook：${JSON.stringify(payload)}`);

    if (!payload?.CheckMacValue) {
      this.logger.error("缺少 CheckMacValue");
      return "0|Missing_CheckMacValue";
    }

    // 安全防線：反向驗證 CheckMacValue
    if (!this.paymentService.verifyCallback(payload)) {
      this.logger.error("CheckMacValue 驗證失敗，資料來源不可信！");
      return "0|CheckMacValue_Error";
    }

    const merchantTradeNo = payload.MerchantTradeNo;
    if (!merchantTradeNo) {
      return "0|Missing_MerchantTradeNo";
    }

    if (payload.RtnCode !== "1") {
      this.logger.warn(
        `⚠️ 訂單 ${merchantTradeNo} 付款未完成：${payload.RtnMsg ?? "unknown"}`,
      );
      return "1|OK";
    }

    const db = getDb();

    // 透過 payment_attempts 對應訂單：即使訂單後續又重新產生了新的
    // MerchantTradeNo（repay），舊編號仍查得到對應訂單，避免無法對帳。
    const attempt = await db.query.paymentAttempts.findFirst({
      where: eq(paymentAttempts.merchantTradeNo, merchantTradeNo),
    });
    if (!attempt) {
      this.logger.warn(`找不到訂單（付款嘗試）${merchantTradeNo}`);
      return "1|OK";
    }

    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, attempt.orderId),
      with: { items: true },
    });
    if (!orderRecord) {
      this.logger.warn(`找不到訂單 ${merchantTradeNo}`);
      return "1|OK";
    }

    // 冪等性：原子地把訂單從「非 paid」轉為 paid；只有真正轉成功的那一通 webhook
    // 才會進行扣庫存，避免綠界重送 webhook 造成重複扣減。
    const transitioned = await db
      .update(orders)
      .set({
        isPaid: true,
        status: "paid",
        paymentType: payload.PaymentType ?? "Credit",
        paidAt: payload.PaymentDate
          ? new Date(payload.PaymentDate)
          : new Date(),
        // 同步為實際完成付款的那組編號，避免顯示與已重新產生的「最新」編號不一致
        merchantTradeNo,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderRecord.id), ne(orders.status, "paid")))
      .returning({ id: orders.id });

    if (transitioned.length === 0) {
      this.logger.log(`ℹ️ 訂單 ${merchantTradeNo} 已為已付款，略過重複處理`);
      return "1|OK";
    }

    // 逐項原子扣減庫存（用 SQL 運算式，避免先讀後寫的 lost update）
    for (const item of orderRecord.items) {
      await this.decrementStock(
        item.productId,
        item.quantity,
        item.selectedVariant as Record<string, string> | null,
      );
    }
    this.logger.log(`✅ 訂單 ${merchantTradeNo} 付款成功，已原子扣減庫存`);

    // 觸發發票開立（開立完成後將自動寄送付款成功通知信）
    this.issueInvoice(orderRecord.id).catch((err) =>
      this.logger.error("發票處理與信件發送失敗", err),
    );

    // 如果是超商取貨（且非貨到付款，例如信用卡已付款），在此時於背景向綠界物流註冊託運單 (isCollection = N)
    if (orderRecord.shippingType === "cvs" && orderRecord.paymentType !== "CVS_COD") {
      this.logisticsService
        .createLogisticsOrder(orderRecord, orderRecord.items, "N")
        .then(async (logisticsInfo) => {
          await db
            .update(orders)
            .set({
              logisticsId: logisticsInfo.logisticsId,
              logisticsNo: logisticsInfo.logisticsNo,
              logisticsValidationNo: logisticsInfo.logisticsValidationNo || null,
              logisticsStatus: "0",
              updatedAt: new Date(),
            })
            .where(eq(orders.id, orderRecord.id));
          this.logger.log(`✅ 已完成超商取貨（已付款）背景物流建單：${logisticsInfo.logisticsNo}`);
        })
        .catch((err) => {
          this.logger.error(`❌ 超商取貨（已付款）背景物流建單失敗：${err.message}`);
        });
    }

    return "1|OK";
  }

  /** 付款成功通知信 */
  private async sendPaidEmail(order: Order & { items: OrderItem[] }) {
    if (!order.recipientEmail) return;
    const rows = order.items
      .map(
        (it) =>
          `<tr>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${it.productName}${
              it.selectedVariant
                ? `<span style="color:#999;font-size:12px;"> (${Object.values(it.selectedVariant).join(" / ")})</span>`
                : ""
            } × ${it.quantity}</td>
            <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">NT$${(it.unitPrice * it.quantity).toLocaleString("zh-TW")}</td>
          </tr>`,
      )
      .join("");

    const html = `
      <div style="font-family:sans-serif;padding:20px;max-width:600px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#ea580c;border-bottom:2px solid #ea580c;padding-bottom:10px;">🎃 付款成功，訂單確認中</h2>
        <p>親愛的 ${order.recipientName}，感謝您的訂購！我們已收到您的付款，將盡快為您出貨。</p>
        <p style="color:#666;font-size:14px;">訂單編號：<b>${order.merchantTradeNo}</b></p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
          ${rows}
          <tr>
            <td style="padding:12px 0;font-weight:bold;">訂單總金額</td>
            <td style="padding:12px 0;text-align:right;font-weight:bold;color:#c2410c;">NT$${order.totalAmount.toLocaleString("zh-TW")}</td>
          </tr>
        </table>
        <p style="color:#666;font-size:14px;">寄送地址：${order.recipientAddress}</p>
        ${
          order.invoiceNo
            ? `<p style="color:#666;font-size:14px;">電子發票號碼：<b style="color:#ea580c;">${order.invoiceNo}</b></p>`
            : ""
        }
        <hr style="border:0;border-top:1px solid #eee;margin:20px 0;" />
        <p style="color:#999;font-size:12px;text-align:center;">南瓜多 本舖 團隊 敬上</p>
      </div>`;

    await this.mailService.sendMail({
      to: order.recipientEmail,
      subject: `【付款成功】訂單 ${order.merchantTradeNo} 確認通知`,
      html,
    });
  }

  /** 原子扣減庫存：規格庫存用 jsonb_set 扣該規格並重算總數，否則直接扣總庫存 */
  private async decrementStock(
    productId: string,
    quantity: number,
    selectedVariant: Record<string, string> | null,
  ) {
    const db = getDb();
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });
    if (!product) return;

    const hasVariantStock =
      product.variantStock && Object.keys(product.variantStock).length > 0;

    if (
      hasVariantStock &&
      product.variants &&
      product.variants.length > 0 &&
      selectedVariant
    ) {
      const key = product.variants
        .map((v) => selectedVariant[v.name] || "")
        .join(" / ");

      // 1) 原子扣減該規格的 jsonb 值（不低於 0）
      await db
        .update(products)
        .set({
          variantStock: sql`jsonb_set(
            ${products.variantStock},
            ARRAY[${key}],
            to_jsonb(GREATEST((${products.variantStock} ->> ${key})::int - ${quantity}, 0))
          )`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));

      // 2) 總庫存重算為各規格加總（從最新的 variantStock 計算）
      await db
        .update(products)
        .set({
          stock: sql`(SELECT COALESCE(SUM(value::int), 0) FROM jsonb_each_text(${products.variantStock}))`,
        })
        .where(eq(products.id, productId));
    } else {
      // 無規格庫存 → 直接原子扣總庫存（不低於 0）
      await db
        .update(products)
        .set({
          stock: sql`GREATEST(${products.stock} - ${quantity}, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(products.id, productId));
    }

    this.logger.log(`📦 已扣減商品 ${product.name} 庫存（-${quantity}）`);
  }

  /**
   * 綠界超商電子地圖選擇門市回傳 Webhook（POST）。
   * 當用戶在綠界地圖選完門市時，綠界會以瀏覽器 Form POST 將資訊回傳至此。
   * 此處回傳一個簡單 HTML，藉由 window.opener.postMessage 回傳資料給主視窗後關閉。
   */
  @Post("logistics-map-callback")
  @Header("Content-Type", "text/html")
  async logisticsMapCallback(@Body() payload: Record<string, string>): Promise<string> {
    this.logger.log(`📡 收到綠界超商地圖回傳：${JSON.stringify(payload)}`);
    const cvsStoreId = payload.CVSStoreID || "";
    const cvsStoreName = payload.CVSStoreName || "";
    const cvsAddress = payload.CVSAddress || "";
    const cvsSubType = payload.LogisticsSubType || "";
    const webBase = process.env.WEB_BASE_URL ?? "http://localhost:3000";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>門市選擇成功</title>
        <style>
          body {
            font-family: sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f9fafb;
            color: #111827;
          }
          .card {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            text-align: center;
          }
          .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #ea580c;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <h3>門市選擇成功</h3>
          <p>正在自動帶入資料並返回結帳頁面...</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: "ECPAY_CVS_SELECT",
              cvsStoreId: "${cvsStoreId}",
              cvsStoreName: "${cvsStoreName}",
              cvsStoreAddress: "${cvsAddress}",
              cvsSubType: "${cvsSubType}"
            }, "${webBase}");
          }
          setTimeout(() => {
            window.close();
          }, 500);
        </script>
      </body>
      </html>
    `;
  }

  /** 異步處理電子發票開立，並在完成後寄出付款確認信 */
  private async issueInvoice(orderId: string) {
    try {
      const db = getDb();
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: { items: true },
      });
      if (!order) return;

      const result = await this.invoiceService.issueInvoice(order, order.items);
      if (result.success && result.invoiceNo) {
        await db
          .update(orders)
          .set({
            invoiceNo: result.invoiceNo,
            invoiceDate: result.invoiceDate || null,
            invoiceStatus: "issued",
            invoiceRtnCode: result.rtnCode,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        // 重新讀取更新後的訂單，發送帶有發票號碼的電子郵件
        const updatedOrder = await db.query.orders.findFirst({
          where: eq(orders.id, orderId),
          with: { items: true },
        });
        if (updatedOrder) {
          this.sendPaidEmail(updatedOrder).catch((err) =>
            this.logger.error("付款通知信（含發票號碼）寄送失敗", err),
          );
        }
      } else {
        await db
          .update(orders)
          .set({
            invoiceStatus: "failed",
            invoiceRtnCode: result.rtnCode,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId));

        // 就算發票開立失敗，也應寄出付款成功通知信
        this.sendPaidEmail(order).catch((err) =>
          this.logger.error("付款通知信（無發票號碼）寄送失敗", err),
        );
      }
    } catch (err) {
      this.logger.error(`[Invoice] 異步發票發送發生例外`, err as Error);
    }
  }

  /**
   * 綠界超商物流狀態回傳 Webhook（POST /api/v1/ecpay/logistics-status）。
   * 綠界物流狀態變更時，會向此端點發送通知。
   */
  @Post("logistics-status")
  @Header("Content-Type", "text/plain")
  async logisticsStatus(@Body() payload: Record<string, string>): Promise<string> {
    this.logger.log(`📡 收到綠界物流狀態 Webhook：${JSON.stringify(payload)}`);

    if (!payload?.CheckMacValue) {
      this.logger.error("物流 Webhook 缺少 CheckMacValue");
      return "0|Missing_CheckMacValue";
    }

    if (!this.logisticsService.verifyCallback(payload)) {
      this.logger.error("物流 CheckMacValue 驗證失敗");
      return "0|CheckMacValue_Error";
    }

    const merchantTradeNo = payload.MerchantTradeNo;
    if (!merchantTradeNo) {
      return "0|Missing_MerchantTradeNo";
    }

    const db = getDb();
    const attempt = await db.query.paymentAttempts.findFirst({
      where: eq(paymentAttempts.merchantTradeNo, merchantTradeNo),
    });
    if (!attempt) {
      this.logger.warn(`物流通知：找不到對應的訂單（付款嘗試）${merchantTradeNo}`);
      return "1|OK";
    }

    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, attempt.orderId),
      with: { items: true },
    });

    if (!orderRecord) {
      this.logger.warn(`物流通知：找不到對應的訂單 ${merchantTradeNo}`);
      return "1|OK";
    }

    const rtnCode = payload.RtnCode;
    const rtnMsg = payload.RtnMsg || "";
    
    await db
      .update(orders)
      .set({
        logisticsStatus: `${rtnCode}:${rtnMsg}`,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderRecord.id));

    // 判斷是否為買家已取件付款成功
    // 正確狀態碼（依綠界文件）：2067 = 7-11 消費者成功取件、3022 = 全家/萊爾富消費者成功取件
    const isPickupSuccess = ["2067", "3022"].includes(rtnCode);

    if (isPickupSuccess && orderRecord.paymentType === "CVS_COD") {
      // #5 修正：使用原子 UPDATE WHERE isPaid=false 確保冪等，防止重送重複開發票
      const transitioned = await db
        .update(orders)
        .set({
          isPaid: true,
          status: "completed",
          paidAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orders.id, orderRecord.id),
            eq(orders.isPaid, false),
          ),
        )
        .returning({ id: orders.id });

      if (transitioned.length === 0) {
        this.logger.log(`ℹ️ COD 訂單 ${merchantTradeNo} 已標記為已付款，略過重複處理`);
        return "1|OK";
      }

      this.logger.log(`💰 超商貨到付款訂單 ${merchantTradeNo} 買家已取貨付款！觸發發票開立...`);

      // 觸發電子發票開立（貨到付款是在取貨付款完成後才開立發票）
      this.issueInvoice(orderRecord.id).catch((err) =>
        this.logger.error("貨到付款取貨開立發票失敗", err),
      );
    }

    return "1|OK";
  }
}
