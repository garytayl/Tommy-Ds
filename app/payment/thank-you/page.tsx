import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PaymentThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;
  const success = payment === "success";

  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {success
            ? "Thank you for your payment"
            : "Payment cancelled"}
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          {success
            ? "Your payment to Tommy D's Windows, Doors, & More has been received. We appreciate your business."
            : "You cancelled the payment. If you have questions or want to pay another way, please contact us."}
        </p>
        <div className="pt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Tommy D&apos;s Windows, Doors, & More, Inc.
            <br />
            3148 S. State Road 446, Bloomington, IN 47401
            <br />
            <a href="tel:812-330-8898" className="text-foreground font-medium hover:underline">
              812-330-8898
            </a>
          </p>
          <a
            href="https://tommyds.us"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Visit our website
          </a>
        </div>
      </div>
    </main>
  );
}
