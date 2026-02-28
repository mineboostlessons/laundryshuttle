"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { cookies } from "next/headers";
import { signIn } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AuthError } from "next-auth";
import { sendEmail, wrapInEmailLayout } from "@/lib/ses";

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

  const { email } = parsed.data;

  // Always return the same message to prevent email enumeration
  const successMessage = "If an account exists with that email, we've sent a password reset link.";

  try {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true, firstName: true, tenantId: true },
    });

    if (!user) {
      return { success: true, message: successMessage };
    }

    // Generate a temporary password
    const tempPassword = crypto.randomBytes(6).toString("base64url");
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword, forcePasswordChange: true },
    });

    // Resolve tenant for login URL
    let loginUrl = "https://laundryshuttle.com/login";
    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { slug: true, businessName: true },
      });
      if (tenant) {
        loginUrl = `https://${tenant.slug}.laundryshuttle.com/login`;
      }
    }

    await sendEmail({
      to: email.toLowerCase(),
      subject: "Password Reset — Laundry Shuttle",
      html: wrapInEmailLayout({
        businessName: "Laundry Shuttle",
        preheader: "Your temporary password",
        body: `
          <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;">Password Reset</h2>
          <p style="margin:0 0 12px;color:#333;font-size:14px;line-height:1.6;">
            Hi ${user.firstName ?? "there"}, we received a password reset request for your account.
          </p>
          <p style="margin:0 0 12px;color:#333;font-size:14px;line-height:1.6;">
            Here is your temporary password:
          </p>
          <div style="background:#f5f5f5;padding:16px;border-radius:6px;margin:16px 0;">
            <p style="margin:0;font-size:16px;font-weight:bold;letter-spacing:1px;">${tempPassword}</p>
          </div>
          <p style="margin:0 0 16px;color:#666;font-size:13px;">
            You will be asked to set a new password when you log in.
          </p>
          <a href="${loginUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
            Log In Now
          </a>
          <p style="margin:16px 0 0;color:#999;font-size:12px;">
            If you didn't request this reset, please ignore this email.
          </p>
        `,
      }),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
  }

  return { success: true, message: successMessage };
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
