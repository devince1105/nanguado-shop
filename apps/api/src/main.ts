import { resolve } from "path";
import * as dotenv from "dotenv";

// 載入專案根目錄的 .env（dist/main.js → apps/api → apps → 專案根目錄）
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api/v1");
  // 允許本機開發前台 + 正式前台（WEB_BASE_URL，逗號可分隔多個網域）
  const allowedOrigins = [
    "http://localhost:3000",
    ...(process.env.WEB_BASE_URL?.split(",").map((o) => o.trim()) ?? []),
  ].filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  console.log(`🎃 南瓜多 API 已啟動：http://localhost:${port}/api/v1`);
}

bootstrap();
