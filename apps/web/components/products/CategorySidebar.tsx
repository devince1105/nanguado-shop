"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  currentSlug?: string;
};

/** 桌面版左側分類篩選；點選切換分類並保留排序狀態 */
export function CategorySidebar({ categories, currentSlug }: Props) {
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort");
  const suffix = sort ? `?sort=${sort}` : "";

  const linkClass = (active: boolean) =>
    `flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
      active
        ? "bg-pumpkin-50 font-bold text-pumpkin-700"
        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
    }`;

  return (
    <div>
      <h2 className="mb-3 px-3 text-sm font-bold text-neutral-900">商品分類</h2>
      <ul className="space-y-1">
        <li>
          <Link href={`/products${suffix}`} className={linkClass(!currentSlug)}>
            全部商品
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.id}>
            <Link
              href={`/categories/${category.slug}${suffix}`}
              className={linkClass(currentSlug === category.slug)}
            >
              <span>{category.name}</span>
              <span className="text-xs text-neutral-400">
                {category.productCount}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
