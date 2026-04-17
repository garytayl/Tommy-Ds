"use client";

import dynamic from "next/dynamic";

import { GlassNav } from "@/components/GlassNav";
import { ClisteFooter } from "@/components/ClisteFooter";
import { cn } from "@/lib/utils";

const Aurora = dynamic(() => import("@/components/Aurora").then((m) => m.default), {
  ssr: false,
});

const VIBRANT_STOPS = ["#7A1D2B", "#F5A623", "#7A1D2B"];
/* Dark maroon/gold tint so subtle aurora is visible but not loud */
const SUBTLE_STOPS = ["#1a0a0e", "#2d1810", "#1a0a0e"];

type PublicShellProps = {
  children: React.ReactNode;
  aurora?: boolean;
  /**
   * Edge-to-edge body: solid dark backdrop, no site footer, main is a flex column that can fill the viewport
   * below the floating nav (e.g. warehouse yard).
   */
  immersive?: boolean;
};

export function PublicShell({ children, aurora = false, immersive = false }: PublicShellProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col overflow-x-hidden",
        immersive ? "min-h-[100dvh] bg-[#050508]" : "bg-background",
      )}
    >
      {!immersive ? (
        <div className="fixed inset-0 h-full w-full">
          <Aurora
            colorStops={aurora ? VIBRANT_STOPS : SUBTLE_STOPS}
            amplitude={aurora ? 1.2 : 0.6}
            blend={aurora ? 0.6 : 0.4}
          />
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <GlassNav />
        <main
          className={cn(
            "flex-1",
            immersive
              ? "flex min-h-0 flex-col p-0 pt-[calc(env(safe-area-inset-top,0px)+4.5rem)] sm:pt-[calc(env(safe-area-inset-top,0px)+5rem)]"
              : "pt-20 md:pt-24",
          )}
        >
          {children}
        </main>
        {!immersive ? <ClisteFooter /> : null}
      </div>
    </div>
  );
}
