export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 p-6 sm:p-10">
      <section className="card-elevated text-center">
        <h1
          className="text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ color: "var(--foreground)" }}
        >
          Field Service Scheduler
        </h1>
        <p className="mt-3 text-base" style={{ color: "var(--muted)" }}>
          Mobile-friendly scheduling, invoicing, and payment collection for
          field installer teams.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="/admin"
          className="card block p-6 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            Admin Dashboard
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Manage customers, jobs, invoices, and payment status.
          </p>
          <span className="mt-3 inline-block text-sm font-medium" style={{ color: "var(--primary)" }}>
            Open dashboard →
          </span>
        </a>
        <a
          href="/m"
          className="card block p-6 transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            Installer Mobile View
          </h2>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            See today&apos;s jobs, collect payment, upload photos.
          </p>
          <span className="mt-3 inline-block text-sm font-medium" style={{ color: "var(--primary)" }}>
            Open installer view →
          </span>
        </a>
      </div>
    </main>
  );
}
