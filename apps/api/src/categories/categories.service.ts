import { Injectable } from "@nestjs/common";
import { getDb, categories, products } from "@repo/db";
import { asc, count, eq } from "drizzle-orm";

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
}
