import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { getDb, banners } from "@repo/db";
import { asc, desc, eq } from "drizzle-orm";

export type BannerDto = {
  imageUrl?: string;
  title?: string;
  subtitle?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

@Injectable()
export class BannersService {
  /** 公開：僅回傳啟用中的橫幅，依排序 */
  async listActive() {
    const db = getDb();
    return db
      .select()
      .from(banners)
      .where(eq(banners.isActive, true))
      .orderBy(asc(banners.sortOrder), desc(banners.createdAt));
  }

  /** 後台：全部橫幅 */
  async listAll() {
    const db = getDb();
    return db
      .select()
      .from(banners)
      .orderBy(asc(banners.sortOrder), desc(banners.createdAt));
  }

  async create(dto: BannerDto) {
    if (!dto?.imageUrl) throw new BadRequestException("背景圖為必填");
    const db = getDb();
    const [row] = await db
      .insert(banners)
      .values({
        imageUrl: dto.imageUrl,
        title: dto.title ?? "",
        subtitle: dto.subtitle ?? null,
        linkUrl: dto.linkUrl ?? null,
        linkLabel: dto.linkLabel ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      })
      .returning();
    return row;
  }

  async update(id: string, dto: BannerDto) {
    const db = getDb();
    const [row] = await db
      .update(banners)
      .set({
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.subtitle !== undefined ? { subtitle: dto.subtitle } : {}),
        ...(dto.linkUrl !== undefined ? { linkUrl: dto.linkUrl } : {}),
        ...(dto.linkLabel !== undefined ? { linkLabel: dto.linkLabel } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      })
      .where(eq(banners.id, id))
      .returning();
    if (!row) throw new NotFoundException("找不到此橫幅");
    return row;
  }

  async remove(id: string) {
    const db = getDb();
    await db.delete(banners).where(eq(banners.id, id));
    return { success: true };
  }
}
