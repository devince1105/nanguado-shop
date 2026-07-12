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
