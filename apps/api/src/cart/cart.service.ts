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
import { and, eq, isNull } from "drizzle-orm";

export type AddCartItemDto = {
  sessionId: string;
  productId: string;
  quantity?: number;
  selectedVariant?: SelectedVariant | null;
  userId?: string;
};

@Injectable()
export class CartService {
  /** 依 sessionId / userId 取得（或建立）購物車，並帶出商品明細與總計 */
  async getCart(sessionId: string, userId?: string) {
    if (!sessionId && !userId) {
      throw new BadRequestException("缺少 sessionId 或 userId");
    }
    const db = getDb();
    let cart;

    if (userId) {
      // 優先尋找會員購物車
      cart = await db.query.carts.findFirst({
        where: eq(carts.userId, userId),
      });

      if (!cart && sessionId) {
        // 如果沒有會員購物車，但有 sessionId 購物車，則將該訪客購物車關聯至此會員
        const guestCart = await db.query.carts.findFirst({
          where: eq(carts.sessionId, sessionId),
        });
        if (guestCart) {
          if (!guestCart.userId || guestCart.userId === userId) {
            [cart] = await db
              .update(carts)
              .set({ userId, updatedAt: new Date() })
              .where(eq(carts.id, guestCart.id))
              .returning();
          }
        }
      }

      if (!cart) {
        // 仍無購物車，建立一個關聯該會員與該 sessionId 的購物車
        [cart] = await db
          .insert(carts)
          .values({ userId, sessionId })
          .returning();
      }
    } else {
      // 訪客狀態：僅依照 sessionId 尋找，且排除已綁定會員的購物車
      // （避免登出後沿用舊 sessionId 的訪客看到會員購物車內容）
      cart = await db.query.carts.findFirst({
        where: and(eq(carts.sessionId, sessionId), isNull(carts.userId)),
      });
      if (!cart) {
        [cart] = await db.insert(carts).values({ sessionId }).returning();
      }
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

    const cart = await this.getCart(dto.sessionId, dto.userId);

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

    return this.getCart(dto.sessionId, dto.userId);
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
    return this.getCart(cart!.sessionId, cart!.userId ?? undefined);
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
    return this.getCart(cart!.sessionId, cart!.userId ?? undefined);
  }

  /** 清空購物車（下單成功後使用） */
  async clearCart(sessionId: string, userId?: string) {
    const db = getDb();
    let cart;
    if (userId) {
      cart = await db.query.carts.findFirst({
        where: eq(carts.userId, userId),
      });
    } else if (sessionId) {
      // 訪客路徑同樣排除會員購物車，避免無憑證請求清空會員的車
      cart = await db.query.carts.findFirst({
        where: and(eq(carts.sessionId, sessionId), isNull(carts.userId)),
      });
    }
    if (cart) {
      await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    }
  }

  /** 合併訪客購物車到會員購物車 */
  async mergeCart(sessionId: string, userId: string) {
    if (!sessionId || !userId) return;
    const db = getDb();

    // 1. 取得或建立會員購物車
    let userCart = await db.query.carts.findFirst({
      where: eq(carts.userId, userId),
    });
    if (!userCart) {
      // 如果會員沒有購物車，可以直接把訪客購物車綁定給他
      const guestCart = await db.query.carts.findFirst({
        where: eq(carts.sessionId, sessionId),
      });
      if (guestCart) {
        await db
          .update(carts)
          .set({ userId, updatedAt: new Date() })
          .where(eq(carts.id, guestCart.id));
      }
      return;
    }

    // 如果會員已有購物車，且有訪客購物車，則合併商品項目
    const guestCart = await db.query.carts.findFirst({
      where: eq(carts.sessionId, sessionId),
    });
    if (!guestCart || guestCart.id === userCart.id) {
      return;
    }

    // 取得訪客購物車中所有的項目
    const guestItems = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, guestCart.id),
      with: { product: true },
    });

    if (guestItems.length === 0) {
      await db.delete(carts).where(eq(carts.id, guestCart.id));
      return;
    }

    // 取得會員購物車中所有的項目
    const userItems = await db.query.cartItems.findMany({
      where: eq(cartItems.cartId, userCart.id),
    });

    for (const gItem of guestItems) {
      const gVariantKey = JSON.stringify(gItem.selectedVariant ?? null);
      const matchedUserItem = userItems.find(
        (uItem) =>
          uItem.productId === gItem.productId &&
          JSON.stringify(uItem.selectedVariant ?? null) === gVariantKey,
      );

      if (matchedUserItem) {
        const maxStock = gItem.product?.stock ?? 999;
        const mergedQty = Math.min(
          matchedUserItem.quantity + gItem.quantity,
          maxStock,
        );
        await db
          .update(cartItems)
          .set({ quantity: mergedQty })
          .where(eq(cartItems.id, matchedUserItem.id));
      } else {
        await db
          .update(cartItems)
          .set({ cartId: userCart.id })
          .where(eq(cartItems.id, gItem.id));
      }
    }

    // 刪除舊的訪客購物車
    await db.delete(carts).where(eq(carts.id, guestCart.id));
  }
}
