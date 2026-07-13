"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
  type CategoryFormDto,
} from "@/lib/admin-api";
import type { Category } from "@/lib/types";

type FormState = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  sortOrder: "0",
};

function toFormState(category: Category): FormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    imageUrl: category.imageUrl ?? "",
    sortOrder: String(category.sortOrder),
  };
}

export default function AdminCategoriesPage() {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // null = 關閉；"new" = 新增；Category = 編輯
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getAdminCategories(token);
      // 依排序權重小到大排序，若權重相同依名稱排序
      const sorted = [...data].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        return a.name.localeCompare(b.name, "zh-Hant");
      });
      setCategories(sorted);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "載入分類失敗", "error");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };

  const openEdit = (category: Category) => {
    setForm(toFormState(category));
    setEditing(category);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editing) return;

    if (!form.name.trim() || !form.slug.trim()) {
      showToast("請填寫分類名稱與 Slug", "error");
      return;
    }

    const sortOrder = Number(form.sortOrder);
    const dto: CategoryFormDto = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    };

    setSaving(true);
    try {
      if (editing === "new") {
        await createCategory(token, dto);
        showToast("分類已建立", "success");
      } else {
        await updateCategory(token, editing.id, dto);
        showToast("分類已更新", "success");
      }
      setEditing(null);
      await fetchCategories();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "儲存失敗", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    try {
      await deleteCategory(token, deleting.id);
      showToast(`已刪除「${deleting.name}」`, "success");
      setDeleting(null);
      await fetchCategories();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "刪除失敗", "error");
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* 頁首 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">分類管理</h1>
          <p className="mt-1 text-sm text-neutral-500">共 {categories.length} 個商品分類</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-pumpkin-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pumpkin-700 transition-colors"
        >
          ＋ 新增分類
        </button>
      </div>

      {/* 清單表格 */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-sm shadow-neutral-900/5">
        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-neutral-500">
            載入中…
          </div>
        ) : categories.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-neutral-500">
            目前尚無分類，點擊右上角新增分類！
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <th className="px-6 py-4">排序</th>
                  <th className="px-6 py-4">分類名稱</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">描述</th>
                  <th className="px-6 py-4">商品數量</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-neutral-500">{c.sortOrder}</td>
                    <td className="px-6 py-4 font-bold text-neutral-900">{c.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-neutral-600">{c.slug}</td>
                    <td className="px-6 py-4 text-xs text-neutral-500 max-w-[200px] truncate">
                      {c.description || <span className="text-neutral-300 italic">無描述</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-pumpkin-50 px-2 py-1 text-xs font-medium text-pumpkin-700 ring-1 ring-inset ring-pumpkin-700/10">
                        {c.productCount} 件商品
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-xs font-bold text-pumpkin-600 hover:text-pumpkin-700 transition-colors"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新增 / 編輯 Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-neutral-900">
              {editing === "new" ? "新增商品分類" : "編輯商品分類"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">
                  分類名稱 *
                </span>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如: 圓領T恤"
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">
                  Slug (URL 標籤) *
                </span>
                <input
                  type="text"
                  required
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="例如: t-shirts"
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono focus:border-pumpkin-400 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">
                  排序權重 (越小越靠前)
                </span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">
                  分類圖片 URL (選填)
                </span>
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">
                  描述 (選填)
                </span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="輸入此分類的簡介"
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                />
              </label>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-pumpkin-600 px-5 py-2 text-sm font-semibold text-white hover:bg-pumpkin-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? "儲存中…" : "儲存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 刪除確認 Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-neutral-900">確認刪除</h2>
            {deleting.productCount > 0 ? (
              <div className="mt-2 text-sm text-neutral-600 space-y-2">
                <p className="text-red-600 font-semibold">⚠️ 無法刪除此分類</p>
                <p>
                  分類「{deleting.name}」目前仍關聯著 <span className="font-bold text-neutral-900">{deleting.productCount}</span> 件商品。
                </p>
                <p className="text-xs text-neutral-500">
                  依據安全規則，您必須先前往「商品管理」將這些商品刪除或移至其他分類，才能刪除此分類。
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-neutral-600">
                確定要刪除分類「{deleting.name}」嗎？此操作無法復原。
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                {deleting.productCount > 0 ? "關閉" : "取消"}
              </button>
              {deleting.productCount === 0 && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  確認刪除
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
