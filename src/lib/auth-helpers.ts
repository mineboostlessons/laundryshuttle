import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";

/**
 * Get the current session on the server side.
 * Redirects to login if not authenticated.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

/**
 * Require a specific role. Redirects if unauthorized.
 */
export async function requireRole(...roles: UserRole[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    redirect("/");
  }
  return session;
}

/**
 * Get session without redirecting (returns null if unauthenticated).
 */
export async function getSession() {
  return auth();
}
