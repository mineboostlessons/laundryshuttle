import Link from "next/link";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageActions } from "./page-actions";

export default async function PagesListPage() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const pages = await prisma.page.findMany({
    where: { tenantId: tenant.id },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublished: true,
      updatedAt: true,
    },
  });

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Pages</h1>
            <p className="text-sm text-muted-foreground">
              Manage your website pages and content
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/settings">
              <Button variant="outline" size="sm">
                Back to Settings
              </Button>
            </Link>
            <Link href="/settings/pages/create">
              <Button size="sm">Create Page</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6">
        {pages.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <p className="text-muted-foreground">No pages yet.</p>
            <Link href="/settings/pages/create">
              <Button className="mt-4">Create Your First Page</Button>
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="px-6 py-3 font-medium">Title</th>
                  <th className="px-6 py-3 font-medium">Slug</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id} className="border-b last:border-b-0">
                    <td className="px-6 py-4">
                      <span className="font-medium text-foreground">
                        {page.title}
                      </span>
                      {page.slug === "home" && (
                        <Badge variant="secondary" className="ml-2">
                          Homepage
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {page.slug === "home" ? "/" : `/p/${page.slug}`}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={page.isPublished ? "success" : "outline"}
                      >
                        {page.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <PageActions
                        pageId={page.id}
                        slug={page.slug}
                        isPublished={page.isPublished}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
