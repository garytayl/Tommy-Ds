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
                src="/images/tommyds-logo.png"
                alt="Tommy D's Windows, Doors, & More"
                width={200}
                height={56}
                className="w-auto h-8"
              />
            </Link>
            <p className="text-muted-foreground leading-relaxed max-w-sm">
              Internal scheduling and billing for Tommy D&apos;s. One dashboard
              for the office, one view for the field. Customers pay via the link
              we send them.
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
            <h4 className="text-sm font-medium mb-4">Contact (main site)</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>
                <a href="tel:812-330-8898" className="hover:text-foreground transition-colors">
                  812-330-8898
                </a>
              </li>
              <li>
                <a href="mailto:mikec@tommyds.us" className="hover:text-foreground transition-colors">
                  mikec@tommyds.us
                </a>
              </li>
              <li>
                3148 S. State Road 446, Bloomington, IN 47401
              </li>
              <li>
                <a href="https://tommyds.us" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  Visit our main website
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Tommy D&apos;s Windows, Doors, & More, Inc.</p>
        </div>
      </div>
    </footer>
  );
}
