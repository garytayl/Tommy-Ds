/** Instant shell while the warehouse client chunk and Supabase data load. */
export default function WarehouseLoading() {
  return (
    <div className="flex min-h-[min(72dvh,640px)] flex-col bg-[#050508]">
      <div className="shrink-0 border-b border-white/10 px-4 py-4 md:px-8">
        <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
        <div className="mt-3 h-8 max-w-xs animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-10 max-w-lg animate-pulse rounded bg-white/5" />
      </div>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 animate-pulse rounded-full border-2 border-white/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading warehouse…</p>
        </div>
      </div>
    </div>
  );
}
