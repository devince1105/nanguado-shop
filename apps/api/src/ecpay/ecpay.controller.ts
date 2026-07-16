import { Body, Controller, Header, Logger, Post } from "@nestjs/common";
import { getDb, orders, products, type Order, type OrderItem } from "@repo/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { EcpayPaymentService } from "./ecpay-payment.service";
import { MailService } from "../mail/mail.service";

@Controller("ecpay")
export class EcpayController {
  private readonly logger = new Logger(EcpayController.name);

  constructor(
    private readonly paymentService: EcpayPaymentService,
    private readonly mailService: MailService,
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
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.merchantTradeNo, merchantTradeNo),
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
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.merchantTradeNo, merchantTradeNo),
          ne(orders.status, "paid"),
        ),
      )
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

    // 寄送付款成功通知信（失敗不影響回覆綠界）
    this.sendPaidEmail(orderRecord).catch((err) =>
      this.logger.error("付款通知信寄送失敗", err),
    );

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
}
