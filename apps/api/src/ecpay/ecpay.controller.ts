import { Body, Controller, Header, Logger, Post } from "@nestjs/common";
import { getDb, orders } from "@repo/db";
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
