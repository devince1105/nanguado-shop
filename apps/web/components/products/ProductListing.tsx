import { getCategories, getProducts } from "@/lib/api";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { CategorySidebar } from "./CategorySidebar";
import { MobileCategoryBar } from "./MobileCategoryBar";
import { Pagination } from "./Pagination";
import { ProductCard } from "./ProductCard";
import { SortSelect } from "./SortSelect";

type Props = {
  /** 分類 slug（不給則為全部商品） */
  categorySlug?: string;
  searchParams: { sort?: string; page?: string };
  basePath: string;
};

/** 商品列表頁共用版型：麵包屑 + 側邊欄 + 商品網格 + 分頁 */
export async function ProductListing({
  categorySlug,
  searchParams,
  basePath,
}: Props) {
  const page = Number(searchParams.page) || 1;
  const sort = searchParams.sort;

  const [categories, data] = await Promise.all([
    getCategories(),
    getProducts({ category: categorySlug, sort, page, limit: 12 }),
  ]);

  const currentCategory = categorySlug
    ? categories.find((c) => c.slug === categorySlug)
    : undefined;

  const crumbs: Crumb[] = [
    { label: "首頁", href: "/" },
    currentCategory
      ? { label: "全部商品", href: "/products" }
      : { label: "全部商品" },
    ...(currentCategory ? [{ label: currentCategory.name }] : []),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Breadcrumbs crumbs={crumbs} />

      <div className="mt-4">
        <h1 className="text-2xl font-bold text-neutral-900">
          {currentCategory?.name ?? "全部商品"}
        </h1>
        {currentCategory?.description && (
          <p className="mt-1.5 text-sm text-neutral-500">
            {currentCategory.description}
          </p>
        )}
      </div>

      <div className="mt-6 flex gap-10">
        {/* 側邊欄（桌面） */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 space-y-8">
            <CategorySidebar categories={categories} currentSlug={categorySlug} />
            <SortSelect />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* 手機版篩選列 */}
          <div className="mb-4 space-y-3 lg:hidden">
            <MobileCategoryBar categories={categories} currentSlug={categorySlug} />
            <div className="flex justify-end">
              <SortSelect />
            </div>
          </div>

          <p className="mb-4 hidden text-sm text-neutral-400 lg:block">
            共 {data.pagination.total} 件商品
          </p>

          {data.items.length === 0 ? (
            <div className="py-24 text-center text-neutral-400">
              <p className="text-4xl">🎃</p>
              <p className="mt-3">這個分類目前沒有商品</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
              {data.items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            basePath={basePath}
            searchParams={searchParams}
          />
        </div>
      </div>
    </div>
  );
}
