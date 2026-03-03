"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const faqs = [
  {
    question: "How do installers see their jobs?",
    answer:
      "Installers sign in and open the Installer View (or bookmark /m on their phone). They see only jobs assigned to them for the current day, with address, time, notes, and invoice balance. They can open the address in Maps, update notes, upload photos, and mark the job complete.",
  },
  {
    question: "How do I create an invoice?",
    answer:
      "From a job's detail page in the Admin Dashboard, click Create invoice. Then open the invoice to add line items (description, qty, unit price), set tax, and update status. The system recomputes subtotal, total, and balance due automatically.",
  },
  {
    question: "How does payment collection work?",
    answer:
      "From the job (admin or installer view), use Collect Payment to create a Stripe Checkout link. Send that link to the customer; they pay by card on Stripe's hosted page. When payment succeeds, the invoice balance updates and you can see the payment in the invoice's Payments table.",
  },
  {
    question: "Can I assign jobs to installers?",
    answer:
      "Yes. When creating or editing a job, choose an installer from the Assigned installer dropdown. Only installers with the installer role in your Supabase profiles table appear. Assigned installers see that job in their Installer View for the scheduled date.",
  },
  {
    question: "Do installers need to log in?",
    answer:
      "Yes. Installers must be signed in (via your Supabase auth) to see their assigned jobs. The app checks the user's role and shows the installer view for installer/manager roles and redirects others as needed.",
  },
  {
    question: "How do we get started?",
    answer:
      "Use the Admin Dashboard to add customers and create jobs, then assign installers and create invoices as needed. Open the Installer View on a phone to see the field experience. Configure Supabase and Stripe in your environment so auth and payments work in production.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 md:py-29">
      <div className="container mx-auto px-6 md:px-12">
        <div className="max-w-3xl mb-16">
          <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mb-6">
            For Tommy D&apos;s staff
          </p>
          <h2 className="text-6xl font-medium leading-[1.15] tracking-tight mb-6 text-balance lg:text-7xl">
            Questions & answers
          </h2>
        </div>
        <div>
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-border">
              <button
                type="button"
                onClick={() => toggleQuestion(index)}
                className="w-full py-6 flex items-start justify-between gap-6 text-left group"
              >
                <span className="text-lg font-medium text-foreground transition-colors group-hover:text-foreground/70">
                  {faq.question}
                </span>
                <Plus
                  className={`w-6 h-6 text-foreground flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? "rotate-45" : "rotate-0"
                  }`}
                  strokeWidth={1.5}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                <p className="text-muted-foreground leading-relaxed pb-6 pr-12">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
