import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { API_URL, formatPrice } from "@/lib/api";
import type { Order } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: "訂單完成" };

async function getOrder(id: string): Promise<Order | null> {
  const res = await fetch(`${API_URL}/api/v1/orders/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

const STATUS_LABELS: Record<string, string> = {
  pending: "待付款",
  paid: "已付款",
  shipped: "已出貨",
  completed: "已完成",
  cancelled: "已取消",
};

export default async function OrderSuccessPage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      {/* 綠色打勾 */}
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-bold text-neutral-900">
          {order.isPaid ? "付款成功！" : "訂單已成立"}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          {order.isPaid
            ? "感謝您的購買，我們將盡快為您出貨。"
            : "已收到您的訂單，付款完成後將盡快為您出貨。"}
        </p>
      </div>

      {/* 訂單資訊 */}
      <div className="mt-8 rounded-2xl border border-neutral-100 p-6">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-neutral-400">訂單編號</p>
            <p className="mt-0.5 font-mono font-medium text-neutral-900">
              {order.merchantTradeNo}
            </p>
          </div>
          <div>
            <p className="text-neutral-400">訂單狀態</p>
            <p className="mt-0.5 font-medium text-neutral-900">
              {STATUS_LABELS[order.status] ?? order.status}
              {order.isPaid && order.paymentType && (
                <span className="ml-2 text-xs text-neutral-400">
                  （{order.paymentType}）
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-neutral-400">收件人</p>
            <p className="mt-0.5 font-medium text-neutral-900">
              {order.recipientName}・{order.recipientPhone}
            </p>
          </div>
          <div>
            <p className="text-neutral-400">收件地址</p>
            <p className="mt-0.5 font-medium text-neutral-900">
              {order.recipientAddress}
            </p>
          </div>
        </div>

        <ul className="mt-6 space-y-3 border-t border-neutral-100 pt-5">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                {item.productImage && (
                  <Image
                    src={item.productImage}
                    alt={item.productName}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-900">
                  {item.productName}
                </p>
                <p className="text-xs text-neutral-400">
                  {item.selectedVariant &&
                    `${Object.values(item.selectedVariant).join("・")}・`}
                  x{item.quantity}
                </p>
              </div>
              <span className="text-sm font-medium">
                {formatPrice(item.unitPrice * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 space-y-1.5 border-t border-neutral-100 pt-4 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>商品總計</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>運費</span>
            <span>
              {order.shippingFee === 0 ? "免運費" : formatPrice(order.shippingFee)}
            </span>
          </div>
          <div className="flex justify-between pt-2 text-base font-bold">
            <span>應付金額</span>
            <span className="text-pumpkin-700">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/products"
          className="inline-block rounded-full bg-pumpkin-600 px-10 py-3 text-sm font-bold text-white transition-colors hover:bg-pumpkin-700"
        >
          繼續購物
        </Link>
      </div>
    </div>
  );
}
