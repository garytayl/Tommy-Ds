"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HighlightedText } from "./highlighted-text";

export function CallToAction() {
  return (
    <section
      id="contact"
      className="py-32 md:py-29 bg-foreground text-primary-foreground"
    >
      <div className="container mx-auto px-6 md:px-12">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-primary-foreground/60 text-sm tracking-[0.3em] uppercase mb-8">
            Internal use only
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-6xl font-medium leading-[1.1] tracking-tight mb-8 text-balance">
            Open
            <br />
            <HighlightedText>Admin</HighlightedText> or field view
          </h2>
          <p className="text-primary-foreground/70 text-lg md:text-xl leading-relaxed mb-12 max-w-2xl mx-auto">
            Office: manage customers, jobs, and invoices. Field: open the
            installer view on your phone for today&apos;s jobs and payment links.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-3 bg-primary-foreground text-foreground px-8 py-4 text-sm tracking-wide hover:bg-primary-foreground/90 transition-colors duration-300 group"
            >
              Admin (office)
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/m"
              className="inline-flex items-center justify-center gap-2 border border-primary-foreground/30 px-8 py-4 text-sm tracking-wide hover:bg-primary-foreground/10 transition-colors duration-300"
            >
              Installer view (field)
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
