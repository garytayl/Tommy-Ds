import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-foreground">Payment canceled</h1>
      <p className="text-sm text-muted-foreground">
        This checkout was canceled. You can close this page or return to the app.
      </p>
      <div>
        <Link href="/" className="btn-secondary inline-flex">
          Back to home
        </Link>
      </div>
    </div>
  );
}
