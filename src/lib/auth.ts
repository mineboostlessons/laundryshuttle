import NextAuth, { type NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "./prisma";
import type { UserRole } from "@/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().optional(),
});

export const authConfig = {
  adapter: PrismaAdapter(prisma) as NextAuthConfig["adapter"],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
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
    async signIn({ user, account }) {
      // For OAuth providers, find or create user
      if (account?.provider === "google" || account?.provider === "facebook") {
        if (!user.email) return false;

        const existingUser = await prisma.user.findFirst({
          where: { email: user.email },
        });

        if (existingUser) {
          // Update auth provider info
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              authProvider: account.provider,
              authProviderId: account.providerAccountId,
              lastLoginAt: new Date(),
              emailVerified: new Date(),
            },
          });
        }
        // If no existing user, NextAuth adapter will create one
        // They'll default to customer role until assigned
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug ?? null;
      }

      // Handle session updates (e.g., role change)
      if (trigger === "update" && session) {
        if (session.role) token.role = session.role;
        if (session.tenantId !== undefined) token.tenantId = session.tenantId;
        if (session.tenantSlug !== undefined) token.tenantSlug = session.tenantSlug;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.tenantId = token.tenantId as string | null;
      session.user.tenantSlug = token.tenantSlug as string | null;
      return session;
    },
  },
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
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
