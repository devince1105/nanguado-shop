"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { API_URL, formatPrice } from "@/lib/api";
import { useUiStore } from "@/lib/store/ui";
import type { Product, ProductListResponse } from "@/lib/types";

/** 全螢幕搜尋 overlay：debounce 300ms 即時搜尋 + ESC 關閉 */
export function SearchOverlay() {
  const isOpen = useUiStore((s) => s.isSearchOpen);
  const closeSearch = useUiStore((s) => s.closeSearch);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 開啟時 autofocus + 鎖捲動 + ESC 關閉
  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeSearch]);

  // 關閉時重置
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  }, [isOpen]);

  // debounce 300ms 搜尋
  useEffect(() => {
    if (!isOpen) return;
    const keyword = query.trim();
    if (!keyword) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/v1/products?search=${encodeURIComponent(keyword)}&limit=6`,
        );
        const data = (await res.json()) as ProductListResponse;
        setResults(data.items ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
        setSearched(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩 */}
      <div
        onClick={closeSearch}
        aria-hidden
        className="absolute inset-0 bg-black/40"
      />

      {/* 搜尋面板 */}
      <div className="relative mx-auto mt-0 max-w-2xl bg-white p-4 shadow-2xl sm:mt-20 sm:rounded-2xl sm:p-5">
        <div className="flex items-center gap-3 rounded-full border border-neutral-200 px-4 py-2.5 focus-within:border-pumpkin-500">
          <svg
            className="h-5 w-5 shrink-0 text-neutral-400"
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
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋商品，例如：黑熊、帽子…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
          <button
            onClick={closeSearch}
            className="shrink-0 text-xs text-neutral-400 hover:text-neutral-600"
          >
            ESC 關閉
          </button>
        </div>

        {/* 下拉結果 */}
        <div className="mt-3 max-h-[60vh] overflow-y-auto">
          {searching && (
            <p className="px-2 py-6 text-center text-sm text-neutral-400">
              搜尋中…
            </p>
          )}
          {!searching && searched && results.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-neutral-400">
              找不到與「{query.trim()}」相關的商品
            </p>
          )}
          {!searching &&
            results.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                onClick={closeSearch}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-neutral-50"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {product.images[0] && (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {product.name}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {product.category?.name}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold ${
                    product.compareAtPrice ? "text-red-600" : "text-neutral-900"
                  }`}
                >
                  {formatPrice(product.price)}
                </span>
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
