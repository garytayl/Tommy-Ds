"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const MOBILE_BREAKPOINT = 640;

/**
 * On small screens, when no layout param is set, redirect to week view
 * so mobile users see the week by default.
 */
export function ScheduleMobileWeekRedirect({ hasLayoutParam }: { hasLayoutParam: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (hasLayoutParam || didRedirect.current) return;
    const isMobile = typeof window !== "undefined" && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
    if (!isMobile) return;

    didRedirect.current = true;
    const params = new URLSearchParams(window.location.search);
    params.set("layout", "week");
    router.replace(`${pathname}?${params.toString()}`);
  }, [hasLayoutParam, pathname, router]);

  return null;
}
