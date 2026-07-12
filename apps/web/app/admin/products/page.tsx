"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import { formatPrice } from "@/lib/api";
import {
  createProduct,
  deleteProduct,
  getAdminCategories,
  getAdminProducts,
  updateProduct,
  type ProductFormDto,
} from "@/lib/admin-api";
import type { Category, Product } from "@/lib/types";

type FormState = {
  name: string;
  slug: string;
  description: string;
  price: string;
  compareAtPrice: string;
  categoryId: string;
  images: string;
  stock: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  description: "",
  price: "",
  compareAtPrice: "",
  categoryId: "",
  images: "",
  stock: "0",
  isActive: true,
};

function toFormState(product: Product): FormState {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    price: String(product.price),
    compareAtPrice:
      product.compareAtPrice != null ? String(product.compareAtPrice) : "",
    categoryId: product.categoryId ?? "",
    images: product.images.join("\n"),
    stock: String(product.stock),
    isActive: product.isActive,
  };
}

export default function AdminProductsPage() {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // null = 關閉；"new" = 新增；Product = 編輯
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getAdminProducts(token, { search, page, limit: 10 });
      setProducts(data.items);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "載入商品失敗", "error");
    } finally {
      setLoading(false);
    }
  }, [token, search, page, showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!token) return;
    getAdminCategories(token)
      .then(setCategories)
      .catch(() => {});
  }, [token]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };

  const openEdit = (product: Product) => {
    setForm(toFormState(product));
    setEditing(product);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editing) return;

    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim() || !form.slug.trim()) {
      showToast("請填寫商品名稱與 Slug", "error");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      showToast("請輸入有效的售價", "error");
      return;
    }

    const dto: ProductFormDto = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      description: form.description.trim() || null,
      price,
      compareAtPrice: form.compareAtPrice
        ? Number(form.compareAtPrice)
        : null,
      categoryId: form.categoryId || null,
      images: form.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editing === "new") {
        await createProduct(token, dto);
        showToast("商品已建立", "success");
      } else {
        await updateProduct(token, editing.id, dto);
        showToast("商品已更新", "success");
      }
      setEditing(null);
      await fetchProducts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "儲存失敗", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (product: Product) => {
    if (!token) return;
    try {
      await updateProduct(token, product.id, { isActive: !product.isActive });
      showToast(product.isActive ? "商品已下架" : "商品已上架", "success");
      await fetchProducts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "操作失敗", "error");
    }
  };

  const handleDelete = async () => {
    if (!token || !deleting) return;
    try {
      await deleteProduct(token, deleting.id);
      showToast(`已刪除「${deleting.name}」`, "success");
      setDeleting(null);
      await fetchProducts();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "刪除失敗", "error");
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">商品管理</h1>
          <p className="mt-1 text-sm text-neutral-500">共 {total} 件商品</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-pumpkin-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-pumpkin-700 transition-colors"
        >
          ＋ 新增商品
        </button>
      </div>

      {/* 搜尋 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
        className="mt-6 flex gap-2"
      >
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="搜尋商品名稱…"
          className="w-64 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
        >
          搜尋
        </button>
      </form>

      {/* 商品表格 */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-100 bg-neutral-50/60 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400">
              <th className="px-4 py-3">商品</th>
              <th className="px-4 py-3">分類</th>
              <th className="px-4 py-3 text-right">售價</th>
              <th className="px-4 py-3 text-right">庫存</th>
              <th className="px-4 py-3 text-center">狀態</th>
              <th className="px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-400">
                  載入中…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-400">
                  沒有符合條件的商品
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-neutral-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-neutral-100 bg-neutral-100">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm">
                            🎃
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs text-neutral-400 truncate">
                          {product.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {product.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-neutral-900">
                    {formatPrice(product.price)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium ${
                      product.stock === 0 ? "text-red-600" : "text-neutral-900"
                    }`}
                  >
                    {product.stock}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(product)}
                      title="點擊切換上下架"
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                        product.isActive
                          ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-100"
                          : "bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200"
                      }`}
                    >
                      {product.isActive ? "上架中" : "已下架"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => openEdit(product)}
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => setDeleting(product)}
                        className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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

      {/* 新增 / 編輯表單 Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold text-neutral-900">
              {editing === "new" ? "新增商品" : `編輯商品：${editing.name}`}
            </h2>

            <div className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-600">
                    商品名稱 *
                  </span>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-600">
                    Slug *
                  </span>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono focus:border-pumpkin-400 focus:outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-600">
                    售價 (NT$) *
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-600">
                    劃線價
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={form.compareAtPrice}
                    onChange={(e) =>
                      setForm({ ...form, compareAtPrice: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-neutral-600">
                    庫存 *
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">
                  分類
                </span>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                >
                  <option value="">未分類</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">
                  圖片 URL（每行一個）
                </span>
                <textarea
                  rows={3}
                  value={form.images}
                  onChange={(e) => setForm({ ...form, images: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono focus:border-pumpkin-400 focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">
                  商品描述
                </span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-neutral-300 accent-pumpkin-600"
                />
                上架販售
              </label>
            </div>

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
      )}

      {/* 刪除確認 Modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-neutral-900">確認刪除</h2>
            <p className="mt-2 text-sm text-neutral-600">
              確定要刪除「{deleting.name}」嗎？此操作無法復原。
              已有訂單紀錄的商品將無法刪除，請改為下架。
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleting(null)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
