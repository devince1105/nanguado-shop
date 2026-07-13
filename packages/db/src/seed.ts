import { resolve } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { getDb } from "./index";
import {
  categories,
  products,
  cartItems,
  carts,
  orderItems,
  orders,
  users,
  reviews,
  type NewProduct,
} from "./schema";

const SIZE_VARIANTS = [{ name: "尺寸", options: ["S", "M", "L", "XL"] }];

function randomStock() {
  return Math.floor(Math.random() * 91) + 10; // 10 ~ 100
}

function picsum(seed: string, index: number) {
  return `https://picsum.photos/seed/${seed}-${index}/800/800`;
}

function images(seed: string, count = 3) {
  return Array.from({ length: count }, (_, i) => picsum(seed, i + 1));
}

/**
 * 正式庫（Neon main 分支）的 endpoint 識別碼。
 * 這支 seed 會清空並重建資料（含假評價/假帳號），只該對開發庫執行。
 */
const PROD_DB_ENDPOINTS = ["ep-noisy-hall-aobrkw7a"];

/** 安全閘門：偵測到 DATABASE_URL 指向正式庫時中止，避免誤洗真資料 */
function assertNotProductionDb() {
  const url = process.env.DATABASE_URL ?? "";
  const hitProd = PROD_DB_ENDPOINTS.some((ep) => url.includes(ep));
  const masked = url.replace(/:\/\/[^@]*@/, "://***:***@") || "(未設定)";

  if (hitProd && process.env.ALLOW_PROD_SEED !== "1") {
    console.error(
      [
        "",
        "🚫 已中止：DATABASE_URL 指向「正式庫」，拒絕執行破壞性 seed。",
        `   目標：${masked}`,
        "",
        "   這支 seed 會清空資料並灌入假評價/假帳號，只該對開發庫執行。",
        "   請確認根目錄 .env 的 DATABASE_URL 指向 dev 分支（ep-young-queen…）後再跑。",
        "   若你真的要重置正式庫，才加上環境變數 ALLOW_PROD_SEED=1 明確覆寫。",
        "",
      ].join("\n"),
    );
    process.exit(1);
  }

  console.log(`🎯 Seed 目標資料庫：${masked}`);
}

