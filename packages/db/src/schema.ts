import {
  pgTable,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { randomUUID } from "crypto";

/** 商品規格，例如 { name: "尺寸", options: ["S", "M", "L", "XL"] } */
export type ProductVariant = {
  name: string;
  options: string[];
};

/** 購物車 / 訂單項目選中的規格，例如 { "尺寸": "M" } */
export type SelectedVariant = Record<string, string>;

// ---------- 分類 ----------
export const categories = pgTable("categories", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- 商品 ----------
export const products = pgTable("products", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  /** 售價，單位：新台幣（元） */
  price: integer("price").notNull(),
  /** 原價 / 劃線價，null 表示無折扣 */
  compareAtPrice: integer("compare_at_price"),
  categoryId: varchar("category_id", { length: 36 }).references(
    () => categories.id,
  ),
  /** 圖片 URL 陣列 */
  images: jsonb("images").$type<string[]>().notNull().default([]),
  /** 規格，例如 [{ name: "尺寸", options: ["S","M","L"] }] */
  variants: jsonb("variants").$type<ProductVariant[]>().notNull().default([]),
  variantStock: jsonb("variant_stock").$type<Record<string, number>>().notNull().default({}),
  stock: integer("stock").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- 使用者 ----------
export const users = pgTable("users", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  /** customer / admin */
  role: varchar("role", { length: 20 }).notNull().default("customer"),
  name: varchar("name", { length: 120 }),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- 購物車 ----------
export const carts = pgTable("carts", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  /** 未登入訪客的識別碼（由前端 localStorage 產生） */
  sessionId: varchar("session_id", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  cartId: varchar("cart_id", { length: 36 })
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 36 })
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").notNull().default(1),
  /** 選中的規格，例如 { "尺寸": "M" } */
  selectedVariant: jsonb("selected_variant").$type<SelectedVariant>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- 訂單 ----------
export const orders = pgTable("orders", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  /** 綠界訂單編號（唯一，最長 20 字元） */
  merchantTradeNo: varchar("merchant_trade_no", { length: 20 })
    .notNull()
    .unique(),
  /** 訂單總金額，單位：新台幣（元） */
  totalAmount: integer("total_amount").notNull(),
  /** pending / paid / shipped / completed / cancelled */
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  recipientName: varchar("recipient_name", { length: 120 }).notNull(),
  recipientPhone: varchar("recipient_phone", { length: 30 }).notNull(),
  recipientEmail: varchar("recipient_email", { length: 255 }).notNull(),
  recipientAddress: text("recipient_address").notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  /** 綠界回傳的付款方式，例如 Credit_CreditCard */
  paymentType: varchar("payment_type", { length: 50 }),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  orderId: varchar("order_id", { length: 36 })
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 36 })
    .notNull()
    .references(() => products.id),
  /** 下單當下的商品快照 */
  productName: varchar("product_name", { length: 200 }).notNull(),
  productImage: text("product_image"),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  selectedVariant: jsonb("selected_variant").$type<SelectedVariant>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- 商品評價 ----------
export const reviews = pgTable("reviews", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  productId: varchar("product_id", { length: 36 })
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** 佐證此評價來自實際購買的已付款訂單 */
  orderId: varchar("order_id", { length: 36 })
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  /** 星等 1–5 */
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Relations ----------
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  order: one(orders, { fields: [reviews.orderId], references: [orders.id] }),
}));

export const cartsRelations = relations(carts, ({ many, one }) => ({
  items: many(cartItems),
  user: one(users, { fields: [carts.userId], references: [users.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many, one }) => ({
  items: many(orderItems),
  user: one(users, { fields: [orders.userId], references: [users.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// ---------- 媒體庫（Cloudflare R2 物件）----------
export const media = pgTable("media", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  /** R2 物件 key，例如 media/uuid.jpg（唯一） */
  key: varchar("key", { length: 512 }).notNull().unique(),
  /** 公開存取 URL */
  url: text("url").notNull(),
  /** 上傳時的原始檔名 */
  filename: varchar("filename", { length: 512 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  /** 檔案大小（bytes） */
  size: integer("size").notNull().default(0),
  /** key 的前綴分類，例如 media / products */
  prefix: varchar("prefix", { length: 64 }).notNull().default("media"),
  /** 資料夾 / 單一主分類（可自訂，null = 未分類） */
  folder: varchar("folder", { length: 120 }),
  /** 標籤（多個，可交叉篩選） */
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  /** 替代文字（無障礙 / SEO） */
  alt: text("alt"),
  /** 圖片說明 */
  caption: text("caption"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- 內容頁面（關於我們 / 服務條款 / 聯絡我們 / 退換貨政策）----------
export const pages = pgTable("pages", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  /** 頁面代稱：about / terms / contact / returns */
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  /** Markdown 內容 */
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- 首頁輪播橫幅（Carousel / 活動主題）----------
export const banners = pgTable("banners", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  /** 背景圖 URL（可由媒體庫上傳） */
  imageUrl: text("image_url").notNull(),
  /** 主標題 */
  title: varchar("title", { length: 200 }).notNull().default(""),
  /** 副標題 / 描述 */
  subtitle: text("subtitle"),
  /** 按鈕連結（活動頁 / 商品）與文字 */
  linkUrl: varchar("link_url", { length: 500 }),
  linkLabel: varchar("link_label", { length: 100 }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- 網站設定（白牌：店名 / 標語 / Emoji 等鍵值）----------
export const settings = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ---------- 驗證碼 ----------
export const verificationCodes = pgTable("verification_codes", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- 型別匯出 ----------
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type User = typeof users.$inferSelect;
export type Cart = typeof carts.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type VerificationCode = typeof verificationCodes.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type Banner = typeof banners.$inferSelect;
export type NewBanner = typeof banners.$inferInsert;
