import { resolve } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { isNotNull } from "drizzle-orm";
import { getDb } from "./index";
import { orders, paymentAttempts } from "./schema";

/**
 * 一次性回填：為 payment_attempts 表上線前就已存在的訂單補上一筆付款嘗試。
 *
 * 背景：付款／物流 Webhook 改為只透過 payment_attempts 反查訂單。若既有的
 * 待付款訂單在此表沒有任何一筆，客人之後完成付款時 Webhook 會查不到而漏帳。
 *
 * 冪等：以 orders.merchantTradeNo 為準，已存在的付款嘗試會跳過，可重複執行。
 */
async function main() {
  const db = getDb();

  const orderRows = await db.query.orders.findMany({
    where: isNotNull(orders.merchantTradeNo),
    columns: { id: true, merchantTradeNo: true },
  });

  const existing = await db.query.paymentAttempts.findMany({
    columns: { merchantTradeNo: true },
  });
  const seen = new Set(existing.map((a) => a.merchantTradeNo));

  const missing = orderRows.filter(
    (o) => o.merchantTradeNo && !seen.has(o.merchantTradeNo),
  );

  if (missing.length === 0) {
    console.log("✅ 沒有需要回填的訂單，payment_attempts 已與 orders 一致");
    return;
  }

  await db.insert(paymentAttempts).values(
    missing.map((o) => ({
      orderId: o.id,
      merchantTradeNo: o.merchantTradeNo!,
    })),
  );

  console.log(`✅ 已回填 ${missing.length} 筆付款嘗試（共檢查 ${orderRows.length} 筆訂單）`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ 回填 payment_attempts 失敗：", err);
    process.exit(1);
  });
