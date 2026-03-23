"use client";

import dynamic from "next/dynamic";

import type { ProfileRole } from "@/lib/auth";
import { GlassNav, type GlassNavLink, type GlassNavSection } from "@/components/GlassNav";

const Aurora = dynamic(() => import("@/components/Aurora").then((m) => m.default), {
  ssr: false,
});

type Mode = "admin" | "field";

const ADMIN_CORE: GlassNavSection = {
  title: "Core",
  links: [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/schedule", label: "Schedule" },
    { href: "/admin/jobs", label: "Jobs" },
    { href: "/admin/customers", label: "Customers" },
    { href: "/admin/invoices", label: "Invoices" },
    { href: "/admin/search", label: "Search" },
  ],
};

const ADMIN_SALES: GlassNavSection = {
  title: "Sales",
  links: [
    { href: "/admin/leads", label: "Leads" },
    { href: "/admin/quotes", label: "Quotes" },
  ],
};

const ADMIN_INVENTORY: GlassNavSection = {
  title: "Inventory",
  links: [
    { href: "/admin/materials", label: "Materials" },
    { href: "/admin/lots", label: "Lots" },
    { href: "/admin/locations", label: "Locations" },
  ],
};

const ADMIN_TEAM: GlassNavSection = {
  title: "Team",
  links: [
    { href: "/admin/crews", label: "Crews" },
    { href: "/admin/team", label: "Team" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/future-features", label: "Future" },
  ],
};

const OFFICE_TEAM: GlassNavSection = {
  title: "Team",
  links: [{ href: "/admin/crews", label: "Crews" }],
};

/** Installers cannot access /admin/* — keep links under /m only. */
const FIELD_SECTIONS: GlassNavSection[] = [
  {
    title: "Field",
    links: [{ href: "/m", label: "My jobs" }],
  },
];

const ADMIN_PRIMARY: GlassNavLink[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/invoices", label: "Invoices" },
];

const FIELD_PRIMARY: GlassNavLink[] = [{ href: "/m", label: "My jobs" }];

function sectionsFor(mode: Mode, role?: ProfileRole): GlassNavSection[] {
  if (mode === "field") return FIELD_SECTIONS;
  if (role === "manager") return [ADMIN_CORE, ADMIN_SALES, ADMIN_INVENTORY, OFFICE_TEAM];
  return [ADMIN_CORE, ADMIN_SALES, ADMIN_INVENTORY, ADMIN_TEAM];
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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="fixed inset-0 h-full w-full">
        <Aurora
          colorStops={["#1a0a0e", "#2d1810", "#1a0a0e"]}
          amplitude={0.6}
          blend={0.4}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <GlassNav mode={mode} primaryLinks={primaryLinks} menuSections={menuSections} />
        <main className={`mx-auto w-full ${maxWidth} px-3 pb-8 pt-20 sm:px-6 sm:pt-24`}>
          {children}
        </main>
      </div>
    </div>
  );
}
