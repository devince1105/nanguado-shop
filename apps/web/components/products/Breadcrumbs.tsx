import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="麵包屑" className="text-sm text-neutral-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((crumb, index) => (
          <li key={index} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-neutral-300">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-pumpkin-600">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-medium text-neutral-900">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
