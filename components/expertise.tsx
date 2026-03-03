"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarCheck, FileText, CreditCard, Smartphone } from "lucide-react";
import { HighlightedText } from "./highlighted-text";

const expertiseAreas = [
  {
    title: "Scheduling",
    description:
      "Assign jobs to installers, set start and end times, and see today's run at a glance. Filter by date and status from the dashboard.",
    icon: CalendarCheck,
  },
  {
    title: "Invoicing",
    description:
      "Create an invoice per job with line items, quantity, and unit price. Add tax and track status from draft to sent to paid.",
    icon: FileText,
  },
  {
    title: "Payment collection",
    description:
      "Send a Stripe checkout link from the field. Customers pay by card; balance due updates automatically. No chasing checks.",
    icon: CreditCard,
  },
  {
    title: "Mobile installer view",
    description:
      "Installers see their assigned jobs for the day, open addresses in Maps, update notes, upload photos, and mark jobs complete.",
    icon: Smartphone,
  },
];

export function Expertise() {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const sectionRef = useRef<HTMLElement>(null);
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
      { threshold: 0.2 },
    );
    itemRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section id="services" ref={sectionRef} className="py-32 md:py-29">
      <div className="container mx-auto px-6 md:px-12">
        <div className="max-w-3xl mb-20">
          <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mb-6">
            For staff
          </p>
          <h2 className="text-6xl font-medium leading-[1.15] tracking-tight mb-6 text-balance lg:text-8xl">
            <HighlightedText>What the app does</HighlightedText>
            <br />
            for office and field
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Office: customers, jobs, invoices, and payment status. Field:
            today’s jobs, payment link to send to the customer, notes, and
            photos.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-16">
          {expertiseAreas.map((area, index) => {
            const Icon = area.icon;
            return (
              <div
                key={area.title}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                data-index={index}
                className={`relative pl-8 border-l border-border transition-all duration-700 ${
                  visibleItems.includes(index)
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div
                  className={`transition-all duration-1000 ${
                    visibleItems.includes(index) ? "animate-draw-stroke" : ""
                  }`}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <Icon
                    className="w-10 h-10 mb-4 text-foreground"
                    strokeWidth={1.25}
                  />
                </div>
                <h3 className="text-xl font-medium mb-4">{area.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {area.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
