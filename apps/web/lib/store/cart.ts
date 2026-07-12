import { create } from "zustand";
import { API_URL } from "../api";
import { getSessionId } from "../session";
import type { Cart, SelectedVariant } from "../types";

type CartState = {
  cart: Cart | null;
  loading: boolean;
  /** 首次載入購物車（Header badge 用） */
  fetchCart: () => Promise<void>;
  addItem: (
    productId: string,
    quantity: number,
    selectedVariant?: SelectedVariant | null,
  ) => Promise<Cart>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => void;
};

async function cartFetch(path: string, init?: RequestInit): Promise<Cart> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.message ?? `購物車操作失敗（${res.status}）`);
  }
  return body as Cart;
}

export const useCartStore = create<CartState>((set) => ({
  cart: null,
  loading: false,

  fetchCart: async () => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    set({ loading: true });
    try {
      const cart = await cartFetch(
        `/cart?sessionId=${encodeURIComponent(sessionId)}`,
      );
      set({ cart });
    } finally {
      set({ loading: false });
    }
  },

  addItem: async (productId, quantity, selectedVariant) => {
    const cart = await cartFetch("/cart/items", {
      method: "POST",
      body: JSON.stringify({
        sessionId: getSessionId(),
        productId,
        quantity,
        selectedVariant: selectedVariant ?? null,
      }),
    });
    set({ cart });
    return cart;
  },

  updateItem: async (itemId, quantity) => {
    const cart = await cartFetch(`/cart/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
    set({ cart });
  },

  removeItem: async (itemId) => {
    const cart = await cartFetch(`/cart/items/${itemId}`, {
      method: "DELETE",
    });
    set({ cart });
  },

  clear: () => set({ cart: null }),
}));

/** Header 購物車 badge 數字 */
export function selectItemCount(state: { cart: Cart | null }) {
  return state.cart?.itemCount ?? 0;
}
