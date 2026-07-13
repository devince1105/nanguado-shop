"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";

export function ProductTrustSection({ product }: { product: Product }) {
  // 模擬評價投票狀態，提升互動感
  const [helpfulVotes, setHelpfulVotes] = useState<Record<number, number>>({
    0: 18,
    1: 12,
    2: 5,
  });
  const [voted, setVoted] = useState<Record<number, boolean>>({});

  const handleVote = (index: number) => {
    if (voted[index]) return;
    setHelpfulVotes((prev) => ({
      ...prev,
      [index]: prev[index] + 1,
    }));
    setVoted((prev) => ({
      ...prev,
      [index]: true,
    }));
  };

  // 模擬該商品的評價資料
  const reviews = [
    {
      user: "v***o",
      rating: 5,
      date: "2026-07-10",
      tags: ["材質極佳", "出貨超快", "CP值超高"],
      content: "衣服的印花比想像中還要精細，純棉的布料摸起來很扎實又透氣。下單隔天就收到貨了，出貨速度快得驚人，大推！",
    },
    {
      user: "c***8",
      rating: 5,
      date: "2026-07-08",
      tags: ["版型好看", "質感優良"],
      content: "黑熊的設計圖案非常有台灣特色，穿出去朋友都問在哪裡買的。洗過兩次目前也沒有縮水或掉色，品質非常滿意！",
    },
    {
      user: "j***n",
      rating: 4,
      date: "2026-07-03",
      tags: ["CP值超高"],
      content: "買給家人的生日禮物，版型很挺、穿起來非常有精神，包裝精美用心。尺寸對照表很精準，稍微合身很剛好。",
    },
  ];

  return (
    <div className="mt-12 border-t border-neutral-100 pt-10">
      <div className="grid gap-8 lg:grid-cols-[35%_1fr] lg:gap-12">
        
        {/* ---- 左側：店家/賣家資訊卡 (Seller Info Card) ---- */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-neutral-900">賣家資訊</h3>
          
          <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm transition-all hover:shadow-md">
            {/* 店家基本資料 */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-pumpkin-500 to-amber-500 text-2xl shadow-inner select-none">
                🎃
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="truncate font-bold text-neutral-900">南瓜多商鋪</h4>
                  <span className="shrink-0 inline-flex items-center gap-0.5 rounded bg-pumpkin-50 px-1.5 py-0.5 text-[10px] font-bold text-pumpkin-700">
                    <span className="text-[8px]">✓</span> 官方認證
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-400">@nanguado-official</p>
              </div>
            </div>

            {/* 店家信譽指標 */}
            <div className="mt-6 grid grid-cols-2 gap-4 border-y border-neutral-50 py-4 text-center">
              <div>
                <p className="text-xs text-neutral-400">評價分數</p>
                <p className="mt-1 font-mono text-lg font-extrabold text-neutral-900">
                  4.9 <span className="text-xs font-semibold text-amber-500">★</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">回覆率</p>
                <p className="mt-1 font-mono text-lg font-extrabold text-neutral-900">100%</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">出貨速度</p>
                <p className="mt-1 text-xs font-bold text-green-600">⚡ 24H 快速</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">商家所在地</p>
                <p className="mt-1 text-xs font-bold text-neutral-700">📍 台灣在地</p>
              </div>
            </div>

            {/* 商家承諾與特色 */}
            <ul className="mt-5 space-y-2 text-xs text-neutral-500">
              <li className="flex items-center gap-2">
                <span className="text-green-500">🛡️</span> 100% 正品保障・安心採購
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">🚚</span> 單筆滿 NT$1,000 即享免運
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">💬</span> 專業客服隨時解答產品疑問
              </li>
            </ul>

            {/* 進入賣場按鈕 */}
            <Link
              href="/products"
              className="mt-6 block w-full rounded-xl bg-neutral-900 py-3 text-center text-sm font-semibold text-white transition-all hover:bg-neutral-800 active:scale-[0.98]"
            >
              瀏覽全部商品
            </Link>
          </div>
        </div>

        {/* ---- 右側：商品評價區塊 (Product Reviews) ---- */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-neutral-900">商品評價</h3>

          <div className="grid gap-6 sm:grid-cols-[30%_1fr]">
            {/* 評分概要 */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-100 bg-white p-5 text-center shadow-sm">
              <p className="text-neutral-400 text-xs font-medium">平均評分</p>
              <p className="mt-2 font-mono text-5xl font-extrabold text-neutral-900">4.9</p>
              <div className="mt-2 flex gap-0.5 text-lg text-amber-500">
                {"★★★★★".split("").map((star, i) => (
                  <span key={i}>{star}</span>
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-400 font-semibold">248 則真實評價</p>
            </div>

            {/* 星等分佈長條圖 */}
            <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm flex flex-col justify-between space-y-2.5">
              {[
                { star: 5, pct: 92 },
                { star: 4, pct: 6 },
                { star: 3, pct: 2 },
                { star: 2, pct: 0 },
                { star: 1, pct: 0 },
              ].map((row) => (
                <div key={row.star} className="flex items-center gap-3 text-xs">
                  <span className="w-8 shrink-0 text-right font-mono font-bold text-neutral-500">
                    {row.star} 星
                  </span>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${row.pct}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 font-mono text-neutral-400 text-right">
                    {row.pct}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 評價列表 */}
          <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
            {reviews.map((review, idx) => (
              <div key={idx} className={`py-5 ${idx === 0 ? "pt-0" : ""} ${idx === reviews.length - 1 ? "pb-0" : ""}`}>
                {/* 買家頭像、評分、日期 */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-neutral-800">{review.user}</span>
                    <span className="inline-flex items-center gap-0.5 rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700 border border-green-100/50">
                      ✓ 已購顧客
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400 font-medium">{review.date}</span>
                </div>

                <div className="mt-2 flex gap-0.5 text-xs text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < review.rating ? "★" : "☆"}</span>
                  ))}
                </div>

                {/* 買家標籤篩選特徵 */}
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {review.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-neutral-50 border border-neutral-200/40 px-2 py-0.5 text-[10px] font-semibold text-neutral-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* 評價內容 */}
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">{review.content}</p>

                {/* 有幫助投票 */}
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={() => handleVote(idx)}
                    disabled={voted[idx]}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                      voted[idx]
                        ? "bg-pumpkin-50 border-pumpkin-200 text-pumpkin-700"
                        : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                    }`}
                  >
                    <span>{voted[idx] ? "✓" : "👍"}</span>
                    <span>這篇評價有幫助 ({helpfulVotes[idx]})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
