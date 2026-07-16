import { Injectable, Logger } from "@nestjs/common";
import { EcpayService } from "@repo/ecpay";
import type { Order, OrderItem } from "@repo/db";

export interface EcpaysInvoiceResult {
  success: boolean;
  invoiceNo?: string;
  invoiceDate?: string;
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
   * 呼叫綠界 API 開立電子發票 (新版 JSON + AES-128-CBC 協定)
   */
  async issueInvoice(order: Order, items: OrderItem[]): Promise<EcpaysInvoiceResult> {
    const merchantId = process.env.ECPAY_INVOICE_MERCHANT_ID ?? "2000132";
    const apiUrl = "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue";
    const ecpay = this.getEcpayInvoiceService();

    // 格式化品項明細 (新版 JSON 規格：Items 為物件陣列)
    const invoiceItems: any[] = [];
    let subtotal = 0;

    for (const item of items) {
      invoiceItems.push({
        ItemName: item.productName,
        ItemCount: item.quantity,
        ItemWord: "件",
        ItemPrice: item.unitPrice,
        ItemAmount: item.unitPrice * item.quantity,
        ItemTaxType: "1", // 應稅
      });
      subtotal += item.unitPrice * item.quantity;
    }

    // 加上運費品項
    const shippingFee = order.totalAmount - subtotal;
    if (shippingFee > 0) {
      invoiceItems.push({
        ItemName: "運費",
        ItemCount: 1,
        ItemWord: "趟",
        ItemPrice: shippingFee,
        ItemAmount: shippingFee,
        ItemTaxType: "1", // 應稅
      });
    }

    // 準備加密的 Data 業務參數
    const dataPayload: Record<string, any> = {
      MerchantID: merchantId,
      RelateNumber: order.merchantTradeNo,
      CustomerName: order.recipientName,
      CustomerAddr: order.recipientAddress,
      CustomerPhone: order.recipientPhone,
      CustomerEmail: order.recipientEmail,
      ClearanceMark: "0",
      TaxType: "1",
      SalesAmount: order.totalAmount,
      InvType: "07",
      vat: "1",
      Items: invoiceItems,
    };

    // 依發票開立選項設定對應屬性
    if (order.invoiceType === "company") {
      dataPayload.CustomerIdentifier = order.companyTaxId || "";
      dataPayload.CustomerName = order.companyTitle || order.recipientName;
      dataPayload.Print = "1"; // 統編發票必須列印
      dataPayload.Donation = "0";
    } else if (order.invoiceType === "donate") {
      dataPayload.Print = "0";
      dataPayload.Donation = "1";
      dataPayload.LoveCode = order.donationCode || "";
    } else if (order.invoiceType === "carrier") {
      dataPayload.Print = "0";
      dataPayload.Donation = "0";
      if (order.carrierType === "mobile") {
        dataPayload.CarrierType = "2"; // 手機條碼
        dataPayload.CarrierNum = order.carrierNum || "";
      } else if (order.carrierType === "natural") {
        dataPayload.CarrierType = "3"; // 自然人憑證
        dataPayload.CarrierNum = order.carrierNum || "";
      } else {
        dataPayload.CarrierType = "1"; // 綠界託管載具/會員載具
      }
    } else {
      dataPayload.Print = "0";
      dataPayload.Donation = "0";
      dataPayload.CarrierType = "1"; // 預設使用綠界託管/會員載具
    }

    try {
      // JSON ➔ URLEncode ➔ AES-128-CBC ➔ Base64
      const jsonStr = JSON.stringify(dataPayload);
      const urlEncoded = encodeURIComponent(jsonStr);
      const encryptedData = ecpay.encryptAES(urlEncoded);

      const requestPayload = {
        MerchantID: merchantId,
        RqHeader: {
          Timestamp: Math.floor(Date.now() / 1000),
        },
        Data: encryptedData,
      };

      this.logger.log(`📡 送出新版電子發票開立請求，訂單：${order.merchantTradeNo}`);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`HTTP 錯誤：${response.status} - ${errText}`);
        return { success: false, rtnCode: response.status, message: "綠界通訊異常" };
      }

