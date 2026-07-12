import type { Metadata } from "next";
import { ProductListing } from "@/components/products/ProductListing";

export const metadata: Metadata = {
  title: "全部商品",
};

type Props = {
  searchParams: Promise<{ sort?: string; page?: string }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  return <ProductListing searchParams={params} basePath="/products" />;
}
