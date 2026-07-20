"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
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
import {
  CATEGORY_ICON_OPTIONS,
  PRESET_BG_COLORS,
  getCategoryIcon,
  resolveLucideIcon,
} from "@/lib/icons";

type FormState = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  icon: string;
  bgColor: string;
  isActive: boolean;
  sortOrder: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  imageUrl: "",
  icon: "",
  bgColor: "",
  isActive: true,
  sortOrder: "0",
};

function toFormState(category: Category): FormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    imageUrl: category.imageUrl ?? "",
    icon: category.icon ?? "",
    bgColor: category.bgColor ?? "",
    isActive: category.isActive ?? true,
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
      icon: form.icon.trim() || null,
      bgColor: form.bgColor.trim() || null,
      isActive: form.isActive,
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

  const handleToggleActive = async (category: Category) => {
    if (!token) return;
    const newStatus = !category.isActive;
    try {
      await updateCategory(token, category.id, { isActive: newStatus });
      showToast(
        `已將「${category.name}」切換為${newStatus ? "【顯示】" : "【隱藏】"}`,
        "success",
      );
      await fetchCategories();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "更新失敗", "error");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (!token) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const curr = categories[index];
    const target = categories[targetIndex];

    let newCurrSort = target.sortOrder;
    let newTargetSort = curr.sortOrder;

    if (newCurrSort === newTargetSort) {
      newCurrSort = direction === "up" ? target.sortOrder - 1 : target.sortOrder + 1;
    }

    try {
      await Promise.all([
        updateCategory(token, curr.id, { sortOrder: newCurrSort }),
        updateCategory(token, target.id, { sortOrder: newTargetSort }),
      ]);
      showToast(`已將「${curr.name}」往${direction === "up" ? "上" : "下"}調整`, "success");
      await fetchCategories();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "排序更新失敗", "error");
    }
  };

  const PreviewIcon = getCategoryIcon(form.icon, form.name || "預覽分類");

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
                  <th className="px-6 py-4">圖示 / 分類名稱</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">前台顯示狀態</th>
                  <th className="px-6 py-4">背景顏色</th>
                  <th className="px-6 py-4">描述</th>
                  <th className="px-6 py-4">商品數量</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {categories.map((c, index) => {
                  const IconComp = getCategoryIcon(c.icon, c.name);
                  const isClass = c.bgColor?.startsWith("bg-");
                  return (
                    <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-neutral-500 w-5 text-center">
                            {c.sortOrder}
                          </span>
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMove(index, "up")}
                              title="往上移"
                              className="rounded border border-neutral-200 p-0.5 text-neutral-500 hover:bg-pumpkin-50 hover:text-pumpkin-600 hover:border-pumpkin-300 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-neutral-500 disabled:hover:border-neutral-200 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            >
                              <ChevronUp className="h-3 w-3" strokeWidth={2.5} />
                            </button>
                            <button
                              type="button"
                              disabled={index === categories.length - 1}
                              onClick={() => handleMove(index, "down")}
                              title="往下移"
                              className="rounded border border-neutral-200 p-0.5 text-neutral-500 hover:bg-pumpkin-50 hover:text-pumpkin-600 hover:border-pumpkin-300 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-neutral-500 disabled:hover:border-neutral-200 transition-colors cursor-pointer disabled:cursor-not-allowed"
                            >
                              <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-700 ${
                              isClass ? c.bgColor : ""
                            }`}
                            style={{
                              backgroundColor:
                                !c.bgColor || isClass ? undefined : c.bgColor,
                              ...(!c.bgColor && { backgroundColor: "#f5f5f5" }),
                            }}
                          >
                            <IconComp className="h-5 w-5" strokeWidth={1.75} />
                          </span>
                          <div>
                            <div className="font-bold text-neutral-900">{c.name}</div>
                            {c.icon && (
                              <div className="font-mono text-[10px] text-neutral-400">
                                icon: {c.icon}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-neutral-600">{c.slug}</td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(c)}
                          className="flex items-center gap-2 group cursor-pointer focus:outline-none"
                          title={`點擊切換為${c.isActive ? "隱藏" : "顯示"}`}
                        >
                          {c.isActive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 group-hover:bg-emerald-100 transition-colors">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              顯示中
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500 ring-1 ring-inset ring-neutral-500/10 group-hover:bg-neutral-200 transition-colors">
                              <span className="h-2 w-2 rounded-full bg-neutral-400" />
                              已隱藏
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono">
                        {c.bgColor ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded-full border border-neutral-200"
                              style={{
                                backgroundColor: isClass
                                  ? PRESET_BG_COLORS.find((p) => p.id === c.bgColor)?.hex || "#f5f5f5"
                                  : c.bgColor,
                              }}
                            />
                            <span className="text-neutral-600">{c.bgColor}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">預設淺灰</span>
                        )}
                      </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新增 / 編輯 Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-neutral-100 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-neutral-900">
              {editing === "new" ? "新增商品分類" : "編輯商品分類"}
            </h2>

            {/* 前台展現實時預覽 */}
            <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500">前台顯示即時預覽</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    form.isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {form.isActive ? "前台可見" : "已隱藏 (不顯示於前台)"}
                </span>
              </div>
              <div className="mt-2 flex flex-col items-center justify-center">
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full text-neutral-700 shadow-sm transition-colors ${
                    !form.isActive ? "opacity-40 grayscale" : ""
                  }`}
                  style={{
                    backgroundColor:
                      !form.bgColor || form.bgColor.startsWith("bg-")
                        ? PRESET_BG_COLORS.find((p) => p.id === form.bgColor)?.hex || "#f5f5f5"
                        : form.bgColor,
                  }}
                >
                  <PreviewIcon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <span className={`mt-2 text-xs font-medium ${form.isActive ? "text-neutral-800" : "text-neutral-400 line-through"}`}>
                  {form.name || "分類名稱"}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* 顯示/隱藏 開關 */}
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-3">
                <div>
                  <div className="text-xs font-bold text-neutral-800">在前台顯示此分類</div>
                  <div className="text-[11px] text-neutral-500">
                    若取消勾選，此分類將不會出現在前台分類牆、選單與分類篩選列
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pumpkin-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              {/* Icon 選擇器 */}
              <div>
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-600">
                    分類 Icon 圖示
                  </span>
                  <span className="ml-2 text-[11px] text-neutral-400">
                    (點擊選擇 Lucide 圖示，留空自動名稱比對)
                  </span>
                </label>
                <div className="mt-2 grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-36 overflow-y-auto rounded-xl border border-neutral-200 p-2 bg-neutral-50/30">
                  {CATEGORY_ICON_OPTIONS.map((item) => {
                    const Icon = item.Icon;
                    const isSelected = form.icon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setForm({ ...form, icon: item.id })}
                        title={`${item.label} (${item.id})`}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all ${
                          isSelected
                            ? "border-pumpkin-500 bg-pumpkin-50 text-pumpkin-700 font-bold shadow-sm"
                            : "border-transparent bg-white hover:bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </button>
                    );
                  })}
                </div>
                <div className="mt-1.5 space-y-1">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      placeholder="輸入 Lucide Icon 名稱 (例如: hat-glasses, shirt, watch...)"
                      className="w-full rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-mono focus:border-pumpkin-400 focus:outline-none"
                    />
                    {form.icon && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, icon: "" })}
                        className="shrink-0 text-xs text-neutral-500 hover:text-neutral-800 px-2 py-1.5 border rounded-lg hover:bg-neutral-50"
                      >
                        清空 (自動)
                      </button>
                    )}
                  </div>
                  {form.icon.trim() && (
                    <div className="text-[11px]">
                      {resolveLucideIcon(form.icon) ? (
                        <span className="text-emerald-600 font-medium">
                          ✓ 已匹配到 Lucide Icon（輸入後請記得點擊右下角『儲存』按鈕保存變更）
                        </span>
                      ) : (
                        <span className="text-amber-600">
                          ⚠️ 未能在 Lucide 找到「{form.icon}」，將使用名稱自動比對
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 背景顏色選擇器 */}
              <div>
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-600">
                    Icon 底色 (Tailwind 色卡 / 色碼)
                  </span>
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PRESET_BG_COLORS.map((color) => {
                    const isSelected = form.bgColor === color.id || form.bgColor === color.hex;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setForm({ ...form, bgColor: color.id })}
                        title={color.name}
                        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs border transition-all ${
                          isSelected
                            ? "border-pumpkin-600 ring-2 ring-pumpkin-500/20 font-bold"
                            : "border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-black/10"
                          style={{ backgroundColor: color.hex }}
                        />
                        <span>{color.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-2 items-center">
                  <input
                    type="text"
                    value={form.bgColor}
                    onChange={(e) => setForm({ ...form, bgColor: e.target.value })}
                    placeholder="或輸入 HEX 色碼 (#ffedd5) 或 Tailwind 類別 (bg-rose-100)"
                    className="w-full rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-mono focus:border-pumpkin-400 focus:outline-none"
                  />
                  {form.bgColor && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, bgColor: "" })}
                      className="shrink-0 text-xs text-neutral-500 hover:text-neutral-800 px-2 py-1 border rounded-lg"
                    >
                      重置預設
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">
                  描述 (選填)
                </span>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="輸入此分類的簡介"
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                />
              </label>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-neutral-100">
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
