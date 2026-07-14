import { Injectable, NotFoundException } from "@nestjs/common";
import { getDb, pages } from "@repo/db";
import { eq } from "drizzle-orm";

/** 固定的頁面集合與預設內容（Markdown）。管理員可於後台覆寫。 */
export const KNOWN_PAGES: { slug: string; title: string; content: string }[] = [
  {
    slug: "about",
    title: "品牌故事",
    content:
      "# 品牌故事\n\n南瓜多 Shop 是一間台灣原創設計商店，把台灣的風景、動物與生活風格穿在身上。\n\n（請在後台編輯這段內容，講述你的品牌故事。）",
  },
  {
    slug: "terms",
    title: "服務條款",
    content:
      "# 服務條款\n\n歡迎使用南瓜多 Shop。使用本網站即表示您同意以下條款。\n\n（請在後台補充完整條款，例如帳號、訂購、付款、智慧財產權等內容。）",
  },
  {
    slug: "returns",
    title: "退換貨政策",
    content:
      "# 退換貨政策\n\n依《消費者保護法》，您享有商品到貨後 **7 天鑑賞期**（非試用期）。\n\n- 退換貨商品需保持全新、包裝完整。\n- （請在後台補充退換貨流程、運費負擔、不適用品項等細節。）",
  },
  {
    slug: "privacy",
    title: "隱私權及網站使用條款",
    content:
      "# 隱私權及網站使用條款\n\n本聲明說明南瓜多 Shop 如何蒐集、使用與保護您的個人資料，以及使用本網站的相關條款。\n\n## 個人資料的蒐集與使用\n\n- 我們僅於提供服務所需範圍內蒐集您的資料（如姓名、聯絡方式、收件地址）。\n- （請補充蒐集目的、利用期間與範圍。）\n\n## Cookie 的使用\n\n- 本網站使用 Cookie 以維持購物車、登入狀態與改善使用體驗。\n- 您可於瀏覽器設定變更或關閉 Cookie，但可能影響部分功能。\n\n## 資料安全與第三方\n\n- 付款經由綠界科技（ECPay）處理，我們不會保存您的完整信用卡資訊。\n- （請補充個資保護措施與第三方服務說明。）\n\n---\n\n以上為模板內容，請在後台補充為完整聲明，並建議由專業人士審閱。",
  },
  {
    slug: "shopping-guide",
    title: "購物說明",
    content:
      "# 購物說明\n\n## 運費\n\n- 單筆消費滿 **NT$1,000 免運費**，未滿酌收 NT$60 運費。\n\n## 鑑賞期\n\n- 商品到貨後享 **7 天鑑賞期**（非試用期）。\n\n## 付款方式\n\n- 採用綠界科技（ECPay）安全金流，支援信用卡付款。\n\n（可在後台補充更多購物流程說明。）",
  },
  {
    slug: "member-rights",
    title: "會員權益聲明",
    content:
      "# 會員權益聲明\n\n- 註冊會員即可保存購物車、查詢歷史訂單、留下商品評價。\n- （請在後台補充會員權益、個資使用、優惠等說明。）",
  },
  {
    slug: "contact",
    title: "聯絡我們",
    content:
      "# 聯絡我們\n\n- **客服信箱**：（請填寫）\n- **服務時間**：（請填寫）\n- **地址**：（請填寫）\n\n有任何問題歡迎與我們聯繫。",
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
