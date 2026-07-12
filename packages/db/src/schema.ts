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
  name: varchar("name", { length: 120 }),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
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

// ---------- Relations ----------
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
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
