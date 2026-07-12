import type { Metadata } from "next";
import { ProductListing } from "@/components/products/ProductListing";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const names: Record<string, string> = {
    "t-shirt": "T恤類",
    "hats-accessories": "帽子配件",
    "cultural-goods": "文創小物",
  };
  return { title: names[slug] ?? "分類商品" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  return (
    <ProductListing
      categorySlug={slug}
      searchParams={query}
      basePath={`/categories/${slug}`}
    />
  );
}
