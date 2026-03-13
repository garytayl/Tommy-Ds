"use client";

import { useEffect, useState } from "react";

const TOAST_COOKIE = "toast";

function getToastFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOAST_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return value || null;
}

function clearToastCookie(): void {
  document.cookie = `${TOAST_COOKIE}=; path=/; max-age=0`;
}

export function ToastViewer() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => {
      const value = getToastFromCookie();
      if (value) {
        clearToastCookie();
        setMessage(value);
        setVisible(true);
        const t = setTimeout(() => {
          setVisible(false);
          setTimeout(() => setMessage(null), 300);
        }, 3500);
        return () => clearTimeout(t);
      }
    };

    check();
    const interval = setInterval(check, 400);
    return () => clearInterval(interval);
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-xl border border-white/20 bg-card/95 px-5 py-3 shadow-lg backdrop-blur-md transition-all duration-300 ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
        {message}
      </span>
    </div>
  );
}
