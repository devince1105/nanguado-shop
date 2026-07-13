"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import { changeAdminPassword } from "@/lib/admin-api";
import { Eye, EyeOff } from "lucide-react";

export default function AdminSettingsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useToastStore((s) => s.show);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast("請填寫所有密碼欄位", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("新密碼長度至少需要 6 個字元", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("新密碼與確認密碼不一致", "error");
      return;
    }

    setLoading(false);
    setLoading(true);
    try {
      await changeAdminPassword(token, { oldPassword, newPassword });
      showToast("密碼變更成功，請使用新密碼重新登入", "success");
      
      // 成功變更後，為維護帳號安全，將管理員登出並導向登入頁
      logout();
      router.replace("/login?redirect=%2Fadmin");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "密碼變更失敗", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">⚙️ 帳號設定</h1>
        <p className="mt-1 text-sm text-neutral-500">
          管理並維護您的登入帳號安全性
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-neutral-800 border-b border-neutral-100 pb-3 mb-5">
          變更登入密碼
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              目前的密碼
            </label>
            <div className="relative">
              <input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 pl-3.5 pr-10 py-2 text-sm focus:border-pumpkin-500 focus:outline-none transition-colors"
                placeholder="請輸入目前使用的密碼"
                required
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label={showOld ? "隱藏目前密碼" : "顯示目前密碼"}
              >
                {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              新的密碼
            </label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 pl-3.5 pr-10 py-2 text-sm focus:border-pumpkin-500 focus:outline-none transition-colors"
                placeholder="新密碼（至少 6 個字元）"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label={showNew ? "隱藏新密碼" : "顯示新密碼"}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
              確認新密碼
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 pl-3.5 pr-10 py-2 text-sm focus:border-pumpkin-500 focus:outline-none transition-colors"
                placeholder="請再次輸入新密碼以供確認"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                aria-label={showConfirm ? "隱藏確認新密碼" : "顯示確認新密碼"}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-pumpkin-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-pumpkin-700 transition-colors disabled:opacity-50"
            >
              {loading ? "變更中…" : "確認變更密碼"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
