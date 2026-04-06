"use client";

import dynamic from "next/dynamic";

import type { ProfileRole } from "@/lib/auth";
import { GlassNav, type GlassNavLink, type GlassNavSection } from "@/components/GlassNav";

const Aurora = dynamic(() => import("@/components/Aurora").then((m) => m.default), {
  ssr: false,
});

type Mode = "admin" | "field";

/** Launchpad “Core” — same order as top nav: run the business. */
const ADMIN_PRIMARY: GlassNavLink[] = [
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/quotes", label: "Estimates" },
];

const FIELD_PRIMARY: GlassNavLink[] = [{ href: "/m", label: "My jobs" }];

const ADMIN_LOOKUP: GlassNavSection = {
  title: "Look up",
  links: [
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/invoices", label: "Invoices" },
    { href: "/admin/billings", label: "Billings" },
  ],
};

const INSIGHTS_LINKS: GlassNavLink[] = [
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/reports/gas", label: "Gas" },
];

const YARD_LINKS: GlassNavLink[] = [
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/lots", label: "Lots" },
  { href: "/admin/materials", label: "Materials" },
  { href: "/admin/scan", label: "Scan" },
];

const ADMIN_TOOLS_ADMIN: GlassNavSection = {
  title: "Tools & back office",
  groups: [
    { title: "Insights", links: INSIGHTS_LINKS },
    {
      title: "Team & crews",
      links: [
        { href: "/admin/crews", label: "Crews" },
        { href: "/admin/team", label: "Team" },
      ],
    },
    { title: "Yard & inventory", links: YARD_LINKS },
    {
      title: "Labs",
      links: [{ href: "/admin/future-features", label: "Future features" }],
    },
  ],
};

const ADMIN_TOOLS_MANAGER: GlassNavSection = {
  title: "Tools & back office",
  groups: [
    { title: "Insights", links: INSIGHTS_LINKS },
    {
      title: "Team & crews",
      links: [{ href: "/admin/crews", label: "Crews" }],
    },
    { title: "Yard & inventory", links: YARD_LINKS },
    {
      title: "Labs",
      links: [{ href: "/admin/future-features", label: "Future features" }],
    },
  ],
};

function sectionsFor(mode: Mode, role?: ProfileRole): GlassNavSection[] {
  if (mode === "field") return [];
  if (role === "manager") return [ADMIN_LOOKUP, ADMIN_TOOLS_MANAGER];
  return [ADMIN_LOOKUP, ADMIN_TOOLS_ADMIN];
}

function primaryLinksFor(mode: Mode): GlassNavLink[] {
  if (mode === "field") return FIELD_PRIMARY;
  return ADMIN_PRIMARY;
}

export function AppShell({
  mode,
  role,
  children,
}: {
  mode: Mode;
  role?: ProfileRole;
  children: React.ReactNode;
}) {
  const menuSections = sectionsFor(mode, role);
  const primaryLinks = primaryLinksFor(mode);
  const maxWidth = mode === "field" ? "max-w-3xl" : "max-w-6xl";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background print:min-h-0 print:overflow-visible print:bg-white">
      <div className="fixed inset-0 h-full w-full print:hidden">
        <Aurora
          colorStops={["#1a0a0e", "#2d1810", "#1a0a0e"]}
          amplitude={0.6}
          blend={0.4}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col print:min-h-0 print:block">
        <GlassNav mode={mode} primaryLinks={primaryLinks} menuSections={menuSections} />
        <main
          className={`mx-auto w-full ${maxWidth} px-3 pb-8 pt-20 print:max-w-none print:overflow-visible print:px-0 print:pb-0 print:pt-0 sm:px-6 sm:pt-24`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
