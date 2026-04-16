"use client";

import dynamic from "next/dynamic";

import { GlassNav } from "@/components/GlassNav";
import { ClisteFooter } from "@/components/ClisteFooter";

const Aurora = dynamic(() => import("@/components/Aurora").then((m) => m.default), {
  ssr: false,
});

const VIBRANT_STOPS = ["#7A1D2B", "#F5A623", "#7A1D2B"];
/* Dark maroon/gold tint so subtle aurora is visible but not loud */
const SUBTLE_STOPS = ["#1a0a0e", "#2d1810", "#1a0a0e"];

type PublicShellProps = {
  children: React.ReactNode;
  aurora?: boolean;
};

export function PublicShell({ children, aurora = false }: PublicShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <div className="fixed inset-0 h-full w-full">
        <Aurora
          colorStops={aurora ? VIBRANT_STOPS : SUBTLE_STOPS}
          amplitude={aurora ? 1.2 : 0.6}
          blend={aurora ? 0.6 : 0.4}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <GlassNav />
        <main className="flex-1 pt-20 md:pt-24">{children}</main>
        <ClisteFooter />
      </div>
    </div>
  );
}
