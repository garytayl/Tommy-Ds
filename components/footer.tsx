import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="py-16 md:py-24 border-t border-border">
      <div className="container mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <Link href="/" className="inline-block mb-6">
              <Image
                src="/images/hously-logo.svg"
                alt="Field Service Scheduler"
                width={120}
                height={32}
                className="w-auto h-6"
              />
            </Link>
            <p className="text-muted-foreground leading-relaxed max-w-sm">
              Scheduling, invoicing, and payment collection for field installer
              teams. One dashboard for the office, one view for the field.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">App</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="#projects" className="hover:text-foreground transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#about" className="hover:text-foreground transition-colors">
                  Approach
                </Link>
              </li>
              <li>
                <Link href="#services" className="hover:text-foreground transition-colors">
                  Capabilities
                </Link>
              </li>
              <li>
                <Link href="#contact" className="hover:text-foreground transition-colors">
                  Get started
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-foreground transition-colors">
                  Admin Dashboard
                </Link>
              </li>
              <li>
                <Link href="/m" className="hover:text-foreground transition-colors">
                  Installer View
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <Link href="/admin/invoices" className="hover:text-foreground transition-colors">
                  Invoices
                </Link>
              </li>
              <li>
                <Link href="/admin/customers" className="hover:text-foreground transition-colors">
                  Customers
                </Link>
              </li>
              <li>
                <Link href="/admin/jobs" className="hover:text-foreground transition-colors">
                  Jobs
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Field Service Scheduler.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
