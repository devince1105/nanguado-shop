import type { Category, Product, ProductListResponse } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `API 請求失敗（${res.status}）`);
  }
  return res.json();
}

export type ProductQuery = {
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export function getProducts(query: ProductQuery = {}) {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.sort) params.set("sort", query.sort);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiFetch<ProductListResponse>(`/products${qs ? `?${qs}` : ""}`);
}

export function getProduct(slug: string) {
  return apiFetch<Product>(`/products/${slug}`);
}

export function getCategories() {
  return apiFetch<Category[]>("/categories");
}

/** 價格顯示：NT$1,280 */
export function formatPrice(price: number) {
  return `NT$${price.toLocaleString("zh-TW")}`;
}
