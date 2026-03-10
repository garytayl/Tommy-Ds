export default function FutureFeaturesPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Future features
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ideas and programs to build next. Not yet implemented.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold text-foreground">
            Follow-up program
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Re-engage past customers with a complementary product after a chosen time.
          </p>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <p className="text-sm text-foreground">
            Reach out to someone who had a <strong>garage door</strong> installed and, after a
            configurable period (e.g. one year, or whatever Tommy D&apos;s chooses), ask if they
            want a <strong>window</strong> or a <strong>door</strong>. Or the other way around:
            customers who got a window or door can be contacted later and offered a garage door.
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Track original job type (garage door, window, door).</li>
            <li>Configurable follow-up delay (e.g. 1 year) per product type.</li>
            <li>List of customers due for follow-up; optional outreach (call, email, campaign).</li>
            <li>Cross-sell: garage door → window/door, or window/door → garage door.</li>
            <li>Track customer response (yes, no, maybe, no response).</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-2">
            This page is a placeholder. Implementation will add data model, scheduling, and
            outreach tools when ready.
          </p>
        </div>
      </section>
    </div>
  );
}
