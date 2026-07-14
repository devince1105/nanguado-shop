import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-100 bg-neutral-50">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎃</span>
            <span className="font-bold">南瓜多 Shop</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-neutral-500">
            台灣原創設計商店，把台灣味穿在身上。
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">購物分類</h3>
          <ul className="mt-3 space-y-2 text-sm text-neutral-500">
            <li>
              <Link href="/categories/t-shirt" className="hover:text-pumpkin-600">
                T恤類
              </Link>
            </li>
            <li>
              <Link
                href="/categories/hats-accessories"
                className="hover:text-pumpkin-600"
              >
                帽子配件
              </Link>
            </li>
            <li>
              <Link
                href="/categories/cultural-goods"
                className="hover:text-pumpkin-600"
              >
                文創小物
              </Link>
            </li>
          </ul>
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
              <Link href="/pages/returns" className="hover:text-pumpkin-600">
                退換貨政策
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
        © {new Date().getFullYear()} 南瓜多 Shop. All rights reserved.
      </div>
    </footer>
  );
}
