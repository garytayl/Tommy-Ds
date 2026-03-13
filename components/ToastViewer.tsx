"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const TOAST_COOKIE = "toast";
const TOAST_DURATION_MS = 5000;

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
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const check = () => {
      const value = getToastFromCookie();
      if (value) {
        clearToastCookie();
        setMessage(value);
        setExiting(false);
        setVisible(true);
        const t = setTimeout(() => {
          setExiting(true);
          setTimeout(() => {
            setVisible(false);
            setMessage(null);
            setExiting(false);
          }, 280);
        }, TOAST_DURATION_MS);
        return () => clearTimeout(t);
      }
    };

    check();
    const interval = setInterval(check, 400);
    return () => clearInterval(interval);
  }, []);

  function dismiss() {
    if (!message) return;
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setMessage(null);
      setExiting(false);
    }, 280);
  }

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed left-1/2 z-[200] -translate-x-1/2 ${
        visible ? "bottom-20 sm:bottom-8" : "bottom-20 sm:bottom-8 pointer-events-none"
      }`}
    >
      <div
        className={`
          flex items-center gap-3 rounded-2xl border-2 border-accent-gold/50 bg-card px-4 py-3.5 shadow-xl
          ring-2 ring-accent-gold/20
          ${visible && !exiting ? "animate-toast-in" : ""}
          ${exiting ? "animate-toast-out" : ""}
        `}
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-gold/20 text-accent-gold" aria-hidden>
          <CheckCircle2 className="h-6 w-6" strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground sm:text-base">
          {message}
        </span>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/10 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-accent-gold/50"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
