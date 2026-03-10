import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ReceiptSignedPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          Thank you for signing
        </h1>
        <p className="text-muted-foreground">
          Your signature has been recorded. You may close this window.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Return to Tommy D&apos;s
        </Link>
      </div>
    </main>
  );
}
