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
  uploadMedia,
  getMediaList,
  type ProductFormDto,
} from "@/lib/admin-api";
import type { Category, Media, Product, ProductVariant } from "@/lib/types";

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
  variants: {
    name: string;
    optionsText: string;
  }[];
  variantStock: Record<string, string>;
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
  variants: [],
  variantStock: {},
};

function toFormState(product: Product): FormState {
  const vsMap: Record<string, string> = {};
  if (product.variantStock) {
    for (const [k, v] of Object.entries(product.variantStock)) {
      vsMap[k] = String(v);
    }
  }
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
    variants: (product.variants || []).map((v) => ({
      name: v.name,
      optionsText: v.options.join(", "),
    })),
    variantStock: vsMap,
  };
}

function getCombinations(variants: { name: string; options: string[] }[]): string[] {
  if (variants.length === 0) return [];
  const combine = (list: string[][]): string[][] => {
    if (list.length === 0) return [[]];
    const head = list[0];
    const tail = list.slice(1);
    const combinedTail = combine(tail);
    const result: string[][] = [];
    for (const h of head) {
      for (const t of combinedTail) {
        result.push([h, ...t]);
      }
    }
    return result;
  };
  const optionsList = variants.map((v) => v.options);
  const combos = combine(optionsList);
  return combos.map((combo) => combo.join(" / "));
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
  const [useVariantStock, setUseVariantStock] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // 把網址（多個）追加到圖片清單（去重）
  function appendImageUrls(urls: string[]) {
    setForm((prev) => {
      const existing = prev.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const merged = Array.from(new Set([...existing, ...urls]));
      return { ...prev, images: merged.join("\n") };
    });
  }

  // 拖拉/選擇檔案 → 上傳到 R2（同時建立 Media 記錄）→ 追加公開 URL
  async function handleImageUpload(files: FileList | File[] | null) {
    if (!token || !files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of list) {
        const uploaded = await uploadMedia(token, file);
        urls.push(uploaded.url);
      }
      appendImageUrls(urls);
      showToast(`已上傳 ${urls.length} 張圖片`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "圖片上傳失敗", "error");
    } finally {
      setUploading(false);
    }
  }

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
    setUseVariantStock(false);
    setEditing("new");
  };

  const openEdit = (product: Product) => {
    setForm(toFormState(product));
    setUseVariantStock(Object.keys(product.variantStock || {}).length > 0);
    setEditing(product);
  };

  const addVariantGroup = () => {
    setForm({
      ...form,
      variants: [...form.variants, { name: "", optionsText: "" }],
    });
  };

  const removeVariantGroup = (index: number) => {
    const next = [...form.variants];
    next.splice(index, 1);
    setForm({ ...form, variants: next });
  };

  const handleVariantNameChange = (index: number, name: string) => {
    const next = [...form.variants];
    next[index] = { ...next[index], name };
    setForm({ ...form, variants: next });
  };

  const handleVariantOptionsChange = (index: number, optionsText: string) => {
    const next = [...form.variants];
    next[index] = { ...next[index], optionsText };
    setForm({ ...form, variants: next });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editing) return;

    const price = Number(form.price);
    if (!form.name.trim() || !form.slug.trim()) {
      showToast("請填寫商品名稱與 Slug", "error");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      showToast("請輸入有效的售價", "error");
      return;
    }

    // 解析規格
    const parsedVariants = form.variants
      .map((v) => ({
        name: v.name.trim(),
        options: v.optionsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      }))
      .filter((v) => v.name && v.options.length > 0);

    // 計算各規格庫存與總庫存
    let finalStock = Number(form.stock);
    const finalVariantStock: Record<string, number> = {};

    if (parsedVariants.length > 0 && useVariantStock) {
      const combinations = getCombinations(parsedVariants);
      let calculatedTotalStock = 0;
      for (const combo of combinations) {
        const variantStockVal = Number(form.variantStock[combo] || 0);
        const variantStockNum = Number.isFinite(variantStockVal) ? Math.max(0, variantStockVal) : 0;
        finalVariantStock[combo] = variantStockNum;
        calculatedTotalStock += variantStockNum;
      }
      finalStock = calculatedTotalStock;
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
      variants: parsedVariants,
      variantStock: (parsedVariants.length > 0 && useVariantStock) ? finalVariantStock : {},
      stock: Number.isFinite(finalStock) ? Math.max(0, finalStock) : 0,
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
                {form.variants.filter(v => v.name.trim() && v.optionsText.trim()).length > 0 ? (
                  <div className="col-span-1 sm:col-span-3 space-y-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100/50">
                      <input
                        type="checkbox"
                        checked={useVariantStock}
                        onChange={(e) => setUseVariantStock(e.target.checked)}
                        className="h-4 w-4 rounded border-neutral-300 accent-pumpkin-600"
                      />
                      啟用規格個別庫存控制（若關閉，所有規格將共享同一總庫存）
                    </label>

                    {useVariantStock ? (
                      <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 space-y-2">
                        {(() => {
                          const combinations = getCombinations(
                            form.variants
                              .map((v) => ({
                                name: v.name.trim(),
                                options: v.optionsText
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              }))
                              .filter((v) => v.name && v.options.length > 0)
                          );
                          const totalCalculatedStock = combinations.reduce((acc, combo) => {
                            const val = Number(form.variantStock[combo] || 0);
                            return acc + (Number.isFinite(val) ? Math.max(0, val) : 0);
                          }, 0);
                          return (
                            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                              各規格組合庫存設定（系統將自動累加為總庫存：<span className="text-pumpkin-600 font-extrabold text-xs">{totalCalculatedStock}</span> 件）
                            </span>
                          );
                        })()}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {getCombinations(
                            form.variants
                              .map((v) => ({
                                name: v.name.trim(),
                                options: v.optionsText
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              }))
                              .filter((v) => v.name && v.options.length > 0)
                          ).map((combo) => (
                            <label key={combo} className="flex items-center justify-between gap-2 bg-white border border-neutral-100 rounded-lg p-2 text-xs">
                              <span className="font-semibold text-neutral-600 truncate max-w-[120px]">{combo}</span>
                              <input
                                type="number"
                                min={0}
                                required
                                placeholder="0"
                                value={form.variantStock[combo] || "0"}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    variantStock: {
                                      ...form.variantStock,
                                      [combo]: e.target.value,
                                    },
                                  })
                                }
                                className="w-20 rounded-md border border-neutral-200 px-2 py-1 text-right focus:border-pumpkin-400 focus:outline-none font-mono"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <label className="block">
                        <span className="text-xs font-semibold text-neutral-600">
                          總庫存數量 *
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
                    )}
                  </div>
                ) : (
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
                )}
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

              <div className="block">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-600">
                    商品圖片
                  </span>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="text-neutral-500 transition-colors hover:text-neutral-800"
                    >
                      從媒體庫挑
                    </button>
                    <label
                      className={`cursor-pointer transition-colors ${
                        uploading
                          ? "text-neutral-400"
                          : "text-pumpkin-600 hover:text-pumpkin-700"
                      }`}
                    >
                      {uploading ? "上傳中…" : "＋ 上傳圖片"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploading}
                        onChange={(e) => {
                          handleImageUpload(e.target.files);
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* 拖拉上傳區 */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    handleImageUpload(e.dataTransfer.files);
                  }}
                  className={`mt-1 rounded-xl border-2 border-dashed px-4 py-4 text-center text-xs transition-colors ${
                    dragOver
                      ? "border-pumpkin-500 bg-pumpkin-50 text-pumpkin-700"
                      : "border-neutral-200 text-neutral-400"
                  }`}
                >
                  將圖片拖曳到這裡自動上傳到媒體庫，或用上方按鈕
                </div>

                {form.images.trim() && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.images
                      .split("\n")
                      .map((u) => u.trim())
                      .filter(Boolean)
                      .map((url, i) => (
                        <div
                          key={`${url}-${i}`}
                          className="group relative h-16 w-16 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`預覽 ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                images: prev.images
                                  .split("\n")
                                  .map((s) => s.trim())
                                  .filter((s) => s && s !== url)
                                  .join("\n"),
                              }))
                            }
                            className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="移除此圖"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-neutral-400">
                    手動編輯圖片網址（每行一個）
                  </summary>
                  <textarea
                    rows={3}
                    value={form.images}
                    onChange={(e) => setForm({ ...form, images: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-mono focus:border-pumpkin-400 focus:outline-none"
                  />
                </details>
              </div>

              <div className="border-t border-neutral-100 pt-4 mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-600">
                    商品規格（例如：顏色、尺寸）
                  </span>
                  <button
                    type="button"
                    onClick={addVariantGroup}
                    className="text-xs font-bold text-pumpkin-600 hover:text-pumpkin-700 transition-colors"
                  >
                    ＋ 新增規格組
                  </button>
                </div>

                {form.variants.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">目前無規格。如無規格，顧客將直接購買單一商品。</p>
                ) : (
                  <div className="space-y-3">
                    {form.variants.map((v, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                          <div>
                            <input
                              type="text"
                              required
                              placeholder="規格名稱 (如: 尺寸)"
                              value={v.name}
                              onChange={(e) => handleVariantNameChange(idx, e.target.value)}
                              className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs focus:border-pumpkin-400 focus:outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              required
                              placeholder="選項內容 (如: S,M,L，以逗號分隔)"
                              value={v.optionsText}
                              onChange={(e) => handleVariantOptionsChange(idx, e.target.value)}
                              className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs focus:border-pumpkin-400 focus:outline-none"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariantGroup(idx)}
                          className="shrink-0 text-red-500 hover:text-red-700 p-1.5 text-xs font-semibold"
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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

      {pickerOpen && token && (
        <MediaPickerModal
          token={token}
          selected={form.images
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)}
          onClose={() => setPickerOpen(false)}
          onConfirm={(urls) => {
            appendImageUrls(urls);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function MediaPickerModal({
  token,
  selected,
  onClose,
  onConfirm,
}: {
  token: string;
  selected: string[];
  onClose: () => void;
  onConfirm: (urls: string[]) => void;
}) {
  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    getMediaList(token, { limit: 50 })
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  function toggle(url: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-neutral-900">從媒體庫挑選圖片</h2>
        <div className="mt-4 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-10 text-center text-sm text-neutral-400">載入中…</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-400">
              媒體庫還沒有圖片，先到「媒體庫」或用上傳按鈕新增。
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {items.map((m) => {
                const already = selected.includes(m.url);
                const isPicked = picked.has(m.url);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => !already && toggle(m.url)}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                      already
                        ? "border-neutral-200 opacity-40"
                        : isPicked
                          ? "border-pumpkin-500 ring-2 ring-pumpkin-200"
                          : "border-neutral-200 hover:border-neutral-400"
                    }`}
                    title={already ? "已在此商品" : m.filename}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.url}
                      alt={m.alt ?? m.filename}
                      className="h-full w-full object-cover"
                    />
                    {(isPicked || already) && (
                      <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-pumpkin-600 text-xs text-white">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(Array.from(picked))}
            disabled={picked.size === 0}
            className="rounded-full bg-pumpkin-600 px-5 py-2 text-sm font-bold text-white hover:bg-pumpkin-700 disabled:bg-neutral-300"
          >
            加入 {picked.size > 0 ? `(${picked.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
