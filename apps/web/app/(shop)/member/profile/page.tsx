"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import { changeAdminPassword } from "@/lib/admin-api";
import { Eye, EyeOff } from "lucide-react";

export default function MemberProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useToastStore((s) => s.show);

  // 基本資料狀態
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // 密碼變更狀態
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // 密碼顯示狀態
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 未登入守衛
  useEffect(() => {
    // 延遲等待 auth 載入後才判斷跳轉
    const t = setTimeout(() => {
      if (!useAuthStore.getState().user) {
        router.replace("/login?redirect=%2Fmember%2Fprofile");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [router]);

  // 初始化資料欄位
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
      setAddress(user.address || "");
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center text-sm text-neutral-500">載入中…</div>
      </div>
    );
  }

  // 儲存基本資料
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("姓名為必填欄位", "error");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        name,
        phone: phone || undefined,
        address: address || undefined,
      });
      showToast("個人資訊更新成功！", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "更新個人資訊失敗", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // 變更密碼
  const handleChangePassword = async (e: React.FormEvent) => {
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

    setChangingPassword(true);
    try {
      await changeAdminPassword(token, { oldPassword, newPassword });
      showToast("密碼變更成功，請使用新密碼重新登入", "success");
      
      // 登出並導向登入頁
      logout();
      router.replace("/login?redirect=%2Fmember%2Fprofile");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "密碼變更失敗", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-neutral-950 placeholder-neutral-400 focus:border-pumpkin-500 focus:outline-none focus:ring-pumpkin-500/20 disabled:bg-neutral-50 disabled:text-neutral-400";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:py-16 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">👤 會員專區</h1>
        <p className="mt-1 text-sm text-neutral-500">
          管理您的個人基本資料與帳號密碼安全設定
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* 左側：基本資料設定 */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-xl shadow-neutral-100/50">
          <h2 className="text-base font-bold text-neutral-800 border-b border-neutral-100 pb-3 mb-5">
            修改基本資料
          </h2>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                電子郵件 (帳號，唯讀)
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="請輸入姓名"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                手機號碼 (聯絡用)
              </label>
              <input
                type="tel"
                pattern="09\d{8}"
                title="請輸入 09 開頭的 10 碼手機號碼"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="0912345678"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                常用配送地址
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
                placeholder="請輸入常用配送地址"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-lg bg-pumpkin-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-pumpkin-700 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {savingProfile ? "儲存中…" : "儲存修改"}
              </button>
            </div>
          </form>
        </div>

        {/* 右側：密碼安全修改 */}
        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-xl shadow-neutral-100/50">
          <h2 className="text-base font-bold text-neutral-800 border-b border-neutral-100 pb-3 mb-5">
            變更登入密碼
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                目前的密碼
              </label>
              <div className="relative">
                <input
                  type={showOld ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="請輸入目前密碼"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
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
                  className={`${inputClass} pr-10`}
                  placeholder="新密碼（至少 6 個字元）"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
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
                  className={`${inputClass} pr-10`}
                  placeholder="請再次輸入新密碼以供確認"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={changingPassword}
                className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {changingPassword ? "變更中…" : "確認變更密碼"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
