"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import {
  deleteMedia,
  getMediaList,
  updateMedia,
  uploadMedia,
} from "@/lib/admin-api";
import type { Media } from "@/lib/types";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMediaPage() {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);

  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState<Media | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getMediaList(token, { page, limit: 20, search });
      setItems(data.items);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "載入媒體失敗", "error");
    } finally {
      setLoading(false);
    }
  }, [token, page, search, showToast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  async function handleFiles(files: FileList | File[] | null) {
    if (!token || !files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    try {
      for (const file of list) {
        await uploadMedia(token, file);
      }
      showToast(`已上傳 ${list.length} 張圖片`);
      if (page !== 1) setPage(1);
      else await fetchList();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "上傳失敗", "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(m: Media) {
    if (!token) return;
    if (!confirm(`確定刪除「${m.filename}」？此動作無法復原。`)) return;
    try {
      await deleteMedia(token, m.id);
      showToast("已刪除");
      await fetchList();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "刪除失敗", "error");
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard?.writeText(url);
    showToast("已複製網址");
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">媒體庫</h1>
          <p className="mt-1 text-sm text-neutral-500">
            共 {total} 個檔案・上傳的圖片會存到 Cloudflare R2
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full bg-pumpkin-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-pumpkin-700 disabled:bg-neutral-300"
        >
          {uploading ? "上傳中…" : "＋ 上傳圖片"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
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
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`mt-5 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-8 text-center text-sm transition-colors ${
          dragOver
            ? "border-pumpkin-500 bg-pumpkin-50 text-pumpkin-700"
            : "border-neutral-200 text-neutral-400 hover:border-neutral-300"
        }`}
      >
        將圖片拖曳到這裡上傳，或點擊選擇檔案（JPG / PNG / WebP / GIF，單張 10MB 內）
      </div>

      {/* 搜尋 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
        className="mt-5"
      >
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="依檔名搜尋…"
          className="w-full max-w-sm rounded-full border border-neutral-200 px-4 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
        />
      </form>

      {/* 列表 */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-3 font-semibold">檔案</th>
                <th className="px-4 py-3 font-semibold">替代文字</th>
                <th className="px-4 py-3 font-semibold">大小</th>
                <th className="px-4 py-3 font-semibold">上傳時間</th>
                <th className="px-4 py-3 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                    載入中…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                    還沒有媒體，上傳第一張圖片吧！
                  </td>
                </tr>
              ) : (
                items.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.url}
                            alt={m.alt ?? m.filename}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <span className="max-w-[220px] truncate font-medium text-neutral-800">
                          {m.filename}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {m.alt || <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {formatSize(m.size)}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2 text-xs font-semibold">
                        <button
                          onClick={() => copyUrl(m.url)}
                          className="rounded-full border border-neutral-200 px-3 py-1 text-neutral-600 hover:bg-neutral-100"
                        >
                          複製網址
                        </button>
                        <button
                          onClick={() => setEditing(m)}
                          className="rounded-full border border-neutral-200 px-3 py-1 text-neutral-600 hover:bg-neutral-100"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="rounded-full border border-red-200 px-3 py-1 text-red-600 hover:bg-red-50"
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
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ‹
          </button>
          <span className="text-sm text-neutral-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            ›
          </button>
        </div>
      )}

      {/* 編輯 metadata 彈窗 */}
      {editing && (
        <EditMediaModal
          media={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((prev) =>
              prev.map((x) => (x.id === updated.id ? updated : x)),
            );
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditMediaModal({
  media,
  onClose,
  onSaved,
}: {
  media: Media;
  onClose: () => void;
  onSaved: (m: Media) => void;
}) {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);
  const [alt, setAlt] = useState(media.alt ?? "");
  const [caption, setCaption] = useState(media.caption ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await updateMedia(token, media.id, { alt, caption });
      showToast("已儲存");
      onSaved(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "儲存失敗", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-neutral-900">編輯媒體</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.url}
            alt={media.filename}
            className="max-h-48 w-full object-contain"
          />
        </div>
        <p className="mt-2 truncate text-xs text-neutral-400">{media.filename}</p>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-neutral-600">替代文字（Alt）</span>
          <input
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-xs font-semibold text-neutral-600">圖片說明</span>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
          />
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
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
  );
}
