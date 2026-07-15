"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth";
import { useToastStore } from "@/lib/store/toast";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton({
  redirectUrl = "/",
}: {
  redirectUrl?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const showToast = useToastStore((s) => s.show);

  const init = useCallback(() => {
    if (!CLIENT_ID || !window.google || !ref.current) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: async (response: { credential?: string }) => {
        if (!response.credential) return;
        try {
          await googleLogin(response.credential);
          showToast("登入成功！");
          router.push(redirectUrl);
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Google 登入失敗",
            "error",
          );
        }
      },
    });
    window.google.accounts.id.renderButton(ref.current, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      text: "continue_with",
      locale: "zh_TW",
      width: Math.min(ref.current.offsetWidth || 360, 400),
    });
  }, [googleLogin, router, redirectUrl, showToast]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    if (window.google) {
      init();
      return;
    }
    const existing = document.getElementById("google-gsi-script");
    if (existing) {
      existing.addEventListener("load", init);
      return () => existing.removeEventListener("load", init);
    }
    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = init;
    document.head.appendChild(script);
  }, [init]);

  // 未設定 Client ID 時不顯示（尚未接上 Google）
  if (!CLIENT_ID) return null;

  return (
    <div className="space-y-4">
      <div ref={ref} className="flex justify-center" />
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-neutral-200" />
        <span className="text-xs text-neutral-400">或</span>
        <span className="h-px flex-1 bg-neutral-200" />
      </div>
    </div>
  );
}
