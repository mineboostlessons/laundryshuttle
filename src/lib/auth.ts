import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "./prisma";
import type { UserRole } from "@/types";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().optional(),
});

// Full auth config with Prisma adapter + Credentials provider
// Not edge-compatible — used in API routes and server actions only
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as NextAuthConfig["adapter"],
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

        // If no tenant-scoped user found, try platform admin as fallback
        if (!user && tenantSlug && tenantSlug !== "__platform__") {
          const platformAdmin = await prisma.user.findFirst({
            where: { email, tenantId: null, role: "platform_admin" },
          });
          if (platformAdmin && platformAdmin.passwordHash) {
            const valid = await bcrypt.compare(password, platformAdmin.passwordHash);
            if (valid && platformAdmin.isActive) {
              await prisma.user.update({
                where: { id: platformAdmin.id },
                data: { lastLoginAt: new Date() },
              });
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
        }

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
  events: {
    async createUser({ user }) {
      // When a new user is created via OAuth, set default role
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "customer" },
        });
      }
    },
  },
});
