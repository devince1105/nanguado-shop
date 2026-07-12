import Link from "next/link";

type Props = {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
};

function pageHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== "page") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `${basePath}${qs ? `?${qs}` : ""}`;
}

export function Pagination({ page, totalPages, basePath, searchParams }: Props) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="分頁" className="mt-10 flex items-center justify-center gap-1.5">
      {page > 1 && (
        <Link
          href={pageHref(basePath, searchParams, page - 1)}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:border-pumpkin-500 hover:text-pumpkin-600"
        >
          上一頁
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={pageHref(basePath, searchParams, p)}
          className={`rounded-lg px-3.5 py-1.5 text-sm ${
            p === page
              ? "bg-pumpkin-600 font-bold text-white"
              : "border border-neutral-200 text-neutral-600 hover:border-pumpkin-500 hover:text-pumpkin-600"
          }`}
        >
          {p}
        </Link>
      ))}
      {page < totalPages && (
        <Link
          href={pageHref(basePath, searchParams, page + 1)}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:border-pumpkin-500 hover:text-pumpkin-600"
        >
          下一頁
        </Link>
      )}
    </nav>
  );
}
