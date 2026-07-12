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
import { eq, inArray } from "drizzle-orm";
import { CartService } from "../cart/cart.service";

export type CreateOrderDto = {
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
  constructor(private readonly cartService: CartService) {}

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
    } else if (dto.sessionId) {
      const cart = await this.cartService.getCart(dto.sessionId);
      if (!cart.items.length) {
        throw new BadRequestException("購物車是空的");
      }
      lineItems = cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant ?? null,
      }));
    } else {
      throw new BadRequestException("請提供 sessionId 或 items");
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
      if (item.quantity > product.stock) {
        throw new BadRequestException(
          `庫存不足：「${product.name}」目前僅剩 ${product.stock} 件`,
        );
      }
    }

    const totalAmount = lineItems.reduce(
      (sum, item) =>
        sum + item.quantity * productMap.get(item.productId)!.price,
      0,
    );

    // 建立訂單與明細
    const [order] = await db
      .insert(orders)
      .values({
        merchantTradeNo: generateMerchantTradeNo(),
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
    if (!dto.items?.length && dto.sessionId) {
      await this.cartService.clearCart(dto.sessionId);
    }

    return this.getById(order.id);
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
    return order;
  }
}
