import { getProducts } from "@/lib/api";
import { ProductCard } from "./ProductCard";

type Props = {
  categorySlug: string | null | undefined;
  currentProductId: string;
};

/** 同分類相似商品推薦（Server Component，取不到資料時整區隱藏） */
export async function SimilarProducts({ categorySlug, currentProductId }: Props) {
  if (!categorySlug) return null;

  let items;
  try {
    const res = await getProducts({ category: categorySlug, limit: 5 });
    items = res.items
      .filter((p) => p.id !== currentProductId)
      .slice(0, 4);
  } catch {
    return null;
  }

  if (!items.length) return null;

  return (
    <section className="mt-14 border-t border-neutral-100 pt-8">
      <h2 className="text-xl font-bold text-neutral-900">相似商品</h2>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
