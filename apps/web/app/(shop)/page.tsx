import Link from "next/link";
import { Suspense } from "react";
import { getBanners, getCategories, getProducts } from "@/lib/api";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductGridSkeleton } from "@/components/products/ProductGridSkeleton";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { getCategoryIcon, PRESET_BG_COLORS } from "@/lib/icons";

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
    <div className="grid grid-cols-3 gap-1 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
      {categories.map((category) => {
        const Icon = getCategoryIcon(category.icon, category.name);
        const isClass = category.bgColor?.startsWith("bg-");
        const presetHex = isClass
          ? PRESET_BG_COLORS.find((p) => p.id === category.bgColor)?.hex
          : null;
        return (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="group flex flex-col items-center gap-2 rounded-xl px-1 py-3 text-center transition-colors hover:bg-pumpkin-50"
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full text-neutral-600 shadow-sm transition-colors group-hover:scale-105 ${
                isClass ? category.bgColor : ""
              }`}
              style={{
                backgroundColor:
                  !category.bgColor || isClass
                    ? presetHex || undefined
                    : category.bgColor,
                ...(!category.bgColor && { backgroundColor: "#f5f5f5" }),
              }}
            >
              <Icon className="h-6 w-6" strokeWidth={1.75} />
            </span>
            <span className="text-xs text-neutral-700 sm:text-sm">
              {category.name}
            </span>
          </Link>
        );
      })}
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
            <div className="grid grid-cols-3 gap-1 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 px-1 py-3"
                >
                  <div className="h-14 w-14 animate-pulse rounded-full bg-neutral-100" />
                  <div className="h-3 w-12 animate-pulse rounded bg-neutral-100" />
                </div>
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
