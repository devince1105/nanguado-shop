"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { API_URL, formatPrice } from "@/lib/api";
import { getSessionId } from "@/lib/session";
import { useCartStore } from "@/lib/store/cart";
import { useToastStore } from "@/lib/store/toast";
import { useAuthStore } from "@/lib/store/auth";
import { calcShippingFee, type EcpayPayment, type Order } from "@/lib/types";

// 台灣公司統一編號 Checksum 校驗
function validateTaxId(taxId: string): boolean {
  if (!/^\d{8}$/.test(taxId)) return false;
  const multipliers = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;
  let hasSeven = false;
  for (let i = 0; i < 8; i++) {
    const num = parseInt(taxId[i]);
    const product = num * multipliers[i];
    sum += Math.floor(product / 10) + (product % 10);
    if (i === 6 && num === 7) hasSeven = true;
  }
  if (sum % 5 === 0) return true;
  if (hasSeven && (sum - 9) % 5 === 0) return true;
  return false;
}

type FormFields = {
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientAddress: string;
  shippingType: "home" | "cvs";
  cvsStoreId?: string;
  cvsStoreName?: string;
  cvsStoreAddress?: string;
  cvsSubType?: string;
  invoiceType: "individual" | "carrier" | "company" | "donate";
  carrierType: "member" | "mobile" | "natural";
  carrierNum: string;
  companyTaxId: string;
  companyTitle: string;
  donationCode: string;
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

  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [fields, setFields] = useState<FormFields>({
    recipientName: "",
    recipientPhone: "",
    recipientEmail: "",
    recipientAddress: "",
    shippingType: "home",
    cvsStoreId: "",
    cvsStoreName: "",
    cvsStoreAddress: "",
    cvsSubType: "UNIMARTC2C",
    invoiceType: "individual",
    carrierType: "member",
    carrierNum: "",
    companyTaxId: "",
    companyTitle: "",
    donationCode: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const redirectingRef = useRef(false);

  // 登入時自動帶入收件人資訊
  useEffect(() => {
    if (user) {
      setFields((prev) => ({
        ...prev,
        recipientName: user.name || prev.recipientName,
        recipientPhone: user.phone || prev.recipientPhone,
        recipientEmail: user.email || prev.recipientEmail,
        recipientAddress: prev.shippingType === "home" ? (user.address || prev.recipientAddress) : prev.recipientAddress,
      }));
    }
  }, [user]);

  // 監聽綠界電子地圖選擇完畢的回傳訊息
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // 驗證訊息來源 origin 是否與後端 API origin 相同，防止跨站腳本攻擊與惡意塞值
      const apiOrigin = new URL(API_URL).origin;
      if (event.origin !== apiOrigin) return;

      if (event.data?.type === "ECPAY_CVS_SELECT") {
        const { cvsStoreId, cvsStoreName, cvsStoreAddress, cvsSubType } = event.data;
        setFields((prev) => ({
          ...prev,
          cvsStoreId,
          cvsStoreName,
          cvsStoreAddress,
          cvsSubType,
          recipientAddress: `${cvsStoreName} (${cvsStoreId}) - ${cvsStoreAddress}`,
        }));
        showToast(`已選擇門市：${cvsStoreName}`);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [showToast]);

  // 彈出綠界電子地圖視窗
  function openEcpayMap(subType: string) {
    const width = 1024;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open("", "ecpayMap", `width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) {
      showToast("彈出視窗被瀏覽器阻擋，請開啟權限後重試！", "error");
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://logistics-stage.ecpay.com.tw/Express/map";
    form.target = "ecpayMap";

    const params = {
      MerchantID: "2000933",
      LogisticsType: "CVS",
      LogisticsSubType: subType,
      IsCollection: "N",
      ServerReplyURL: `${API_URL}/api/v1/ecpay/logistics-map-callback`,
      ExtraData: "",
    };

    for (const [key, value] of Object.entries(params)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  }

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

    // 額外驗證：若選擇超商取貨，必須選擇門市
    if (fields.shippingType === "cvs" && !fields.cvsStoreId) {
      showToast("請選擇超商取貨門市", "error");
      return;
    }

    // 發票開立額外驗證
    if (fields.invoiceType === "carrier") {
      if (fields.carrierType === "mobile") {
        if (!fields.carrierNum || !/^\/[0-9A-Z.+-]{7}$/.test(fields.carrierNum)) {
          showToast("手機條碼格式錯誤，應為 / 開頭加 7 碼英數或符號", "error");
          return;
        }
      } else if (fields.carrierType === "natural") {
        if (!fields.carrierNum || !/^[A-Z]{2}\d{14}$/.test(fields.carrierNum)) {
          showToast("自然人憑證格式錯誤，應為 2 碼大寫英文加 14 碼數字", "error");
          return;
        }
      }
    } else if (fields.invoiceType === "company") {
      if (!fields.companyTaxId || !validateTaxId(fields.companyTaxId)) {
        showToast("統一編號格式或檢查碼不正確", "error");
        return;
      }
      if (!fields.companyTitle) {
        showToast("請輸入公司抬頭", "error");
        return;
      }
    } else if (fields.invoiceType === "donate") {
      if (!fields.donationCode || !/^\d{3,7}$/.test(fields.donationCode)) {
        showToast("愛心碼格式錯誤，應為 3 至 7 碼數字", "error");
        return;
      }
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 如果是超商取貨，送出時 recipientAddress 將自動包含門市資訊
      const res = await fetch(`${API_URL}/api/v1/orders`, {
        method: "POST",
        headers,
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
            {fields.shippingType === "home" ? (
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
            ) : (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                    選擇超商通路 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-6 mt-1">
                    {(
                      [
                        { id: "UNIMARTC2C", label: "7-11" },
                        { id: "FAMIC2C", label: "全家" },
                        { id: "HILIFEC2C", label: "萊爾富" },
                      ] as const
                    ).map((opt) => (
                      <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700 font-medium">
                        <input
                          type="radio"
                          name="cvsSubType"
                          checked={fields.cvsSubType === opt.id}
                          onChange={() => setFields((prev) => ({
                            ...prev,
                            cvsSubType: opt.id,
                            cvsStoreId: "",
                            cvsStoreName: "",
                            cvsStoreAddress: "",
                            recipientAddress: "",
                          }))}
                          className="accent-pumpkin-600 h-4 w-4"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  {fields.cvsStoreName ? (
                    <div className="rounded-lg border border-pumpkin-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-2 mb-2">
                        <span className="inline-flex items-center rounded-full bg-pumpkin-100 px-2.5 py-0.5 text-xs font-semibold text-pumpkin-800">
                          {fields.cvsSubType === "UNIMARTC2C" ? "7-11" : fields.cvsSubType === "FAMIC2C" ? "全家" : "萊爾富"} {fields.cvsStoreName} ({fields.cvsStoreId})
                        </span>
                        <button
                          type="button"
                          onClick={() => openEcpayMap(fields.cvsSubType || "UNIMARTC2C")}
                          className="text-xs font-bold text-pumpkin-600 hover:text-pumpkin-700 hover:underline"
                        >
                          重新選擇門市
                        </button>
                      </div>
                      <p className="text-sm text-neutral-600 font-medium">{fields.cvsStoreAddress}</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openEcpayMap(fields.cvsSubType || "UNIMARTC2C")}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 py-5 text-sm font-semibold text-neutral-500 hover:border-pumpkin-500 hover:text-pumpkin-600 bg-white transition-all shadow-sm"
                    >
                      🏪 點擊開啟地圖選擇超商門市
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <h2 className="mt-8 text-base font-bold text-neutral-900">配送方式</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all ${fields.shippingType === "home" ? "border-pumpkin-600 bg-pumpkin-50/50 ring-2 ring-pumpkin-600/10" : "border-neutral-200 bg-white hover:border-neutral-300"}`}>
              <input
                type="radio"
                name="shippingType"
                checked={fields.shippingType === "home"}
                onChange={() => setFields((prev) => ({
                  ...prev,
                  shippingType: "home",
                  recipientAddress: "",
                  cvsStoreId: "",
                  cvsStoreName: "",
                  cvsStoreAddress: "",
                }))}
                className="accent-pumpkin-600 h-4 w-4"
              />
              <div>
                <p className="text-sm font-bold text-neutral-900">宅配到府</p>
                <p className="text-xs text-neutral-500">直接配送到您填寫的地址</p>
              </div>
            </label>

            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all ${fields.shippingType === "cvs" ? "border-pumpkin-600 bg-pumpkin-50/50 ring-2 ring-pumpkin-600/10" : "border-neutral-200 bg-white hover:border-neutral-300"}`}>
              <input
                type="radio"
                name="shippingType"
                checked={fields.shippingType === "cvs"}
                onChange={() => setFields((prev) => ({
                  ...prev,
                  shippingType: "cvs",
                  recipientAddress: "",
                  cvsStoreId: "",
                  cvsStoreName: "",
                  cvsStoreAddress: "",
                }))}
                className="accent-pumpkin-600 h-4 w-4"
              />
              <div>
                <p className="text-sm font-bold text-neutral-900">超商取貨</p>
                <p className="text-xs text-neutral-500">7-11 / 全家 / 萊爾富門市</p>
              </div>
            </label>
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

          <h2 className="mt-8 text-base font-bold text-neutral-900">發票資訊</h2>
          <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4 space-y-4 shadow-sm">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                發票類型 <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    { id: "individual", label: "個人雲端" },
                    { id: "carrier", label: "載具發票" },
                    { id: "company", label: "公司三聯" },
                    { id: "donate", label: "捐贈發票" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-xs font-semibold transition-all ${
                      fields.invoiceType === opt.id
                        ? "border-pumpkin-600 bg-pumpkin-50/50 text-pumpkin-800 ring-1 ring-pumpkin-600/10"
                        : "border-neutral-200 bg-white hover:border-neutral-300 text-neutral-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="invoiceType"
                      checked={fields.invoiceType === opt.id}
                      onChange={() =>
                        setFields((prev) => ({
                          ...prev,
                          invoiceType: opt.id,
                          carrierType: "member",
                          carrierNum: "",
                          companyTaxId: "",
                          companyTitle: "",
                          donationCode: "",
                        }))
                      }
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* 載具發票選項 */}
            {fields.invoiceType === "carrier" && (
              <div className="space-y-3 rounded-lg bg-neutral-50 p-3.5">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                    載具類型
                  </label>
                  <div className="flex gap-4 mt-1">
                    {(
                      [
                        { id: "member", label: "會員載具" },
                        { id: "mobile", label: "手機條碼" },
                        { id: "natural", label: "自然人憑證" },
                      ] as const
                    ).map((opt) => (
                      <label
                        key={opt.id}
                        className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-neutral-600"
                      >
                        <input
                          type="radio"
                          name="carrierType"
                          checked={fields.carrierType === opt.id}
                          onChange={() =>
                            setFields((prev) => ({
                              ...prev,
                              carrierType: opt.id,
                              carrierNum: "",
                            }))
                          }
                          className="accent-pumpkin-600 h-3.5 w-3.5"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {fields.carrierType === "mobile" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      手機條碼 <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      value={fields.carrierNum}
                      onChange={setField("carrierNum")}
                      placeholder="/ABC1234"
                      className={inputClass}
                    />
                  </div>
                )}

                {fields.carrierType === "natural" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-600">
                      自然人憑證 <span className="text-red-500">*</span>
                    </label>
                    <input
                      required
                      value={fields.carrierNum}
                      onChange={setField("carrierNum")}
                      placeholder="AB12345678901234"
                      className={inputClass}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 公司三聯式發票 */}
            {fields.invoiceType === "company" && (
              <div className="grid gap-3 rounded-lg bg-neutral-50 p-3.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    統一編號 <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    maxLength={8}
                    value={fields.companyTaxId}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFields((prev) => ({ ...prev, companyTaxId: val }));
                    }}
                    placeholder="12345678"
                    className={inputClass}
                  />
                  {fields.companyTaxId &&
                    fields.companyTaxId.length === 8 &&
                    !validateTaxId(fields.companyTaxId) && (
                      <p className="mt-1 text-xs font-semibold text-red-500">
                        ⚠️ 統一編號檢查碼驗證失敗，請再次確認。
                      </p>
                    )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    公司抬頭 <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={fields.companyTitle}
                    onChange={setField("companyTitle")}
                    placeholder="南瓜多工作室"
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* 捐贈發票 */}
            {fields.invoiceType === "donate" && (
              <div className="rounded-lg bg-neutral-50 p-3.5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    愛心碼 (3~7 碼) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    maxLength={7}
                    value={fields.donationCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setFields((prev) => ({ ...prev, donationCode: val }));
                    }}
                    placeholder="178"
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </div>
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
