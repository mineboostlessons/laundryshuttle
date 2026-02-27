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
      const user = await prisma.user.findFirst({
        where: { email, tenantId },
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

        const { email, password, tenantSlug } = parsed.data;

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

        // OAuth users have tenantId but no tenantSlug — resolve it
        if (user.tenantId && !user.tenantSlug) {
          const tenant = await prisma.tenant.findUnique({
            where: { id: user.tenantId as string },
            select: { slug: true },
          });
          token.tenantSlug = tenant?.slug ?? null;
        }
      }

      if (trigger === "update" && session) {
        if (session.role) token.role = session.role;
        if (session.tenantId !== undefined) token.tenantId = session.tenantId;
        if (session.tenantSlug !== undefined) token.tenantSlug = session.tenantSlug;
      }

      return token;
    },
  },
});
