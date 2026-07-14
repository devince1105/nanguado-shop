import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/Toaster";
import { getSettings } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: {
      default: `${s.shopName}｜${s.shopTagline}`,
      template: `%s｜${s.shopName}`,
    },
    description: s.shopDescription,
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-TW">
      <body className="flex min-h-screen flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
