"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { API_URL } from "@/lib/api";
import { useToastStore } from "@/lib/store/toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const showToast = useToastStore((s) => s.show);

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message ?? "發送失敗");
      showToast("若該 Email 已註冊，重設驗證碼已寄出");
      setStep(2);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "發送失敗", "error");
    } finally {
      setLoading(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.message ?? "重設失敗");
      showToast("密碼已重設，請以新密碼登入");
      router.push("/login");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "重設失敗", "error");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "block w-full h-11 rounded-md border border-neutral-200 px-4 text-neutral-950 placeholder-neutral-400 focus:border-pumpkin-500 focus:outline-none focus:ring-pumpkin-500/20 sm:text-sm";
  const btnCls =
    "w-full h-11 rounded-md bg-pumpkin-600 text-sm font-semibold text-white hover:bg-pumpkin-700 transition-colors disabled:opacity-70";

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-neutral-100 bg-white p-8 shadow-xl shadow-neutral-100/50">
        <div className="text-center">
          <span className="text-4xl">🎃</span>
          <h2 className="mt-4 text-2xl font-bold text-neutral-900">重設密碼</h2>
          <p className="mt-2 text-sm text-neutral-500">
            {step === 1
              ? "輸入註冊時的 Email，我們會寄送重設驗證碼"
              : "輸入收到的驗證碼並設定新密碼"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={sendCode} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="電子郵件信箱"
              className={inputCls}
            />
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? "寄送中…" : "寄送驗證碼"}
            </button>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6 位數驗證碼"
              className={inputCls}
            />
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密碼（至少 6 碼）"
              className={inputCls}
            />
            <button type="submit" disabled={loading} className={btnCls}>
              {loading ? "重設中…" : "重設密碼"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-sm text-neutral-500 hover:text-neutral-700"
            >
              沒收到？重新寄送
            </button>
          </form>
        )}

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-pumpkin-600 hover:underline"
          >
            返回登入
          </Link>
        </div>
      </div>
    </div>
  );
}
