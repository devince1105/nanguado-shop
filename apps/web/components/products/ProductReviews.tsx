"use client";

import { useCallback, useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";
import type {
  ProductReviewSummary,
  ReviewEligibility,
} from "@/lib/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex gap-0.5 text-amber-500 ${className}`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} aria-hidden>
          {i < value ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

export function ProductReviews({ slug }: { slug: string }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const [summary, setSummary] = useState<ProductReviewSummary | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_URL}/api/v1/products/${slug}/reviews`,
        { cache: "no-store" },
      );
      if (res.ok) setSummary(await res.json());
    } catch {
      // 靜默失敗：評價載入失敗不影響商品頁其他內容
    }
  }, [slug]);

  const loadEligibility = useCallback(async () => {
    if (!token) {
      setEligibility(null);
      return;
    }
    try {
      const res = await fetch(
        `${API_URL}/api/v1/products/${slug}/reviews/eligibility`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );
      if (res.ok) setEligibility(await res.json());
    } catch {
      // 靜默失敗
    }
  }, [slug, token]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  async function handleSubmit() {
    if (!content.trim()) {
      showToast("請先填寫評價內容", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/v1/products/${slug}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rating, content: content.trim() }),
        },
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? "送出評價失敗");
      }
      showToast("感謝你的評價！");
      setContent("");
      setRating(5);
      await Promise.all([loadSummary(), loadEligibility()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "送出評價失敗", "error");
    } finally {
      setSubmitting(false);
    }
  }

  const count = summary?.count ?? 0;

  return (
    <section className="mt-14 border-t border-neutral-100 pt-8">
      <h2 className="text-xl font-bold text-neutral-900">商品評價</h2>

      {/* 摘要 */}
      {count > 0 ? (
        <div className="mt-5 grid gap-6 sm:grid-cols-[220px_1fr] sm:items-center">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-neutral-50 p-5 text-center">
            <p className="font-mono text-5xl font-extrabold text-neutral-900">
              {summary!.average.toFixed(1)}
            </p>
            <Stars value={Math.round(summary!.average)} className="mt-2 text-lg" />
            <p className="mt-2 text-xs font-medium text-neutral-400">
              {count} 則評價
            </p>
          </div>

          <div className="space-y-2">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const n = summary!.distribution[String(star) as "5"] ?? 0;
              const pct = count ? Math.round((n / count) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-8 shrink-0 text-right font-mono font-bold text-neutral-500">
                    {star} 星
                  </span>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right font-mono text-neutral-400">
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
          目前還沒有評價，成為第一個評價這件商品的人吧！
        </p>
      )}

      {/* 留評區塊 */}
      <div className="mt-6">
        {!user ? (
          <p className="text-sm text-neutral-400">
            登入並完成購買後即可留下評價。
          </p>
        ) : eligibility?.canReview ? (
          <div className="rounded-2xl border border-neutral-200 p-5">
            <p className="text-sm font-bold text-neutral-900">撰寫你的評價</p>
            <div className="mt-3 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => {
                const val = i + 1;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRating(val)}
                    className={`text-2xl transition-colors ${
                      val <= rating ? "text-amber-500" : "text-neutral-300"
                    }`}
                    aria-label={`給 ${val} 星`}
                  >
                    ★
                  </button>
                );
              })}
              <span className="ml-2 text-sm text-neutral-500">{rating} 星</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="分享你對這件商品的實際使用心得…"
              className="mt-3 w-full resize-none rounded-lg border border-neutral-200 p-3 text-sm text-neutral-700 focus:border-pumpkin-500 focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="mt-3 rounded-full bg-pumpkin-600 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-pumpkin-700 disabled:bg-neutral-300"
            >
              {submitting ? "送出中…" : "送出評價"}
            </button>
          </div>
        ) : eligibility?.alreadyReviewed ? (
          <p className="text-sm text-neutral-400">你已經評價過這件商品，感謝分享！</p>
        ) : (
          <p className="text-sm text-neutral-400">
            購買並完成付款後，即可為這件商品留下評價。
          </p>
        )}
      </div>

      {/* 評價列表 */}
      {count > 0 && (
        <div className="mt-6 divide-y divide-neutral-100">
          {summary!.items.map((review) => (
            <div key={review.id} className="py-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-neutral-800">
                    {review.authorName}
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded border border-green-100 bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                    ✓ 已購買會員
                  </span>
                </div>
                <span className="text-xs font-medium text-neutral-400">
                  {formatDate(review.createdAt)}
                </span>
              </div>
              <Stars value={review.rating} className="mt-2 text-xs" />
              <p className="mt-2.5 text-sm leading-relaxed text-neutral-600">
                {review.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
