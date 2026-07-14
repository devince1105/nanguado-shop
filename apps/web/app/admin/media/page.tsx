"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import {
  deleteMedia,
  getMediaList,
  getMediaMeta,
  updateMedia,
  uploadMedia,
} from "@/lib/admin-api";
import type { Media, MediaMeta } from "@/lib/types";

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

const ALL = "";
const NONE = "__none__";

export default function AdminMediaPage() {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);

  const [items, setItems] = useState<Media[]>([]);
  const [meta, setMeta] = useState<MediaMeta>({ folders: [], tags: [] });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [folder, setFolder] = useState<string>(ALL);
  const [tag, setTag] = useState<string>("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editing, setEditing] = useState<Media | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchList = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await getMediaList(token, {
        page,
        limit: 24,
        search,
        folder: folder || undefined,
        tag: tag || undefined,
      });
      setItems(data.items);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "載入媒體失敗", "error");
    } finally {
      setLoading(false);
    }
  }, [token, page, search, folder, tag, showToast]);

  const fetchMeta = useCallback(async () => {
    if (!token) return;
    try {
      setMeta(await getMediaMeta(token));
    } catch {
      /* 篩選 meta 失敗不影響主列表 */
    }
  }, [token]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);
  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  async function handleFiles(files: FileList | File[] | null) {
    if (!token || !files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    try {
      // 若目前篩選在某個資料夾，上傳就歸到那個資料夾
      const targetFolder = folder && folder !== NONE ? folder : null;
      for (const file of list) await uploadMedia(token, file, targetFolder);
      showToast(`已上傳 ${list.length} 張圖片`);
      if (page !== 1) setPage(1);
      else await fetchList();
      await fetchMeta();
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
      await fetchMeta();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "刪除失敗", "error");
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard?.writeText(url);
    showToast("已複製網址");
  }

  function selectFolder(f: string) {
    setFolder(f);
    setPage(1);
  }

  const folderPills = [
    { key: ALL, label: "全部" },
    ...meta.folders.map((f) => ({ key: f, label: f })),
    { key: NONE, label: "未分類" },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* 標題列 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">媒體庫</h1>
          <p className="mt-1 text-sm text-neutral-500">
            共 {total} 個檔案・存於 Cloudflare R2
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-neutral-200 p-0.5 text-sm">
            <button
              onClick={() => setView("grid")}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                view === "grid"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              相簿
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                view === "list"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              表格
            </button>
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
        className={`mt-5 cursor-pointer rounded-2xl border-2 border-dashed px-6 py-6 text-center text-sm transition-colors ${
          dragOver
            ? "border-pumpkin-500 bg-pumpkin-50 text-pumpkin-700"
            : "border-neutral-200 text-neutral-400 hover:border-neutral-300"
        }`}
      >
        將圖片拖曳到這裡上傳
        {folder && folder !== NONE ? `（歸入「${folder}」）` : ""}
        ，或點擊選擇檔案
      </div>

      {/* 資料夾列 */}
      <div className="mt-5 flex flex-wrap gap-2">
        {folderPills.map((p) => (
          <button
            key={p.key || "all"}
            onClick={() => selectFolder(p.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              folder === p.key
                ? "bg-pumpkin-600 text-white"
                : "border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {p.key === ALL ? "📁 " : ""}
            {p.label}
          </button>
        ))}
      </div>

      {/* 搜尋 + 標籤篩選 */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput.trim());
          }}
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="依檔名搜尋…"
            className="w-56 rounded-full border border-neutral-200 px-4 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
          />
        </form>
        {meta.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-neutral-400">標籤：</span>
            {meta.tags.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTag((cur) => (cur === t ? "" : t));
                  setPage(1);
                }}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  tag === t
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 內容 */}
      <div className="mt-5">
        {loading ? (
          <p className="py-16 text-center text-sm text-neutral-400">載入中…</p>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-sm text-neutral-400">
            這裡還沒有圖片，拖曳或點上傳新增第一張吧！
          </p>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((m) => (
              <button
                key={m.id}
                onClick={() => setEditing(m)}
                className="group relative aspect-square overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.alt ?? m.filename}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="truncate text-xs font-medium text-white">
                    {m.filename}
                  </p>
                  {m.folder && (
                    <p className="truncate text-[10px] text-white/70">
                      📁 {m.folder}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-100 bg-neutral-50 text-left text-xs text-neutral-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">檔案</th>
                    <th className="px-4 py-3 font-semibold">資料夾</th>
                    <th className="px-4 py-3 font-semibold">標籤</th>
                    <th className="px-4 py-3 font-semibold">大小</th>
                    <th className="px-4 py-3 text-right font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {items.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.url}
                              alt={m.alt ?? m.filename}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="max-w-[200px] truncate font-medium text-neutral-800">
                            {m.filename}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {m.folder || <span className="text-neutral-300">未分類</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {m.tags.length ? (
                            m.tags.map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500"
                              >
                                #{t}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-300">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-500">
                        {formatSize(m.size)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2 text-xs font-semibold">
                          <button
                            onClick={() => copyUrl(m.url)}
                            className="rounded-full border border-neutral-200 px-3 py-1 text-neutral-600 hover:bg-neutral-100"
                          >
                            複製
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
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

      {editing && (
        <EditMediaModal
          media={editing}
          folders={meta.folders}
          onClose={() => setEditing(null)}
          onDeleted={() => {
            setEditing(null);
            fetchList();
            fetchMeta();
          }}
          onSaved={(updated) => {
            setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            setEditing(null);
            fetchMeta();
          }}
        />
      )}
    </div>
  );
}

function EditMediaModal({
  media,
  folders,
  onClose,
  onSaved,
  onDeleted,
}: {
  media: Media;
  folders: string[];
  onClose: () => void;
  onSaved: (m: Media) => void;
  onDeleted: () => void;
}) {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);
  const [alt, setAlt] = useState(media.alt ?? "");
  const [caption, setCaption] = useState(media.caption ?? "");
  const [folder, setFolder] = useState(media.folder ?? "");
  const [tags, setTags] = useState<string[]>(media.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  function addTag(raw: string) {
    const t = raw.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  }

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await updateMedia(token, media.id, {
        alt,
        caption,
        folder: folder.trim() || null,
        tags,
      });
      showToast("已儲存");
      onSaved(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "儲存失敗", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!token) return;
    if (!confirm(`確定刪除「${media.filename}」？`)) return;
    try {
      await deleteMedia(token, media.id);
      showToast("已刪除");
      onDeleted();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "刪除失敗", "error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6"
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
        <button
          onClick={() => {
            navigator.clipboard?.writeText(media.url);
            showToast("已複製網址");
          }}
          className="mt-1 text-xs font-semibold text-pumpkin-600 hover:text-pumpkin-700"
        >
          複製公開網址
        </button>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-neutral-600">資料夾</span>
          <input
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            list="media-folders"
            placeholder="例如：商品圖、橫幅（留空為未分類）"
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
          />
          <datalist id="media-folders">
            {folders.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>

        <div className="mt-3">
          <span className="text-xs font-semibold text-neutral-600">標籤</span>
          <div className="mt-1 flex flex-wrap gap-1.5 rounded-xl border border-neutral-200 p-2">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
              >
                #{t}
                <button
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              onBlur={() => tagInput && addTag(tagInput)}
              placeholder="輸入後按 Enter"
              className="min-w-[100px] flex-1 text-sm focus:outline-none"
            />
          </div>
        </div>

        <label className="mt-3 block">
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

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={remove}
            className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            刪除
          </button>
          <div className="flex gap-2">
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
    </div>
  );
}
