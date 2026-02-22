"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import type { BlockType } from "@/types/blocks";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const pageSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
});

const pageUpdateSchema = pageSchema.extend({
  seoTitle: z.string().max(100).optional().default(""),
  seoDescription: z.string().max(300).optional().default(""),
  isPublished: z.boolean().optional(),
});

const featureSchema = z.object({
  icon: z.enum(["truck", "clock", "sparkles", "shield", "phone", "dollar"]),
  title: z.string(),
  description: z.string(),
});

const faqItemSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

const blockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hero"),
    heading: z.string(),
    subheading: z.string(),
    ctaText: z.string(),
    ctaLink: z.string(),
    backgroundImage: z.string().optional(),
    showGradient: z.boolean(),
  }),
  z.object({
    type: z.literal("text"),
    heading: z.string().optional(),
    body: z.string(),
  }),
  z.object({
    type: z.literal("services"),
    heading: z.string(),
    showPrices: z.boolean(),
  }),
  z.object({
    type: z.literal("features"),
    heading: z.string(),
    features: z.array(featureSchema),
  }),
  z.object({
    type: z.literal("cta"),
    heading: z.string(),
    subheading: z.string().optional(),
    buttonText: z.string(),
    buttonLink: z.string(),
  }),
  z.object({
    type: z.literal("faq"),
    heading: z.string(),
    items: z.array(faqItemSchema),
  }),
]);

const blocksArraySchema = z.array(blockSchema);

// ---------------------------------------------------------------------------
// Action response type
// ---------------------------------------------------------------------------

interface ActionResult {
  success: boolean;
  error?: string;
  pageId?: string;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createPage(formData: FormData): Promise<ActionResult> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = pageSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Check for duplicate slug
  const existing = await prisma.page.findFirst({
    where: { tenantId: tenant.id, slug: parsed.data.slug },
  });
  if (existing) {
    return { success: false, error: "A page with this slug already exists." };
  }

  const maxOrder = await prisma.page.aggregate({
    where: { tenantId: tenant.id },
    _max: { sortOrder: true },
  });

  const page = await prisma.page.create({
    data: {
      tenantId: tenant.id,
      title: parsed.data.title,
      slug: parsed.data.slug,
      blocks: [],
      isPublished: false,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/settings/pages");
  return { success: true, pageId: page.id };
}

export async function updatePage(
  pageId: string,
  formData: FormData
): Promise<ActionResult> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = pageUpdateSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    seoTitle: formData.get("seoTitle") || "",
    seoDescription: formData.get("seoDescription") || "",
    isPublished: formData.get("isPublished") === "true",
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Verify ownership
  const page = await prisma.page.findFirst({
    where: { id: pageId, tenantId: tenant.id },
  });
  if (!page) {
    return { success: false, error: "Page not found." };
  }

  // Check slug uniqueness (exclude current page)
  const duplicate = await prisma.page.findFirst({
    where: {
      tenantId: tenant.id,
      slug: parsed.data.slug,
      id: { not: pageId },
    },
  });
  if (duplicate) {
    return { success: false, error: "A page with this slug already exists." };
  }

  await prisma.page.update({
    where: { id: pageId },
    data: {
      title: parsed.data.title,
      slug: parsed.data.slug,
      seoTitle: parsed.data.seoTitle || null,
      seoDescription: parsed.data.seoDescription || null,
      isPublished: parsed.data.isPublished,
    },
  });

  revalidatePath("/settings/pages");
  revalidatePath("/");
  revalidatePath(`/p/${parsed.data.slug}`);
  return { success: true };
}

export async function updatePageBlocks(
  pageId: string,
  blocks: unknown
): Promise<ActionResult> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = blocksArraySchema.safeParse(blocks);
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid block data: ${parsed.error.issues[0].message}`,
    };
  }

  const page = await prisma.page.findFirst({
    where: { id: pageId, tenantId: tenant.id },
    select: { slug: true },
  });
  if (!page) {
    return { success: false, error: "Page not found." };
  }

  await prisma.page.update({
    where: { id: pageId },
    data: { blocks: parsed.data },
  });

  revalidatePath("/settings/pages");
  revalidatePath("/");
  revalidatePath(`/p/${page.slug}`);
  return { success: true };
}

export async function deletePage(pageId: string): Promise<ActionResult> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const page = await prisma.page.findFirst({
    where: { id: pageId, tenantId: tenant.id },
    select: { slug: true },
  });
  if (!page) {
    return { success: false, error: "Page not found." };
  }

  if (page.slug === "home") {
    return { success: false, error: "Cannot delete the home page." };
  }

  await prisma.page.delete({ where: { id: pageId } });

  revalidatePath("/settings/pages");
  return { success: true };
}

export async function togglePagePublished(
  pageId: string
): Promise<ActionResult> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const page = await prisma.page.findFirst({
    where: { id: pageId, tenantId: tenant.id },
    select: { isPublished: true, slug: true },
  });
  if (!page) {
    return { success: false, error: "Page not found." };
  }

  await prisma.page.update({
    where: { id: pageId },
    data: { isPublished: !page.isPublished },
  });

  revalidatePath("/settings/pages");
  revalidatePath("/");
  revalidatePath(`/p/${page.slug}`);
  return { success: true };
}

export async function getBlockTypes(): Promise<BlockType[]> {
  return ["hero", "text", "services", "features", "cta", "faq"];
}
