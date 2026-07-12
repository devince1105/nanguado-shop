import * as crypto from "crypto";

export interface EcpayConfig {
  hashKey: string;
  hashIV: string;
}

/**
 * 綠界科技 CheckMacValue 簽章工具（自 nanguado-studio 已驗證版本複製）。
 * 預設使用綠界官方測試環境金鑰。
 */
export class EcpayService {
  private readonly hashKey: string;
  private readonly hashIV: string;

  constructor(config?: Partial<EcpayConfig>) {
    this.hashKey = config?.hashKey ?? "5294y06JbISpM5x9";
    this.hashIV = config?.hashIV ?? "v77hoKGq4kWxNNIS";
  }

  /**
   * 依綠界規範產生 CheckMacValue：
   * 參數 A-Z 排序 → HashKey/HashIV 前後包夾 → URL encode（.NET 風格）→ SHA256 大寫。
   */
  generateCheckMacValue(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params)
      .filter((key) => key !== "CheckMacValue")
      .sort((a, b) => a.localeCompare(b));

    const paramString = sortedKeys
      .map((key) => `${key}=${params[key]}`)
      .join("&");

    const rawString = `HashKey=${this.hashKey}&${paramString}&HashIV=${this.hashIV}`;

    const urlEncodedString = encodeURIComponent(rawString)
      .toLowerCase()
      .replace(/%2d/g, "-")
      .replace(/%5f/g, "_")
      .replace(/%2e/g, ".")
      .replace(/%21/g, "!")
      .replace(/%2a/g, "*")
      .replace(/%28/g, "(")
      .replace(/%29/g, ")")
      .replace(/%20/g, "+"); // 綠界規定空白須編碼為 +

    return crypto
      .createHash("sha256")
      .update(urlEncodedString)
      .digest("hex")
      .toUpperCase();
  }

  /** 反向驗證綠界回傳資料的 CheckMacValue 是否正確 */
  verifyCheckMacValue(payload: Record<string, any>): boolean {
    const received = payload.CheckMacValue;
    if (!received) return false;
    return this.generateCheckMacValue(payload) === received;
  }
}
