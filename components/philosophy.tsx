"use client";

import { useEffect, useRef, useState } from "react";
import { HighlightedText } from "./highlighted-text";

const philosophyItems = [
  {
    title: "Simple by design",
    description:
      "One place for customers, jobs, and invoices. No clutter—just what your team needs to run the day.",
  },
  {
    title: "Built for the field",
    description:
      "Installers get today's jobs on their phone, with addresses, notes, and a one-tap payment link. Office stays in control.",
  },
  {
    title: "Jobs and payments together",
    description:
      "Create an invoice from a job, add line items and tax, then send a Stripe pay link from the field. Balance due updates in real time.",
  },
  {
    title: "Mobile-first for installers",
    description:
      "View schedule, update notes, upload photos, and mark jobs complete. Collect payment without chasing checks.",
  },
];

export function Philosophy() {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.getAttribute("data-index"));
          if (entry.isIntersecting) {
            setVisibleItems((prev) => [...new Set([...prev, index])]);
          }
        });
      },
      { threshold: 0.3 },
    );
    itemRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section id="about" className="py-32 md:py-29">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mb-6">
              Our approach
            </p>
            <h2 className="text-6xl md:text-6xl font-medium leading-[1.15] tracking-tight mb-6 text-balance lg:text-8xl">
              Built for
              <br />
              <HighlightedText>field teams</HighlightedText>
            </h2>
            <div className="relative hidden lg:block">
              <img
                src="/images/exterior.png"
                alt=""
                className="opacity-90 relative z-10 w-auto"
              />
            </div>
          </div>
          <div className="space-y-6 lg:pt-48">
            <p className="text-muted-foreground text-lg leading-relaxed max-w-md mb-12">
              Field Service Scheduler keeps office and field in sync. Manage
              customers and jobs from the dashboard; installers see their day,
              collect payment, and update notes from their phone.
            </p>
            {philosophyItems.map((item, index) => (
              <div
                key={item.title}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                data-index={index}
                className={`transition-all duration-700 ${
                  visibleItems.includes(index)
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="flex gap-6">
                  <span className="text-muted-foreground/50 text-sm font-medium">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-xl font-medium mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
