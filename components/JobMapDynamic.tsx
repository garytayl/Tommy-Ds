"use client";

import dynamic from "next/dynamic";

const JobMap = dynamic(() => import("@/components/JobMap").then((m) => m.JobMap), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-border bg-muted/30 h-[240px] flex items-center justify-center text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

type JobMapDynamicProps = {
  address: string;
  title?: string;
  height?: number;
};

export function JobMapDynamic({ address, title, height = 240 }: JobMapDynamicProps) {
  return <JobMap address={address} title={title} height={height} />;
}
