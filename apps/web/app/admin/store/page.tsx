"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import { getAdminSettings, updateSettings } from "@/lib/admin-api";
import type { SiteSettings } from "@/lib/types";

export default function AdminStorePage() {
  const token = useAuthStore((s) => s.token);
  const showToast = useToastStore((s) => s.show);

  const [form, setForm] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setForm(await getAdminSettings(token));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "載入失敗", "error");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function save() {
    if (!token || !form) return;
    setSaving(true);
    try {
      const updated = await updateSettings(token, form);
      setForm(updated);
      showToast("已儲存，前台會即時更新");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "儲存失敗", "error");
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof SiteSettings>(key: K, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-2xl font-bold text-neutral-900">商店設定</h1>
      <p className="mt-1 text-sm text-neutral-500">
        變更店名、標語與 Emoji，前台 Header、Footer 與瀏覽器標題會一併更新。
      </p>

      {loading || !form ? (
        <p className="mt-8 text-sm text-neutral-400">載入中…</p>
      ) : (
        <div className="mt-6 max-w-lg space-y-5 rounded-2xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center gap-3 rounded-xl bg-neutral-50 p-4">
            <span className="text-3xl">{form.shopEmoji || "🏪"}</span>
            <div>
              <p className="font-bold text-neutral-900">
                {form.shopName || "（未命名商店）"}
              </p>
              <p className="text-xs text-neutral-500">{form.shopTagline}</p>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-neutral-600">
              店名 Emoji
            </span>
            <input
              value={form.shopEmoji}
              onChange={(e) => set("shopEmoji", e.target.value)}
              maxLength={4}
              className="mt-1 w-24 rounded-xl border border-neutral-200 px-3 py-2 text-lg focus:border-pumpkin-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-neutral-600">店名</span>
            <input
              value={form.shopName}
              onChange={(e) => set("shopName", e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-neutral-600">標語</span>
            <input
              value={form.shopTagline}
              onChange={(e) => set("shopTagline", e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-neutral-600">
              網站描述（SEO / 分享用）
            </span>
            <textarea
              value={form.shopDescription}
              onChange={(e) => set("shopDescription", e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:border-pumpkin-400 focus:outline-none"
            />
          </label>

          <div className="flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-pumpkin-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-pumpkin-700 disabled:bg-neutral-300"
            >
              {saving ? "儲存中…" : "儲存"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
