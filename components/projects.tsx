"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";

const features = [
  {
    id: 1,
    title: "Admin Dashboard",
    category: "Office",
    location: "Customers, jobs, invoices",
    year: "Manage",
    image: "/images/hously-1.png",
  },
  {
    id: 2,
    title: "Installer View",
    category: "Mobile",
    location: "Today's jobs, pay link, photos",
    year: "Field",
    image: "/images/hously-2.png",
  },
  {
    id: 3,
    title: "Invoicing",
    category: "Per job",
    location: "Line items, tax, status",
    year: "Billing",
    image: "/images/hously-3.png",
  },
  {
    id: 4,
    title: "Payment collection",
    category: "Stripe",
    location: "Send link, get paid",
    year: "Checkout",
    image: "/images/hously-4.png",
  },
];

export function Projects() {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [revealedImages, setRevealedImages] = useState<Set<number>>(new Set());
  const imageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = imageRefs.current.indexOf(entry.target as HTMLDivElement);
            if (index !== -1) {
              setRevealedImages((prev) => new Set(prev).add(features[index].id));
            }
          }
        });
      },
      { threshold: 0.2 },
    );
    imageRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section id="projects" className="py-32 md:py-29 bg-secondary/50">
      <div className="container mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div>
            <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mb-6">
              What’s included
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight">
              Features
            </h2>
          </div>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            Get started
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </div>
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <article
              key={feature.id}
              className="group cursor-pointer"
              onMouseEnter={() => setHoveredId(feature.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div
                ref={(el) => {
                  imageRefs.current[index] = el;
                }}
                className="relative overflow-hidden aspect-[4/3] mb-6"
              >
                <img
                  src={feature.image || "/placeholder.svg"}
                  alt=""
                  className={`w-full h-full object-cover transition-transform duration-700 ${
                    hoveredId === feature.id ? "scale-105" : "scale-100"
                  }`}
                />
                <div
                  className="absolute inset-0 bg-primary origin-top"
                  style={{
                    transform: revealedImages.has(feature.id)
                      ? "scaleY(0)"
                      : "scaleY(1)",
                    transition:
                      "transform 1.5s cubic-bezier(0.76, 0, 0.24, 1)",
                  }}
                />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-medium mb-2 group-hover:underline underline-offset-4">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.category} · {feature.location}
                  </p>
                </div>
                <span className="text-muted-foreground/60 text-sm">
                  {feature.year}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
