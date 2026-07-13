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
