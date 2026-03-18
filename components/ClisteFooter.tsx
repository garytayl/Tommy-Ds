import Link from "next/link";
import Image from "next/image";

export function ClisteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mx-auto flex w-full max-w-6xl flex-col items-center justify-center rounded-t-4xl border-t border-border bg-background bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)] px-6 py-12 md:rounded-t-6xl lg:py-16">
      <div className="absolute left-1/2 right-1/2 top-0 h-px w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/20 blur" />

      <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
        <div className="space-y-4">
          <Link href="/" className="inline-block">
            <Image
              src="/images/tommyds-logo.png"
              alt="Tommy D's"
              width={64}
              height={64}
              className="size-16 object-contain"
            />
          </Link>
          <div className="hidden text-sm text-muted-foreground md:block">
            <p>© {year} Tommy D&apos;s Windows, Doors, & More. Internal PoC.</p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4 xl:col-span-2 xl:mt-0">
          <div className="mb-10 md:mb-0">
            <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Quick links
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="inline-flex text-muted-foreground transition-colors duration-300 hover:text-foreground"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="inline-flex text-muted-foreground transition-colors duration-300 hover:text-foreground"
                >
                  Admin
                </Link>
              </li>
              <li>
                <Link
                  href="/m"
                  className="inline-flex text-muted-foreground transition-colors duration-300 hover:text-foreground"
                >
                  Installer
                </Link>
              </li>
              <li>
                <a
                  href="https://tommyds.us"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-muted-foreground transition-colors duration-300 hover:text-foreground"
                >
                  Main website
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-2 text-center md:hidden">
        <p className="text-sm text-muted-foreground">
          © {year} Tommy D&apos;s Windows, Doors, & More. Internal PoC.
        </p>
      </div>

      <div className="mt-8 hidden w-full border-t border-foreground/10 pt-6 md:block">
        <p className="text-center text-xs text-muted-foreground">
          © {year} Tommy D&apos;s Windows, Doors, & More, Inc. — Internal PoC.
        </p>
      </div>
    </footer>
  );
}
