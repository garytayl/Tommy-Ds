"use client";

import dynamic from "next/dynamic";

import { GlassNav } from "@/components/GlassNav";
import { ClisteFooter } from "@/components/ClisteFooter";

const Aurora = dynamic(() => import("@/components/Aurora").then((m) => m.default), {
  ssr: false,
});

type PublicShellProps = {
  children: React.ReactNode;
  aurora?: boolean;
};

export function PublicShell({ children, aurora = false }: PublicShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      {aurora && (
        <div className="fixed inset-0 h-full w-full">
          <Aurora
            colorStops={["#7A1D2B", "#F5A623", "#7A1D2B"]}
            amplitude={1.2}
            blend={0.6}
          />
        </div>
      )}

      <div className="relative z-10 flex min-h-screen flex-col">
        <GlassNav />
        <main className="flex-1">{children}</main>
        <ClisteFooter />
      </div>
    </div>
  );
}
