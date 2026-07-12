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

