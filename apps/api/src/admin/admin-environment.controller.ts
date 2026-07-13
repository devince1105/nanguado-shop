import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/admin.guard";

/**
 * 正式庫（Neon main 分支）的 endpoint 識別碼。
 * 與 packages/db/src/seed.ts 的 PROD_DB_ENDPOINTS 保持一致。
 */
const PROD_DB_ENDPOINTS = ["ep-noisy-hall-aobrkw7a"];

@Controller("admin/environment")
@UseGuards(AdminGuard)
export class AdminEnvironmentController {
  /** 唯讀：回報後端目前連線的資料庫屬於正式或開發環境（不含任何帳密） */
  @Get()
  getEnvironment() {
    const url = process.env.DATABASE_URL ?? "";
    const isProd = PROD_DB_ENDPOINTS.some((ep) => url.includes(ep));

    // 取出 endpoint 主機片段供辨識（例：ep-young-queen-aofw6v4f），去掉帳密與 -pooler 後綴
    const host = url.match(/@([^./:]+)/)?.[1] ?? null;
    const endpoint = host ? host.replace(/-pooler$/, "") : null;

    return {
      environment: isProd ? "production" : "development",
      endpoint,
    };
  }
}
