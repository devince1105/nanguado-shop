import { Injectable, Logger } from "@nestjs/common";
import { EcpayService } from "@repo/ecpay";
import type { Order, OrderItem } from "@repo/db";

export interface EcpaysInvoiceResult {
  success: boolean;
  invoiceNo?: string;
  rtnCode: number;
  message: string;
}

@Injectable()
export class EcpayInvoiceService {
  private readonly logger = new Logger(EcpayInvoiceService.name);

  // 使用電子發票專用金鑰進行初始化
  private getEcpayInvoiceService(): EcpayService {
    return new EcpayService({
      hashKey: process.env.ECPAY_INVOICE_HASH_KEY ?? "ejCk326UnaZWKisg",
      hashIV: process.env.ECPAY_INVOICE_HASH_IV ?? "q9jcZX8Ib9LM8wYk",
    });
  }

  /**
   * 呼叫綠界 API 開立電子發票
   */
  async issueInvoice(order: Order, items: OrderItem[]): Promise<EcpaysInvoiceResult> {
    const merchantId = process.env.ECPAY_INVOICE_MERCHANT_ID ?? "2000132";
    const apiUrl = "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue";
    const ecpay = this.getEcpayInvoiceService();

    // 格式化品項資料，以 | 分隔
    const itemNames: string[] = [];
    const itemCount: string[] = [];
    const itemWord: string[] = [];
    const itemPrice: string[] = [];
    const itemAmount: string[] = [];

    let subtotal = 0;
    for (const item of items) {
      itemNames.push(item.productName);
      itemCount.push(String(item.quantity));
      itemWord.push("件");
      itemPrice.push(String(item.unitPrice));
      itemAmount.push(String(item.unitPrice * item.quantity));
      subtotal += item.unitPrice * item.quantity;
    }

    // 加上運費品項 (若有運費，由總金額扣除小計計算)
    const shippingFee = order.totalAmount - subtotal;
    if (shippingFee > 0) {
      itemNames.push("運費");
      itemCount.push("1");
      itemWord.push("趟");
      itemPrice.push(String(shippingFee));
      itemAmount.push(String(shippingFee));
    }

    const payload: Record<string, string> = {
      MerchantID: merchantId,
      RelateNumber: order.merchantTradeNo,
      CustomerName: order.recipientName,
      CustomerAddr: order.recipientAddress,
      CustomerPhone: order.recipientPhone,
      CustomerEmail: order.recipientEmail,
      ClearanceMark: "0", // 通關方式：非課稅區則為1，其餘為0
      TaxType: "1", // 課稅別：應稅
      SalesAmount: String(order.totalAmount),
      InvType: "07", // 字軌類別：一般雙聯/三聯
      vat: "1", // 商品單價是否含稅

      // 品項明細
      ItemName: itemNames.join("|"),
      ItemCount: itemCount.join("|"),
      ItemWord: itemWord.join("|"),
      ItemPrice: itemPrice.join("|"),
      ItemAmount: itemAmount.join("|"),
    };

    // 發票開立選項與參數映射
    if (order.invoiceType === "company") {
      // 公司三聯式發票
      payload.CustomerIdentifier = order.companyTaxId || "";
      payload.CustomerName = order.companyTitle || order.recipientName;
      payload.Print = "1"; // 統編發票必須列印
      payload.Donation = "0";
    } else if (order.invoiceType === "donate") {
      // 捐贈發票
      payload.Print = "0";
      payload.Donation = "1";
      payload.LoveCode = order.donationCode || "";
    } else if (order.invoiceType === "carrier") {
      // 載具發票
      payload.Print = "0";
      payload.Donation = "0";
      if (order.carrierType === "mobile") {
        payload.CarruerType = "2"; // 手機條碼
        payload.CarruerNum = order.carrierNum || "";
      } else if (order.carrierType === "natural") {
        payload.CarruerType = "3"; // 自然人憑證
        payload.CarruerNum = order.carrierNum || "";
      } else {
        payload.CarruerType = "1"; // 綠界託管載具/會員載具
      }
    } else {
      // 個人雲端發票（預設）
      payload.Print = "0";
      payload.Donation = "0";
      payload.CarruerType = "1"; // 預設使用綠界託管/會員載具
    }

    // 發票 API 要求使用 MD5 檢查碼？
    // 綠界發票 API 最新版支援 MD5 亦支援 SHA256，本處使用 SHA256 (金鑰設定 EncryptType = 1)
    payload.CheckMacValue = ecpay.generateCheckMacValue(payload, "sha256");

    try {
      this.logger.log(`📡 送出電子發票開立請求，訂單：${order.merchantTradeNo}`);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(payload).toString(),
      });

      const bodyText = await response.text();
      this.logger.log(`📥 綠界發票回傳原始內容：${bodyText}`);

      const result = new URLSearchParams(bodyText);
      const rtnCode = Number(result.get("RtnCode") || "0");
      const rtnMsg = result.get("RtnMsg") || "";
      const invoiceNo = result.get("InvoiceNumber") || undefined;

      if (rtnCode === 1 && invoiceNo) {
        this.logger.log(`🎉 電子發票開立成功！發票號碼：${invoiceNo}`);
        return { success: true, invoiceNo, rtnCode, message: rtnMsg };
      } else {
        this.logger.error(`❌ 電子發票開立失敗！代碼：${rtnCode}，原因：${rtnMsg}`);
        return { success: false, rtnCode, message: rtnMsg };
      }
    } catch (err) {
      this.logger.error(`💥 發票開立例外錯誤`, err as Error);
      return { success: false, rtnCode: -1, message: (err as Error).message };
    }
  }

  /**
   * 呼叫綠界 API 作廢電子發票
   */
  async voidInvoice(invoiceNo: string, reason = "交易取消退貨"): Promise<EcpaysInvoiceResult> {
    const merchantId = process.env.ECPAY_INVOICE_MERCHANT_ID ?? "2000132";
    const apiUrl = "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Void";
    const ecpay = this.getEcpayInvoiceService();

    const payload: Record<string, string> = {
      MerchantID: merchantId,
      InvoiceNumber: invoiceNo,
      VoidReason: reason,
    };

    payload.CheckMacValue = ecpay.generateCheckMacValue(payload, "sha256");

    try {
      this.logger.log(`📡 送出電子發票作廢請求，發票號碼：${invoiceNo}`);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(payload).toString(),
      });

      const bodyText = await response.text();
      this.logger.log(`📥 綠界發票作廢回傳內容：${bodyText}`);

      const result = new URLSearchParams(bodyText);
      const rtnCode = Number(result.get("RtnCode") || "0");
      const rtnMsg = result.get("RtnMsg") || "";

      if (rtnCode === 1) {
        this.logger.log(`🎉 電子發票作廢成功！`);
        return { success: true, rtnCode, message: rtnMsg };
      } else {
        this.logger.error(`❌ 電子發票作廢失敗！代碼：${rtnCode}，原因：${rtnMsg}`);
        return { success: false, rtnCode, message: rtnMsg };
      }
    } catch (err) {
      this.logger.error(`💥 發票作廢例外錯誤`, err as Error);
      return { success: false, rtnCode: -1, message: (err as Error).message };
    }
  }
}
