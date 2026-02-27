"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { signIn } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AuthError } from "next-auth";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  tenantSlug: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  tenantSlug: z.string().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type AuthState = {
  error?: string;
  success?: boolean;
  message?: string;
  role?: string;
  tenantSlug?: string | null;
};

export async function registerAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    tenantSlug: formData.get("tenantSlug") || undefined,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { firstName, lastName, email, phone, password, tenantSlug } = parsed.data;

  try {
    // Resolve tenant if slug provided
    let tenantId: string | null = null;
    if (tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
      });
      if (!tenant) {
        return { error: "Business not found" };
      }
      tenantId = tenant.id;
    }

    // Check if user already exists for this tenant
    const existingUser = await prisma.user.findFirst({
      where: { email, tenantId },
    });

    if (existingUser) {
      return { error: "An account with this email already exists" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        phone: phone || null,
        passwordHash,
        role: "customer",
        tenantId,
        authProvider: "email",
        emailVerified: null,
      },
    });

    return { success: true, message: "Account created! You can now sign in." };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

export async function loginAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    tenantSlug: formData.get("tenantSlug") || undefined,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      tenantSlug: parsed.data.tenantSlug || "",
      redirect: false,
    });

    // Fetch the user to return role and tenantSlug for proper redirect
    const user = await prisma.user.findFirst({
      where: { email: parsed.data.email },
      select: { role: true, tenantId: true },
    });

    let userTenantSlug: string | null = null;
    if (user?.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { slug: true },
      });
      userTenantSlug = tenant?.slug ?? null;
    }

    return { success: true, role: user?.role, tenantSlug: userTenantSlug };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password" };
        default:
          return { error: "Something went wrong" };
      }
    }
    // signIn may throw a NEXT_REDIRECT — rethrow it
    throw error;
  }
}

export async function forgotPasswordAction(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = { email: formData.get("email") };

  const parsed = forgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // Always return success to prevent email enumeration
  // In a full implementation, this would send a reset email via SES
  return {
    success: true,
    message: "If an account exists with that email, we've sent a password reset link.",
  };
}

export async function oauthSignIn(provider: "google" | "facebook", tenantSlug?: string) {
  // Persist tenant slug across the OAuth redirect round-trip via a short-lived cookie
  if (tenantSlug && tenantSlug !== "__platform__") {
    const cookieStore = await cookies();
    cookieStore.set("__oauth_tenant_slug", tenantSlug, {
      maxAge: 300, // 5 minutes — enough for OAuth round-trip
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  await signIn(provider, { redirectTo: "/" });
}
