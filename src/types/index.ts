// =============================================================================
// Laundry Shuttle — Type Definitions
// =============================================================================

export * from "./theme";
export * from "./blocks";

export const UserRole = {
  PLATFORM_ADMIN: "platform_admin",
  OWNER: "owner",
  MANAGER: "manager",
  ATTENDANT: "attendant",
  DRIVER: "driver",
  CUSTOMER: "customer",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Roles that belong to a tenant's staff */
export const TENANT_STAFF_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.MANAGER,
  UserRole.ATTENDANT,
  UserRole.DRIVER,
];

/** Roles that can access tenant management dashboards */
export const TENANT_MANAGEMENT_ROLES: UserRole[] = [
  UserRole.OWNER,
  UserRole.MANAGER,
];

// Extend NextAuth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      tenantId: string | null;
      tenantSlug: string | null;
    };
  }

  interface User {
    role: UserRole;
    tenantId: string | null;
    tenantSlug?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    tenantId: string | null;
    tenantSlug: string | null;
  }
}

/** Route protection configuration */
export interface RouteGuard {
  path: string;
  roles: UserRole[];
  requireTenant: boolean;
}

/** Standard API response */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Pagination params */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/** Paginated response */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
