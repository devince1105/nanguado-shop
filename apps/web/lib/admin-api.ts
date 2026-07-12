import { API_URL } from "./api";
import type {
  AdminUser,
  AdminUserListResponse,
  Category,
  Order,
  OrderListResponse,
  Product,
  ProductListResponse,
  ProductVariant,
} from "./types";

/** 後台 API 皆需 Bearer token（role=admin） */
async function adminFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1/admin${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `API 請求失敗（${res.status}）`);
  }
  return res.json();
}

// ---------- 商品 ----------

export type AdminProductQuery = {
  search?: string;
  page?: number;
  limit?: number;
};

export type ProductFormDto = {
  name: string;
  slug: string;
  description?: string | null;
  price: number;
  compareAtPrice?: number | null;
  categoryId?: string | null;
  images?: string[];
  variants?: ProductVariant[];
  stock?: number;
  isActive?: boolean;
};

export function getAdminProducts(token: string, query: AdminProductQuery = {}) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return adminFetch<ProductListResponse>(
    `/products${qs ? `?${qs}` : ""}`,
    token,
  );
}

export function createProduct(token: string, dto: ProductFormDto) {
  return adminFetch<Product>("/products", token, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function updateProduct(
  token: string,
  id: string,
  dto: Partial<ProductFormDto>,
) {
  return adminFetch<Product>(`/products/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export function deleteProduct(token: string, id: string) {
  return adminFetch<{ success: boolean }>(`/products/${id}`, token, {
    method: "DELETE",
  });
}

// ---------- 分類 ----------

export function getAdminCategories(token: string) {
  return adminFetch<Category[]>("/categories", token);
}

// ---------- 訂單 ----------

export type AdminOrderQuery = {
  status?: string;
  page?: number;
  limit?: number;
};

export function getAdminOrders(token: string, query: AdminOrderQuery = {}) {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return adminFetch<OrderListResponse>(`/orders${qs ? `?${qs}` : ""}`, token);
}

export function updateOrderStatus(token: string, id: string, status: string) {
  return adminFetch<Order>(`/orders/${id}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ---------- 會員 ----------

export type AdminUserQuery = {
  search?: string;
  page?: number;
  limit?: number;
};

export function getAdminUsers(token: string, query: AdminUserQuery = {}) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return adminFetch<AdminUserListResponse>(`/users${qs ? `?${qs}` : ""}`, token);
}

export function getAdminUserOrders(token: string, userId: string) {
  return adminFetch<Order[]>(`/users/${userId}/orders`, token);
}

export function updateUserRole(token: string, userId: string, role: string) {
  return adminFetch<Pick<AdminUser, "id" | "email" | "name" | "role">>(
    `/users/${userId}/role`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    },
  );
}
