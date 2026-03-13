import Link from "next/link";

import { PublicShell } from "@/components/PublicShell";

export default function CustomerPaymentDemoPage() {
  return (
    <PublicShell>
      <div className="container mx-auto max-w-2xl flex-1 px-4 pb-12 pt-6 md:px-6 md:pb-16 md:pt-8">
        <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground">Demo</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Customer payment flow
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          What the customer sees when they pay. The installer copies the pay link and can send it by text, email, or open it for the customer to pay in person.
        </p>
        <ol className="mt-8 list-decimal list-inside space-y-4 text-sm leading-relaxed text-muted-foreground">
          <li>Installer taps &quot;Copy pay link&quot; — the link is copied to the clipboard. They can send it (text, email) or tap &quot;Open pay page&quot; to show it on their device.</li>
          <li>Customer opens the link (on their phone or the installer&apos;s).</li>
          <li>Customer pays on Stripe Checkout: card, Apple Pay, or Google Pay. <strong className="text-foreground">Tap to pay (Apple Pay / Google Pay) works automatically</strong> when the customer opens the link on a supported device (e.g. iPhone in Safari, Android in Chrome) — no extra setup.</li>
          <li>Customer sees the thank-you page; the job balance updates.</li>
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
            className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-foreground hover:bg-white/10 transition"
          >
            See cancelled flow (demo)
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
