"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { formatPrice } from "@/lib/api";
import { useCartStore } from "@/lib/store/cart";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import {
  calcShippingFee,
  FREE_SHIPPING_THRESHOLD,
  type CartItem,
} from "@/lib/types";

function CartRow({ item }: { item: CartItem }) {
  const updateItem = useCartStore((s) => s.updateItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const showToast = useToastStore((s) => s.show);

  const product = item.product;
  if (!product) return null;

  const lineTotal = product.price * item.quantity;
  const variantText = item.selectedVariant
    ? Object.entries(item.selectedVariant)
        .map(([k, v]) => `${k}：${v}`)
        .join("・")
    : null;

  async function changeQuantity(quantity: number) {
    try {
      await updateItem(item.id, quantity);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "更新失敗", "error");
    }
  }

  return (
    <div className="flex gap-4 border-b border-neutral-100 py-5">
      <Link
        href={`/products/${product.slug}`}
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100"
      >
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/products/${product.slug}`}
              className="line-clamp-2 text-sm font-bold text-neutral-900 hover:text-pumpkin-700"
            >
              {product.name}
            </Link>
            <button
              onClick={() => removeItem(item.id)}
              aria-label="刪除"
              className="text-neutral-300 transition-colors hover:text-red-500"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m14.74 9-.35 9m-4.78 0L9.26 9m9.97-3.21c.34.05.68.11 1.02.17m-1.02-.17-1.07 13.88A2.25 2.25 0 0 1 15.92 21.75H8.08a2.25 2.25 0 0 1-2.24-2.08L4.77 5.79m14.46 0a48.1 48.1 0 0 0-3.48-.4m-12 .56c.34-.06.68-.12 1.02-.17m0 0a48.1 48.1 0 0 1 3.48-.4m7.5 0v-.92c0-1.18-.91-2.16-2.09-2.2a51.96 51.96 0 0 0-3.32 0c-1.18.04-2.09 1.02-2.09 2.2v.92m7.5 0a48.67 48.67 0 0 0-7.5 0"
                />
              </svg>
            </button>
          </div>
          {variantText && (
            <p className="mt-1 text-xs text-neutral-400">{variantText}</p>
          )}
          <p className="mt-1 text-xs text-neutral-400">
            單價 {formatPrice(product.price)}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center rounded-lg border border-neutral-200">
            <button
              onClick={() => changeQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="px-3 py-1 text-neutral-600 disabled:text-neutral-300"
              aria-label="減少數量"
            >
              −
            </button>
            <span className="min-w-9 text-center text-sm font-bold">
              {item.quantity}
            </span>
            <button
              onClick={() => changeQuantity(item.quantity + 1)}
              disabled={item.quantity >= product.stock}
              className="px-3 py-1 text-neutral-600 disabled:text-neutral-300"
              aria-label="增加數量"
            >
              +
            </button>
          </div>
          <span className="text-sm font-bold text-neutral-900">
            {formatPrice(lineTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const cart = useCartStore((s) => s.cart);
  const loading = useCartStore((s) => s.loading);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    fetchCart().catch(() => {});
  }, [fetchCart]);

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const shippingFee = calcShippingFee(subtotal);
  const total = subtotal + shippingFee;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-neutral-900">購物車</h1>

      {loading && !cart ? (
        <div className="mt-6 space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* 空購物車 */
        <div className="py-24 text-center">
          <p className="text-6xl">🎃</p>
          <p className="mt-4 text-lg font-bold text-neutral-900">
            購物車空空的
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            快去挑幾件台灣味好物吧！
          </p>
          <Link
            href="/products"
            className="mt-6 inline-block rounded-full bg-pumpkin-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-pumpkin-700"
          >
            去逛逛
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          {items.map((item) => (
            <CartRow key={item.id} item={item} />
          ))}

          {/* 結帳摘要 */}
          <div className="mt-6 ml-auto max-w-sm space-y-2 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>商品總計</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>運費</span>
              <span>
                {shippingFee === 0 ? (
                  <span className="font-medium text-green-600">免運費</span>
                ) : (
                  formatPrice(shippingFee)
                )}
              </span>
            </div>
            {shippingFee > 0 && (
              <p className="text-right text-xs text-pumpkin-700">
                再買 {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)} 即可免運！
              </p>
            )}
            <div className="flex justify-between border-t border-neutral-100 pt-3 text-base font-bold text-neutral-900">
              <span>應付金額</span>
              <span className="text-pumpkin-700">{formatPrice(total)}</span>
            </div>
            <Link
              href={token ? "/checkout" : "/login?redirect=/checkout"}
              className="mt-3 block rounded-full bg-pumpkin-600 py-3.5 text-center text-base font-bold text-white transition-colors hover:bg-pumpkin-700"
            >
              {token ? "前往結帳" : "登入後結帳"}
            </Link>
            <Link
              href="/products"
              className="block py-2 text-center text-sm text-neutral-400 hover:text-neutral-600"
            >
              ← 繼續購物
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
