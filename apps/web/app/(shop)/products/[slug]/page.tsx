import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/api";
import { Breadcrumbs } from "@/components/products/Breadcrumbs";
import { ProductDetail } from "@/components/products/ProductDetail";
import { ProductTrustSection } from "@/components/products/ProductTrustSection";
import { SimilarProducts } from "@/components/products/SimilarProducts";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    return {
      title: product.name,
      description: product.description ?? undefined,
    };
  } catch {
    return { title: "商品不存在" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;

  let product;
  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-24 lg:pb-8">
      <Breadcrumbs
        crumbs={[
          { label: "首頁", href: "/" },
          { label: "全部商品", href: "/products" },
          ...(product.category
            ? [
                {
                  label: product.category.name,
                  href: `/categories/${product.category.slug}`,
                },
              ]
            : []),
          { label: product.name },
        ]}
      />
      <ProductDetail product={product} />
      <ProductTrustSection product={product} />
      <SimilarProducts
        categorySlug={product.category?.slug}
        currentProductId={product.id}
      />
    </div>
  );
}
