"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const features = [
  {
    id: 1,
    title: "Admin Dashboard",
    category: "Office",
    detail: "Customers, jobs, invoices",
    tag: "Manage",
  },
  {
    id: 2,
    title: "Installer View",
    category: "Mobile",
    detail: "Today's jobs, notes, photos",
    tag: "Field",
  },
  {
    id: 3,
    title: "Invoicing",
    category: "Per job",
    detail: "Line items, tax, status",
    tag: "Billing",
  },
  {
    id: 4,
    title: "Status tracking",
    category: "Workflow",
    detail: "Job and invoice progress",
    tag: "Ops",
  },
];

export function Projects() {
  return (
    <section id="projects" className="py-32 md:py-29 bg-secondary/50">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div>
            <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mb-6">
              In the app
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight">
              What’s in the app
            </h2>
          </div>
          <Link
            href="#contact"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            Get started
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {features.map((feature) => (
            <article
              key={feature.id}
              className="group rounded-xl border border-border bg-card p-6 transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-medium mb-2 group-hover:underline underline-offset-4">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.category} · {feature.detail}
                  </p>
                </div>
                <span className="text-muted-foreground/60 text-sm font-medium">
                  {feature.tag}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
