"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import {
  createBanner,
  deleteBanner,
  getAdminBanners,
  updateBanner,
  uploadMedia,
} from "@/lib/admin-api";
import type { Banner } from "@/lib/types";

type FormState = {
  imageUrl: string;
  title: string;
  subtitle: string;
  linkUrl: string;
  linkLabel: string;
  sortOrder: string;
  isActive: boolean;
};

const EMPTY: FormState = {
  imageUrl: "",
  title: "",
  subtitle: "",
  linkUrl: "",
  linkLabel: "",
  sortOrder: "0",
  isActive: true,
};

export default function AdminBannersPage() {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Banner | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchBanners = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setBanners(await getAdminBanners(token));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "載入失敗", "error");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  function openNew() {
    setForm({ ...EMPTY, sortOrder: String(banners.length) });
    setEditing("new");
  }

  function openEdit(b: Banner) {
    setForm({
      imageUrl: b.imageUrl,
      title: b.title,
      subtitle: b.subtitle ?? "",
      linkUrl: b.linkUrl ?? "",
      linkLabel: b.linkLabel ?? "",
      sortOrder: String(b.sortOrder),
      isActive: b.isActive,
    });
    setEditing(b);
  }

  async function handleUpload(file: File | undefined) {
    if (!token || !file) return;
    setUploading(true);
    try {
      const media = await uploadMedia(token, file, "橫幅");
      setForm((f) => ({ ...f, imageUrl: media.url }));
      showToast("已上傳背景圖");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "上傳失敗", "error");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!token) return;
    if (!form.imageUrl) {
      showToast("請先上傳或填入背景圖", "error");
      return;
    }
    setSaving(true);
    const dto = {
      imageUrl: form.imageUrl,
      title: form.title,
      subtitle: form.subtitle || null,
      linkUrl: form.linkUrl || null,
      linkLabel: form.linkLabel || null,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };
    try {
      if (editing === "new") await createBanner(token, dto);
      else if (editing) await updateBanner(token, editing.id, dto);
      showToast("已儲存");
      setEditing(null);
      await fetchBanners();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "儲存失敗", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(b: Banner) {
    if (!token) return;
    if (!confirm(`確定刪除此橫幅？`)) return;
    try {
      await deleteBanner(token, b.id);
      showToast("已刪除");
      await fetchBanners();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "刪除失敗", "error");
    }
  }

  async function toggleActive(b: Banner) {
    if (!token) return;
    try {
      await updateBanner(token, b.id, { isActive: !b.isActive });
      await fetchBanners();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "更新失敗", "error");
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">首頁輪播</h1>
          <p className="mt-1 text-sm text-neutral-500">
            管理首頁 Carousel 橫幅、背景圖與活動連結（依排序輪播）
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-full bg-pumpkin-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pumpkin-700"
        >
          ＋ 新增橫幅
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <p className="text-sm text-neutral-400">載入中…</p>
        ) : banners.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center text-sm text-neutral-400">
            還沒有橫幅。新增後，首頁就會顯示輪播（否則顯示預設 Hero）。
          </p>
        ) : (
          banners.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-3"
            >
              <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.imageUrl} alt={b.title} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-neutral-900">
                  {b.title || "（無標題）"}
                </p>
                <p className="truncate text-xs text-neutral-500">{b.subtitle}</p>
                <p className="mt-1 text-xs text-neutral-400">排序 {b.sortOrder}</p>
              </div>
              <button
                onClick={() => toggleActive(b)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  b.isActive
                    ? "bg-green-50 text-green-700"
                    : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {b.isActive ? "顯示中" : "已隱藏"}
              </button>
              <button
                onClick={() => openEdit(b)}
                className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                編輯
              </button>
              <button
                onClick={() => remove(b)}
                className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                刪除
              </button>
            </div>
          ))
        )}
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-neutral-900">
              {editing === "new" ? "新增橫幅" : "編輯橫幅"}
            </h2>

            {/* 背景圖 */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-600">背景圖</span>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="text-xs font-bold text-pumpkin-600 hover:text-pumpkin-700 disabled:text-neutral-400"
                >
                  {uploading ? "上傳中…" : "＋ 上傳圖片"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleUpload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="mt-1 aspect-[21/9] overflow-hidden rounded-xl bg-neutral-100">
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="預覽" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-400">
                    尚未選擇背景圖
                  </div>
                )}
              </div>
              <input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="或貼上圖片網址"
                className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-xs font-mono focus:border-pumpkin-400 focus:outline-none"
              />
            </div>

            <label className="mt-3 block">
              <span className="text-xs font-semibold text-neutral-600">主標題</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-xs font-semibold text-neutral-600">描述（副標）</span>
              <textarea
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">按鈕文字</span>
                <input
                  value={form.linkLabel}
                  onChange={(e) => setForm({ ...form, linkLabel: e.target.value })}
                  placeholder="例：立即選購"
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">按鈕連結</span>
                <input
                  value={form.linkUrl}
                  onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                  placeholder="例：/products"
                  className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <label className="block">
                <span className="text-xs font-semibold text-neutral-600">排序</span>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  className="mt-1 w-20 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
                />
              </label>
              <label className="mt-5 flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                顯示於首頁
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-100"
              >
                取消
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-pumpkin-600 px-5 py-2 text-sm font-bold text-white hover:bg-pumpkin-700 disabled:bg-neutral-300"
              >
                {saving ? "儲存中…" : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
