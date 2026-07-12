const SESSION_KEY = "nanguado-session-id";

/** 取得（或建立）訪客購物車識別碼，存於 localStorage */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = window.localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * 重生 sessionId（登出時使用）。
 * 舊 sessionId 已綁定會員購物車，若沿用會讓登出後的訪客看到會員購物車內容。
 */
export function resetSessionId(): string {
  if (typeof window === "undefined") return "";
  const sessionId = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, sessionId);
  return sessionId;
}
