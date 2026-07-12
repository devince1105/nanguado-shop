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
  app.enableCors({
    origin: ["http://localhost:3000"],
    credentials: true,
  });

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  console.log(`🎃 南瓜多 API 已啟動：http://localhost:${port}/api/v1`);
}

bootstrap();
