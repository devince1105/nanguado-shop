import Link from "next/link";

export function Footer({
  shopName = "南瓜多 Shop",
  shopEmoji = "🎃",
  shopTagline = "原創設計商店，把喜歡的穿在身上。",
}: {
  shopName?: string;
  shopEmoji?: string;
  shopTagline?: string;
}) {
  return (
    <footer className="mt-16 border-t border-neutral-100 bg-neutral-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">{shopEmoji}</span>
            <span className="font-bold">{shopName}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            {shopTagline}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">關於我們</h3>
          <ul className="mt-3 space-y-2 text-sm text-neutral-500">
            <li>
              <Link href="/pages/about" className="hover:text-pumpkin-600">
                品牌故事
              </Link>
            </li>
            <li>
              <Link href="/pages/terms" className="hover:text-pumpkin-600">
                服務條款
              </Link>
            </li>
            <li>
              <Link href="/pages/privacy" className="hover:text-pumpkin-600">
                隱私權及網站使用條款
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">商品導覽</h3>
          <ul className="mt-3 space-y-2 text-sm text-neutral-500">
            <li>
              <Link href="/products" className="hover:text-pumpkin-600 font-medium">
                逛逛全部商品 →
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">客服資訊</h3>
          <ul className="mt-3 space-y-2 text-sm text-neutral-500">
            <li>
              <Link
                href="/pages/shopping-guide"
                className="hover:text-pumpkin-600"
              >
                購物說明
              </Link>
            </li>
            <li>
              <Link href="/pages/returns" className="hover:text-pumpkin-600">
                退換貨政策
              </Link>
            </li>
            <li>
              <Link
                href="/pages/member-rights"
                className="hover:text-pumpkin-600"
              >
                會員權益聲明
              </Link>
            </li>
            <li>
              <Link href="/pages/contact" className="hover:text-pumpkin-600">
                聯絡我們
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-100 py-4 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} {shopName}. All rights reserved.
      </div>
    </footer>
  );
}
