import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getPage } from "@/lib/api";
import { Breadcrumbs } from "@/components/products/Breadcrumbs";

type Props = { params: Promise<{ slug: string }> };

/** 內容頁面導覽（分兩群組） */
const NAV_GROUPS = [
  {
    heading: "關於我們",
    items: [
      { slug: "about", title: "品牌故事" },
      { slug: "terms", title: "服務條款" },
      { slug: "returns", title: "退換貨政策" },
    ],
  },
  {
    heading: "客服資訊",
    items: [
      { slug: "shopping-guide", title: "購物說明" },
      { slug: "member-rights", title: "會員權益聲明" },
      { slug: "contact", title: "聯絡我們" },
    ],
  },
];

const KNOWN = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await getPage(slug);
    return { title: page.title };
  } catch {
    return { title: "頁面不存在" };
  }
}

export default async function ContentPage({ params }: Props) {
  const { slug } = await params;
  if (!KNOWN.includes(slug)) notFound();

  let page;
  try {
    page = await getPage(slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <Breadcrumbs
        crumbs={[{ label: "首頁", href: "/" }, { label: page.title }]}
      />
      <div className="mt-6 gap-10 lg:flex">
      {/* 左側導覽 */}
      <aside className="mb-8 shrink-0 lg:mb-0 lg:w-56">
        <div className="space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.heading}>
              <h2 className="text-sm font-bold text-neutral-900">
                {group.heading}
              </h2>
              <nav className="mt-2 flex gap-2 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
                {group.items.map((item) => {
                  const active = item.slug === slug;
                  return (
                    <Link
                      key={item.slug}
                      href={`/pages/${item.slug}`}
                      className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-pumpkin-50 text-pumpkin-700"
                          : "text-neutral-600 hover:bg-neutral-100"
                      }`}
                    >
                      {item.title}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* 內容 */}
      <article className="min-w-0 flex-1">
        <h1 className="text-3xl font-bold text-neutral-900">{page.title}</h1>
        <div
          className="mt-8 space-y-4 leading-8 text-neutral-700
            [&_a]:text-pumpkin-600 [&_a]:underline
            [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-neutral-900
            [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-neutral-900
            [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-neutral-900
            [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6
            [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6
            [&_strong]:font-bold [&_strong]:text-neutral-900"
        >
          <ReactMarkdown>{page.content}</ReactMarkdown>
        </div>
        {page.updatedAt && (
          <p className="mt-10 border-t border-neutral-100 pt-4 text-xs text-neutral-400">
            最後更新：
            {new Date(page.updatedAt).toLocaleDateString("zh-TW")}
          </p>
        )}
      </article>
      </div>
    </div>
  );
}
