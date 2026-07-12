"use client";

import { useToastStore } from "@/lib/store/toast";

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => dismiss(toast.id)}
          className={`pointer-events-auto flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all ${
            toast.type === "success" ? "bg-neutral-900" : "bg-red-600"
          }`}
        >
          <span>{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.message}
        </button>
      ))}
    </div>
  );
}
