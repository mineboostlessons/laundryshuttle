import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import type { UserRole } from "@/types";

// Edge-compatible auth config (no Prisma, no bcrypt)
// Used by middleware for lightweight JWT verification
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    // Credentials provider is added in auth.ts (requires Prisma + bcrypt, not edge-compatible)
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.tenantId = user.tenantId;
        token.tenantSlug = user.tenantSlug ?? null;
      }

      // Session updates are handled in auth.ts where Prisma is available
      // to verify values from the database. Do NOT trust client-provided
      // role/tenantId/tenantSlug here — that would allow privilege escalation.
      if (trigger === "update") {
        // Noop in edge config — full auth.ts callback handles this securely
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

    authorized({ auth, request: { nextUrl } }) {
      return true; // We handle auth checks manually in middleware
    },
  },
} satisfies NextAuthConfig;
