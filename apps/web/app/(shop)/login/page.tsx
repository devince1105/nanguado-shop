"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useState, useEffect, Suspense } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const showToast = useToastStore((s) => s.show);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

    try {
      await login(email, password);
      showToast("登入成功！");
      router.push(redirectUrl);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "登入失敗", "error");
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-neutral-50/50">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-neutral-100 bg-white p-8 shadow-xl shadow-neutral-100/50">
        <div className="text-center">
          <span className="text-4xl">🎃</span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-neutral-900">
            登入南瓜多
          </h2>
          <p className="mt-2 text-sm text-neutral-500">
            登入後即可同步購物車並查看您的專屬訂單
          </p>
        </div>

        <div className="mt-6">
          <GoogleSignInButton redirectUrl={redirectUrl} />
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="sr-only">
                電子郵件
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full h-11 rounded-md border border-neutral-200 px-4 text-neutral-950 placeholder-neutral-400 focus:z-10 focus:border-pumpkin-500 focus:outline-none focus:ring-pumpkin-500/20 sm:text-sm"
                placeholder="電子郵件信箱"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                密碼
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="relative block w-full h-11 rounded-md border border-neutral-200 px-4 pr-10 text-neutral-950 placeholder-neutral-400 focus:z-10 focus:border-pumpkin-500 focus:outline-none focus:ring-pumpkin-500/20 sm:text-sm"
                  placeholder="密碼"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-400 hover:text-neutral-600 transition-colors z-20"
                  aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full py-2.5 items-center justify-center rounded-md bg-pumpkin-600 px-4 text-sm font-semibold text-white shadow-lg shadow-pumpkin-600/10 hover:bg-pumpkin-700 focus:outline-none focus:ring-2 focus:ring-pumpkin-500/50 focus:ring-offset-2 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
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
              {loading ? "登入中..." : "登入"}
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <p className="text-sm text-neutral-500">
            還沒有帳號？{" "}
            <Link
              href={`/register${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
              className="font-medium text-pumpkin-600 hover:text-pumpkin-500 hover:underline"
            >
              立即註冊
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// useSearchParams 需包在 Suspense 內，否則 next build 於預渲染階段會失敗
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
