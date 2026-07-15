"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/api";
import { useCartStore } from "@/lib/store/cart";
import { useToastStore } from "@/lib/store/toast";
import type { Product } from "@/lib/types";

const FAV_KEY = "nanguado-favorites";

function readFavs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(FAV_KEY) || "[]");
  } catch {
    return [];
  }
}

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useToastStore((s) => s.show);
  const [favorited, setFavorited] = useState(false);
  const [adding, setAdding] = useState(false);

  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;
  const [firstImage, secondImage] = product.images;
  const soldOut = product.stock === 0;

  useEffect(() => {
    setFavorited(readFavs().includes(product.id));
  }, [product.id]);

  function toggleFav(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const favs = readFavs();
    const next = favs.includes(product.id)
      ? favs.filter((id) => id !== product.id)
      : [...favs, product.id];
    window.localStorage.setItem(FAV_KEY, JSON.stringify(next));
    const isFav = next.includes(product.id);
    setFavorited(isFav);
    showToast(isFav ? "已加入收藏" : "已移除收藏");
  }

  async function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) {
      showToast("此商品補貨中", "error");
      return;
    }
    // 有規格需選擇 → 導到商品頁
    if (product.variants.length > 0) {
      router.push(`/products/${product.slug}`);
      return;
    }
    setAdding(true);
    try {
      await addItem(product.id, 1);
      showToast(`已將「${product.name}」加入購物車`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "加入購物車失敗", "error");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden transition-shadow hover:shadow-lg"
    >
      {/* 1:1 商品圖，hover 切換第二張 + 放大 */}
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        {firstImage && (
          <Image
            src={firstImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className={`object-cover transition-all duration-500 group-hover:scale-105 ${
              secondImage ? "group-hover:opacity-0" : ""
            }`}
          />
        )}
        {secondImage && (
          <Image
            src={secondImage}
            alt={`${product.name} - 2`}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover opacity-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-100"
          />
        )}

        {/* 左上角 badge */}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {onSale ? (
            <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">
              特價
            </span>
          ) : (
            <span className="rounded-full bg-pumpkin-500 px-2.5 py-1 text-xs font-bold text-white">
              新品
            </span>
          )}
        </div>

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-bold text-white">
              補貨中
            </span>
          </div>
        )}
      </div>

      <div className="px-2 pb-5 pt-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-neutral-900 group-hover:text-pumpkin-700">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-base font-bold ${onSale ? "text-red-600" : "text-neutral-900"}`}
            >
              {formatPrice(product.price)}
            </span>
            {onSale && (
              <span className="text-sm text-neutral-400 line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={toggleFav}
              aria-label={favorited ? "取消收藏" : "加入收藏"}
              className={`p-1.5 transition-colors ${
                favorited
                  ? "text-red-500"
                  : "text-neutral-400 hover:text-red-500"
              }`}
            >
              <Heart
                className="h-5 w-5"
                fill={favorited ? "currentColor" : "none"}
              />
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              aria-label="加入購物車"
              className="p-1.5 text-neutral-400 transition-colors hover:text-pumpkin-600 disabled:opacity-40"
            >
              <ShoppingCart className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
