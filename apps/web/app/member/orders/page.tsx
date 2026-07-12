"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { API_URL, formatPrice } from "@/lib/api";
import { useToastStore } from "@/lib/store/toast";
import type { EcpayPayment, Order } from "@/lib/types";

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  pending: { text: "待付款", className: "bg-amber-50 text-amber-700 border-amber-100" },
  paid: { text: "已付款", className: "bg-green-50 text-green-700 border-green-100" },
  shipped: { text: "已出貨", className: "bg-blue-50 text-blue-700 border-blue-100" },
  completed: { text: "已完成", className: "bg-neutral-50 text-neutral-700 border-neutral-100" },
  cancelled: { text: "已取消", className: "bg-red-50 text-red-700 border-red-100" },
};

export default function MemberOrdersPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error("無法取得訂單資料");
        }
        const data = await res.json();
        setOrders(data);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "載入訂單失敗", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders().catch(() => {});
  }, [token, showToast]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const submitEcpayForm = (payment: EcpayPayment) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = payment.action;
    form.style.display = "none";

    Object.entries(payment.params).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold text-neutral-900">我的訂單</h1>
        <div className="mt-8 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 w-full animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <span className="text-5xl">🔒</span>
        <h1 className="mt-4 text-xl font-bold text-neutral-900">請先登入會員</h1>
        <p className="mt-2 text-sm text-neutral-500">
          您必須登入才能查看歷史訂單紀錄。
        </p>
        <Link
          href="/login?redirect=/member/orders"
          className="mt-6 inline-block rounded-xl bg-pumpkin-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pumpkin-600/10 hover:bg-pumpkin-700 active:scale-[0.98] transition-all"
        >
          前往登入
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">我的訂單</h1>
          <p className="mt-1 text-sm text-neutral-500">
            您好，{user.name}！此處列出您所有的購物歷史紀錄。
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm font-semibold text-pumpkin-600 hover:text-pumpkin-700 hover:underline"
        >
          繼續購物 &rarr;
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
          <span className="text-4xl">🛍️</span>
          <h3 className="mt-4 text-base font-bold text-neutral-900">尚無任何訂單</h3>
          <p className="mt-1 text-sm text-neutral-500">
            您目前沒有任何訂購紀錄。快去選購喜歡的商品吧！
          </p>
          <Link
            href="/products"
            className="mt-6 inline-block rounded-xl bg-pumpkin-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pumpkin-600/10 hover:bg-pumpkin-700 transition-colors"
          >
            去逛逛商品
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] ?? {
              text: order.status,
              className: "bg-neutral-50 text-neutral-700 border-neutral-100",
            };
            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-2xl border border-neutral-100 bg-white transition-all shadow-sm hover:shadow-md"
              >
                {/* 訂單卡片標題 / 摘要 */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  className="flex flex-wrap items-center justify-between gap-4 p-5 cursor-pointer select-none"
                >
                  <div className="space-y-1">
                    <p className="text-xs text-neutral-400">訂單編號</p>
                    <p className="font-mono text-sm font-bold text-neutral-900">
                      {order.merchantTradeNo}
                    </p>
                  </div>

                  <div className="space-y-1 sm:text-right">
                    <p className="text-xs text-neutral-400">訂購日期</p>
                    <p className="text-sm font-medium text-neutral-600">
                      {new Date(order.createdAt).toLocaleDateString("zh-TW")}
                    </p>
                  </div>

                  <div className="space-y-1 sm:text-right">
                    <p className="text-xs text-neutral-400">總金額</p>
                    <p className="text-sm font-bold text-pumpkin-600">
                      {formatPrice(order.totalAmount)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.className}`}
                    >
                      {statusInfo.text}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        order.isPaid
                          ? "bg-green-50 text-green-700 border-green-100"
                          : "bg-red-50 text-red-700 border-red-100"
                      }`}
                    >
                      {order.isPaid ? "已付款" : "未付款"}
                    </span>

                    {/* 未付款且有支付表單時顯示付款按鈕 */}
                    {order.status === "pending" && order.payment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          submitEcpayForm(order.payment!);
                        }}
                        className="ml-2 inline-flex items-center rounded-full bg-pumpkin-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-pumpkin-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pumpkin-600 transition-colors"
                      >
                        前往付款
                      </button>
                    )}

                    {/* 展開箭頭 */}
                    <svg
                      className={`h-5 w-5 text-neutral-400 transition-transform duration-300 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>

                {/* 展開之訂單明細 */}
                {isExpanded && (
                  <div className="border-t border-neutral-50 bg-neutral-50/30 p-5 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                        訂購商品項目
                      </h4>
                      <ul className="mt-2 divide-y divide-neutral-100">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-4 py-3">
                            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 border border-neutral-100">
                              {item.productImage ? (
                                <Image
                                  src={item.productImage}
                                  alt={item.productName}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs">
                                  🎃
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-semibold text-neutral-900 truncate">
                                {item.productName}
                              </h5>
                              {item.selectedVariant && (
                                <p className="mt-0.5 text-xs text-neutral-500">
                                  {Object.entries(item.selectedVariant)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join(" | ")}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-neutral-900">
                                {formatPrice(item.unitPrice)}
                              </p>
                              <p className="text-xs text-neutral-500">
                                x {item.quantity}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="grid gap-4 pt-4 border-t border-neutral-100 sm:grid-cols-2 text-sm text-neutral-600">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                          收件人資訊
                        </h4>
                        <div className="mt-2 space-y-1">
                          <p>
                            <span className="font-semibold">姓名：</span>
                            {order.recipientName}
                          </p>
                          <p>
                            <span className="font-semibold">電話：</span>
                            {order.recipientPhone}
                          </p>
                          <p>
                            <span className="font-semibold">Email：</span>
                            {order.recipientEmail}
                          </p>
                          <p>
                            <span className="font-semibold">地址：</span>
                            {order.recipientAddress}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 sm:text-right sm:self-end">
                        <p>
                          <span>商品小計：</span>
                          <span className="font-medium text-neutral-950">
                            {formatPrice(order.subtotal)}
                          </span>
                        </p>
                        <p>
                          <span>運費：</span>
                          <span className="font-medium text-neutral-950">
                            {formatPrice(order.shippingFee)}
                          </span>
                        </p>
                        <p className="text-base font-bold text-pumpkin-600 pt-1 border-t border-dashed border-neutral-200 inline-block">
                          <span>應付總額：</span>
                          <span>{formatPrice(order.totalAmount)}</span>
                        </p>
                        {order.isPaid && order.paymentType && (
                          <p className="text-xs text-neutral-400">
                            付款方式：{order.paymentType}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
