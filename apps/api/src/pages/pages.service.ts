import { Injectable, NotFoundException } from "@nestjs/common";
import { getDb, pages } from "@repo/db";
import { eq } from "drizzle-orm";

/** 固定的頁面集合與預設內容（Markdown）。管理員可於後台覆寫。 */
export const KNOWN_PAGES: { slug: string; title: string; content: string }[] = [
  {
    slug: "about",
    title: "關於我們",
    content:
      "# 關於南瓜多 Shop\n\n南瓜多 Shop 是一間台灣原創設計商店，把台灣的風景、動物與生活風格穿在身上。\n\n（請在後台編輯這段內容，介紹你的品牌故事。）",
  },
  {
    slug: "terms",
    title: "服務條款",
    content:
      "# 服務條款\n\n歡迎使用南瓜多 Shop。使用本網站即表示您同意以下條款。\n\n（請在後台補充完整條款，例如帳號、訂購、付款、智慧財產權等內容。）",
  },
  {
    slug: "contact",
    title: "聯絡我們",
    content:
      "# 聯絡我們\n\n- **客服信箱**：（請填寫）\n- **服務時間**：（請填寫）\n- **地址**：（請填寫）\n\n有任何問題歡迎與我們聯繫。",
  },
  {
    slug: "returns",
    title: "退換貨政策",
    content:
      "# 退換貨政策\n\n依《消費者保護法》，您享有商品到貨後 **7 天鑑賞期**（非試用期）。\n\n- 退換貨商品需保持全新、包裝完整。\n- （請在後台補充退換貨流程、運費負擔、不適用品項等細節。）",
  },
];

function defaultOf(slug: string) {
  return KNOWN_PAGES.find((p) => p.slug === slug);
}

@Injectable()
export class PagesService {
  /** 公開：取得頁面內容（DB 有就用 DB，否則回預設） */
  async getBySlug(slug: string) {
    const db = getDb();
    const [row] = await db.select().from(pages).where(eq(pages.slug, slug));
    if (row) return row;

    const fallback = defaultOf(slug);
    if (!fallback) throw new NotFoundException(`找不到頁面：${slug}`);
    return {
      id: "",
      slug: fallback.slug,
      title: fallback.title,
      content: fallback.content,
      updatedAt: new Date(),
    };
  }

  /** 後台：列出所有已知頁面（合併 DB 內容） */
  async adminList() {
    const db = getDb();
    const rows = await db.select().from(pages);
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    return KNOWN_PAGES.map((known) => {
      const row = bySlug.get(known.slug);
      return {
        slug: known.slug,
        title: row?.title ?? known.title,
        content: row?.content ?? known.content,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  }

  /** 後台：更新頁面（不存在則建立） */
  async update(slug: string, dto: { title?: string; content?: string }) {
    const known = defaultOf(slug);
    if (!known) throw new NotFoundException(`未知的頁面：${slug}`);

    const db = getDb();
    const [existing] = await db
      .select()
      .from(pages)
      .where(eq(pages.slug, slug));

    if (existing) {
      const [row] = await db
        .update(pages)
        .set({
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.content !== undefined ? { content: dto.content } : {}),
          updatedAt: new Date(),
        })
        .where(eq(pages.slug, slug))
        .returning();
      return row;
    }

    const [row] = await db
      .insert(pages)
      .values({
        slug,
        title: dto.title ?? known.title,
        content: dto.content ?? known.content,
      })
      .returning();
    return row;
  }
}
