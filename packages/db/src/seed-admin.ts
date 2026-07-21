import { resolve } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../../../.env") });

import * as bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { users } from "./schema";

const email = (process.env.ADMIN_EMAIL || "admin@nanguado.shop")
  .toLowerCase()
  .trim();

// 正式環境必須明確指定 ADMIN_PASSWORD，避免沿用弱預設密碼造成後台被入侵。
if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
  console.error(
    "❌ 正式環境未設定 ADMIN_PASSWORD，拒絕以預設弱密碼建立管理員。請在 .env 設定強密碼後再執行。",
  );
  process.exit(1);
}

const password = process.env.ADMIN_PASSWORD || "Admin@12345";

async function main() {
  const db = getDb();
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    await db
      .update(users)
      .set({ role: "admin", passwordHash, isEmailVerified: true })
      .where(eq(users.id, existing.id));
    console.log(`✅ 既有帳號 ${email} 已升級為管理員（密碼已重設，已驗證）`);
  } else {
    await db.insert(users).values({
      email,
      passwordHash,
      name: "管理員",
      role: "admin",
      isEmailVerified: true,
    });
    console.log(`✅ 已建立管理員帳號 ${email}（已驗證）`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed 管理員失敗：", err);
    process.exit(1);
  });
