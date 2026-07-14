import { Injectable } from "@nestjs/common";
import { getDb, settings } from "@repo/db";
import { inArray } from "drizzle-orm";

/** 公開設定的鍵與預設值（白牌可覆寫） */
export const DEFAULT_SETTINGS = {
  shopName: "南瓜多 Shop",
  shopTagline: "原創設計商店，把喜歡的穿在身上。",
  shopEmoji: "🎃",
  shopDescription:
    "南瓜多 Shop — 原創 T 恤、帽子配件與文創小物，把喜歡的穿在身上。",
};

export type SiteSettings = typeof DEFAULT_SETTINGS;
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[];

@Injectable()
export class SettingsService {
  /** 取得所有公開設定（DB 覆寫預設值） */
  async getAll(): Promise<SiteSettings> {
    const db = getDb();
    const rows = await db
      .select()
      .from(settings)
      .where(inArray(settings.key, SETTING_KEYS as string[]));
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const result = { ...DEFAULT_SETTINGS };
    for (const key of SETTING_KEYS) {
      const val = map.get(key);
      if (val != null && val !== "") result[key] = val;
    }
    return result;
  }

  /** 後台：批次更新設定（僅接受已知的鍵） */
  async update(dto: Partial<SiteSettings>): Promise<SiteSettings> {
    const db = getDb();
    const entries = SETTING_KEYS.filter(
      (k) => dto[k] !== undefined,
    ).map((k) => ({ key: k as string, value: String(dto[k] ?? "") }));

    for (const entry of entries) {
      await db
        .insert(settings)
        .values({ key: entry.key, value: entry.value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: entry.value, updatedAt: new Date() },
        });
    }
    return this.getAll();
  }
}
