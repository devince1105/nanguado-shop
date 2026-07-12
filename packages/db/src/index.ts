import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export * from "./schema";
export { schema };

export type Database = NeonHttpDatabase<typeof schema>;

let _db: Database | null = null;

/**
 * 取得 DB client（lazy 初始化，確保呼叫端已載入 .env）。
 */
export function getDb(): Database {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL 未設定，請確認專案根目錄的 .env");
    }
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}
