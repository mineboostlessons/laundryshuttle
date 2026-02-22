import type { Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getCurrentTenant, getFullTenantInfo } from "@/lib/tenant";
import type { PageBlock } from "@/types/blocks";
import { BlockRenderer } from "@/components/blocks";
import { TenantHeader } from "@/components/tenant/tenant-header";
import { TenantFooter } from "@/components/tenant/tenant-footer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getFullTenantInfo();
  if (!tenant) return {};

  const page = await prisma.page.findFirst({
    where: { tenantId: tenant.id, slug, isPublished: true },
    select: { title: true, seoTitle: true, seoDescription: true },
  });

  if (!page) return {};

  return {
    title: page.seoTitle || `${page.title} | ${tenant.businessName}`,
    description:
      page.seoDescription ||
      tenant.seoDefaults?.metaDescriptionTemplate ||
      `${page.title} — ${tenant.businessName}`,
  };
}

export default async function TenantDynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();

  const page = await prisma.page.findFirst({
    where: { tenantId: tenant.id, slug, isPublished: true },
    select: { title: true, blocks: true },
  });

  if (!page) notFound();

  const blocks = (page.blocks as PageBlock[] | null) ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <TenantHeader />
      <main className="flex-1">
        {blocks.length > 0 ? (
          <BlockRenderer blocks={blocks} />
        ) : (
          <section className="flex min-h-[300px] items-center justify-center px-6 py-16 text-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {page.title}
              </h1>
              <p className="mt-4 text-muted-foreground">
                This page is still being built.
              </p>
            </div>
          </section>
        )}
      </main>
      <TenantFooter />
    </div>
  );
}
