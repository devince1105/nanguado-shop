import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  getDb,
  products,
  categories,
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
      stock: dto.stock ?? 0,
      isActive: dto.isActive ?? true,
    };
    const [created] = await db.insert(products).values(values).returning();
    return created;
  }
}
