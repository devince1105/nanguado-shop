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
  AdminStatsResponse,
  AdminEnvironmentResponse,
  Media,
  MediaListResponse,
  MediaMeta,
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
  variantStock?: Record<string, number>;
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

export type CategoryFormDto = {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
};

export function getAdminCategories(token: string) {
  return adminFetch<Category[]>("/categories", token);
}

export function createCategory(token: string, dto: CategoryFormDto) {
  return adminFetch<Category>("/categories", token, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}

export function updateCategory(
  token: string,
  id: string,
  dto: Partial<CategoryFormDto>,
) {
  return adminFetch<Category>(`/categories/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export function deleteCategory(token: string, id: string) {
  return adminFetch<{ success: boolean }>(`/categories/${id}`, token, {
    method: "DELETE",
  });
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

// ---------- 統計數據 ----------

export function getAdminStats(token: string) {
  return adminFetch<AdminStatsResponse>("/stats", token);
}

// ---------- 環境標示（唯讀）----------

export function getAdminEnvironment(token: string) {
  return adminFetch<AdminEnvironmentResponse>("/environment", token);
}

// ---------- 媒體庫（Cloudflare R2）----------

/** 上傳圖片到 R2 + 建立媒體記錄，回傳 Media。用 multipart，不套用 JSON header */
export async function uploadMedia(
  token: string,
  file: File,
  folder?: string | null,
): Promise<Media> {
  const fd = new FormData();
  fd.append("file", file);
  if (folder) fd.append("folder", folder);
  const res = await fetch(`${API_URL}/api/v1/admin/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `圖片上傳失敗（${res.status}）`);
  }
  return res.json();
}

export type MediaQuery = {
  page?: number;
  limit?: number;
  search?: string;
  folder?: string;
  tag?: string;
};

export function getMediaList(token: string, query: MediaQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.folder) params.set("folder", query.folder);
  if (query.tag) params.set("tag", query.tag);
  const qs = params.toString();
  return adminFetch<MediaListResponse>(`/media${qs ? `?${qs}` : ""}`, token);
}

export function getMediaMeta(token: string) {
  return adminFetch<MediaMeta>("/media/meta", token);
}

export function updateMedia(
  token: string,
  id: string,
  dto: { alt?: string; caption?: string; folder?: string | null; tags?: string[] },
) {
  return adminFetch<Media>(`/media/${id}`, token, {
    method: "PATCH",
    body: JSON.stringify(dto),
  });
}

export function deleteMedia(token: string, id: string) {
  return adminFetch<{ success: boolean }>(`/media/${id}`, token, {
    method: "DELETE",
  });
}

// ---------- 帳號安全 ----------

export function changeAdminPassword(token: string, body: any) {
  return fetch(`${API_URL}/api/v1/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  }).then(async (res) => {
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.message ?? "變更密碼失敗");
    }
    return res.json();
  });
}
