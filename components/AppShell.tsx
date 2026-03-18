"use client";

import dynamic from "next/dynamic";

import type { ProfileRole } from "@/lib/auth";
import { GlassNav, type GlassNavLink, type GlassNavSection } from "@/components/GlassNav";

const Aurora = dynamic(() => import("@/components/Aurora").then((m) => m.default), {
  ssr: false,
});

type Mode = "admin" | "field";

const ADMIN_PRIMARY_LINKS: GlassNavLink[] = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Today" },
  { href: "/m", label: "Installer" },
];

const FIELD_PRIMARY_LINKS: GlassNavLink[] = [
  { href: "/", label: "Home" },
  { href: "/m", label: "My jobs" },
  { href: "/admin", label: "Office" },
];

const ADMIN_CORE: GlassNavSection = {
  title: "Core",
  links: [
    { href: "/admin", label: "Today", description: "Dashboard summary" },
    { href: "/admin/search", label: "Search", description: "Find customers and jobs" },
    { href: "/admin/schedule", label: "Schedule", description: "Plan installer workload" },
    { href: "/admin/jobs", label: "Jobs", description: "Manage active installs" },
    { href: "/admin/customers", label: "Customers", description: "Customer records" },
    { href: "/admin/invoices", label: "Money", description: "Invoices and billing status" },
  ],
};

const ADMIN_SALES: GlassNavSection = {
  title: "Sales & planning",
  links: [
    { href: "/admin/leads", label: "Leads" },
    { href: "/admin/quotes", label: "Quotes" },
    { href: "/admin/materials", label: "Materials" },
    { href: "/admin/lots", label: "Lots" },
    { href: "/admin/locations", label: "Locations" },
  ],
};

const ADMIN_TEAM: GlassNavSection = {
  title: "Team & insights",
  links: [
    { href: "/admin/crews", label: "Installers" },
    { href: "/admin/team", label: "Team" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/future-features", label: "Future features" },
  ],
};

const OFFICE_TEAM: GlassNavSection = {
  title: "Team",
  links: [{ href: "/admin/crews", label: "Installers" }],
};

const FIELD_SECTIONS: GlassNavSection[] = [
  {
    title: "Field",
    links: [
      { href: "/m", label: "My jobs", description: "Assigned work for today" },
      { href: "/admin/jobs", label: "All jobs", description: "Read-only office view" },
      { href: "/admin/customers", label: "Customers", description: "Customer lookups" },
      { href: "/admin/invoices", label: "Invoices", description: "Open billing records" },
    ],
  },
];

function sectionsFor(mode: Mode, role?: ProfileRole): GlassNavSection[] {
  if (mode === "field") return FIELD_SECTIONS;
  if (role === "manager") return [ADMIN_CORE, ADMIN_SALES, OFFICE_TEAM];
  return [ADMIN_CORE, ADMIN_SALES, ADMIN_TEAM];
}

function primaryLinksFor(mode: Mode): GlassNavLink[] {
  return mode === "field" ? FIELD_PRIMARY_LINKS : ADMIN_PRIMARY_LINKS;
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
        <GlassNav primaryLinks={primaryLinks} menuSections={menuSections} />
        <main className={`mx-auto w-full ${maxWidth} px-3 pb-8 pt-20 sm:px-6 sm:pt-24`}>
          {children}
        </main>
      </div>
    </div>
  );
}
