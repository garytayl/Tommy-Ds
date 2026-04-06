import Link from "next/link";

export default function PaymentSuccessPage() {
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-semibold text-foreground">Payment received</h1>
      <p className="text-sm text-muted-foreground">
        Thanks. Your payment was submitted successfully.
      </p>
      <div>
        <Link href="/" className="btn-primary inline-flex">
          Back to home
        </Link>
      </div>
    </div>
  );
}
