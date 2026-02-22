"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth-helpers";

export async function getTourProgress(tourSlug: string) {
  const session = await getSession();
  if (!session?.user?.id) return null;

  return prisma.productTourProgress.findUnique({
    where: {
      userId_tourSlug: {
        userId: session.user.id,
        tourSlug,
      },
    },
  });
}

export async function updateTourStep(
  tourSlug: string,
  completedSteps: number,
  totalSteps: number
) {
  const session = await getSession();
  if (!session?.user?.id) return;

  await prisma.productTourProgress.upsert({
    where: {
      userId_tourSlug: {
        userId: session.user.id,
        tourSlug,
      },
    },
    update: {
      completedSteps,
    },
    create: {
      userId: session.user.id,
      tourSlug,
      completedSteps,
      totalSteps,
    },
  });
}

export async function completeTour(tourSlug: string, totalSteps: number) {
  const session = await getSession();
  if (!session?.user?.id) return;

  await prisma.productTourProgress.upsert({
    where: {
      userId_tourSlug: {
        userId: session.user.id,
        tourSlug,
      },
    },
    update: {
      completedSteps: totalSteps,
      totalSteps,
      isCompleted: true,
      completedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      tourSlug,
      completedSteps: totalSteps,
      totalSteps,
      isCompleted: true,
      completedAt: new Date(),
    },
  });
}

export async function dismissTour(tourSlug: string, totalSteps: number) {
  const session = await getSession();
  if (!session?.user?.id) return;

  await prisma.productTourProgress.upsert({
    where: {
      userId_tourSlug: {
        userId: session.user.id,
        tourSlug,
      },
    },
    update: {
      dismissedAt: new Date(),
    },
    create: {
      userId: session.user.id,
      tourSlug,
      completedSteps: 0,
      totalSteps,
      dismissedAt: new Date(),
    },
  });
}

export async function resetTourProgress(tourSlug: string) {
  const session = await getSession();
  if (!session?.user?.id) return;

  await prisma.productTourProgress.deleteMany({
    where: {
      userId: session.user.id,
      tourSlug,
    },
  });
}

export async function getAllTourProgress() {
  const session = await getSession();
  if (!session?.user?.id) return [];

  return prisma.productTourProgress.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });
}
