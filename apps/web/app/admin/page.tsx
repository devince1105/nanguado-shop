"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import { getAdminStats } from "@/lib/admin-api";
import { formatPrice } from "@/lib/api";
import type { AdminStatsResponse } from "@/lib/types";

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  pending: { text: "待付款", className: "bg-amber-50 text-amber-700 border-amber-100 border" },
  paid: { text: "已付款", className: "bg-green-50 text-green-700 border-green-100 border" },
  shipped: { text: "已出貨", className: "bg-blue-50 text-blue-700 border-blue-100 border" },
  completed: { text: "已完成", className: "bg-neutral-50 text-neutral-700 border-neutral-100 border" },
  cancelled: { text: "已取消", className: "bg-red-50 text-red-700 border-red-100 border" },
};

export default function AdminDashboardPage() {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);

  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    date: string;
    value: number;
    type: "revenue" | "orders";
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getAdminStats(token)
      .then((data) => {
        setStats(data);
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : "載入儀表板數據失敗", "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, showToast]);

  if (loading || !stats) {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <div className="text-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-pumpkin-600 border-t-transparent"></span>
          <p className="mt-3 text-sm text-neutral-500 font-medium">正在載入數據中…</p>
        </div>
      </div>
    );
  }

  // ---------------- 折線圖 (營收) 數據計算 ----------------
  const maxRevenue = Math.max(...stats.salesTrend.map((d) => d.revenue), 1000);
  const linePoints = stats.salesTrend.map((d, i) => {
    const x = 45 + (i / 6) * 415;
    const y = 170 - (d.revenue / maxRevenue) * 135;
    return { x, y, date: d.date, value: d.revenue };
  });

  const linePathD =
    linePoints.length > 0
      ? `M ${linePoints[0].x} ${linePoints[0].y} ` +
        linePoints
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(" ")
      : "";

  const areaPathD =
    linePoints.length > 0
      ? `${linePathD} L ${linePoints[linePoints.length - 1].x} 170 L ${linePoints[0].x} 170 Z`
      : "";

  // ---------------- 長條圖 (訂單數) 數據計算 ----------------
  const maxOrders = Math.max(...stats.salesTrend.map((d) => d.orderCount), 5);
  const barWidth = 32;
  const barSpacing = 60;
  const bars = stats.salesTrend.map((d, i) => {
    const x = 50 + i * barSpacing;
    const barHeight = (d.orderCount / maxOrders) * 135;
    const y = 170 - barHeight;
    return { x, y, width: barWidth, height: barHeight, date: d.date, value: d.orderCount };
  });

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* 標題與更新時間 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">📊 營運數據總覽</h1>
          <p className="mt-1 text-sm text-neutral-500">
            即時分析商店訂單、營收、會員與庫存現況
          </p>
        </div>
        <div className="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs text-neutral-600 font-medium">
          最後更新：{new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}
        </div>
      </div>

      {/* 1. 今日核心指標卡片 */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
          今日即時指標
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 今日營收 */}
          <div className="relative overflow-hidden rounded-2xl border border-pumpkin-100 bg-gradient-to-br from-white to-pumpkin-50/20 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-500">今日營收</span>
              <span className="rounded-full bg-pumpkin-100 px-2.5 py-1 text-xs font-bold text-pumpkin-700">
                已付款
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-neutral-900">
              {formatPrice(stats.todayRevenue)}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="text-base">💰</span> 今日累積營業額
            </div>
            <div className="absolute right-0 bottom-0 translate-x-2 translate-y-2 opacity-5 text-8xl pointer-events-none select-none font-bold">
              NT
            </div>
          </div>

          {/* 今日訂單 */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-500">今日訂單</span>
              <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                新建立
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-neutral-900">
              {stats.todayOrderCount} <span className="text-sm font-normal text-neutral-500">筆</span>
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="text-base">🧾</span> 含未付款之所有訂單
            </div>
          </div>

          {/* 低庫存警示 */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-500">低庫存警示</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${stats.lowStockCount > 0 ? "bg-red-100 text-red-700 animate-pulse" : "bg-green-100 text-green-700"}`}>
                {stats.lowStockCount > 0 ? "需補貨" : "正常"}
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold text-neutral-900">
              {stats.lowStockCount} <span className="text-sm font-normal text-neutral-500">品項</span>
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-neutral-400">
              <span className="text-base">⚠️</span> 庫存低於或等於 10 件之商品
            </div>
          </div>
        </div>
      </div>

      {/* 2. 歷史累積統計指標 */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
          歷史累計指標
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 總營收 */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-pumpkin-100 text-xl">
              💵
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-400">歷史總營收</p>
              <p className="text-lg font-bold text-neutral-900">{formatPrice(stats.totalSales)}</p>
            </div>
          </div>

          {/* 總訂單 */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl">
              📦
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-400">累積總訂單數</p>
              <p className="text-lg font-bold text-neutral-900">{stats.totalOrders} 筆</p>
            </div>
          </div>

          {/* 總會員 */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-xl">
              👤
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-400">累積顧客數</p>
              <p className="text-lg font-bold text-neutral-900">{stats.totalUsers} 人</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 趨勢圖表 (SVG) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 過去 7 天營收折線圖 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm relative">
          <h3 className="text-sm font-bold text-neutral-900">📈 過去 7 天營收趨勢 (NT$)</h3>
          <p className="mt-0.5 text-xs text-neutral-400">只計算已付款訂單金額</p>
          <div className="mt-6 flex justify-center items-center h-48 relative">
            <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="strokeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#ea580c" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>

              {/* 背景網格線 */}
              {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                const y = 35 + r * 135;
                return (
                  <line
                    key={idx}
                    x1="45"
                    y1={y}
                    x2="460"
                    y2={y}
                    stroke="#f3f4f6"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* 橫軸日期標籤 */}
              {linePoints.map((p, i) => (
                <text
                  key={i}
                  x={p.x}
                  y="192"
                  textAnchor="middle"
                  className="fill-neutral-400 text-[10px] font-medium"
                >
                  {p.date.slice(5)}
                </text>
              ))}

              {/* 縱軸網格標籤 */}
              {[0, 0.5, 1].map((r, idx) => {
                const val = maxRevenue * (1 - r);
                const y = 35 + r * 135;
                return (
                  <text
                    key={idx}
                    x="5"
                    y={y + 4}
                    className="fill-neutral-400 text-[9px] font-medium"
                  >
                    {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                  </text>
                );
              })}

              {/* 漸層陰影填充 */}
              {areaPathD && (
                <path d={areaPathD} fill="url(#lineGrad)" className="transition-all duration-500" />
              )}

              {/* 折線 */}
              {linePathD && (
                <path
                  d={linePathD}
                  fill="none"
                  stroke="url(#strokeGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-500"
                />
              )}

              {/* 節點圓圈 */}
              {linePoints.map((p, i) => (
                <g key={i}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="4.5"
                    className="fill-white stroke-pumpkin-600 stroke-2 cursor-pointer transition-all hover:scale-150"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredPoint({
                        x: p.x,
                        y: p.y,
                        date: p.date,
                        value: p.value,
                        type: "revenue",
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                </g>
              ))}
            </svg>

            {/* 自製 Tooltip 提示浮窗 */}
            {hoveredPoint && hoveredPoint.type === "revenue" && (
              <div
                style={{
                  position: "absolute",
                  left: `${(hoveredPoint.x / 500) * 100}%`,
                  top: `${(hoveredPoint.y / 200) * 100 - 32}%`,
                }}
                className="z-10 -translate-x-1/2 rounded bg-neutral-900 px-2 py-1 text-center text-xs font-semibold text-white shadow-md pointer-events-none whitespace-nowrap"
              >
                <p className="text-[10px] text-neutral-400">{hoveredPoint.date}</p>
                <p className="text-white mt-0.5">{formatPrice(hoveredPoint.value)}</p>
              </div>
            )}
          </div>
        </div>

        {/* 過去 7 天訂單長條圖 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm relative">
          <h3 className="text-sm font-bold text-neutral-900">📊 過去 7 天訂單量 (筆)</h3>
          <p className="mt-0.5 text-xs text-neutral-400">包含所有付款狀態的訂單</p>
          <div className="mt-6 flex justify-center items-center h-48 relative">
            <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.6" />
                </linearGradient>
              </defs>

              {/* 背景網格線 */}
              {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                const y = 35 + r * 135;
                return (
                  <line
                    key={idx}
                    x1="45"
                    y1={y}
                    x2="460"
                    y2={y}
                    stroke="#f3f4f6"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                );
              })}

              {/* 橫軸日期 */}
              {bars.map((b, i) => (
                <text
                  key={i}
                  x={b.x + b.width / 2}
                  y="192"
                  textAnchor="middle"
                  className="fill-neutral-400 text-[10px] font-medium"
                >
                  {b.date.slice(5)}
                </text>
              ))}

              {/* 縱軸標籤 */}
              {[0, 0.5, 1].map((r, idx) => {
                const val = maxOrders * (1 - r);
                const y = 35 + r * 135;
                return (
                  <text
                    key={idx}
                    x="5"
                    y={y + 4}
                    className="fill-neutral-400 text-[9px] font-medium"
                  >
                    {val.toFixed(0)}
                  </text>
                );
              })}

              {/* 長條 */}
              {bars.map((b, i) => (
                <rect
                  key={i}
                  x={b.x}
                  y={b.y}
                  width={b.width}
                  height={Math.max(b.height, 2)} // 至少給 2px 高度以避免 0 筆時完全消失
                  rx="4"
                  fill="url(#barGrad)"
                  className="cursor-pointer transition-all hover:opacity-85"
                  onMouseEnter={() => {
                    setHoveredPoint({
                      x: b.x + b.width / 2,
                      y: b.y,
                      date: b.date,
                      value: b.value,
                      type: "orders",
                    });
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </svg>

            {/* 自製 Tooltip 提示浮窗 */}
            {hoveredPoint && hoveredPoint.type === "orders" && (
              <div
                style={{
                  position: "absolute",
                  left: `${(hoveredPoint.x / 500) * 100}%`,
                  top: `${(hoveredPoint.y / 200) * 100 - 32}%`,
                }}
                className="z-10 -translate-x-1/2 rounded bg-neutral-900 px-2 py-1 text-center text-xs font-semibold text-white shadow-md pointer-events-none whitespace-nowrap"
              >
                <p className="text-[10px] text-neutral-400">{hoveredPoint.date}</p>
                <p className="text-white mt-0.5">{hoveredPoint.value} 筆訂單</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. 最新訂單 與 低庫存警告 (並排網格) */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* 最新訂單 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900">🧾 最新訂單</h3>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-pumpkin-600 hover:text-pumpkin-700 transition-colors"
            >
              看全部 →
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm text-neutral-600">
              <thead>
                <tr className="border-b border-neutral-100 text-xs font-bold uppercase tracking-wider text-neutral-400">
                  <th className="pb-3 pr-4">訂單編號</th>
                  <th className="pb-3 pr-4">訂單時間</th>
                  <th className="pb-3 pr-4">顧客</th>
                  <th className="pb-3 pr-4 text-right">總金額</th>
                  <th className="pb-3">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {stats.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-neutral-400">
                      目前尚無訂單資料
                    </td>
                  </tr>
                ) : (
                  stats.recentOrders.map((order) => {
                    const statusConfig = STATUS_LABELS[order.status] ?? {
                      text: order.status,
                      className: "bg-neutral-100 text-neutral-700",
                    };
                    return (
                      <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="py-3 pr-4 font-mono text-xs text-neutral-500 font-medium">
                          {order.merchantTradeNo}
                        </td>
                        <td className="py-3 pr-4 text-xs text-neutral-400 whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString("zh-TW")}
                        </td>
                        <td className="py-3 pr-4 font-medium text-neutral-800 truncate max-w-[120px]">
                          {order.recipientName}
                        </td>
                        <td className="py-3 pr-4 text-right font-semibold text-neutral-900">
                          {formatPrice(order.totalAmount)}
                        </td>
                        <td className="py-3">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${statusConfig.className}`}>
                            {statusConfig.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 低庫存警告 */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-neutral-900">⚠️ 低庫存警示</h3>
            <Link
              href="/admin/products"
              className="text-xs font-bold text-pumpkin-600 hover:text-pumpkin-700 transition-colors"
            >
              商品管理 →
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {stats.lowStockProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-neutral-400 text-sm">
                <span className="text-2xl mb-1">🎉</span>
                所有商品庫存水位正常！
              </div>
            ) : (
              stats.lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-100 p-3 hover:border-red-100 hover:bg-red-50/10 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-800">{p.name}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      分類：{p.category?.name ?? "無分類"}
                    </p>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${p.stock === 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                      剩餘 {p.stock} 件
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
