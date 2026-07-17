import { Injectable, BadRequestException } from "@nestjs/common";
import { EcpayService } from "@repo/ecpay";
import type { Order, OrderItem } from "@repo/db";

/** 綠界日期格式：yyyy/MM/dd HH:mm:ss（台北時間） */
function formatTradeDate(date: Date): string {
  const taipei = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Taipei" }),
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${taipei.getFullYear()}/${pad(taipei.getMonth() + 1)}/${pad(taipei.getDate())} ${pad(taipei.getHours())}:${pad(taipei.getMinutes())}:${pad(taipei.getSeconds())}`;
}

@Injectable()
export class EcpayLogisticsService {
  private readonly ecpay = new EcpayService({
    hashKey: process.env.ECPAY_LOGISTICS_HASH_KEY ?? "XBERn1YOvpM9nfZc",
    hashIV: process.env.ECPAY_LOGISTICS_HASH_IV ?? "h1ONHk4P4yqbl5LK",
  });

  async createLogisticsOrder(
    order: Order,
    items: OrderItem[],
    isCollection: "Y" | "N",
  ): Promise<{ logisticsId: string; logisticsNo: string; logisticsValidationNo: string }> {
    const merchantId = process.env.ECPAY_LOGISTICS_MERCHANT_ID ?? "2000933";
    const action =
      process.env.ECPAY_LOGISTICS_ACTION_URL ??
      "https://logistics-stage.ecpay.com.tw/Express/Create";
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:4000";

    const params: Record<string, string> = {
      MerchantID: merchantId,
      MerchantTradeNo: order.merchantTradeNo,
      MerchantTradeDate: formatTradeDate(new Date()),
      LogisticsType: "CVS",
      LogisticsSubType: order.cvsSubType || "UNIMARTC2C",
      GoodsAmount: String(order.totalAmount),
      // 綠界必填：商品名稱。綠界禁用 ^'`!@#%&*+\"<>｜_[] 等符號，
      // 僅保留中英數與空白，多品項以空白分隔，截到 50 字內
      GoodsName:
        items
          .map((it) => it.productName)
          .join(" ")
          .replace(/[^一-龥A-Za-z0-9 ]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 50) || "商品",
      CollectionAmount: isCollection === "Y" ? String(order.totalAmount) : "0",
      IsCollection: isCollection,
      SenderName: "南瓜多",
      SenderCellPhone: "0988631458",
      ReceiverName: order.recipientName.trim().slice(0, 10),
      ReceiverCellPhone: order.recipientPhone.trim(),
      ReceiverEmail: order.recipientEmail.trim(),
      ReceiverStoreID: order.cvsStoreId || "",
      ServerReplyURL: `${apiBase}/api/v1/ecpay/logistics-status`,
    };

    // 綠界物流建單 CheckMacValue 使用 MD5 簽章
    params.CheckMacValue = this.ecpay.generateCheckMacValue(params, "md5");

    console.log("📡 送出綠界物流建立請求：", JSON.stringify(params));

    const response = await fetch(action, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });

    if (!response.ok) {
      throw new Error(`綠界物流伺服器 HTTP 錯誤：${response.status}`);
    }

    const text = await response.text();
    console.log("📥 綠界物流回傳結果：", text);

    const parts = text.split("|");
    const status = parts[0];
    if (status !== "1") {
      const errorMsg = parts[1] || "未知物流建單錯誤";
      throw new BadRequestException(`綠界物流建單失敗：${errorMsg}`);
    }

    // 成功回傳格式：1|AllPayLogisticsID=234567&CVSPaymentNo=F12345678901&CVSValidationNo=ABCDE...
    const queryStr = parts[1] || "";
    const resParams = new URLSearchParams(queryStr);
    const logisticsId = resParams.get("AllPayLogisticsID") || "";
    const logisticsNo = resParams.get("CVSPaymentNo") || "";
    // 7-ELEVEN C2C 出貨驗證碼（全家/萊爾富為空字串）
    const logisticsValidationNo = resParams.get("CVSValidationNo") || "";

    if (!logisticsId || !logisticsNo) {
      throw new Error(`綠界物流回傳資料解析失敗，缺少關鍵欄位：${queryStr}`);
    }

    return { logisticsId, logisticsNo, logisticsValidationNo };
  }

  /** 驗證綠界物流 Webhook 的 CheckMacValue（使用 MD5 簽章） */
  verifyCallback(payload: Record<string, any>): boolean {
    const received = payload.CheckMacValue;
    if (!received) return false;
    return this.ecpay.generateCheckMacValue(payload, "md5") === received;
  }
}
