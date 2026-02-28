"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const session = await requireAuth();
  const parsed = changePasswordSchema.parse(data);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new Error(
      "No password set on this account. You may have signed up with a social provider."
    );
  }

  const valid = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect.");
  }

  const hash = await bcrypt.hash(parsed.newPassword, 12);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      passwordHash: hash,
      forcePasswordChange: false,
    },
  });

  return { success: true };
}
