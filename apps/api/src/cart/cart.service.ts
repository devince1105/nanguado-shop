import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  getDb,
  carts,
  cartItems,
  products,
  type SelectedVariant,
} from "@repo/db";
import { and, eq } from "drizzle-orm";

export type AddCartItemDto = {
  sessionId: string;
  productId: string;
  quantity?: number;
  selectedVariant?: SelectedVariant | null;
};

@Injectable()
export class CartService {
  /** 依 sessionId 取得（或建立）購物車，並帶出商品明細與總計 */
  async getCart(sessionId: string) {
    if (!sessionId) {
      throw new BadRequestException("缺少 sessionId");
    }
    const db = getDb();
    let cart = await db.query.carts.findFirst({
      where: eq(carts.sessionId, sessionId),
    });
    if (!cart) {
      [cart] = await db.insert(carts).values({ sessionId }).returning();
    }

    const items = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, cart.id),
      with: { product: true },
      orderBy: (item, { asc }) => asc(item.createdAt),
    });

    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * (item.product?.price ?? 0),
      0,
    );
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return { ...cart, items, subtotal, itemCount };
  }

  /** 加入商品；相同商品＋相同規格則累加數量（不超過庫存） */
  async addItem(dto: AddCartItemDto) {
    if (!dto?.sessionId || !dto?.productId) {
      throw new BadRequestException("sessionId、productId 為必填欄位");
    }
    const quantity = Math.max(1, dto.quantity ?? 1);
    const db = getDb();

    const product = await db.query.products.findFirst({
      where: eq(products.id, dto.productId),
    });
    if (!product || !product.isActive) {
      throw new NotFoundException("找不到商品");
    }

    const cart = await this.getCart(dto.sessionId);

    const variantKey = JSON.stringify(dto.selectedVariant ?? null);
    const existing = cart.items.find(
      (item) =>
        item.productId === dto.productId &&
        JSON.stringify(item.selectedVariant ?? null) === variantKey,
    );

    const newQuantity = (existing?.quantity ?? 0) + quantity;
    if (newQuantity > product.stock) {
      throw new BadRequestException(
        `庫存不足：「${product.name}」目前僅剩 ${product.stock} 件`,
      );
    }

    if (existing) {
      await db
        .update(cartItems)
        .set({ quantity: newQuantity })
        .where(eq(cartItems.id, existing.id));
    } else {
      await db.insert(cartItems).values({
        cartId: cart.id,
        productId: dto.productId,
        quantity,
        selectedVariant: dto.selectedVariant ?? null,
      });
    }

    await db
      .update(carts)
      .set({ updatedAt: new Date() })
      .where(eq(carts.id, cart.id));

    return this.getCart(dto.sessionId);
  }

  /** 更新購物車項目數量 */
  async updateItem(itemId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new BadRequestException("quantity 必須為大於 0 的整數");
    }
    const db = getDb();
    const item = await db.query.cartItems.findFirst({
      where: eq(cartItems.id, itemId),
      with: { product: true },
    });
    if (!item) {
      throw new NotFoundException("找不到購物車項目");
    }
    if (item.product && quantity > item.product.stock) {
      throw new BadRequestException(
        `庫存不足：「${item.product.name}」目前僅剩 ${item.product.stock} 件`,
      );
    }
    await db
      .update(cartItems)
      .set({ quantity })
      .where(eq(cartItems.id, itemId));

    const cart = await db.query.carts.findFirst({
      where: eq(carts.id, item.cartId),
    });
    return this.getCart(cart!.sessionId);
  }

  /** 移除購物車項目 */
  async removeItem(itemId: string) {
    const db = getDb();
    const item = await db.query.cartItems.findFirst({
      where: eq(cartItems.id, itemId),
    });
    if (!item) {
      throw new NotFoundException("找不到購物車項目");
    }
    await db.delete(cartItems).where(eq(cartItems.id, itemId));

    const cart = await db.query.carts.findFirst({
      where: eq(carts.id, item.cartId),
    });
    return this.getCart(cart!.sessionId);
  }

  /** 清空購物車（下單成功後使用） */
  async clearCart(sessionId: string) {
    const db = getDb();
    const cart = await db.query.carts.findFirst({
      where: eq(carts.sessionId, sessionId),
    });
    if (cart) {
      await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    }
  }
}
