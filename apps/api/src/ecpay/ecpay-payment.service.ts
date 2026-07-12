import { Injectable } from "@nestjs/common";
import { EcpayService } from "@repo/ecpay";
import type { Order, OrderItem } from "@repo/db";

export type EcpayCheckoutForm = {
  /** 綠界收銀台 URL（前端隱藏 form 的 action） */
  action: string;
  /** 含 CheckMacValue 的完整表單欄位 */
  params: Record<string, string>;
};

/** 綠界日期格式：yyyy/MM/dd HH:mm:ss（台北時間） */
function formatTradeDate(date: Date): string {
  const taipei = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Taipei" }),
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${taipei.getFullYear()}/${pad(taipei.getMonth() + 1)}/${pad(taipei.getDate())} ${pad(taipei.getHours())}:${pad(taipei.getMinutes())}:${pad(taipei.getSeconds())}`;
}

@Injectable()
export class EcpayPaymentService {
  private readonly ecpay = new EcpayService({
    hashKey: process.env.ECPAY_HASH_KEY,
    hashIV: process.env.ECPAY_HASH_IV,
  });

  /** 建立綠界信用卡付款表單（前端以隱藏 form POST 到綠界） */
  buildCheckoutForm(order: Order, items: OrderItem[]): EcpayCheckoutForm {
    const merchantId = process.env.ECPAY_MERCHANT_ID ?? "2000132";
    const action =
      process.env.ECPAY_ACTION_URL ??
      "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:4000";
    const webBase = process.env.WEB_BASE_URL ?? "http://localhost:3000";

    // ItemName：以 # 分隔多項商品，綠界上限 400 字
    const itemName = items
      .map((item) => `${item.productName} x ${item.quantity}`)
      .join("#")
      .slice(0, 400);

    const params: Record<string, string> = {
      MerchantID: merchantId,
      MerchantTradeNo: order.merchantTradeNo,
      MerchantTradeDate: formatTradeDate(new Date()),
      PaymentType: "aio",
      TotalAmount: String(order.totalAmount),
      TradeDesc: "NanguadoShop Online Order",
      ItemName: itemName,
      ReturnURL: `${apiBase}/api/v1/ecpay/callback`,
      ClientBackURL: `${webBase}/orders/${order.id}/success`,
      ChoosePayment: "Credit",
      EncryptType: "1",
    };

    params.CheckMacValue = this.ecpay.generateCheckMacValue(params);
    return { action, params };
  }

  verifyCallback(payload: Record<string, any>): boolean {
    return this.ecpay.verifyCheckMacValue(payload);
  }
}
