import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/layout/CartDrawer";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { getSettings } from "@/lib/api";

/** 前台商店版型：Header / Footer / 購物車 Drawer（後台 /admin 不套用） */
export default async function ShopLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();

  return (
    <>
      <Header shopName={settings.shopName} shopEmoji={settings.shopEmoji} />
      <main className="flex-1">{children}</main>
      <Footer
        shopName={settings.shopName}
        shopEmoji={settings.shopEmoji}
        shopTagline={settings.shopTagline}
      />
      <CartDrawer />
      <SearchOverlay />
    </>
  );
}
