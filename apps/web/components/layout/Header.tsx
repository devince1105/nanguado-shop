"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCartStore, selectItemCount } from "@/lib/store/cart";

const NAV_LINKS = [
  { href: "/", label: "首頁" },
  { href: "/products", label: "全部商品" },
  { href: "/categories/t-shirt", label: "T恤類" },
  { href: "/categories/hats-accessories", label: "帽子配件" },
  { href: "/categories/cultural-goods", label: "文創小物" },
];

export function Header() {
  const itemCount = useCartStore(selectItemCount);
  const fetchCart = useCartStore((s) => s.fetchCart);

  useEffect(() => {
    fetchCart().catch(() => {});
  }, [fetchCart]);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="text-2xl">🎃</span>
          <span className="text-lg font-bold tracking-wide">
            南瓜多 <span className="text-pumpkin-600">Shop</span>
          </span>
        </Link>

        {/* 導航（桌面） */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-neutral-600 transition-colors hover:text-pumpkin-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* 右側圖示 */}
        <div className="flex items-center gap-1">
          <Link
            href="/products"
            aria-label="搜尋商品"
            className="rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.34-4.34M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
          </Link>
          <Link
            href="/cart"
            aria-label="購物車"
            className="relative rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.5l2.1 12.6a1.5 1.5 0 0 0 1.48 1.25h9.9a1.5 1.5 0 0 0 1.47-1.2L20.7 7.5H5.1M9 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm9 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
              />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pumpkin-600 px-1 text-[11px] font-bold text-white">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* 導航（手機：橫向捲動） */}
      <nav className="flex gap-4 overflow-x-auto border-t border-neutral-100 px-4 py-2 md:hidden">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="whitespace-nowrap text-sm font-medium text-neutral-600"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
