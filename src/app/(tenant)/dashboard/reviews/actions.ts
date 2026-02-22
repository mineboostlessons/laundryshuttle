"use server";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { revalidatePath } from "next/cache";

export async function getReviewsDashboard(params: {
  page?: number;
  limit?: number;
  rating?: string;
}) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    order: { tenantId: tenant.id },
  };

  if (params.rating && params.rating !== "all") {
    where.rating = parseInt(params.rating, 10);
  }

  const [reviews, total, avgRating, ratingDistribution] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        order: { select: { orderNumber: true, id: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({
      where: { order: { tenantId: tenant.id } },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { order: { tenantId: tenant.id } },
      _count: true,
      orderBy: { rating: "desc" },
    }),
  ]);

  return {
    reviews,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats: {
      averageRating: avgRating._avg.rating ?? 0,
      totalReviews: avgRating._count,
      distribution: ratingDistribution.map((r) => ({
        rating: r.rating,
        count: r._count,
      })),
    },
  };
}

export async function toggleReviewVisibility(reviewId: string) {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  const review = await prisma.review.findFirst({
    where: { id: reviewId, order: { tenantId: tenant.id } },
  });

  if (!review) throw new Error("Review not found");

  await prisma.review.update({
    where: { id: reviewId },
    data: { isPublic: !review.isPublic },
  });

  revalidatePath("/dashboard/reviews");
  return { success: true };
}
