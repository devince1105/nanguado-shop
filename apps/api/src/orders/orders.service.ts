import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  getDb,
  orders,
  orderItems,
  products,
  type SelectedVariant,
} from "@repo/db";
import { and, count, desc, eq, inArray, type SQL } from "drizzle-orm";
import { CartService } from "../cart/cart.service";
import { EcpayPaymentService } from "../ecpay/ecpay-payment.service";

/** 滿 NT$1,000 免運，未滿收 NT$60 */
const FREE_SHIPPING_THRESHOLD = 1000;
const SHIPPING_FEE = 60;

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "shipped",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function calcShippingFee(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

export type CreateOrderDto = {
  /** 會員 ID */
  userId?: string;
  /** 提供 sessionId 時，從該購物車取得下單商品並於成功後清空 */
  sessionId?: string;
  /** 或直接指定商品（直接購買） */
  items?: {
    productId: string;
    quantity: number;
    selectedVariant?: SelectedVariant | null;
  }[];
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientAddress: string;
};

/** 產生綠界 MerchantTradeNo：NGD + 13 位時間戳 + 4 位隨機數（共 20 字元） */
function generateMerchantTradeNo() {
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `NGD${Date.now()}${rand}`;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly cartService: CartService,
    private readonly ecpayPaymentService: EcpayPaymentService,
  ) {}

  async create(dto: CreateOrderDto) {
    for (const field of [
      "recipientName",
      "recipientPhone",
      "recipientEmail",
      "recipientAddress",
    ] as const) {
      if (!dto?.[field]) {
        throw new BadRequestException(`缺少必填欄位：${field}`);
      }
    }

    const db = getDb();

    // 取得下單商品清單（購物車或直接購買）
    let lineItems: {
      productId: string;
      quantity: number;
      selectedVariant: SelectedVariant | null;
    }[];

    if (dto.items?.length) {
      lineItems = dto.items.map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, item.quantity),
        selectedVariant: item.selectedVariant ?? null,
      }));
    } else if (dto.userId || dto.sessionId) {
      const cart = await this.cartService.getCart(dto.sessionId || "", dto.userId);
      if (!cart.items.length) {
        throw new BadRequestException("購物車是空的");
      }
      lineItems = cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant ?? null,
      }));
    } else {
      throw new BadRequestException("請提供 userId、sessionId 或 items");
    }

    // 讀取商品並驗證庫存
    const productIds = [...new Set(lineItems.map((item) => item.productId))];
    const productRows = await db.query.products.findMany({
      where: inArray(products.id, productIds),
    });
    const productMap = new Map(productRows.map((p) => [p.id, p]));

    for (const item of lineItems) {
      const product = productMap.get(item.productId);
      if (!product || !product.isActive) {
        throw new NotFoundException(`找不到商品：${item.productId}`);
      }

      let maxStock = product.stock;
      const hasVariantStock = product.variantStock && Object.keys(product.variantStock).length > 0;
      if (hasVariantStock && product.variants && product.variants.length > 0 && item.selectedVariant) {
        const key = product.variants
          .map((v: any) => item.selectedVariant?.[v.name] || "")
          .join(" / ");
        maxStock = (product.variantStock as any)?.[key] ?? 0;
      }

      if (item.quantity > maxStock) {
        throw new BadRequestException(
          `庫存不足：「${product.name}」目前僅剩 ${maxStock} 件`,
        );
      }
    }

    const subtotal = lineItems.reduce(
      (sum, item) =>
        sum + item.quantity * productMap.get(item.productId)!.price,
      0,
    );
    const shippingFee = calcShippingFee(subtotal);
    const totalAmount = subtotal + shippingFee;

    // 建立訂單與明細
    const [order] = await db
      .insert(orders)
      .values({
        merchantTradeNo: generateMerchantTradeNo(),
        userId: dto.userId || null,
        totalAmount,
        status: "pending",
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        recipientEmail: dto.recipientEmail,
        recipientAddress: dto.recipientAddress,
      })
      .returning();

    await db.insert(orderItems).values(
      lineItems.map((item) => {
        const product = productMap.get(item.productId)!;
        return {
          orderId: order.id,
          productId: item.productId,
          productName: product.name,
          productImage: product.images[0] ?? null,
          unitPrice: product.price,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant,
        };
      }),
    );

    // 從購物車下單成功後清空購物車
    if (!dto.items?.length && (dto.userId || dto.sessionId)) {
      await this.cartService.clearCart(dto.sessionId || "", dto.userId);
    }

    const created = await this.getById(order.id);

    // 產生綠界付款表單，前端以隱藏 form submit 到綠界收銀台
    const payment = this.ecpayPaymentService.buildCheckoutForm(
      created,
      created.items,
    );

    return { ...created, payment };
  }

  async getById(id: string) {
    const db = getDb();
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`找不到訂單：${id}`);
    }
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );
    return {
      ...order,
      subtotal,
      shippingFee: Math.max(0, order.totalAmount - subtotal),
    };
  }

  async getByUserId(userId: string) {
    const db = getDb();
    const rows = await db.query.orders.findMany({
      where: eq(orders.userId, userId),
      with: { items: true },
      orderBy: (order, { desc }) => desc(order.createdAt),
    });

    return rows.map((order) => {
      const subtotal = order.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      
      const enhancedOrder = {
        ...order,
        subtotal,
        shippingFee: Math.max(0, order.totalAmount - subtotal),
      };

      if (enhancedOrder.status === "pending") {
        const payment = this.ecpayPaymentService.buildCheckoutForm(
          enhancedOrder as any,
          enhancedOrder.items,
        );
        return { ...enhancedOrder, payment };
      }

      return enhancedOrder;
    });
  }

  // ---------- 後台管理 ----------

  /** 後台訂單列表：分頁 + 狀態篩選 */
  async adminList(query: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const db = getDb();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const conditions: SQL[] = [];
    if (query.status) {
      if (!ORDER_STATUSES.includes(query.status as OrderStatus)) {
        throw new BadRequestException(`無效的訂單狀態：${query.status}`);
      }
      conditions.push(eq(orders.status, query.status));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [{ total }]] = await Promise.all([
      db.query.orders.findMany({
        where,
        with: { items: true },
        orderBy: desc(orders.createdAt),
        limit,
        offset: (page - 1) * limit,
      }),
      db.select({ total: count() }).from(orders).where(where),
    ]);

    const items = rows.map((order) => {
      const subtotal = order.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      return {
        ...order,
        subtotal,
        shippingFee: Math.max(0, order.totalAmount - subtotal),
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /** 更新訂單狀態；標記為 paid 時同步補上付款註記 */
  async updateStatus(id: string, status: string) {
    if (!ORDER_STATUSES.includes(status as OrderStatus)) {
      throw new BadRequestException(
        `無效的訂單狀態：${status}（允許：${ORDER_STATUSES.join(" / ")}）`,
      );
    }

    const db = getDb();
    const existing = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
    if (!existing) {
      throw new NotFoundException(`找不到訂單：${id}`);
    }

    await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
        ...(status === "paid" &&
          !existing.isPaid && {
            isPaid: true,
            paidAt: new Date(),
            paymentType: existing.paymentType ?? "Manual",
          }),
      })
      .where(eq(orders.id, id));

    return this.getById(id);
  }

  async repay(orderId: string, userId?: string) {
    const db = getDb();
    
    // 讀取該筆交易的訂單
    const orderRecord = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true },
    });

    if (!orderRecord) {
      throw new NotFoundException("找不到該訂單");
    }

    if (userId && orderRecord.userId !== userId) {
      throw new BadRequestException("無權操作此訂單");
    }

    if (orderRecord.status !== "pending") {
      throw new BadRequestException("只有待付款的訂單才能重新付款");
    }

    // 產生全新的綠界 MerchantTradeNo 以防綠界重複交易錯誤
    const newMerchantTradeNo = generateMerchantTradeNo();

    // 更新資料庫中的 MerchantTradeNo
    await db
      .update(orders)
      .set({
        merchantTradeNo: newMerchantTradeNo,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    const updatedOrder = {
      ...orderRecord,
      merchantTradeNo: newMerchantTradeNo,
    };

    // 重新產生綠界付款表單參數
    const payment = this.ecpayPaymentService.buildCheckoutForm(
      updatedOrder as any,
      orderRecord.items,
    );

    return {
      success: true,
      payment,
    };
  }
}
