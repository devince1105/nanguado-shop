import { resolve } from "path";
import * as dotenv from "dotenv";

// 載入專案根目錄的 .env（dist/main.js → apps/api → apps → 專案根目錄）
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 安全標頭（HSTS、X-Content-Type-Options、X-Frame-Options、隱藏 X-Powered-By…）。
  // 本服務只回 JSON：關閉 CSP（不需要、避免誤擋），並允許前台跨網域讀取回應。
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  // 信任 Render 反向代理 1 層，使 req.ip 正確取得真實客戶端 IP
  app.set("trust proxy", 1);

  app.setGlobalPrefix("api/v1");

  // 註冊全域輸入驗證管道 (第一階段採 whitelist 靜默剝除多餘欄位，暫不開啟 forbidNonWhitelisted 避免阻斷)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  // 允許本機開發前台 + 正式前台（WEB_BASE_URL，逗號可分隔多個網域）
  const allowedOrigins = [
    "http://localhost:3000",
    ...(process.env.WEB_BASE_URL?.split(",").map((o) => o.trim()) ?? []),
  ].filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Swagger / OpenAPI 文件（互動式介面，可直接在網頁測試 API，含 JWT 授權）
  const swaggerConfig = new DocumentBuilder()
    .setTitle("南瓜多商鋪 API")
    .setDescription("南瓜多商鋪後端 RESTful API 文件")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, swaggerDocument, {
    useGlobalPrefix: false,
  });

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  console.log(`🎃 南瓜多 API 已啟動：http://localhost:${port}/api/v1`);
  console.log(`📖 API 文件（Swagger）：http://localhost:${port}/docs`);
}

bootstrap();
