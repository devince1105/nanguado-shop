import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getDb, media } from "@repo/db";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
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
export class MediaService {
  private _client: S3Client | null = null;

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

  /** 上傳一張圖片到 R2，並在 media 表建立記錄 */
  async upload(file: UploadedImage, prefix = "media", folder?: string | null) {
    if (!file) throw new BadRequestException("未收到檔案");
    const ext = ALLOWED_MIME.get(file.mimetype);
    if (!ext) {
      throw new BadRequestException("僅接受 JPG / PNG / WebP / GIF / AVIF 圖片");
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

    const safePrefix = prefix.replace(/[^a-z0-9-]/gi, "") || "media";
    const key = `${safePrefix}/${randomUUID()}.${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${publicUrl.replace(/\/$/, "")}/${key}`;
    const db = getDb();
    const [row] = await db
      .insert(media)
      .values({
        key,
        url,
        filename: file.originalname?.slice(0, 512) || key,
        mimeType: file.mimetype,
        size: file.size,
        prefix: safePrefix,
        folder: folder?.trim() || null,
      })
      .returning();
    return row;
  }

  /** 分頁列出媒體，可依檔名搜尋、資料夾、標籤篩選（可疊加） */
  async list(params: {
    page?: number;
    limit?: number;
    search?: string;
    folder?: string;
    tag?: string;
  }) {
    const db = getDb();
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 24));

    const conds = [];
    if (params.search) conds.push(ilike(media.filename, `%${params.search}%`));
    if (params.folder === "__none__") conds.push(sql`${media.folder} is null`);
    else if (params.folder) conds.push(eq(media.folder, params.folder));
    if (params.tag) {
      conds.push(sql`${media.tags} @> ${JSON.stringify([params.tag])}::jsonb`);
    }
    const where = conds.length ? and(...conds) : undefined;

    const items = await db
      .select()
      .from(media)
      .where(where)
      .orderBy(desc(media.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(media)
      .where(where);

    return {
      items,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
    };
  }

  /** 提供篩選用的資料夾清單與所有標籤 */
  async meta() {
    const db = getDb();
    const folderRows = await db
      .selectDistinct({ folder: media.folder })
      .from(media);
    const folders = folderRows
      .map((r) => r.folder)
      .filter((f): f is string => !!f)
      .sort();

    const tagRows = await db.select({ tags: media.tags }).from(media);
    const tagSet = new Set<string>();
    for (const r of tagRows) (r.tags ?? []).forEach((t) => tagSet.add(t));

    return { folders, tags: Array.from(tagSet).sort() };
  }

  /** 更新 alt / 圖片說明 / 資料夾 / 標籤 */
  async update(
    id: string,
    dto: {
      alt?: string;
      caption?: string;
      folder?: string | null;
      tags?: string[];
    },
  ) {
    const db = getDb();
    const [row] = await db
      .update(media)
      .set({
        ...(dto.alt !== undefined ? { alt: dto.alt } : {}),
        ...(dto.caption !== undefined ? { caption: dto.caption } : {}),
        ...(dto.folder !== undefined
          ? { folder: dto.folder?.trim() || null }
          : {}),
        ...(dto.tags !== undefined
          ? {
              tags: Array.from(
                new Set(dto.tags.map((t) => t.trim()).filter(Boolean)),
              ),
            }
          : {}),
      })
      .where(eq(media.id, id))
      .returning();
    if (!row) throw new NotFoundException("找不到此媒體");
    return row;
  }

  /** 從 R2 與 DB 同時刪除 */
  async remove(id: string) {
    const db = getDb();
    const [row] = await db.select().from(media).where(eq(media.id, id));
    if (!row) throw new NotFoundException("找不到此媒體");

    const bucket = process.env.R2_BUCKET;
    if (bucket) {
      try {
        await this.client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: row.key }),
        );
      } catch {
        // R2 刪除失敗不阻擋 DB 記錄移除（避免孤兒記錄卡住）
      }
    }
    await db.delete(media).where(eq(media.id, id));
    return { success: true };
  }
}
