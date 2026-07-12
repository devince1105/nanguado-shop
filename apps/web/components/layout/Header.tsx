"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCartStore, selectItemCount } from "@/lib/store/cart";
import { useUiStore } from "@/lib/store/ui";

const NAV_LINKS = [
  { href: "/", label: "首頁" },
  { href: "/products", label: "全部商品" },
  { href: "/categories/t-shirt", label: "T恤類" },
  { href: "/categories/hats-accessories", label: "帽子配件" },
  { href: "/categories/cultural-goods", label: "文創小物" },
];

export function Header() {
  const pathname = usePathname();
  const itemCount = useCartStore(selectItemCount);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const openCart = useUiStore((s) => s.openCart);
  const openSearch = useUiStore((s) => s.openSearch);
  const isMobileMenuOpen = useUiStore((s) => s.isMobileMenuOpen);
  const toggleMobileMenu = useUiStore((s) => s.toggleMobileMenu);
  const closeMobileMenu = useUiStore((s) => s.closeMobileMenu);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetchCart().catch(() => {});
  }, [fetchCart]);

  // 捲動時加上背景陰影
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 切換頁面時收合手機選單
  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-shadow duration-300 ${
        scrolled
          ? "border-transparent shadow-md shadow-neutral-900/5"
          : "border-neutral-100"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* 手機：漢堡選單 */}
        <button
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "關閉選單" : "開啟選單"}
          aria-expanded={isMobileMenuOpen}
          className="rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-100 md:hidden"
        >
          {isMobileMenuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>

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
              className={`text-sm font-medium transition-colors hover:text-pumpkin-600 ${
                pathname === link.href ? "text-pumpkin-600" : "text-neutral-600"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* 右側圖示 */}
        <div className="flex items-center gap-1">
          <button
            onClick={openSearch}
            aria-label="搜尋商品"
            className="rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.34-4.34M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
              />
            </svg>
          </button>
          <button
            onClick={openCart}
            aria-label="開啟購物車"
            className="relative rounded-full p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          </button>
        </div>
      </div>

      {/* 手機：漢堡展開選單 */}
      <div
        className={`overflow-hidden border-t border-neutral-100 transition-all duration-300 md:hidden ${
          isMobileMenuOpen ? "max-h-80" : "max-h-0 border-t-0"
        }`}
      >
        <nav className="space-y-1 px-4 py-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMobileMenu}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-pumpkin-50 text-pumpkin-700"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
