import { getFullTenantInfo } from "@/lib/tenant";
import { formatPhone } from "@/lib/utils";

export async function TenantFooter() {
  const tenant = await getFullTenantInfo();
  if (!tenant) return null;

  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Business info */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-foreground">
              {tenant.businessName}
            </h3>
            {tenant.phone && (
              <p className="text-sm text-muted-foreground">
                Phone:{" "}
                <a
                  href={`tel:${tenant.phone}`}
                  className="hover:text-foreground"
                >
                  {formatPhone(tenant.phone)}
                </a>
              </p>
            )}
            {tenant.email && (
              <p className="mt-1 text-sm text-muted-foreground">
                Email:{" "}
                <a
                  href={`mailto:${tenant.email}`}
                  className="hover:text-foreground"
                >
                  {tenant.email}
                </a>
              </p>
            )}
          </div>

          {/* Social links */}
          {tenant.socialLinks && Object.keys(tenant.socialLinks).length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-semibold text-foreground">
                Follow Us
              </h3>
              <div className="flex flex-col gap-2">
                {Object.entries(tenant.socialLinks).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm capitalize text-muted-foreground hover:text-foreground"
                  >
                    {platform}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div>
            <h3 className="mb-3 text-lg font-semibold text-foreground">
              Quick Links
            </h3>
            <div className="flex flex-col gap-2">
              <a href="/order" className="text-sm text-muted-foreground hover:text-foreground">
                Place an Order
              </a>
              <a href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Sign In
              </a>
              <a href="/register" className="text-sm text-muted-foreground hover:text-foreground">
                Create Account
              </a>
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
