import { create } from "zustand";
import { API_URL } from "../api";
import { getSessionId, resetSessionId } from "../session";
import { useCartStore } from "./cart";
import type { User } from "../types";

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  googleLogin: (credential: string) => Promise<User>;
  register: (data: {
    email: string;
    password?: string;
    name: string;
    phone?: string;
    address?: string;
    code?: string;
  }) => Promise<User>;
  updateProfile: (data: {
    name: string;
    phone?: string;
    address?: string;
  }) => Promise<User>;
  logout: () => void;
  initAuth: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true });
    try {
      const sessionId = getSessionId();
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, sessionId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? "登入失敗");
      }

      const { token, user } = body as { token: string; user: User };
      window.localStorage.setItem("nanguado-token", token);
      window.localStorage.setItem("nanguado-user", JSON.stringify(user));
      set({ token, user });

      // 登入後重新獲取購物車（不因購物車失敗影響登入）
      try {
        await useCartStore.getState().fetchCart();
      } catch (cartErr) {
        console.error("登入後同步購物車失敗:", cartErr);
      }

      return user;
    } finally {
      set({ loading: false });
    }
  },

  googleLogin: async (credential) => {
    set({ loading: true });
    try {
      const sessionId = getSessionId();
      const res = await fetch(`${API_URL}/api/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, sessionId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? "Google 登入失敗");
      }

      const { token, user } = body as { token: string; user: User };
      window.localStorage.setItem("nanguado-token", token);
      window.localStorage.setItem("nanguado-user", JSON.stringify(user));
      set({ token, user });

      try {
        await useCartStore.getState().fetchCart();
      } catch (cartErr) {
        console.error("Google 登入後同步購物車失敗:", cartErr);
      }

      return user;
    } finally {
      set({ loading: false });
    }
  },

  register: async (data) => {
    set({ loading: true });
    try {
      const sessionId = getSessionId();
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, sessionId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? "註冊失敗");
      }

      const { token, user } = body as { token: string; user: User };
      window.localStorage.setItem("nanguado-token", token);
      window.localStorage.setItem("nanguado-user", JSON.stringify(user));
      set({ token, user });

      // 註冊後重新獲取購物車（會因為 user 綁定而升級，不因購物車失敗影響註冊）
      try {
        await useCartStore.getState().fetchCart();
      } catch (cartErr) {
        console.error("註冊後同步購物車失敗:", cartErr);
      }

      return user;
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (data: { name: string; phone?: string; address?: string }) => {
    const token = get().token;
    if (!token) throw new Error("未登入");
    set({ loading: true });
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? "更新個人資訊失敗");
      }

      window.localStorage.setItem("nanguado-user", JSON.stringify(body));
      set({ user: body });
      return body as User;
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    window.localStorage.removeItem("nanguado-token");
    window.localStorage.removeItem("nanguado-user");
    set({ token: null, user: null });
    // 重生 sessionId：舊的已綁定會員購物車，沿用會洩漏會員購物車內容
    resetSessionId();
    // 登出後清空購物車狀態，重新產生為訪客購物車
    useCartStore.getState().clear();
    useCartStore.getState().fetchCart();
  },

  initAuth: async () => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("nanguado-token");
    const userStr = window.localStorage.getItem("nanguado-user");
    if (token && userStr) {
      try {
        set({ token, user: JSON.parse(userStr) });
        // 後台背景校驗憑證
        const res = await fetch(`${API_URL}/api/v1/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const user = await res.json();
          set({ user });
          window.localStorage.setItem("nanguado-user", JSON.stringify(user));
        } else {
          // Token 已失效
          window.localStorage.removeItem("nanguado-token");
          window.localStorage.removeItem("nanguado-user");
          set({ token: null, user: null });
          useCartStore.getState().clear();
          useCartStore.getState().fetchCart();
        }
      } catch (err) {
        // 網路瞬斷時，仍維持本地登入快取狀態
      }
    }
  },
}));
