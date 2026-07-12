"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import { formatPrice } from "@/lib/api";
import { getAdminOrders, updateOrderStatus } from "@/lib/admin-api";
import type { Order } from "@/lib/types";

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  pending: { text: "待付款", className: "bg-amber-50 text-amber-700 border-amber-100" },
  paid: { text: "已付款", className: "bg-green-50 text-green-700 border-green-100" },
  shipped: { text: "已出貨", className: "bg-blue-50 text-blue-700 border-blue-100" },
  completed: { text: "已完成", className: "bg-neutral-50 text-neutral-700 border-neutral-100" },
  cancelled: { text: "已取消", className: "bg-red-50 text-red-700 border-red-100" },
};

const STATUS_TABS = [
  { value: "", label: "全部" },
  { value: "pending", label: "待付款" },
  { value: "paid", label: "已付款" },
  { value: "shipped", label: "已出貨" },
  { value: "completed", label: "已完成" },
  { value: "cancelled", label: "已取消" },
];

export default function AdminOrdersPage() {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getAdminOrders(token, {
        status: status || undefined,
        page,
        limit: 10,
      });
      setOrders(data.items);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "載入訂單失敗", "error");
    } finally {
      setLoading(false);
    }
  }, [token, status, page, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateStatus = async (order: Order, newStatus: string) => {
    if (!token || newStatus === order.status) return;
    setUpdatingId(order.id);
    try {
      await updateOrderStatus(token, order.id, newStatus);
      showToast(
        `訂單 ${order.merchantTradeNo} 已更新為「${STATUS_LABELS[newStatus]?.text ?? newStatus}」`,
        "success",
      );
      await fetchOrders();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "更新失敗", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">訂單管理</h1>
        <p className="mt-1 text-sm text-neutral-500">共 {total} 筆訂單</p>
      </div>

      {/* 狀態篩選 */}
      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              status === tab.value
                ? "bg-pumpkin-600 text-white"
                : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 訂單表格 */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/60 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">
              <th className="px-4 py-3">訂單編號</th>
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3">收件人</th>
              <th className="px-4 py-3 text-right">金額</th>
              <th className="px-4 py-3 text-center">付款</th>
              <th className="px-4 py-3 text-center">狀態</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                  載入中…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                  沒有符合條件的訂單
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const statusInfo = STATUS_LABELS[order.status] ?? {
                  text: order.status,
                  className: "bg-neutral-50 text-neutral-700 border-neutral-100",
                };
                const isExpanded = expandedId === order.id;
                const isUpdating = updatingId === order.id;

                return (
                  <React.Fragment key={order.id}>
                    <tr
                      className="cursor-pointer hover:bg-neutral-50/50"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : order.id)
                      }
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-neutral-900">
                        {order.merchantTradeNo}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {new Date(order.createdAt).toLocaleDateString("zh-TW")}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {order.recipientName}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-900">
                        {formatPrice(order.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                            order.isPaid
                              ? "bg-green-50 text-green-700 border-green-100"
                              : "bg-red-50 text-red-700 border-red-100"
                          }`}
                        >
                          {order.isPaid ? "已付款" : "未付款"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.className}`}
                        >
                          {statusInfo.text}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-2">
                          {order.status === "paid" && (
                            <button
                              disabled={isUpdating}
                              onClick={() =>
                                handleUpdateStatus(order, "shipped")
                              }
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                            >
                              {isUpdating ? "更新中…" : "標記出貨"}
                            </button>
                          )}
                          <select
                            value={order.status}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleUpdateStatus(order, e.target.value)
                            }
                            className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-700 focus:border-pumpkin-400 focus:outline-none disabled:opacity-60"
                          >
                            {STATUS_TABS.filter((t) => t.value).map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-neutral-50/40">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid gap-6 sm:grid-cols-2">
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                                訂購商品
                              </h4>
                              <ul className="mt-2 space-y-1.5">
                                {order.items.map((item) => (
                                  <li
                                    key={item.id}
                                    className="flex justify-between gap-4 text-sm"
                                  >
                                    <span className="text-neutral-700 truncate">
                                      {item.productName}
                                      {item.selectedVariant &&
                                        ` (${Object.entries(item.selectedVariant)
                                          .map(([k, v]) => `${k}:${v}`)
                                          .join(", ")})`}{" "}
                                      × {item.quantity}
                                    </span>
                                    <span className="shrink-0 font-medium text-neutral-900">
                                      {formatPrice(
                                        item.unitPrice * item.quantity,
                                      )}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-3 border-t border-neutral-200 pt-2 text-sm text-neutral-600 space-y-1">
                                <p>商品小計：{formatPrice(order.subtotal)}</p>
                                <p>運費：{formatPrice(order.shippingFee)}</p>
                                <p className="font-bold text-pumpkin-600">
                                  總額：{formatPrice(order.totalAmount)}
                                </p>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                                收件資訊
                              </h4>
                              <div className="mt-2 space-y-1 text-sm text-neutral-700">
                                <p>姓名：{order.recipientName}</p>
                                <p>電話：{order.recipientPhone}</p>
                                <p>Email：{order.recipientEmail}</p>
                                <p>地址：{order.recipientAddress}</p>
                                {order.paymentType && (
                                  <p className="text-neutral-400">
                                    付款方式：{order.paymentType}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 disabled:opacity-40 hover:bg-neutral-100 transition-colors"
          >
            上一頁
          </button>
          <span className="text-neutral-500">
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 disabled:opacity-40 hover:bg-neutral-100 transition-colors"
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
}
