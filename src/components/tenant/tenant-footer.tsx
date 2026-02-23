import Link from "next/link";
import prisma from "@/lib/prisma";
import { getFullTenantInfo } from "@/lib/tenant";
import { formatPhone } from "@/lib/utils";

const SERVICE_SLUGS = ["wash-and-fold", "pickup-and-delivery", "dry-cleaning"];
const COMPANY_SLUGS = ["about", "contact", "faq"];

export async function TenantFooter() {
  const tenant = await getFullTenantInfo();
  if (!tenant) return null;

  const pages = await prisma.page.findMany({
    where: { tenantId: tenant.id, isPublished: true, slug: { not: "home" } },
    select: { title: true, slug: true },
    orderBy: { sortOrder: "asc" },
  });

  const servicePages = pages.filter((p) => SERVICE_SLUGS.includes(p.slug));
  const companyPages = pages.filter((p) => COMPANY_SLUGS.includes(p.slug));
  const otherPages = pages.filter(
    (p) => !SERVICE_SLUGS.includes(p.slug) && !COMPANY_SLUGS.includes(p.slug)
  );

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Business info */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-foreground">
              {tenant.businessName}
            </h3>
            {tenant.phone && (
              <p className="text-sm text-muted-foreground">
                Phone:{" "}
                <a href={`tel:${tenant.phone}`} className="hover:text-foreground">
                  {formatPhone(tenant.phone)}
                </a>
              </p>
            )}
            {tenant.email && (
              <p className="mt-1 text-sm text-muted-foreground">
                Email:{" "}
                <a href={`mailto:${tenant.email}`} className="hover:text-foreground">
                  {tenant.email}
                </a>
              </p>
            )}
          </div>

          {/* Services */}
          {servicePages.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-semibold text-foreground">Services</h3>
              <div className="flex flex-col gap-2">
                {servicePages.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/p/${page.slug}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Company */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-foreground">Company</h3>
            <div className="flex flex-col gap-2">
              {companyPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/p/${page.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {page.title}
                </Link>
              ))}
              {otherPages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/p/${page.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  {page.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-foreground">Quick Links</h3>
            <div className="flex flex-col gap-2">
              <Link href="/order" className="text-sm text-muted-foreground hover:text-foreground">
                Place an Order
              </Link>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Sign In
              </Link>
              <Link href="/register" className="text-sm text-muted-foreground hover:text-foreground">
                Create Account
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
          &copy; {currentYear} {tenant.businessName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
