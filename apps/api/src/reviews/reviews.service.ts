import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  getDb,
  orders,
  orderItems,
  products,
  reviews,
  users,
} from "@repo/db";
import { and, desc, eq } from "drizzle-orm";

export type CreateReviewDto = {
  rating: number;
  content: string;
};

/** 將顯示名稱遮罩，例如「王小明」→「王*明」、「vince」→「v***e」 */
function maskName(raw: string | null | undefined, email: string): string {
  const base = (raw && raw.trim()) || email.split("@")[0] || "會員";
  const chars = [...base];
  if (chars.length <= 1) return base;
  if (chars.length === 2) return `${chars[0]}*`;
  return `${chars[0]}${"*".repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}

@Injectable()
export class ReviewsService {
  private async getProductBySlug(slug: string) {
    const db = getDb();
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });
    if (!product) throw new NotFoundException(`找不到商品：${slug}`);
    return product;
  }

  /** 該會員是否有「已付款」且包含此商品的訂單；回傳可用於留評的 orderId */
  private async findPurchasedOrderId(
    userId: string,
    productId: string,
  ): Promise<string | null> {
    const db = getDb();
    const [row] = await db
      .select({ orderId: orderItems.orderId })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.isPaid, true),
          eq(orderItems.productId, productId),
        ),
      )
      .limit(1);
    return row?.orderId ?? null;
  }

  private async findExistingReview(userId: string, productId: string) {
    const db = getDb();
    return db.query.reviews.findFirst({
      where: and(eq(reviews.userId, userId), eq(reviews.productId, productId)),
    });
  }

  /** 公開：取得商品的評價摘要與列表（作者名稱已遮罩） */
  async listBySlug(slug: string) {
    const product = await this.getProductBySlug(slug);
    const db = getDb();

    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        content: reviews.content,
        createdAt: reviews.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(eq(reviews.productId, product.id))
      .orderBy(desc(reviews.createdAt));

    const distribution: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let sum = 0;
    for (const r of rows) {
      sum += r.rating;
      const key = Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5;
      distribution[key] += 1;
    }
    const count = rows.length;
    const average = count ? Math.round((sum / count) * 10) / 10 : 0;

    return {
      average,
      count,
      distribution,
      items: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        content: r.content,
        createdAt: r.createdAt,
        authorName: maskName(r.userName, r.userEmail),
      })),
    };
  }

  /** 登入會員：查詢自己對此商品的留評資格 */
  async eligibility(slug: string, userId: string) {
    const product = await this.getProductBySlug(slug);
    const [purchasedOrderId, existing] = await Promise.all([
      this.findPurchasedOrderId(userId, product.id),
      this.findExistingReview(userId, product.id),
    ]);
    return {
      hasPurchased: purchasedOrderId != null,
      alreadyReviewed: existing != null,
      canReview: purchasedOrderId != null && existing == null,
    };
  }

  /** 登入會員：新增評價（限已付款買家、每人每商品一則） */
  async create(slug: string, userId: string, dto: CreateReviewDto) {
    const rating = Number(dto?.rating);
    const content = dto?.content?.trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException("評分必須為 1 至 5 的整數");
    }
    if (!content) {
      throw new BadRequestException("評價內容不可為空");
    }
    if (content.length > 1000) {
      throw new BadRequestException("評價內容請控制在 1000 字以內");
    }

    const product = await this.getProductBySlug(slug);
    const orderId = await this.findPurchasedOrderId(userId, product.id);
    if (!orderId) {
      throw new ForbiddenException("只有購買過此商品的會員才能留下評價");
    }
    const existing = await this.findExistingReview(userId, product.id);
    if (existing) {
      throw new BadRequestException("你已經評價過此商品了");
    }

    const db = getDb();
    const [created] = await db
      .insert(reviews)
      .values({ productId: product.id, userId, orderId, rating, content })
      .returning();
    return created;
  }
}
