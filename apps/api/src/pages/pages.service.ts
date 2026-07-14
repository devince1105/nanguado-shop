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
    content: `# 隱私權及網站使用條款

歡迎使用南瓜多 Shop。本聲明說明本網站如何蒐集、處理、利用及保護您的個人資料，以及您使用本網站時應遵守的條款。當您使用本網站與服務，即表示您已閱讀並同意本聲明。

## 一、適用範圍

本聲明適用於您在南瓜多 Shop 網站瀏覽、註冊會員、下單購物及使用相關服務之情形；不適用於本網站以外之連結網站。

## 二、個人資料的蒐集與利用

- **蒐集項目**：姓名、電子郵件、聯絡電話、收件地址、訂單與付款紀錄等。
- **利用目的**：訂單處理、金流與物流作業、客戶服務、會員管理，以及經您同意之行銷通知。
- **利用期間、地區、對象及方式**：於營業所需及法令規定之期間內，在提供服務之必要範圍使用；不會於目的外利用。

## 三、Cookie 的使用

本網站使用 Cookie 以維持購物車、登入狀態並改善瀏覽體驗。您可於瀏覽器設定變更或關閉 Cookie，惟可能影響部分功能之使用。

## 四、資料安全

我們採取合理之技術與管理措施保護您的個人資料。線上付款經由綠界科技（ECPay）處理，本網站不會保存您完整的信用卡資訊。

## 五、當事人權利

您得就本公司保有之個人資料，請求查詢、閱覽、複製、補充或更正，並得請求停止蒐集、處理、利用或刪除。相關請求可透過「聯絡我們」提出。

## 六、第三方連結

本網站可能包含第三方網站連結，該等網站之隱私權政策與本網站無關，請您於使用時另行參閱。

## 七、網站使用條款

- **智慧財產權**：本網站之文字、圖片、商標及其他內容之著作權，均屬本公司或合法權利人所有，未經同意不得重製、散布或作商業使用。
- **使用規範**：您不得從事任何違反法令、干擾網站運作或侵害他人權益之行為。
- **免責聲明**：本網站已盡力維護資訊正確，惟不保證完全無誤；因不可歸責於本公司之事由所致之損害，本公司不負賠償責任。
- **準據法與管轄**：本條款以中華民國法律為準據法，並以臺灣臺北地方法院為第一審管轄法院。

## 八、條款修訂

本公司保留隨時修訂本聲明之權利，修訂內容將公告於本網站，不另行個別通知。

## 九、聯絡方式

如對本聲明有任何疑問，歡迎透過「聯絡我們」與我們聯繫。

---

*以上為參考模板（原創撰寫，非任何品牌之條款）。實際上線前，請依您的營運情形調整，並建議由法律專業人士審閱。*`,
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
