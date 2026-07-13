import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  getDb,
  products,
  categories,
  cartItems,
  orderItems,
  type NewProduct,
  type ProductVariant,
} from "@repo/db";
import { and, asc, count, desc, eq, ilike, type SQL } from "drizzle-orm";

export type ListProductsQuery = {
  category?: string;
  /** 關鍵字搜尋（比對商品名稱，不分大小寫） */
  search?: string;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
};

export type CreateProductDto = {
  name: string;
  slug: string;
  description?: string;
  price: number;
  compareAtPrice?: number | null;
  categoryId?: string | null;
  images?: string[];
  variants?: ProductVariant[];
  variantStock?: Record<string, number>;
  stock?: number;
  isActive?: boolean;
};

@Injectable()
export class ProductsService {
  async list(query: ListProductsQuery) {
    const db = getDb();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(48, Math.max(1, query.limit ?? 12));

    const conditions: SQL[] = [eq(products.isActive, true)];

    if (query.category) {
      const category = await db.query.categories.findFirst({
        where: eq(categories.slug, query.category),
      });
      if (!category) {
        throw new NotFoundException(`找不到分類：${query.category}`);
      }
      conditions.push(eq(products.categoryId, category.id));
    }

    if (query.search?.trim()) {
      conditions.push(ilike(products.name, `%${query.search.trim()}%`));
    }

    const where = and(...conditions);

    const orderBy =
      query.sort === "price_asc"
        ? asc(products.price)
        : query.sort === "price_desc"
          ? desc(products.price)
          : desc(products.createdAt);

    const [items, [{ total }]] = await Promise.all([
      db.query.products.findMany({
        where,
        orderBy,
        limit,
        offset: (page - 1) * limit,
        with: { category: true },
      }),
      db.select({ total: count() }).from(products).where(where),
    ]);

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

  async getBySlug(slug: string) {
    const db = getDb();
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
      with: { category: true },
    });
    if (!product) {
      throw new NotFoundException(`找不到商品：${slug}`);
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    if (!dto?.name || !dto?.slug || dto?.price == null) {
      throw new BadRequestException("name、slug、price 為必填欄位");
    }
    const db = getDb();
    const values: NewProduct = {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      price: dto.price,
      compareAtPrice: dto.compareAtPrice ?? null,
      categoryId: dto.categoryId ?? null,
      images: dto.images ?? [],
      variants: dto.variants ?? [],
      variantStock: dto.variantStock ?? {},
      stock: dto.stock ?? 0,
      isActive: dto.isActive ?? true,
    };
    const [created] = await db.insert(products).values(values).returning();
    return created;
  }

  // ---------- 後台管理 ----------

  /** 後台列表：不過濾 isActive，支援關鍵字搜尋與分頁 */
  async adminList(query: { search?: string; page?: number; limit?: number }) {
    const db = getDb();
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));

    const conditions: SQL[] = [];
    if (query.search?.trim()) {
      conditions.push(ilike(products.name, `%${query.search.trim()}%`));
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [items, [{ total }]] = await Promise.all([
      db.query.products.findMany({
        where,
        orderBy: desc(products.createdAt),
        limit,
        offset: (page - 1) * limit,
        with: { category: true },
      }),
      db.select({ total: count() }).from(products).where(where),
    ]);

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

  /** 部分更新（含上下架 isActive、庫存調整） */
  async update(id: string, dto: Partial<CreateProductDto>) {
    const db = getDb();
    const existing = await db.query.products.findFirst({
      where: eq(products.id, id),
    });
    if (!existing) {
      throw new NotFoundException(`找不到商品：${id}`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const dup = await db.query.products.findFirst({
        where: eq(products.slug, dto.slug),
      });
      if (dup) {
        throw new BadRequestException(`Slug 已被使用：${dto.slug}`);
      }
    }

    const [updated] = await db
      .update(products)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.compareAtPrice !== undefined && {
          compareAtPrice: dto.compareAtPrice,
        }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.images !== undefined && { images: dto.images }),
        ...(dto.variants !== undefined && { variants: dto.variants }),
        ...(dto.variantStock !== undefined && { variantStock: dto.variantStock }),
        ...(dto.stock !== undefined && { stock: dto.stock }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  /** 刪除商品；已有訂單紀錄時擋下（保留歷史快照），請改用下架 */
  async remove(id: string) {
    const db = getDb();
    const existing = await db.query.products.findFirst({
      where: eq(products.id, id),
    });
    if (!existing) {
      throw new NotFoundException(`找不到商品：${id}`);
    }

    const [{ total: orderRefs }] = await db
      .select({ total: count() })
      .from(orderItems)
      .where(eq(orderItems.productId, id));
    if (orderRefs > 0) {
      throw new BadRequestException(
        "該商品已有訂單紀錄，無法刪除，請改為下架（isActive = false）",
      );
    }

    // 先清掉購物車中的引用，再刪除商品
    await db.delete(cartItems).where(eq(cartItems.productId, id));
    await db.delete(products).where(eq(products.id, id));
    return { success: true };
  }
}
