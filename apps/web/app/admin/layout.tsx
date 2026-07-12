"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth";

const NAV_ITEMS = [
  { href: "/admin/products", label: "商品管理", icon: "📦" },
  { href: "/admin/orders", label: "訂單管理", icon: "🧾" },
  { href: "/admin/users", label: "會員管理", icon: "👤" },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const initAuth = useAuthStore((s) => s.initAuth);
  const logout = useAuthStore((s) => s.logout);
  // 等 initAuth 完成後才判斷權限，避免重新整理時誤判未登入
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    initAuth().finally(() => setChecked(true));
  }, [initAuth]);

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
            const active = pathname.startsWith(item.href);
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
      <div className="flex-1 min-w-0 bg-neutral-50">{children}</div>
    </div>
  );
}
