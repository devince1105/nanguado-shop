"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import { getAdminPages, updatePage } from "@/lib/admin-api";
import type { Page } from "@/lib/types";

export default function AdminPagesPage() {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);

  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Page | null>(null);

  const fetchPages = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setPages(await getAdminPages(token));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "載入失敗", "error");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-neutral-900">頁面內容</h1>
      <p className="mt-1 text-sm text-neutral-500">
        編輯前台的商店訊息頁面（支援 Markdown）
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {loading ? (
          <p className="text-sm text-neutral-400">載入中…</p>
        ) : (
          pages.map((p) => (
            <button
              key={p.slug}
              onClick={() => setEditing(p)}
              className="rounded-2xl border border-neutral-200 bg-white p-5 text-left transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-neutral-900">{p.title}</h2>
                <span className="text-xs text-neutral-400">/pages/{p.slug}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-neutral-500">
                {p.content.replace(/[#*>-]/g, "").slice(0, 80) || "（尚未填寫）"}
              </p>
              <p className="mt-3 text-xs font-semibold text-pumpkin-600">
                編輯 →
              </p>
            </button>
          ))
        )}
      </div>

      {editing && (
        <EditPageModal
          page={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setPages((prev) =>
              prev.map((x) => (x.slug === updated.slug ? updated : x)),
            );
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EditPageModal({
  page,
  onClose,
  onSaved,
}: {
  page: Page;
  onClose: () => void;
  onSaved: (p: Page) => void;
}) {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);
  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      const updated = await updatePage(token, page.slug, { title, content });
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
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">
            編輯：{page.title}
          </h2>
          <button
            onClick={() => setPreview((v) => !v)}
            className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
          >
            {preview ? "編輯" : "預覽"}
          </button>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-semibold text-neutral-600">頁面標題</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
          />
        </label>

        <div className="mt-3 flex-1 overflow-y-auto">
          <span className="text-xs font-semibold text-neutral-600">
            內容（Markdown）
          </span>
          {preview ? (
            <div
              className="mt-1 min-h-[240px] rounded-xl border border-neutral-200 p-4 text-sm leading-7 text-neutral-700
                [&_a]:text-pumpkin-600 [&_a]:underline
                [&_h1]:mt-3 [&_h1]:text-xl [&_h1]:font-bold
                [&_h2]:mt-3 [&_h2]:text-lg [&_h2]:font-bold
                [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                [&_strong]:font-bold"
            >
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              className="mt-1 w-full rounded-xl border border-neutral-200 p-3 font-mono text-sm leading-6 focus:border-pumpkin-400 focus:outline-none"
            />
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
