import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterUser } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { headers, cookies } from "next/headers";
import prisma from "./prisma";
import type { UserRole } from "@/types";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().optional(),
});

/**
 * Resolve the tenant ID from the current request context during OAuth flows.
 * 1. Check x-tenant-slug header (set by middleware for subdomain requests)
 * 2. Fall back to __oauth_tenant_slug cookie (set before OAuth redirect)
 */
async function getOAuthTenantId(): Promise<string | null> {
  let slug: string | null = null;

  try {
    const hdrs = await headers();
    slug = hdrs.get("x-tenant-slug");
  } catch {
    // headers() may throw outside request context
  }

  if (!slug || slug === "__platform__") {
    try {
      const cookieStore = await cookies();
      slug = cookieStore.get("__oauth_tenant_slug")?.value ?? null;
    } catch {
      // cookies() may throw outside request context
    }
  }

  if (!slug || slug === "__platform__") return null;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  return tenant?.id ?? null;
}

/**
 * Wrap PrismaAdapter to handle tenant-scoped user lookups.
 * The User model has @@unique([email, tenantId]) — no plain email unique index,
 * so the default adapter's findUnique({ where: { email } }) fails.
 */
function tenantAwarePrismaAdapter(): Adapter {
  const base = PrismaAdapter(prisma) as Adapter;

  return {
    ...base,

    async getUserByEmail(email: string) {
      const tenantId = await getOAuthTenantId();
      // If tenantId is null (cookie expired), explicitly search for tenantId: null
      // to avoid returning an arbitrary tenant user. This means OAuth sign-in will
      // only match platform-level users when no tenant context is available.
      const user = await prisma.user.findFirst({
        where: { email, tenantId: tenantId ?? null, isActive: true },
      });
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
        image: user.avatarUrl,
        role: user.role as UserRole,
        tenantId: user.tenantId,
      } as AdapterUser;
    },

    async createUser(data) {
      const tenantId = await getOAuthTenantId();

      // Prevent creating platform-scoped users via OAuth — OAuth is only
      // for tenant customers. If tenantId is null the cookie likely expired
      // during the OAuth redirect round-trip.
      if (!tenantId) {
        throw new Error("OAuth sign-up requires a tenant context. Please try again.");
      }

      const nameParts = (data.name ?? "").split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const user = await prisma.user.create({
        data: {
          email: data.email,
          emailVerified: data.emailVerified,
          firstName,
          lastName,
          avatarUrl: data.image,
          role: "customer",
          authProvider: "oauth",
          tenantId,
        },
      });

      return {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
        image: user.avatarUrl,
        role: user.role as UserRole,
        tenantId: user.tenantId,
      } as AdapterUser;
    },
  };
}

// Full auth config with Prisma adapter + Credentials provider
// Not edge-compatible — used in API routes and server actions only
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: tenantAwarePrismaAdapter() as NextAuthConfig["adapter"],
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantSlug: { label: "Tenant", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { password, tenantSlug } = parsed.data;
        const email = parsed.data.email.toLowerCase();

        // Build the query to find user
        const where: { email: string; tenantId?: string | null } = { email };

        if (tenantSlug === "__platform__" || !tenantSlug) {
          // Try platform admin first, then fallback to any tenant
          const platformAdmin = await prisma.user.findFirst({
            where: { email, tenantId: null, role: "platform_admin" },
          });

          if (platformAdmin) {
            if (!platformAdmin.passwordHash) return null;
            const valid = await bcrypt.compare(password, platformAdmin.passwordHash);
            if (!valid) return null;
            return {
              id: platformAdmin.id,
              email: platformAdmin.email,
              name: [platformAdmin.firstName, platformAdmin.lastName].filter(Boolean).join(" ") || null,
              image: platformAdmin.avatarUrl,
              role: platformAdmin.role as UserRole,
              tenantId: null,
              tenantSlug: null,
              sessionVersion: platformAdmin.sessionVersion,
            };
          }
        }

        // Find tenant-scoped user
        if (tenantSlug && tenantSlug !== "__platform__") {
          const tenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug },
          });
          if (!tenant) return null;
          where.tenantId = tenant.id;
        }

        const user = await prisma.user.findFirst({ where });
        if (!user || !user.passwordHash) return null;

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) return null;

        if (!user.isActive) return null;

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // Resolve tenant slug
        let resolvedSlug: string | null = null;
        if (user.tenantId) {
          const tenant = await prisma.tenant.findUnique({
            where: { id: user.tenantId },
            select: { slug: true },
          });
          resolvedSlug = tenant?.slug ?? null;
        }

        return {
          id: user.id,
          email: user.email,
          name: [user.firstName, user.lastName].filter(Boolean).join(" ") || null,
          image: user.avatarUrl,
          role: user.role as UserRole,
          tenantId: user.tenantId,
          tenantSlug: resolvedSlug,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug ?? null;
        token.sessionVersion = (user as unknown as Record<string, unknown>).sessionVersion as number ?? 0;
        token.sessionCheckedAt = Date.now();

        // OAuth users have tenantId but no tenantSlug — resolve it
        if (user.tenantId && !user.tenantSlug) {
          const tenant = await prisma.tenant.findUnique({
            where: { id: user.tenantId as string },
            select: { slug: true },
          });
          token.tenantSlug = tenant?.slug ?? null;
        }

        // Clear the OAuth tenant cookie now that sign-in is complete
        try {
          const { cookies } = await import("next/headers");
          const cookieStore = await cookies();
          cookieStore.delete("__oauth_tenant_slug");
        } catch {
          // Ignore — may be outside request context
        }
      }

      // Periodically re-validate session against DB (every 5 minutes)
      // to detect password resets and deactivations
      const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
      const lastChecked = (token.sessionCheckedAt as number) ?? 0;
      const shouldRecheck = Date.now() - lastChecked > SESSION_CHECK_INTERVAL;

      if (shouldRecheck && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, tenantId: true, isActive: true, sessionVersion: true },
        });

        if (!dbUser || !dbUser.isActive || dbUser.sessionVersion !== (token.sessionVersion ?? 0)) {
          // Session invalidated — force re-login
          return { ...token, invalidated: true };
        }

        token.role = dbUser.role;
        token.tenantId = dbUser.tenantId;
        token.sessionCheckedAt = Date.now();

        if (dbUser.tenantId) {
          const t = await prisma.tenant.findUnique({
            where: { id: dbUser.tenantId },
            select: { slug: true },
          });
          token.tenantSlug = t?.slug ?? null;
        } else {
          token.tenantSlug = null;
        }
      }

      // On explicit session update, also re-fetch from DB
      if (trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, tenantId: true, isActive: true, sessionVersion: true },
        });
        if (dbUser && dbUser.isActive) {
          token.role = dbUser.role;
          token.tenantId = dbUser.tenantId;
          token.sessionVersion = dbUser.sessionVersion;
          if (dbUser.tenantId) {
            const t = await prisma.tenant.findUnique({
              where: { id: dbUser.tenantId },
              select: { slug: true },
            });
            token.tenantSlug = t?.slug ?? null;
          } else {
            token.tenantSlug = null;
          }
        }
      }

      return token;
    },
  },
});
