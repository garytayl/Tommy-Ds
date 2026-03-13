"use client";

import { useState, useEffect, useRef } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Pay invoice", href: "/pay" },
  { label: "Admin", href: "/admin" },
  { label: "Installer", href: "/m" },
  { label: "Customer pay (demo)", href: "/demo/customer-payment" },
];

export function GlassNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setHasLoaded(true), 100);

    const controlNavbar = () => {
      if (typeof window === "undefined") return;
      const currentScrollY = window.scrollY;

      // Hide after a small scroll down; show when near top or scrolling up
      if (currentScrollY > 24) {
        if (
          currentScrollY > lastScrollY.current &&
          currentScrollY - lastScrollY.current > 3
        ) {
          setIsVisible(false);
        } else if (lastScrollY.current - currentScrollY > 3) {
          setIsVisible(true);
        }
      } else {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", controlNavbar, { passive: true });

    return () => {
      window.removeEventListener("scroll", controlNavbar);
      clearTimeout(timer);
    };
  }, []);

  return (
    <nav
      className={`fixed top-4 left-1/2 z-50 w-[90vw] max-w-xs md:top-8 md:max-w-4xl -translate-x-1/2 transition-all duration-500 ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-20 md:-translate-y-24 opacity-0"
      } ${hasLoaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
      style={{
        transition: hasLoaded
          ? "all 0.5s ease-out"
          : "opacity 0.8s ease-out, transform 0.8s ease-out",
      }}
    >
      <div className="mx-auto">
        <div className="rounded-full border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-md md:px-6 md:py-2">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center transition-transform duration-200 hover:scale-105"
            >
              <div className="relative h-10 w-10 md:h-12 md:w-12">
                <Image
                  src="/images/tommyds-logo.png"
                  alt="Tommy D's"
                  width={48}
                  height={48}
                  className="h-full w-full object-contain"
                />
              </div>
            </Link>

            <div className="hidden md:flex md:items-center md:space-x-6 lg:space-x-8">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-medium text-white/80 transition-all duration-200 hover:scale-105 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <button
              type="button"
              className="text-white transition-transform duration-200 hover:scale-110 md:hidden"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              onClick={() => setIsOpen(!isOpen)}
            >
              <div className="relative h-6 w-6">
                <Menu
                  size={24}
                  className={`absolute inset-0 transition-all duration-300 ${
                    isOpen
                      ? "scale-75 rotate-180 opacity-0"
                      : "scale-100 rotate-0 opacity-100"
                  }`}
                />
                <X
                  size={24}
                  className={`absolute inset-0 transition-all duration-300 ${
                    isOpen
                      ? "scale-100 rotate-0 opacity-100"
                      : "scale-75 -rotate-180 opacity-0"
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="relative md:hidden">
        <div
          className={`fixed inset-0 -z-10 bg-black/20 backdrop-blur-sm transition-all duration-300 ${
            isOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden
          onClick={() => setIsOpen(false)}
        />

        <div
          className={`mx-auto mt-2 w-[90vw] max-w-xs transition-all duration-500 ease-out ${
            isOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-8 scale-95 opacity-0"
          }`}
        >
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
            <div className="flex flex-col space-y-1">
              {NAV_ITEMS.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`translate-x-1 rounded-lg px-3 py-3 text-left font-medium text-white/80 transition-all duration-300 hover:scale-[1.02] hover:bg-white/10 hover:text-white ${
                    isOpen ? "animate-mobile-menu-item" : ""
                  }`}
                  style={{
                    animationDelay: isOpen ? `${index * 80 + 100}ms` : "0ms",
                  }}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
