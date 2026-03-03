import Link from "next/link";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 container mx-auto px-4 py-12 md:py-16 md:px-6 max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Internal scheduling & billing (PoC)
        </h1>
        <p className="mt-2 text-muted-foreground">
          Use the links below or the menu to open each part of the system.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin"
            className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <h2 className="text-lg font-semibold text-foreground">Admin</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Dashboard, customers, jobs, invoices. Office view.
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-primary">
              Open Admin →
            </span>
          </Link>
          <Link
            href="/m"
            className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <h2 className="text-lg font-semibold text-foreground">Installer</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Today&apos;s jobs, collect payment link, notes, photos. Field view.
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-primary">
              Open Installer view →
            </span>
          </Link>
          <Link
            href="/demo/customer-payment"
            className="rounded-xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <h2 className="text-lg font-semibold text-foreground">Customer payment (demo)</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              What the customer sees: tap-to-pay / pay link flow.
            </p>
            <span className="mt-3 inline-block text-sm font-medium text-primary">
              See customer flow →
            </span>
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
