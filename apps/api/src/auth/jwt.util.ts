import * as jwt from "jsonwebtoken";

export type AuthTokenPayload = {
  userId: string;
  email: string;
  /** customer / admin（舊 token 可能沒有此欄位） */
  role?: string;
};

/**
 * JWT 密鑰統一從專案根目錄 .env 讀取（main.ts 啟動時已載入 dotenv）。
 * 刻意不提供 fallback：缺少設定時直接失敗，避免上線誤用寫死的密鑰。
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET 未設定，請確認專案根目錄的 .env");
  }
  return secret;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

/** 驗證失敗（無效 / 過期）時丟出 jsonwebtoken 的錯誤，由呼叫端決定如何處理 */
export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
}

/**
 * 從 Authorization header 解析出 userId；未帶或驗證失敗回傳 undefined（視同訪客）。
 * 供購物車 / 建立訂單這類「登入可選」的端點使用。
 */
export function getUserIdFromAuthHeader(
  authHeader?: string,
): string | undefined {
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  try {
    return verifyAuthToken(authHeader.split(" ")[1]).userId;
  } catch {
    return undefined;
  }
}
