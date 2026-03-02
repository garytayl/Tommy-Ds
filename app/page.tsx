export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-5 sm:p-8">
      <section className="card">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Field Service Scheduler MVP
        </h1>
        <p className="mt-3 text-sm text-zinc-600 sm:text-base">
          Mobile-friendly scheduling, invoicing, and payment collection for field
          installer teams.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="/admin"
          className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-zinc-900">Admin Dashboard</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Manage customers, jobs, invoices, and payment status.
          </p>
        </a>
        <a
          href="/m"
          className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-zinc-900">Installer Mobile View</h2>
          <p className="mt-2 text-sm text-zinc-600">
            See today&apos;s jobs, collect payment, upload photos.
          </p>
        </a>
      </div>
    </main>
  );
}
