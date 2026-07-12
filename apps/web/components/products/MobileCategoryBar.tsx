"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Category } from "@/lib/types";

type Props = {
  categories: Category[];
  currentSlug?: string;
};

/** 手機版：頂部橫向捲動的分類篩選按鈕 */
export function MobileCategoryBar({ categories, currentSlug }: Props) {
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort");
  const suffix = sort ? `?sort=${sort}` : "";

  const chipClass = (active: boolean) =>
    `whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "border-pumpkin-600 bg-pumpkin-600 text-white"
        : "border-neutral-200 bg-white text-neutral-600"
    }`;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
      <Link href={`/products${suffix}`} className={chipClass(!currentSlug)}>
        全部
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/categories/${category.slug}${suffix}`}
          className={chipClass(currentSlug === category.slug)}
        >
          {category.name}
        </Link>
      ))}
    </div>
  );
}
