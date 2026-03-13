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
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link?.href?.startsWith(window.location.origin)) {
        const url = new URL(link.href);

        if (url.pathname !== pathname && !url.hash) {
          e.preventDefault();
          setIsTransitioning(true);

          setTimeout(() => {
            router.push(url.pathname);
          }, 300);
        }
      }
    };

    document.addEventListener("click", handleLinkClick);

    return () => {
      document.removeEventListener("click", handleLinkClick);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (pathname !== previousPathname.current) {
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);

      previousPathname.current = pathname;
    }
  }, [pathname, isTransitioning]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black pointer-events-none transition-opacity duration-300 ease-in-out ${
        isTransitioning ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
