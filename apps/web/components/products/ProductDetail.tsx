"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/api";
import { useCartStore } from "@/lib/store/cart";
import { useToastStore } from "@/lib/store/toast";
import type { Product, SelectedVariant } from "@/lib/types";

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const showToast = useToastStore((s) => s.show);

  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<SelectedVariant>(() =>
    Object.fromEntries(
      product.variants.map((variant) => [variant.name, variant.options[0]]),
    ),
  );
  const [submitting, setSubmitting] = useState(false);

  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;

  // 取得當前選取的規格組合 Key (以 product.variants 定義的順序組合)
  const selectedComboKey = useMemo(() => {
    return product.variants.map((v) => selected[v.name] || "").join(" / ");
  }, [product.variants, selected]);

  // 取得當前規格組合的庫存量 (若無規格或未啟用規格個別庫存，則回傳主商品庫存)
  const currentStock = useMemo(() => {
    const hasVariantStock = product.variantStock && Object.keys(product.variantStock).length > 0;
    if (!product.variants.length || !hasVariantStock) return product.stock;
    return product.variantStock?.[selectedComboKey] ?? 0;
  }, [product.variants.length, product.stock, product.variantStock, selectedComboKey]);

  const soldOut = currentStock === 0;
  const lowStock = !soldOut && currentStock <= 10;

  // 當切換規格導致庫存小於目前所選數量時，重置數量為上限值
  useEffect(() => {
    setQuantity((q) => Math.min(currentStock, Math.max(1, q)));
  }, [currentStock]);

  const selectedVariant = useMemo(
    () => (product.variants.length ? selected : null),
    [product.variants.length, selected],
  );

  function changeQuantity(delta: number) {
    setQuantity((q) => Math.min(currentStock, Math.max(1, q + delta)));
  }

  async function handleAddToCart(): Promise<boolean> {
    setSubmitting(true);
    try {
      await addItem(product.id, quantity, selectedVariant);
      showToast(`已將「${product.name}」加入購物車`);
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : "加入購物車失敗", "error");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleBuyNow() {
    const ok = await handleAddToCart();
    if (ok) router.push("/cart");
  }

  return (
    <div className="mt-6 grid gap-8 pb-24 lg:grid-cols-[55%_1fr] lg:gap-12 lg:pb-0">
      {/* ---- 圖片區 ---- */}
      <div>
        {/* 桌面：大圖 + 縮圖 */}
        <div className="hidden lg:block">
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
            {product.images[activeImage] && (
              <Image
                src={product.images[activeImage]}
                alt={product.name}
                fill
                sizes="55vw"
                className="object-cover"
                priority
              />
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {product.images.map((image, index) => (
                <button
                  key={image}
                  onClick={() => setActiveImage(index)}
                  className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    index === activeImage
                      ? "border-pumpkin-600"
                      : "border-transparent hover:border-neutral-300"
                  }`}
                  aria-label={`查看第 ${index + 1} 張圖片`}
                >
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 手機：滿寬輪播 */}
        <div className="-mx-4 lg:hidden">
          <div className="snap-carousel flex overflow-x-auto">
            {product.images.map((image, index) => (
              <div
                key={image}
                className="relative aspect-square w-full shrink-0"
              >
                <Image
                  src={image}
                  alt={`${product.name} ${index + 1}`}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority={index === 0}
                />
              </div>
            ))}
          </div>
          {product.images.length > 1 && (
            <p className="mt-2 text-center text-xs text-neutral-400">
              左右滑動查看更多圖片
            </p>
          )}
        </div>
      </div>

      {/* ---- 商品資訊區 ---- */}
      <div>
        <h1 className="text-2xl font-bold leading-snug text-neutral-900 sm:text-3xl">
          {product.name}
        </h1>

        <div className="mt-4 flex items-baseline gap-3">
          <span
            className={`text-3xl font-bold ${onSale ? "text-red-600" : "text-neutral-900"}`}
          >
            {formatPrice(product.price)}
          </span>
          {onSale && (
            <span className="text-lg text-neutral-400 line-through">
              {formatPrice(product.compareAtPrice!)}
            </span>
          )}
          {onSale && (
            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">
              限時特價
            </span>
          )}
        </div>

        {product.description && (
          <p className="mt-5 leading-7 text-neutral-600">
            {product.description}
          </p>
        )}

        {/* 規格選擇 */}
        {product.variants.map((variant) => (
          <div key={variant.name} className="mt-6">
            <p className="text-sm font-bold text-neutral-900">
              {variant.name}
              <span className="ml-2 font-normal text-neutral-400">
                {selected[variant.name]}
              </span>
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {variant.options.map((option) => (
                <button
                  key={option}
                  onClick={() =>
                    setSelected((prev) => ({ ...prev, [variant.name]: option }))
                  }
                  className={`min-w-12 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                    selected[variant.name] === option
                      ? "border-pumpkin-600 bg-pumpkin-50 text-pumpkin-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 數量選擇器 */}
        <div className="mt-6">
          <p className="text-sm font-bold text-neutral-900">數量</p>
          <div className="mt-2.5 flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-neutral-200">
              <button
                onClick={() => changeQuantity(-1)}
                disabled={quantity <= 1}
                className="px-4 py-2 text-lg text-neutral-600 disabled:text-neutral-300"
                aria-label="減少數量"
              >
                −
              </button>
              <span className="min-w-12 text-center font-bold">{quantity}</span>
              <button
                onClick={() => changeQuantity(1)}
                disabled={quantity >= currentStock || soldOut}
                className="px-4 py-2 text-lg text-neutral-600 disabled:text-neutral-300"
                aria-label="增加數量"
              >
                +
              </button>
            </div>
            {/* 庫存提示 */}
            {soldOut ? (
              <span className="text-sm font-medium text-red-600">
                補貨中，暫時無法購買
              </span>
            ) : lowStock ? (
              <span className="text-sm font-medium text-pumpkin-700">
                庫存只剩 {currentStock} 件！
              </span>
            ) : (
              <span className="text-sm text-neutral-400">
                庫存 {currentStock} 件
              </span>
            )}
          </div>
        </div>

        {/* 按鈕（桌面） */}
        <div className="mt-8 hidden gap-3 lg:flex">
          <button
            onClick={handleAddToCart}
            disabled={soldOut || submitting}
            className="flex-1 rounded-full bg-pumpkin-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-pumpkin-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {submitting ? "處理中…" : "加入購物車"}
          </button>
          <button
            onClick={handleBuyNow}
            disabled={soldOut || submitting}
            className="flex-1 rounded-full border-2 border-pumpkin-600 py-3.5 text-base font-bold text-pumpkin-700 transition-colors hover:bg-pumpkin-50 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:text-neutral-300"
          >
            直接購買
          </button>
        </div>

        <ul className="mt-8 space-y-1.5 border-t border-neutral-100 pt-5 text-sm text-neutral-400">
          <li>・滿 NT$1,000 免運費（未滿收 NT$60）</li>
          <li>・綠界科技安全付款</li>
          <li>・7 天鑑賞期</li>
        </ul>
      </div>

      {/* 按鈕（手機：底部固定） */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-3 border-t border-neutral-100 bg-white p-3 lg:hidden">
        <button
          onClick={handleAddToCart}
          disabled={soldOut || submitting}
          className="flex-1 rounded-full bg-pumpkin-600 py-3 text-sm font-bold text-white disabled:bg-neutral-300"
        >
          加入購物車
        </button>
        <button
          onClick={handleBuyNow}
          disabled={soldOut || submitting}
          className="flex-1 rounded-full border-2 border-pumpkin-600 py-3 text-sm font-bold text-pumpkin-700 disabled:border-neutral-300 disabled:text-neutral-300"
        >
          直接購買
        </button>
      </div>
    </div>
  );
}
