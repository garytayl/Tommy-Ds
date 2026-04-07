import Link from "next/link";

import { PublicShell } from "@/components/PublicShell";

const cardBase =
  "group rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background";

export default function Home() {
  return (
    <PublicShell aurora>
      {/* Hero with cliste-style fade-in animations */}
      <section className="relative flex min-h-[38vh] flex-col items-center justify-center overflow-hidden px-4 py-16 md:min-h-[44vh] md:py-20">
        <p className="animate-fade-in-badge text-xs uppercase tracking-[0.25em] text-primary-foreground/80 md:text-sm">
          Tommy D&apos;s Windows, Doors, & More
        </p>
        <h1 className="animate-fade-in-heading mt-3 max-w-2xl text-center font-medium tracking-tight text-primary-foreground md:text-4xl lg:text-5xl">
          Scheduling and invoicing{" "}
          <span className="text-accent-gold">for the team</span>
          <br />
          <span className="text-2xl text-primary-foreground/90 md:text-3xl lg:text-4xl">
            at Tommy D&apos;s
          </span>
        </h1>
        <p className="animate-fade-in-subheading mt-4 text-center text-sm text-primary-foreground/70">
          Internal proof of concept — no sign-in required
        </p>
        <a
          href="#hub"
          className="animate-fade-in-buttons mt-6 flex flex-col items-center gap-1 text-primary-foreground/80 transition hover:text-accent-gold"
          aria-label="Scroll to get started"
        >
          <span className="text-xs uppercase tracking-widest">Get started</span>
          <svg className="h-5 w-5 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </a>
      </section>

      {/* Content: one clear block with consistent spacing and glass treatment */}
      <div id="hub" className="scroll-mt-6 container mx-auto max-w-4xl flex-1 px-4 pb-16 pt-6 md:px-6 md:pt-8">
        {/* Open a view — section label + cards in one visual group */}
        <h2 className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Open a view
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/warehouse" className={cardBase}>
            <span className="block h-1 w-10 rounded-full bg-primary/80 transition group-hover:bg-primary" />
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              Warehouse map
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Upper warehouse floor plans — windows, doors, screens, and inventory zones. Shared with the team.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-accent-gold">
              Open map →
            </span>
          </Link>
          <Link href="/admin" className={cardBase}>
            <span className="block h-1 w-10 rounded-full bg-primary/80 transition group-hover:bg-primary" />
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              Admin
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Dashboard, customers, jobs, invoices. Office view.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-accent-gold">
              Open Admin →
            </span>
          </Link>
          <Link href="/m" className={cardBase}>
            <span className="block h-1 w-10 rounded-full bg-primary/80 transition group-hover:bg-primary" />
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              Installer
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Today&apos;s jobs, notes, photos. Field view.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-accent-gold">
              Open Installer view →
            </span>
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
