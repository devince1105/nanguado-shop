import { Body, Controller, Header, Logger, Post } from "@nestjs/common";
import { getDb, orders, products } from "@repo/db";
import { eq } from "drizzle-orm";
import { EcpayPaymentService } from "./ecpay-payment.service";

@Controller("ecpay")
export class EcpayController {
  private readonly logger = new Logger(EcpayController.name);

  constructor(private readonly paymentService: EcpayPaymentService) {}

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

    const db = getDb();

    if (payload.RtnCode === "1") {
      // 讀取該筆交易的訂單明細，並於狀態變更前扣減庫存
      const orderRecord = await db.query.orders.findFirst({
        where: eq(orders.merchantTradeNo, merchantTradeNo),
        with: { items: true },
      });

      if (orderRecord && orderRecord.status !== "paid") {
        for (const item of orderRecord.items) {
          const product = await db.query.products.findFirst({
            where: eq(products.id, item.productId),
          });
          if (product) {
            let nextStock = Math.max(0, product.stock - item.quantity);
            let nextVariantStock = { ...product.variantStock };

            const hasVariantStock = product.variantStock && Object.keys(product.variantStock).length > 0;
            if (hasVariantStock && product.variants && product.variants.length > 0 && item.selectedVariant) {
              const key = product.variants
                .map((v: any) => (item.selectedVariant as Record<string, string>)[v.name] || "")
                .join(" / ");
              const currentVal = nextVariantStock[key] ?? 0;
              nextVariantStock[key] = Math.max(0, currentVal - item.quantity);
              
              // 總庫存更新為各規格庫存的加總
              nextStock = Object.values(nextVariantStock).reduce((a, b) => a + b, 0);
            }

            await db
              .update(products)
              .set({
                stock: nextStock,
                variantStock: nextVariantStock,
                updatedAt: new Date(),
              })
              .where(eq(products.id, product.id));
            
            this.logger.log(`📦 已更新商品 ${product.name} 庫存：剩餘 ${nextStock} 件`);
          }
        }
      }

      await db
        .update(orders)
        .set({
          isPaid: true,
          status: "paid",
          paymentType: payload.PaymentType ?? "Credit",
          paidAt: payload.PaymentDate ? new Date(payload.PaymentDate) : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.merchantTradeNo, merchantTradeNo));
      this.logger.log(`✅ 訂單 ${merchantTradeNo} 付款成功，已更新資料庫`);
    } else {
      this.logger.warn(
        `⚠️ 訂單 ${merchantTradeNo} 付款未完成：${payload.RtnMsg ?? "unknown"}`,
      );
    }

    return "1|OK";
  }
}
