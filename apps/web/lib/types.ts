export type ProductVariant = {
  name: string;
  options: string[];
};

export type SelectedVariant = Record<string, string>;

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  createdAt: string;
  productCount: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  categoryId: string | null;
  images: string[];
  variants: ProductVariant[];
  variantStock?: Record<string, number>;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Omit<Category, "productCount"> | null;
};

export type ProductListResponse = {
  items: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CartItem = {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  selectedVariant: SelectedVariant | null;
  createdAt: string;
  product: Product | null;
};

export type Cart = {
  id: string;
  sessionId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
};

export type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImage: string | null;
  unitPrice: number;
  quantity: number;
  selectedVariant: SelectedVariant | null;
};

export type Order = {
  id: string;
  merchantTradeNo: string;
  totalAmount: number;
  status: "pending" | "paid" | "shipped" | "completed" | "cancelled";
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientAddress: string;
  isPaid: boolean;
  paymentType: string | null;
  paidAt: string | null;
  createdAt: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  /** 建單回應才有：綠界付款表單 */
  payment?: EcpayPayment;
};

/** 滿 NT$1,000 免運，未滿收 NT$60 */
export const FREE_SHIPPING_THRESHOLD = 1000;
export const SHIPPING_FEE = 60;

export function calcShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

/** 綠界付款表單資料（由後端產生，前端隱藏 form submit） */
export type EcpayPayment = {
  action: string;
  params: Record<string, string>;
};

/** 單筆商品評價（作者名稱由後端遮罩後回傳） */
export type ProductReview = {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  authorName: string;
};

/** 商品評價摘要 + 列表 */
export type ProductReviewSummary = {
  average: number;
  count: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  items: ProductReview[];
};

/** 目前登入會員對某商品的留評資格 */
export type ReviewEligibility = {
  hasPurchased: boolean;
  alreadyReviewed: boolean;
  canReview: boolean;
};

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  /** customer / admin */
  role: string;
};

export type OrderListResponse = {
  items: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/** 後台會員列表項目（含訂單統計） */
export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
  role: string;
  createdAt: string;
  orderCount: number;
  /** 已付款訂單消費總額（元） */
  totalSpent: number;
};

export type AdminUserListResponse = {
  items: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/** 媒體庫項目（Cloudflare R2 物件 + metadata） */
export type Media = {
  id: string;
  key: string;
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  prefix: string;
  folder: string | null;
  tags: string[];
  alt: string | null;
  caption: string | null;
  createdAt: string;
};

export type MediaMeta = {
  folders: string[];
  tags: string[];
};

/** 首頁輪播橫幅 */
export type Banner = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

/** 網站設定（白牌：店名 / 標語 / Emoji） */
export type SiteSettings = {
  shopName: string;
  shopTagline: string;
  shopEmoji: string;
  shopDescription: string;
};

/** 內容頁面（關於我們 / 服務條款 / 聯絡我們 / 退換貨政策） */
export type Page = {
  slug: string;
  title: string;
  content: string;
  updatedAt: string | null;
};

export type MediaListResponse = {
  items: Media[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

/** 後端目前連線的資料庫環境（唯讀，不含帳密） */
export type AdminEnvironmentResponse = {
  environment: "development" | "production";
  endpoint: string | null;
};

export type AdminStatsResponse = {
  todayOrderCount: number;
  todayRevenue: number;
  lowStockCount: number;
  totalSales: number;
  totalOrders: number;
  totalUsers: number;
  recentOrders: Order[];
  lowStockProducts: Product[];
  salesTrend: {
    date: string;
    revenue: number;
    orderCount: number;
  }[];
};


