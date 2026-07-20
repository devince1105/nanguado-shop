"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import {
  deleteAdminUser,
  getAdminUserOrders,
  getAdminUsers,
  updateUserRole,
} from "@/lib/admin-api";
import { formatPrice } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import type { AdminUser, Order } from "@/lib/types";

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "待付款",
  paid: "已付款",
  shipped: "已出貨",
  completed: "已完成",
  cancelled: "已取消",
};

export default function AdminUsersPage() {
  const token = useAuthStore((s) => s.token);
  const me = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");

  // 展開的會員 → 其訂單快取
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [orderCache, setOrderCache] = useState<Record<string, Order[]>>({});
  const [ordersLoading, setOrdersLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getAdminUsers(token, {
        search: keyword || undefined,
        limit: 100,
      });
      setItems(data.items);
      setTotal(data.pagination.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "載入失敗", "error");
    } finally {
      setLoading(false);
    }
  }, [token, keyword, showToast]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function toggleExpand(user: AdminUser) {
    if (expandedId === user.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(user.id);
    if (!token || orderCache[user.id]) return;
    setOrdersLoading(true);
    try {
      const orders = await getAdminUserOrders(token, user.id);
      setOrderCache((prev) => ({ ...prev, [user.id]: orders }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "載入訂單失敗", "error");
    } finally {
      setOrdersLoading(false);
    }
  }

  async function handleRoleToggle(user: AdminUser) {
    if (!token) return;
    const nextRole = user.role === "admin" ? "customer" : "admin";
    const label =
      nextRole === "admin"
        ? `確定將「${user.name ?? user.email}」升級為管理員嗎？`
        : `確定將「${user.name ?? user.email}」降為一般會員嗎？`;
    if (!window.confirm(label)) return;
    try {
      await updateUserRole(token, user.id, nextRole);
      setItems((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)),
      );
      showToast(nextRole === "admin" ? "已升級為管理員" : "已降為一般會員");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "操作失敗", "error");
    }
  }

  async function handleDeleteUser(user: AdminUser) {
    if (!token) return;
    const nameStr = user.name ?? user.email;
    if (
      !window.confirm(
        `確定要刪除會員「${nameStr}」嗎？\n刪除後帳號無法復原，該會員的購物車與評價將一併刪除。`,
      )
    )
      return;
    try {
      await deleteAdminUser(token, user.id);
      showToast(`已刪除會員「${nameStr}」`, "success");
      await reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "刪除失敗", "error");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      {/* 頁首 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">會員管理</h1>
          <p className="mt-0.5 text-sm text-neutral-500">共 {total} 位會員</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setKeyword(search.trim());
          }}
          className="flex items-center gap-2"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋 Email 或姓名…"
            className="w-56 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-pumpkin-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 hover:border-pumpkin-500 hover:text-pumpkin-600"
          >
            搜尋
          </button>
        </form>
      </div>

      {/* 會員表格 */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-neutral-100 bg-neutral-50 text-xs text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">會員</th>
              <th className="px-4 py-3 font-medium">電話</th>
              <th className="px-4 py-3 font-medium">註冊日期</th>
              <th className="px-4 py-3 text-right font-medium">訂單數</th>
              <th className="px-4 py-3 text-right font-medium">消費總額</th>
              <th className="px-4 py-3 font-medium">角色</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-neutral-400">
                  載入中…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-neutral-400">
                  沒有符合的會員
                </td>
              </tr>
            ) : (
              items.map((user) => (
                <Fragment key={user.id}>
                  <tr
                    onClick={() => toggleExpand(user)}
                    className="cursor-pointer hover:bg-neutral-50/60"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pumpkin-100 text-sm font-bold text-pumpkin-700">
                          {(user.name ?? user.email).slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-900">
                            {user.name ?? "—"}
                            {me?.id === user.id && (
                              <span className="ml-1.5 text-xs text-neutral-400">
                                （你）
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-neutral-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {user.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {new Date(user.createdAt).toLocaleDateString("zh-TW")}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-600">
                      {user.orderCount}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-900">
                      {formatPrice(user.totalSpent)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          user.role === "admin"
                            ? "bg-pumpkin-100 text-pumpkin-700"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {user.role === "admin" ? "管理員" : "會員"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {me?.id !== user.id && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRoleToggle(user);
                            }}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                          >
                            {user.role === "admin" ? "降為會員" : "升為管理員"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(user);
                            }}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            刪除
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* 展開：會員資料 + 歷史訂單 */}
                  {expandedId === user.id && (
                    <tr>
                      <td colSpan={7} className="bg-neutral-50/60 px-6 py-4">
                        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                          <div className="text-sm text-neutral-600">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                              會員資料
                            </h4>
                            <p className="mt-2">Email：{user.email}</p>
                            <p className="mt-1">電話：{user.phone ?? "—"}</p>
                            <p className="mt-1">地址：{user.address ?? "—"}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                              歷史訂單
                            </h4>
                            {ordersLoading && !orderCache[user.id] ? (
                              <p className="mt-2 text-sm text-neutral-400">
                                載入中…
                              </p>
                            ) : (orderCache[user.id]?.length ?? 0) === 0 ? (
                              <p className="mt-2 text-sm text-neutral-400">
                                尚無訂單
                              </p>
                            ) : (
                              <ul className="mt-2 space-y-1.5">
                                {orderCache[user.id].map((order) => (
                                  <li
                                    key={order.id}
                                    className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-white px-3 py-2 text-sm"
                                  >
                                    <span className="font-mono text-xs text-neutral-500">
                                      {order.merchantTradeNo}
                                    </span>
                                    <span className="text-neutral-400">
                                      {new Date(order.createdAt).toLocaleDateString("zh-TW")}
                                    </span>
                                    <span className="text-neutral-600">
                                      {order.items.length} 項商品
                                    </span>
                                    <span className="font-medium text-neutral-900">
                                      {formatPrice(order.totalAmount)}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                        order.isPaid
                                          ? "bg-green-50 text-green-700"
                                          : "bg-red-50 text-red-600"
                                      }`}
                                    >
                                      {order.isPaid ? "已付款" : "未付款"}
                                    </span>
                                    <span className="text-xs text-neutral-500">
                                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
