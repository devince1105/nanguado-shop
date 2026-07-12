"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, Suspense } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useAuthStore((s) => s.register);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const showToast = useToastStore((s) => s.show);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const redirectUrl = searchParams.get("redirect") || "/";

  // 若已登入，直接導向目的地
  useEffect(() => {
    if (user) {
      router.replace(redirectUrl);
    }
  }, [user, router, redirectUrl]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (password.length < 6) {
      showToast("密碼字數必須大於 6 位", "error");
      return;
    }

    try {
      await register({
        email,
        password,
        name,
        phone: phone || undefined,
        address: address || undefined,
      });
      showToast("註冊並登入成功！");
      router.push(redirectUrl);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "註冊失敗", "error");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm text-neutral-950 placeholder-neutral-400 focus:border-pumpkin-500 focus:outline-none focus:ring-pumpkin-500/20";

  return (
    <div className="flex min-h-[90vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-neutral-50/50">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-neutral-100 bg-white p-8 shadow-xl shadow-neutral-100/50">
        <div className="text-center">
          <span className="text-4xl">🎃</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900">
            註冊南瓜多會員
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            加入會員以享有訂單追蹤與更便利的結帳體驗
          </p>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="王小明"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500">
              電子郵件 <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="example@mail.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500">
              密碼 <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="請輸入至少 6 位密碼"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-500">
              手機號碼 (聯絡與出貨用，選填)
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
            <label className="mb-1 block text-xs font-semibold text-neutral-500">
              常用配送地址 (選填)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputClass}
              placeholder="台北市大安區信義路二段100號"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-xl bg-pumpkin-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-pumpkin-600/10 hover:bg-pumpkin-700 focus:outline-none focus:ring-2 focus:ring-pumpkin-500/50 focus:ring-offset-2 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? (
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : null}
              {loading ? "註冊中..." : "註冊並登入"}
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <p className="text-sm text-neutral-500">
            已經有帳號了？{" "}
            <Link
              href={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
              className="font-medium text-pumpkin-600 hover:text-pumpkin-500 hover:underline"
            >
              立即登入
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// useSearchParams 需包在 Suspense 內，否則 next build 於預渲染階段會失敗
export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
