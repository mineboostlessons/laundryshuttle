import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import type { PageBlock } from "@/types/blocks";
import { BlockEditor } from "./block-editor";

interface EditPageProps {
  params: Promise<{ pageId: string }>;
}

export default async function EditPagePage({ params }: EditPageProps) {
  const { pageId } = await params;
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const page = await prisma.page.findFirst({
    where: { id: pageId, tenantId: tenant.id },
    select: {
      id: true,
      title: true,
      slug: true,
      seoTitle: true,
      seoDescription: true,
      isPublished: true,
      blocks: true,
    },
  });

  if (!page) notFound();

  return (
    <BlockEditor
      page={{
        id: page.id,
        title: page.title,
        slug: page.slug,
        seoTitle: page.seoTitle || "",
        seoDescription: page.seoDescription || "",
        isPublished: page.isPublished,
        blocks: (page.blocks as unknown as PageBlock[]) || [],
      }}
    />
  );
}
