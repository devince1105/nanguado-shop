"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Banner } from "@/lib/types";

export function HeroCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const count = banners.length;

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 5000);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) return null;

  const go = (i: number) => setIndex((i + count) % count);

  return (
    <section className="relative overflow-hidden">
      <div className="relative aspect-[21/9] max-h-[520px] min-h-[280px] w-full">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner.imageUrl}
              alt={banner.title || `輪播 ${i + 1}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
              {banner.title && (
                <h1 className="max-w-3xl text-3xl font-bold leading-tight drop-shadow sm:text-5xl">
                  {banner.title}
                </h1>
              )}
              {banner.subtitle && (
                <p className="mt-4 max-w-xl text-sm text-white/90 drop-shadow sm:text-base">
                  {banner.subtitle}
                </p>
              )}
              {banner.linkUrl && banner.linkLabel && (
                <Link
                  href={banner.linkUrl}
                  className="mt-6 rounded-full bg-pumpkin-600 px-8 py-3 text-sm font-bold text-white transition-colors hover:bg-pumpkin-700"
                >
                  {banner.linkLabel}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          {/* 左右箭頭 */}
          <button
            onClick={() => go(index - 1)}
            aria-label="上一張"
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => go(index + 1)}
            aria-label="下一張"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white transition-colors hover:bg-black/50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* 指示點 */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => go(i)}
                aria-label={`第 ${i + 1} 張`}
                className={`h-2 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