async function main() {
  assertNotProductionDb();

  const db = getDb();

  console.log("清空既有資料…");
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(cartItems);
  await db.delete(carts);
  await db.delete(reviews);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(users).where(eq(users.role, "customer"));

  console.log("建立分類…");
  const [tshirt, hats, goods] = await db
    .insert(categories)
    .values([
      {
        name: "T恤類",
        slug: "t-shirt",
        description: "台灣原創圖案 T 恤，100% 純棉舒適印花上衣",
        imageUrl: picsum("cat-tshirt", 1),
        sortOrder: 1,
      },
      {
        name: "帽子配件",
        slug: "hats-accessories",
        description: "帽子、托特包與各式穿搭配件",
        imageUrl: picsum("cat-hats", 1),
        sortOrder: 2,
      },
      {
        name: "文創小物",
        slug: "cultural-goods",
        description: "台灣在地文創設計小物與生活雜貨",
        imageUrl: picsum("cat-goods", 1),
        sortOrder: 3,
      },
    ])
    .returning();

  console.log("建立商品…");
  const productRows: NewProduct[] = [
    // ---- T恤類 ----
    {
      name: "台灣黑熊經典T恤",
      slug: "taiwan-black-bear-tee",
      description:
        "以台灣黑熊為主角的經典款 T 恤，胸前 V 字白斑設計，100% 精梳棉，親膚透氣。",
      price: 690,
      compareAtPrice: 890,
      categoryId: tshirt.id,
      images: images("bear-tee"),
      variants: SIZE_VARIANTS,
      stock: randomStock(),
    },
    {
      name: "日月潭風景印花上衣",
      slug: "sun-moon-lake-tee",
      description:
        "日月潭湖光山色插畫印花，水彩風格細膩呈現，日常穿搭的風景明信片。",
      price: 750,
      categoryId: tshirt.id,
      images: images("sml-tee"),
      variants: SIZE_VARIANTS,
      stock: randomStock(),
    },
    {
      name: "玉山日出短袖T恤",
      slug: "yushan-sunrise-tee",
      description:
        "東北亞最高峰玉山日出剪影設計，漸層暖色印刷，登山魂必收。",
      price: 590,
      compareAtPrice: 790,
      categoryId: tshirt.id,
      images: images("yushan-tee"),
      variants: SIZE_VARIANTS,
      stock: randomStock(),
    },
    {
      name: "珍珠奶茶趣味T恤",
      slug: "bubble-tea-tee",
      description: "台灣之光珍珠奶茶插畫 T 恤，可愛風格，送禮自穿兩相宜。",
      price: 650,
      categoryId: tshirt.id,
      images: images("boba-tee"),
      variants: SIZE_VARIANTS,
      stock: randomStock(),
    },
    // ---- 帽子配件 ----
    {
      name: "藍鵲刺繡棒球帽",
      slug: "blue-magpie-cap",
      description:
        "台灣藍鵲刺繡棒球帽，可調式金屬扣環，棉質斜紋布料，遮陽有型。",
      price: 580,
      compareAtPrice: 680,
      categoryId: hats.id,
      images: images("magpie-cap"),
      variants: [{ name: "顏色", options: ["藏青", "卡其", "黑色"] }],
      stock: randomStock(),
    },
    {
      name: "梅花鹿漁夫帽",
      slug: "sika-deer-bucket-hat",
      description: "梅花鹿印花漁夫帽，雙面可戴設計，輕便好收納。",
      price: 520,
      categoryId: hats.id,
      images: images("deer-hat"),
      variants: [{ name: "顏色", options: ["米白", "軍綠"] }],
      stock: randomStock(),
    },
    {
      name: "帆布托特包・島嶼地圖",
      slug: "island-map-tote",
      description:
        "厚磅帆布托特包，印有手繪台灣島嶼地圖，內裡附口袋，耐重耐用。",
      price: 490,
      compareAtPrice: 620,
      categoryId: hats.id,
      images: images("map-tote"),
      variants: [{ name: "顏色", options: ["原色", "黑色"] }],
      stock: randomStock(),
    },
    // ---- 文創小物 ----
    {
      name: "廟宇燈籠陶瓷杯",
      slug: "temple-lantern-mug",
      description:
        "以廟宇紅燈籠為靈感的陶瓷馬克杯，釉面溫潤，容量 350ml。",
      price: 450,
      categoryId: goods.id,
      images: images("lantern-mug"),
      variants: [],
      stock: randomStock(),
    },
    {
      name: "台灣小吃琺瑯別針組",
      slug: "taiwan-food-enamel-pins",
      description:
        "小籠包、珍奶、雞排、芒果冰四入琺瑯別針組，細節滿分的迷你台灣味。",
      price: 390,
      compareAtPrice: 480,
      categoryId: goods.id,
      images: images("food-pins"),
      variants: [],
      stock: randomStock(),
    },
    {
      name: "檜木香氛擴香磚",
      slug: "hinoki-diffuser-stone",
      description:
        "台灣檜木精油擴香磚，山林氣息療癒日常，附棉繩可吊掛。",
      price: 680,
      categoryId: goods.id,
      images: images("hinoki-stone"),
      variants: [{ name: "款式", options: ["山形", "島形"] }],
      stock: randomStock(),
    },
    {
      name: "野溪溫泉柴犬明信片組",
      slug: "shiba-postcard-set",
      description: "插畫家聯名柴犬泡湯明信片 8 入組，厚磅美術紙印刷。",
      price: 1280,
      compareAtPrice: 1480,
      categoryId: goods.id,
      images: images("shiba-postcard"),
      variants: [],
      stock: randomStock(),
    },
  ];

  const inserted = await db.insert(products).values(productRows).returning();

  console.log("建立測試會員…");
  const pwd = hashSync("password123", 10);
  const [userA, userB, userC] = await db
    .insert(users)
    .values([
      {
        email: "vince@gmail.com",
        passwordHash: pwd,
        role: "customer",
        name: "vince",
        isEmailVerified: true,
      },
      {
        email: "chao@gmail.com",
        passwordHash: pwd,
        role: "customer",
        name: "chao",
        isEmailVerified: true,
      },
      {
        email: "jason@gmail.com",
        passwordHash: pwd,
        role: "customer",
        name: "jason",
        isEmailVerified: true,
      },
    ])
    .returning();

  console.log("建立測試訂單以作評價佐證…");
  const bearTee = inserted.find((p) => p.slug === "taiwan-black-bear-tee")!;
  const deerHat = inserted.find((p) => p.slug === "sika-deer-bucket-hat")!;
  const lanternMug = inserted.find((p) => p.slug === "temple-lantern-mug")!;

  const [orderA] = await db
    .insert(orders)
    .values({
      userId: userA.id,
      merchantTradeNo: `SEED${Date.now()}A`,
      totalAmount: bearTee.price + deerHat.price + lanternMug.price,
      status: "paid",
      isPaid: true,
      paidAt: new Date(),
      recipientName: "Vince",
      recipientPhone: "0912345678",
      recipientEmail: "vince@gmail.com",
      recipientAddress: "台北市信義區信義路五段7號",
    })
    .returning();
  await db.insert(orderItems).values([
    { orderId: orderA.id, productId: bearTee.id, productName: bearTee.name, unitPrice: bearTee.price, quantity: 1 },
    { orderId: orderA.id, productId: deerHat.id, productName: deerHat.name, unitPrice: deerHat.price, quantity: 1 },
    { orderId: orderA.id, productId: lanternMug.id, productName: lanternMug.name, unitPrice: lanternMug.price, quantity: 1 },
  ]);

  const [orderB] = await db
    .insert(orders)
    .values({
      userId: userB.id,
      merchantTradeNo: `SEED${Date.now()}B`,
      totalAmount: bearTee.price + deerHat.price + lanternMug.price,
      status: "paid",
      isPaid: true,
      paidAt: new Date(),
      recipientName: "Chao",
      recipientPhone: "0923456789",
      recipientEmail: "chao@gmail.com",
      recipientAddress: "台中市西屯區台灣大道三段99號",
    })
    .returning();
  await db.insert(orderItems).values([
    { orderId: orderB.id, productId: bearTee.id, productName: bearTee.name, unitPrice: bearTee.price, quantity: 1 },
    { orderId: orderB.id, productId: deerHat.id, productName: deerHat.name, unitPrice: deerHat.price, quantity: 1 },
    { orderId: orderB.id, productId: lanternMug.id, productName: lanternMug.name, unitPrice: lanternMug.price, quantity: 1 },
  ]);

  const [orderC] = await db
    .insert(orders)
    .values({
      userId: userC.id,
      merchantTradeNo: `SEED${Date.now()}C`,
      totalAmount: bearTee.price,
      status: "paid",
      isPaid: true,
      paidAt: new Date(),
      recipientName: "Jason",
      recipientPhone: "0934567890",
      recipientEmail: "jason@gmail.com",
      recipientAddress: "高雄市苓雅區四維三路2號",
    })
    .returning();
  await db.insert(orderItems).values([
    { orderId: orderC.id, productId: bearTee.id, productName: bearTee.name, unitPrice: bearTee.price, quantity: 1 },
  ]);

  console.log("建立測試評價…");
  await db.insert(reviews).values([
    {
      productId: bearTee.id,
      userId: userA.id,
      orderId: orderA.id,
      rating: 5,
      content: "衣服的印花比想像中還要精細，純棉的布料摸起來很扎實又透氣。下單隔天就收到貨了，出貨速度快得驚人，大推！",
    },
    {
      productId: bearTee.id,
      userId: userB.id,
      orderId: orderB.id,
      rating: 5,
      content: "黑熊的設計圖案非常有台灣特色，穿出去朋友都問在哪裡買的。洗過兩次目前也沒有縮水或掉色，品質非常滿意！",
    },
    {
      productId: bearTee.id,
      userId: userC.id,
      orderId: orderC.id,
      rating: 4,
      content: "買給家人的生日禮物，版型很挺、穿起來非常有精神，包裝精美用心。尺寸對照表很精準，稍微合身很剛好。",
    },
    {
      productId: deerHat.id,
      userId: userA.id,
      orderId: orderA.id,
      rating: 5,
      content: "雙面可戴的設計真的很划算！米白色很百搭，軍綠色休閒感十足。布料防風防曬，出門健行必備！",
    },
    {
      productId: deerHat.id,
      userId: userB.id,
      orderId: orderB.id,
      rating: 5,
      content: "質感很好的漁夫帽，梅花鹿插圖小巧可愛。出貨速度超快，滿千免運很推薦大家買。",
    },
    {
      productId: lanternMug.id,
      userId: userA.id,
      orderId: orderA.id,
      rating: 5,
      content: "陶瓷的釉面溫潤有質感，大紅色燈籠圖案非常有台灣廟宇氛圍，拿起來手感很沉穩，喝茶或喝咖啡都很適合！",
    },
    {
      productId: lanternMug.id,
      userId: userB.id,
      orderId: orderB.id,
      rating: 5,
      content: "送給外國朋友的伴手禮，包裝很安全沒有任何破損，朋友收到非常開心！很有在地特色的小物。",
    },
  ]);

  console.log(`✅ Seed 完成：3 個分類、${inserted.length} 筆商品、3 個用戶、3 個訂單、7 筆評價`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed 失敗：", err);
    process.exit(1);
  });
