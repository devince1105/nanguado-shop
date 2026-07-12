"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { API_URL, formatPrice } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import { useCartStore } from "@/lib/store/cart";
import { useToastStore } from "@/lib/store/toast";
import { calcShippingFee, type EcpayPayment, type Order } from "@/lib/types";

type FormFields = {
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientAddress: string;
};

/** 將綠界付款表單以隱藏 form POST 到綠界收銀台 */
function submitEcpayForm(payment: EcpayPayment) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = payment.action;
  for (const [name, value] of Object.entries(payment.params)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export default function CheckoutPage() {
  const router = useRouter();
  const cart = useCartStore((s) => s.cart);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const clearCart = useCartStore((s) => s.clear);
  const showToast = useToastStore((s) => s.show);

  const [fields, setFields] = useState<FormFields>({
    recipientName: "",
    recipientPhone: "",
    recipientEmail: "",
    recipientAddress: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    fetchCart().catch(() => {});
  }, [fetchCart]);

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const shippingFee = calcShippingFee(subtotal);
  const total = subtotal + shippingFee;

  // 購物車為空（且非付款跳轉中）導回購物車頁
  useEffect(() => {
    if (cart && items.length === 0 && !redirectingRef.current) {
      router.replace("/cart");
    }
  }, [cart, items.length, router]);

  function setField(key: keyof FormFields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId(), ...fields }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.message ?? `建立訂單失敗（${res.status}）`);
      }
      const order = body as Order;
      if (!order.payment) {
        throw new Error("訂單建立成功，但缺少付款資訊");
      }
      redirectingRef.current = true;
      clearCart();
      showToast("訂單建立成功，正在前往綠界付款頁…");
      submitEcpayForm(order.payment);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "結帳失敗", "error");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-neutral-200 px-4 py-2.5 text-sm focus:border-pumpkin-500 focus:outline-none";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-neutral-900">結帳</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px]"
      >
        {/* 左：收件人資料 */}
        <div>
          <h2 className="text-base font-bold text-neutral-900">收件人資料</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={fields.recipientName}
                onChange={setField("recipientName")}
                placeholder="王小明"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                手機 <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="tel"
                pattern="09\d{8}"
                title="請輸入 09 開頭的 10 碼手機號碼"
                value={fields.recipientPhone}
                onChange={setField("recipientPhone")}
                placeholder="0912345678"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="email"
                value={fields.recipientEmail}
                onChange={setField("recipientEmail")}
                placeholder="you@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                收件地址 <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={fields.recipientAddress}
                onChange={setField("recipientAddress")}
                placeholder="台北市信義區市府路 1 號"
                className={inputClass}
              />
            </div>
          </div>

          <h2 className="mt-8 text-base font-bold text-neutral-900">付款方式</h2>
          <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-pumpkin-600 bg-pumpkin-50 px-4 py-3.5">
            <input type="radio" checked readOnly className="accent-pumpkin-600" />
            <div>
              <p className="text-sm font-bold text-neutral-900">信用卡</p>
              <p className="text-xs text-neutral-500">
                由綠界科技（ECPay）提供安全加密付款
              </p>
            </div>
          </label>
        </div>

        {/* 右：訂單摘要 */}
        <aside className="h-fit rounded-2xl bg-neutral-50 p-6">
          <h2 className="text-base font-bold text-neutral-900">訂單摘要</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {item.product?.images[0] && (
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  )}
                  <span className="absolute -right-0 -top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-900/80 px-1 text-[10px] font-bold text-white">
                    {item.quantity}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-900">
                    {item.product?.name}
                  </p>
                  {item.selectedVariant && (
                    <p className="text-xs text-neutral-400">
                      {Object.values(item.selectedVariant).join("・")}
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium text-neutral-700">
                  {formatPrice((item.product?.price ?? 0) * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 space-y-2 border-t border-neutral-200 pt-4 text-sm">
            <div className="flex justify-between text-neutral-600">
              <span>商品總計</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>運費</span>
              <span>
                {shippingFee === 0 ? (
                  <span className="font-medium text-green-600">免運費</span>
                ) : (
                  formatPrice(shippingFee)
                )}
              </span>
            </div>
            <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-bold">
              <span>應付金額</span>
              <span className="text-pumpkin-700">{formatPrice(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || items.length === 0}
            className="mt-5 w-full rounded-full bg-pumpkin-600 py-3.5 text-base font-bold text-white transition-colors hover:bg-pumpkin-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {submitting ? "處理中…" : "確認付款"}
          </button>
          <Link
            href="/cart"
            className="mt-3 block text-center text-sm text-neutral-400 hover:text-neutral-600"
          >
            ← 回購物車
          </Link>
        </aside>
      </form>
    </div>
  );
}
