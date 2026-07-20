import type {
  Banner,
  Category,
  Page,
  Product,
  ProductListResponse,
  SiteSettings,
} from "./types";

const DEFAULT_SETTINGS: SiteSettings = {
  shopName: "南瓜多 Shop",
  shopTagline: "原創設計商店，把喜歡的穿在身上。",
  shopEmoji: "🎃",
  shopDescription:
    "南瓜多 Shop — 原創 T 恤、帽子配件與文創小物，把喜歡的穿在身上。",
};

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

export async function getProducts(
  query: ProductQuery = {},
): Promise<ProductListResponse> {
  try {
    const params = new URLSearchParams();
    if (query.category) params.set("category", query.category);
    if (query.sort) params.set("sort", query.sort);
    if (query.page) params.set("page", String(query.page));
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return await apiFetch<ProductListResponse>(`/products${qs ? `?${qs}` : ""}`);
  } catch {
    return {
      items: [],
      pagination: {
        page: 1,
        limit: query.limit || 12,
        total: 0,
        totalPages: 0,
      },
    };
  }
}

export function getProduct(slug: string) {
  return apiFetch<Product>(`/products/${slug}`);
}

export async function getCategories(): Promise<Category[]> {
  try {
    return await apiFetch<Category[]>("/categories");
  } catch {
    return [];
  }
}

export function getPage(slug: string) {
  return apiFetch<Page>(`/pages/${slug}`);
}

/** 取得首頁輪播橫幅；失敗回空陣列 */
export async function getBanners(): Promise<Banner[]> {
  try {
    return await apiFetch<Banner[]>("/banners");
  } catch {
    return [];
  }
}

/** 取得網站設定；失敗時回預設值（避免整頁掛掉） */
export async function getSettings(): Promise<SiteSettings> {
  try {
    return await apiFetch<SiteSettings>("/settings");
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** 價格顯示：NT$1,280 */
export function formatPrice(price: number) {
  return `NT$${price.toLocaleString("zh-TW")}`;
}
