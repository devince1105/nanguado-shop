import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { getPage } from "@/lib/api";

type Props = { params: Promise<{ slug: string }> };

const KNOWN = ["about", "terms", "contact", "returns"];

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
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
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
    </div>
  );
}
