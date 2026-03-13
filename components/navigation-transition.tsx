"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export function NavigationTransition() {
  const pathname = usePathname();
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      try {
        const target = e.target as HTMLElement;
        const link = target?.closest?.("a");
        if (!link?.href) return;

        const origin = typeof window !== "undefined" ? window.location.origin : "";
        if (!origin || !link.href.startsWith(origin)) return;

        const url = new URL(link.href);
        if (url.pathname !== pathname && !url.hash) {
          e.preventDefault();
          setIsTransitioning(true);
          const nextPath = url.pathname + (url.search || "");
          setTimeout(() => {
            router.push(nextPath);
          }, 300);
        }
      } catch {
        // ignore URL or navigation errors
      }
    };

    document.addEventListener("click", handleLinkClick);
    return () => document.removeEventListener("click", handleLinkClick);
  }, [pathname, router]);

  useEffect(() => {
    if (pathname !== previousPathname.current) {
      previousPathname.current = pathname;
      const t = setTimeout(() => setIsTransitioning(false), 50);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black pointer-events-none transition-opacity duration-300 ease-in-out ${
        isTransitioning ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
