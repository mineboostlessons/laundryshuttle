import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth-helpers";
import { MobileNavToggle } from "./mobile-nav-toggle";
import { NavDropdown } from "./nav-dropdown";

const SERVICE_SLUGS = ["wash-and-fold", "pickup-and-delivery", "dry-cleaning"];
const SECONDARY_SLUGS = ["faq", "service-areas", "contact"];

export async function TenantHeader() {
  const tenant = await requireTenant();

  const session = await getSession();
  const user = session?.user ?? null;

  const pages = await prisma.page.findMany({
    where: { tenantId: tenant.id, isPublished: true, slug: { not: "home" } },
    select: { title: true, slug: true },
    orderBy: { sortOrder: "asc" },
  });

  // Split pages into services, main nav, and secondary
  const servicePages = pages.filter((p) => SERVICE_SLUGS.includes(p.slug));
  const mainPages = pages.filter(
    (p) => !SERVICE_SLUGS.includes(p.slug) && !SECONDARY_SLUGS.includes(p.slug)
  );
  const secondaryPages = pages.filter((p) => SECONDARY_SLUGS.includes(p.slug));

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold text-foreground">
          {tenant.businessName}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>

          {/* Services dropdown if multiple service pages exist */}
          {servicePages.length > 1 ? (
            <NavDropdown label="Services" items={servicePages} />
          ) : (
            servicePages.map((page) => (
              <Link
                key={page.slug}
                href={`/p/${page.slug}`}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {page.title}
              </Link>
            ))
          )}

          {/* Main pages (Pricing, About, etc.) */}
          {mainPages.map((page) => (
            <Link
              key={page.slug}
              href={`/p/${page.slug}`}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {page.title}
            </Link>
          ))}

          {/* Secondary dropdown if multiple exist */}
          {secondaryPages.length > 1 ? (
            <NavDropdown label="More" items={secondaryPages} />
          ) : (
            secondaryPages.map((page) => (
              <Link
                key={page.slug}
                href={`/p/${page.slug}`}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {page.title}
              </Link>
            ))
          )}

          <Link
            href="/order"
            className="bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            style={{ borderRadius: "var(--button-radius)" }}
          >
            Order Now
          </Link>

          {user ? (
            <Link
              href="/customer"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="font-medium text-foreground">{user.name}</span>
              <br />
              <span className="text-xs">{user.email}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Login
            </Link>
          )}
        </nav>

        {/* Mobile nav */}
        <MobileNavToggle
          pages={pages}
          user={user ? { name: user.name ?? "", email: user.email ?? "" } : null}
        />
      </div>
    </header>
  );
}