      const responseJson = (await response.json()) as any;
      if (!responseJson.Data) {
        this.logger.error(`綠界回傳無 Data 欄位：${JSON.stringify(responseJson)}`);
        return {
          success: false,
          rtnCode: responseJson.TransCode ?? -1,
          message: responseJson.TransMsg ?? "回傳格式不符",
        };
      }

      // 解密 Data 欄位：Base64 ➔ Decrypt ➔ URLDecode ➔ JSON
      const decryptedBase64 = ecpay.decryptAES(responseJson.Data);
      const decodedJsonStr = decodeURIComponent(decryptedBase64);
      const resultData = JSON.parse(decodedJsonStr);

      this.logger.log(`📥 綠界解密後開立結果：${JSON.stringify(resultData)}`);

      const rtnCode = Number(resultData.RtnCode ?? "0");
      const rtnMsg = resultData.RtnMsg || "";
      const invoiceNo = resultData.InvoiceNo || undefined;
      const invoiceDate = resultData.InvoiceDate || undefined;

      if (rtnCode === 1 && invoiceNo) {
        return { success: true, invoiceNo, invoiceDate, rtnCode, message: rtnMsg };
      } else {
        return { success: false, rtnCode, message: rtnMsg };
      }
    } catch (err) {
      this.logger.error(`💥 發票開立例外錯誤`, err as Error);
      return { success: false, rtnCode: -1, message: (err as Error).message };
    }
  }

  /**
   * 呼叫綠界 API 作廢電子發票 (新版 JSON + AES-128-CBC 協定)
   */
  async voidInvoice(invoiceNo: string, invoiceDate: string, reason = "交易取消退貨"): Promise<EcpaysInvoiceResult> {
    const merchantId = process.env.ECPAY_INVOICE_MERCHANT_ID ?? "2000132";
    const apiUrl = "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Invalid";
    const ecpay = this.getEcpayInvoiceService();

    // Data 內層參數
    const dataPayload = {
      MerchantID: merchantId,
      InvoiceNo: invoiceNo,
      InvoiceDate: invoiceDate,
      Reason: reason,
    };

    try {
      const jsonStr = JSON.stringify(dataPayload);
      const urlEncoded = encodeURIComponent(jsonStr);
      const encryptedData = ecpay.encryptAES(urlEncoded);

      const requestPayload = {
        MerchantID: merchantId,
        RqHeader: {
          Timestamp: Math.floor(Date.now() / 1000),
        },
        Data: encryptedData,
      };

      this.logger.log(`📡 送出新版電子發票作廢請求，發票號碼：${invoiceNo}`);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`HTTP 作廢錯誤：${response.status} - ${errText}`);
        return { success: false, rtnCode: response.status, message: "綠界通訊異常" };
      }

      const responseJson = (await response.json()) as any;
      if (!responseJson.Data) {
        this.logger.error(`綠界回傳無 Data 欄位：${JSON.stringify(responseJson)}`);
        return {
          success: false,
          rtnCode: responseJson.TransCode ?? -1,
          message: responseJson.TransMsg ?? "回傳格式不符",
        };
      }

      const decryptedBase64 = ecpay.decryptAES(responseJson.Data);
      const decodedJsonStr = decodeURIComponent(decryptedBase64);
      const resultData = JSON.parse(decodedJsonStr);

      this.logger.log(`📥 綠界解密後作廢結果：${JSON.stringify(resultData)}`);

      const rtnCode = Number(resultData.RtnCode ?? "0");
      const rtnMsg = resultData.RtnMsg || "";

      if (rtnCode === 1) {
        return { success: true, rtnCode, message: rtnMsg };
      } else {
        return { success: false, rtnCode, message: rtnMsg };
      }
    } catch (err) {
      this.logger.error(`💥 發票作廢例外錯誤`, err as Error);
      return { success: false, rtnCode: -1, message: (err as Error).message };
    }
  }
}
