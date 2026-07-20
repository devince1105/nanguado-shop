import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getBanners, getCategories, getProducts } from "@/lib/api";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductGridSkeleton } from "@/components/products/ProductGridSkeleton";
import { HeroCarousel } from "@/components/home/HeroCarousel";

async function FeaturedProducts() {
  const data = await getProducts({ limit: 8 });
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4">
      {data.items.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

async function CategoryCards() {
  const categories = await getCategories();
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/categories/${category.slug}`}
          className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-neutral-100"
        >
          {category.imageUrl && (
            <Image
              src={category.imageUrl}
              alt={category.name}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute bottom-4 left-4 text-white">
            <h3 className="text-lg font-bold">{category.name}</h3>
            <p className="text-sm text-white/80">
              {category.productCount} 件商品
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const banners = await getBanners();

  return (
    <div>
      {/* Hero：有輪播橫幅則顯示 Carousel，否則預設 Hero */}
      {banners.length > 0 ? (
        <HeroCarousel banners={banners} />
      ) : (
        <section className="bg-gradient-to-br from-pumpkin-50 via-white to-pumpkin-100">
          <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28">
            <h1 className="text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl">
              把喜歡的
              <span className="text-pumpkin-600">穿在身上</span>
            </h1>
            <p className="mt-4 max-w-xl text-neutral-500">
              精選原創圖案商品，每一件都有屬於自己的故事。
            </p>
            <div className="mt-8 flex gap-3">
              <Link
                href="/products"
                className="rounded-full bg-pumpkin-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-pumpkin-700"
              >
                開始逛逛
              </Link>
              <Link
                href="/categories/t-shirt"
                className="rounded-full border border-neutral-300 bg-white px-8 py-3 text-sm font-bold text-neutral-700 transition-colors hover:border-pumpkin-500 hover:text-pumpkin-600"
              >
                熱門 T 恤
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 分類卡片 */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="mb-6 text-xl font-bold text-neutral-900">購物分類</h2>
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[4/3] animate-pulse rounded-2xl bg-neutral-100"
                />
              ))}
            </div>
          }
        >
          <CategoryCards />
        </Suspense>
      </section>

      {/* 精選商品 */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-neutral-900">精選商品</h2>
          <Link
            href="/products"
            className="text-sm font-medium text-pumpkin-600 hover:text-pumpkin-700"
          >
            查看全部 →
          </Link>
        </div>
        <Suspense fallback={<ProductGridSkeleton />}>
          <FeaturedProducts />
        </Suspense>
      </section>
    </div>
  );
}
