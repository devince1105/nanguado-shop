import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

/** 由 FileInterceptor（multer 記憶體儲存）提供的檔案結構 */
export interface UploadedImage {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ALLOWED_MIME = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/avif", "avif"],
]);
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class UploadsService {
  private _client: S3Client | null = null;

  /** lazy 初始化 S3 client（確保 .env 已載入） */
  private get client(): S3Client {
    if (!this._client) {
      const accountId = process.env.R2_ACCOUNT_ID;
      const accessKeyId = process.env.R2_ACCESS_KEY_ID;
      const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
      if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new InternalServerErrorException(
          "R2 尚未設定（缺 R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY）",
        );
      }
      this._client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
    return this._client;
  }

  /** 上傳單張商品圖片到 R2，回傳可公開存取的 URL */
  async uploadProductImage(file: UploadedImage): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException("未收到檔案");
    }
    const ext = ALLOWED_MIME.get(file.mimetype);
    if (!ext) {
      throw new BadRequestException(
        "僅接受 JPG / PNG / WebP / GIF / AVIF 圖片",
      );
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException("圖片大小請小於 10MB");
    }

    const bucket = process.env.R2_BUCKET;
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (!bucket || !publicUrl) {
      throw new InternalServerErrorException(
        "R2 尚未設定（缺 R2_BUCKET / R2_PUBLIC_URL）",
      );
    }

    const key = `products/${randomUUID()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { url: `${publicUrl.replace(/\/$/, "")}/${key}` };
  }
}
