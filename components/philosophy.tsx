"use client";

import { useEffect, useRef, useState } from "react";
import { HighlightedText } from "./highlighted-text";

const philosophyItems = [
  {
    title: "One place for the day",
    description:
      "Customers, jobs, and invoices in one app. Office runs the board; field sees only what’s assigned to them.",
  },
  {
    title: "Field view on the phone",
    description:
      "Installers open the installer view and get today’s jobs with address, notes, and quick access to maps and customer contact details.",
  },
  {
    title: "Invoice workflow",
    description:
      "Create an invoice from a job, add line items and tax, and keep billing status current as office work progresses.",
  },
  {
    title: "Internal-only app",
    description:
      "Customers never log into this app. It stays focused on internal office and installer operations.",
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
              How we use it
            </p>
            <h2 className="text-6xl md:text-6xl font-medium leading-[1.15] tracking-tight mb-6 text-balance lg:text-8xl">
              Built for
              <br />
              <HighlightedText>our team</HighlightedText>
            </h2>
          </div>
          <div className="space-y-6 lg:pt-8">
            <p className="text-muted-foreground text-lg leading-relaxed max-w-md mb-12">
              This app is for Tommy D&apos;s staff only. Office uses the dashboard
              for customers, jobs, and invoices; field uses the installer view for
              the day&apos;s runs and on-site updates.
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
