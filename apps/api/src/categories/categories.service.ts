import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { getDb, categories, products } from "@repo/db";
import { asc, count, eq } from "drizzle-orm";

export type CategoryDto = {
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
};

@Injectable()
export class CategoriesService {
  /** 回傳所有分類（含各分類商品數量），依 sortOrder 排序 */
  async list() {
    const db = getDb();
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        description: categories.description,
        imageUrl: categories.imageUrl,
        sortOrder: categories.sortOrder,
        createdAt: categories.createdAt,
        productCount: count(products.id),
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(asc(categories.sortOrder));
    return rows;
  }

  // ---------- 後台管理 ----------

  async create(dto: CategoryDto) {
    if (!dto?.name || !dto?.slug) {
      throw new BadRequestException("name、slug 為必填欄位");
    }
    const db = getDb();
    const dup = await db.query.categories.findFirst({
      where: eq(categories.slug, dto.slug),
    });
    if (dup) {
      throw new BadRequestException(`Slug 已被使用：${dto.slug}`);
    }
    const [created] = await db
      .insert(categories)
      .values({
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        sortOrder: dto.sortOrder ?? 0,
      })
      .returning();
    return created;
  }

  async update(id: string, dto: Partial<CategoryDto>) {
    const db = getDb();
    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });
    if (!existing) {
      throw new NotFoundException(`找不到分類：${id}`);
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const dup = await db.query.categories.findFirst({
        where: eq(categories.slug, dto.slug),
      });
      if (dup) {
        throw new BadRequestException(`Slug 已被使用：${dto.slug}`);
      }
    }

    const [updated] = await db
      .update(categories)
      .set({
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      })
      .where(eq(categories.id, id))
      .returning();
    return updated;
  }

  /** 刪除分類；底下商品改為未分類（categoryId = null） */
  async remove(id: string) {
    const db = getDb();
    const existing = await db.query.categories.findFirst({
      where: eq(categories.id, id),
    });
    if (!existing) {
      throw new NotFoundException(`找不到分類：${id}`);
    }
    await db
      .update(products)
      .set({ categoryId: null })
      .where(eq(products.categoryId, id));
    await db.delete(categories).where(eq(categories.id, id));
    return { success: true };
  }
}
