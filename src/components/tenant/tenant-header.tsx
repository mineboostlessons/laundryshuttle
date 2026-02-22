import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { MobileNavToggle } from "./mobile-nav-toggle";

export async function TenantHeader() {
  const tenant = await requireTenant();

  const pages = await prisma.page.findMany({
    where: { tenantId: tenant.id, isPublished: true, slug: { not: "home" } },
    select: { title: true, slug: true },
    orderBy: { sortOrder: "asc" },
  });

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
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={`/p/${page.slug}`}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {page.title}
            </Link>
          ))}
          <Link
            href="/order"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Order Now
          </Link>
        </nav>

        {/* Mobile nav */}
        <MobileNavToggle pages={pages} />
      </div>
    </header>
  );
}
