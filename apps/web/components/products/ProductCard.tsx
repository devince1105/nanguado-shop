import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/api";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;
  const [firstImage, secondImage] = product.images;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-xl transition-shadow hover:shadow-lg"
    >
      {/* 1:1 商品圖，hover 切換第二張 + 放大 */}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
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

        {product.stock === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-bold text-white">
              補貨中
            </span>
          </div>
        )}
      </div>

      <div className="px-1 py-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-neutral-900 group-hover:text-pumpkin-700">
          {product.name}
        </h3>
        <div className="mt-1.5 flex items-baseline gap-2">
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
      </div>
    </Link>
  );
}
