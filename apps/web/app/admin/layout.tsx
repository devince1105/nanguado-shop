"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";
import { getAdminEnvironment } from "@/lib/admin-api";
import type { AdminEnvironmentResponse } from "@/lib/types";

const NAV_ITEMS = [
  { href: "/admin", label: "儀表板", icon: "📊" },
  { href: "/admin/products", label: "商品管理", icon: "📦" },
  { href: "/admin/media", label: "媒體庫", icon: "🖼️" },
  { href: "/admin/categories", label: "分類管理", icon: "🏷️" },
  { href: "/admin/orders", label: "訂單管理", icon: "🧾" },
  { href: "/admin/users", label: "會員管理", icon: "👤" },
  { href: "/admin/banners", label: "首頁輪播", icon: "🖥️" },
  { href: "/admin/pages", label: "頁面內容", icon: "📄" },
  { href: "/admin/store", label: "商店設定", icon: "🏪" },
  { href: "/admin/settings", label: "帳號設定", icon: "⚙️" },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const initAuth = useAuthStore((s) => s.initAuth);
  const logout = useAuthStore((s) => s.logout);
  // 等 initAuth 完成後才判斷權限，避免重新整理時誤判未登入
  const [checked, setChecked] = useState(false);
  const [env, setEnv] = useState<AdminEnvironmentResponse | null>(null);

  useEffect(() => {
    initAuth().finally(() => setChecked(true));
  }, [initAuth]);

  // 確認為管理員後，向後端查詢目前連線的資料庫環境（唯讀）
  useEffect(() => {
    if (checked && user?.role === "admin" && token) {
      getAdminEnvironment(token)
        .then(setEnv)
        .catch(() => setEnv(null));
    }
  }, [checked, user, token]);

  useEffect(() => {
    if (!checked) return;
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else if (user.role !== "admin") {
      router.replace("/");
    }
  }, [checked, user, router, pathname]);

  if (!checked || !user || user.role !== "admin") {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <div className="text-center">
          <span className="text-4xl">🎃</span>
          <p className="mt-3 text-sm text-neutral-500">正在確認管理員身分…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-1">
      {/* 側邊欄 */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-neutral-900 text-neutral-100">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-neutral-800">
          <span className="text-2xl">🎃</span>
          <div>
            <p className="text-sm font-bold">南瓜多 Shop</p>
            <p className="text-xs text-neutral-400">管理後台</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-pumpkin-600 text-white"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-800 px-3 py-4 space-y-1">
          <p className="px-3 pb-1 text-xs text-neutral-500 truncate">
            {user.email}
          </p>
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <span>🏬</span>回到前台
          </Link>
          <button
            onClick={() => {
              logout();
              router.replace("/");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <span>🚪</span>登出
          </button>
        </div>
      </aside>

      {/* 主內容 */}
      <div className="flex-1 min-w-0 bg-neutral-50">
        {/* 開發環境警示橫幅（唯讀，僅提示，不能切換資料庫）*/}
        {env?.environment === "development" && (
          <div className="border-b border-amber-300 bg-amber-100 px-6 py-2 text-center text-sm font-semibold text-amber-900">
            ⚠️ 開發環境 — 目前連線至 DEV 資料庫
            {env.endpoint ? `（${env.endpoint}）` : ""}，此處資料為測試用假資料
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
