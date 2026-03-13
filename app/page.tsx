import Link from "next/link";

import { PublicShell } from "@/components/PublicShell";

export default function Home() {
  return (
    <PublicShell aurora>
      {/* Hero with cliste-style fade-in animations */}
      <section className="relative flex min-h-[42vh] flex-col items-center justify-center overflow-hidden px-4 py-20 md:min-h-[50vh] md:py-24">
        <p className="animate-fade-in-badge text-xs uppercase tracking-[0.25em] text-primary-foreground/80 md:text-sm">
          Tommy D&apos;s Windows, Doors, & More
        </p>
        <h1 className="animate-fade-in-heading mt-3 max-w-2xl text-center font-medium tracking-tight text-primary-foreground md:text-4xl lg:text-5xl">
          Scheduling, invoicing,{" "}
          <span className="text-accent-gold">and payments</span>
          <br />
          <span className="text-primary-foreground/90 text-2xl md:text-3xl lg:text-4xl">
            for our team
          </span>
        </h1>
        <p className="animate-fade-in-subheading mt-4 text-center text-sm text-primary-foreground/70">
          Internal proof of concept — no sign-in required
        </p>
        <a
          href="#hub"
          className="animate-fade-in-buttons mt-8 flex flex-col items-center gap-1 text-primary-foreground/80 transition hover:text-accent-gold"
          aria-label="Scroll to get started"
        >
          <span className="text-xs uppercase tracking-widest">Get started</span>
          <svg className="h-5 w-5 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </a>
      </section>

      <div className="container mx-auto max-w-4xl flex-1 px-4 py-12 md:px-6 md:py-16">
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5 mb-10">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Pay your bill
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a check to the address on your bill, or pay online: use your invoice number at{" "}
            <Link href="/pay" className="text-primary font-medium hover:underline">
              Pay your invoice
            </Link>{" "}
            or use the link we sent you.
          </p>
        </section>

        <h2 id="hub" className="scroll-mt-8 text-lg font-medium tracking-tight text-muted-foreground">
          Open a view
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin"
            className="group rounded-xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <span className="block h-1 w-12 rounded-full bg-primary/80 group-hover:bg-primary" />
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              Admin
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Dashboard, customers, jobs, invoices. Office view.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-primary">
              Open Admin →
            </span>
          </Link>
          <Link
            href="/m"
            className="group rounded-xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <span className="block h-1 w-12 rounded-full bg-primary/80 group-hover:bg-primary" />
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              Installer
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Today&apos;s jobs, collect payment link, notes, photos. Field view.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-primary">
              Open Installer view →
            </span>
          </Link>
          <Link
            href="/demo/customer-payment"
            className="group rounded-xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <span className="block h-1 w-12 rounded-full bg-primary/80 group-hover:bg-primary" />
            <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              Customer payment (demo)
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              What the customer sees: tap-to-pay / pay link flow.
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-primary">
              See customer flow →
            </span>
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
