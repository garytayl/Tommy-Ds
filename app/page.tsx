export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-3xl font-semibold">Field Service Scheduler MVP</h1>
      <p className="text-sm text-zinc-600">
        Core skeleton is ready. Use these entry points:
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="/admin"
          className="rounded-lg border bg-white p-4 hover:bg-zinc-50"
        >
          <h2 className="font-semibold">Admin Dashboard</h2>
          <p className="text-sm text-zinc-600">
            Manage customers, jobs, invoices, and payment status.
          </p>
        </a>
        <a href="/m" className="rounded-lg border bg-white p-4 hover:bg-zinc-50">
          <h2 className="font-semibold">Installer Mobile View</h2>
          <p className="text-sm text-zinc-600">
            See today&apos;s jobs, collect payment, upload photos.
          </p>
        </a>
      </div>
    </main>
  );
}
