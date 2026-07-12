import { resolve } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { getDb } from "./index";
import {
  categories,
  products,
  cartItems,
  carts,
  orderItems,
  orders,
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

async function main() {
  const db = getDb();

  console.log("清空既有資料…");
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(cartItems);
  await db.delete(carts);
  await db.delete(products);
  await db.delete(categories);

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

  console.log(`✅ Seed 完成：3 個分類、${inserted.length} 筆商品`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed 失敗：", err);
    process.exit(1);
  });
