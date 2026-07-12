"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { formatPrice } from "@/lib/api";
import { useCartStore } from "@/lib/store/cart";
import { useToastStore } from "@/lib/store/toast";
import { useUiStore } from "@/lib/store/ui";
import { calcShippingFee, FREE_SHIPPING_THRESHOLD } from "@/lib/types";

/** 右側滑出購物車面板 + 遮罩 */
export function CartDrawer() {
  const isOpen = useUiStore((s) => s.isCartOpen);
  const closeCart = useUiStore((s) => s.closeCart);
  const cart = useCartStore((s) => s.cart);
  const updateItem = useCartStore((s) => s.updateItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const showToast = useToastStore((s) => s.show);

  // ESC 關閉 + 開啟時鎖住背景捲動
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const shippingFee = calcShippingFee(subtotal);

  async function changeQuantity(itemId: string, quantity: number) {
    try {
      await updateItem(itemId, quantity);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "更新失敗", "error");
    }
  }

  return (
    <>
      {/* 遮罩 */}
      <div
        onClick={closeCart}
        aria-hidden
        className={`fixed inset-0 z-50 bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* 面板 */}
      <aside
        role="dialog"
        aria-label="購物車"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <h2 className="text-base font-bold text-neutral-900">
            購物車{cart?.itemCount ? `（${cart.itemCount}）` : ""}
          </h2>
          <button
            onClick={closeCart}
            aria-label="關閉購物車"
            className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="text-5xl">🎃</p>
            <p className="mt-4 font-bold text-neutral-900">購物車空空的</p>
            <p className="mt-1 text-sm text-neutral-400">快去挑幾件好物吧！</p>
            <Link
              href="/products"
              onClick={closeCart}
              className="mt-5 rounded-full bg-pumpkin-600 px-7 py-2.5 text-sm font-bold text-white transition-colors hover:bg-pumpkin-700"
            >
              去逛逛
            </Link>
          </div>
        ) : (
          <>
            {/* 商品列表 */}
            <div className="flex-1 overflow-y-auto px-5">
              {items.map((item) => {
                const product = item.product;
                if (!product) return null;
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 border-b border-neutral-100 py-4"
                  >
                    <Link
                      href={`/products/${product.slug}`}
                      onClick={closeCart}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100"
                    >
                      {product.images[0] && (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      )}
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/products/${product.slug}`}
                            onClick={closeCart}
                            className="line-clamp-1 text-sm font-bold text-neutral-900 hover:text-pumpkin-700"
                          >
                            {product.name}
                          </Link>
                          {item.selectedVariant && (
                            <p className="mt-0.5 text-xs text-neutral-400">
                              {Object.values(item.selectedVariant).join("・")}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          aria-label="刪除"
                          className="shrink-0 text-neutral-300 transition-colors hover:text-red-500"
                        >
                          <svg
                            className="h-4.5 w-4.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.8}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-neutral-200">
                          <button
                            onClick={() => changeQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="px-2.5 py-0.5 text-neutral-600 disabled:text-neutral-300"
                            aria-label="減少數量"
                          >
                            −
                          </button>
                          <span className="min-w-7 text-center text-sm font-bold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => changeQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= product.stock}
                            className="px-2.5 py-0.5 text-neutral-600 disabled:text-neutral-300"
                            aria-label="增加數量"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-bold">
                          {formatPrice(product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 總計 */}
            <div className="border-t border-neutral-100 px-5 py-4">
              {shippingFee > 0 && (
                <p className="mb-2 rounded-lg bg-pumpkin-50 px-3 py-2 text-xs text-pumpkin-700">
                  再買 {formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)}{" "}
                  即可免運（未滿收 {formatPrice(shippingFee)}）
                </p>
              )}
              <div className="flex justify-between text-sm text-neutral-600">
                <span>商品總計</span>
                <span className="font-bold text-neutral-900">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="rounded-full border border-neutral-300 py-3 text-center text-sm font-bold text-neutral-700 transition-colors hover:border-pumpkin-500 hover:text-pumpkin-600"
                >
                  查看購物車
                </Link>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="rounded-full bg-pumpkin-600 py-3 text-center text-sm font-bold text-white transition-colors hover:bg-pumpkin-700"
                >
                  前往結帳
                </Link>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
