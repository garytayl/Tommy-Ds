import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border py-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="inline-block">
            <Image
              src="/images/tommyds-logo.png"
              alt="Tommy D's"
              width={160}
              height={45}
              className="h-6 w-auto"
            />
          </Link>
          <nav className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link href="/admin" className="hover:text-foreground transition-colors">
              Admin
            </Link>
            <Link href="/m" className="hover:text-foreground transition-colors">
              Installer
            </Link>
            <a
              href="https://tommyds.us"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Main website
            </a>
          </nav>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Tommy D&apos;s Windows, Doors, & More, Inc. — Internal PoC.
        </p>
      </div>
    </footer>
  );
}
