import Link from "next/link";

import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function CustomerPaymentDemoPage() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 container mx-auto px-4 py-10 md:py-14 md:px-6 max-w-2xl">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Demo</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Customer payment flow
        </h1>
        <p className="mt-2 text-muted-foreground">
          What the customer sees when they pay — e.g. tap to pay from the installer&apos;s phone.
        </p>
        <ol className="mt-8 list-decimal list-inside space-y-4 text-muted-foreground">
          <li>Installer taps &quot;Collect payment&quot; on their phone and sends the link to the customer (text, email, or in person).</li>
          <li>Customer opens the link on their phone.</li>
          <li>Customer pays on Stripe Checkout (card or tap to pay).</li>
          <li>Customer sees the thank-you page.</li>
        </ol>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/payment/thank-you?payment=success"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            See thank-you page (demo)
          </Link>
          <Link
            href="/payment/thank-you?payment=cancel"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-muted transition"
          >
            See cancelled flow (demo)
          </Link>
        </div>
      </div>
      <Footer />
    </main>
  );
}
