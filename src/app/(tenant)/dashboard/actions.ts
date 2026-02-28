"use server";

import prisma from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendEmail, wrapInEmailLayout } from "@/lib/ses";

// =============================================================================
// Owner Dashboard Stats
// =============================================================================

export async function getOwnerDashboardStats() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayOrders,
    weekOrders,
    monthOrders,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    statusCounts,
    totalCustomers,
    totalStaff,
    recentOrders,
    staffMembers,
  ] = await Promise.all([
    // Order counts
    prisma.order.count({
      where: { tenantId: tenant.id, createdAt: { gte: todayStart } },
    }),
    prisma.order.count({
      where: { tenantId: tenant.id, createdAt: { gte: weekStart } },
    }),
    prisma.order.count({
      where: { tenantId: tenant.id, createdAt: { gte: monthStart } },
    }),

    // Revenue (paid orders only)
    prisma.order.aggregate({
      where: {
        tenantId: tenant.id,
        paidAt: { not: null },
        createdAt: { gte: todayStart },
        status: { notIn: ["refunded", "cancelled"] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        tenantId: tenant.id,
        paidAt: { not: null },
        createdAt: { gte: weekStart },
        status: { notIn: ["refunded", "cancelled"] },
      },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: {
        tenantId: tenant.id,
        paidAt: { not: null },
        createdAt: { gte: monthStart },
        status: { notIn: ["refunded", "cancelled"] },
      },
      _sum: { totalAmount: true },
    }),

    // Orders by status
    prisma.order.groupBy({
      by: ["status"],
      where: { tenantId: tenant.id },
      _count: true,
    }),

    // Total customers
    prisma.user.count({
      where: { tenantId: tenant.id, role: "customer", isActive: true },
    }),

    // Total staff
    prisma.user.count({
      where: {
        tenantId: tenant.id,
        role: { in: ["manager", "attendant", "driver"] },
        isActive: true,
      },
    }),

    // Recent orders
    prisma.order.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        orderType: true,
        totalAmount: true,
        createdAt: true,
        customer: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    }),

    // Staff members
    prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        role: { in: ["manager", "attendant", "driver"] },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        lastLoginAt: true,
      },
      orderBy: { lastLoginAt: "desc" },
      take: 10,
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const s of statusCounts) {
    statusMap[s.status] = s._count;
  }

  return {
    orders: {
      today: todayOrders,
      week: weekOrders,
      month: monthOrders,
    },
    revenue: {
      today: todayRevenue._sum.totalAmount ?? 0,
      week: weekRevenue._sum.totalAmount ?? 0,
      month: monthRevenue._sum.totalAmount ?? 0,
    },
    statusCounts: statusMap,
    totalCustomers,
    totalStaff,
    recentOrders,
    staffMembers,
  };
}

// =============================================================================
// Revenue Chart Data (last 30 days)
// =============================================================================

export async function getRevenueChartData() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const orders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      paidAt: { not: null },
      createdAt: { gte: thirtyDaysAgo },
      status: { notIn: ["refunded", "cancelled"] },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by day
  const dailyRevenue: Record<string, number> = {};
  const dailyCount: Record<string, number> = {};

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const key = date.toISOString().split("T")[0];
    dailyRevenue[key] = 0;
    dailyCount[key] = 0;
  }

  for (const order of orders) {
    const key = order.createdAt.toISOString().split("T")[0];
    if (key in dailyRevenue) {
      dailyRevenue[key] += order.totalAmount;
      dailyCount[key] += 1;
    }
  }

  return Object.entries(dailyRevenue).map(([date, revenue]) => ({
    date,
    revenue: Math.round(revenue * 100) / 100,
    orders: dailyCount[date],
  }));
}

// =============================================================================
// Staff Management
// =============================================================================

export async function getStaffList() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  return prisma.user.findMany({
    where: {
      tenantId: tenant.id,
      role: { in: ["manager", "attendant", "driver"] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      shiftEndTime: true,
    },
    orderBy: [{ role: "asc" }, { firstName: "asc" }],
  });
}

// =============================================================================
// Create Staff Member
// =============================================================================

const createStaffSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().max(20).optional().or(z.literal("")),
  role: z.enum(["manager", "attendant", "driver"], {
    errorMap: () => ({ message: "Role must be manager, attendant, or driver" }),
  }),
});

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return password;
}

export async function createStaffMember(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  tenantSlug: string;
}): Promise<{ success: true; staffId: string; emailError?: string } | { success: false; error: string }> {
  const session = await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const tenant = await requireTenant();

  // Managers can only create staff if the owner has enabled the permission
  if (session.user.role === UserRole.MANAGER && !tenant.managerCanCreateStaff) {
    return { success: false, error: "You do not have permission to create staff members" };
  }

  const parsed = createStaffSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { firstName, lastName, email, phone, role } = parsed.data;

  // Check duplicate email within tenant
  const existing = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), tenantId: tenant.id },
  });
  if (existing) {
    return { success: false, error: "A staff member with this email already exists" };
  }

  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      firstName,
      lastName,
      phone: phone || null,
      role,
      passwordHash: hashedPassword,
      forcePasswordChange: true,
      authProvider: "email",
      isActive: true,
      tenantId: tenant.id,
    },
  });

  // Send welcome email with temp password
  const loginUrl = `https://${data.tenantSlug}.laundryshuttle.com/staff/login`;
  const emailResult = await sendEmail({
    to: email.toLowerCase(),
    subject: `You've been added as ${role} at ${tenant.businessName}`,
    html: wrapInEmailLayout({
      businessName: tenant.businessName,
      preheader: `Your staff account is ready`,
      body: `
        <h2 style="margin:0 0 16px;font-size:20px;color:#1a1a1a;">Welcome to ${tenant.businessName}!</h2>
        <p style="margin:0 0 12px;color:#333;font-size:14px;line-height:1.6;">
          You've been added as a <strong>${role}</strong>. Use the credentials below to log in:
        </p>
        <div style="background:#f5f5f5;padding:16px;border-radius:6px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:14px;"><strong>Email:</strong> ${email.toLowerCase()}</p>
          <p style="margin:0;font-size:14px;"><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <p style="margin:0 0 16px;color:#666;font-size:13px;">
          You will be asked to change your password on first login.
        </p>
        <a href="${loginUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">
          Log In Now
        </a>
      `,
    }),
  });

  if (!emailResult.success) {
    console.error("Failed to send staff welcome email:", emailResult.error);
    return {
      success: true,
      staffId: user.id,
      emailError: `Staff account created but welcome email failed to send: ${emailResult.error}`,
    };
  }

  return { success: true, staffId: user.id };
}

// =============================================================================
// Update Staff Member
// =============================================================================

const updateStaffSchema = z.object({
  staffId: z.string().min(1),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(20).optional().or(z.literal("")),
  role: z.enum(["manager", "attendant", "driver"]),
  shiftEndTime: z.string().max(5).optional().or(z.literal("")),
});

export async function updateStaffMember(data: {
  staffId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  shiftEndTime?: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const parsed = updateStaffSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { staffId, firstName, lastName, phone, role, shiftEndTime } = parsed.data;

  // Ensure staff belongs to this tenant
  const existing = await prisma.user.findFirst({
    where: { id: staffId, tenantId: tenant.id, role: { in: ["manager", "attendant", "driver"] } },
  });
  if (!existing) {
    return { success: false, error: "Staff member not found" };
  }

  await prisma.user.update({
    where: { id: staffId },
    data: {
      firstName,
      lastName,
      phone: phone || null,
      role,
      shiftEndTime: role === "driver" && shiftEndTime ? shiftEndTime : null,
    },
  });

  return { success: true };
}

// =============================================================================
// Deactivate / Reactivate Staff Member
// =============================================================================

export async function toggleStaffActive(staffId: string): Promise<
  { success: true; isActive: boolean } | { success: false; error: string }
> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  const existing = await prisma.user.findFirst({
    where: { id: staffId, tenantId: tenant.id, role: { in: ["manager", "attendant", "driver"] } },
  });
  if (!existing) {
    return { success: false, error: "Staff member not found" };
  }

  const updated = await prisma.user.update({
    where: { id: staffId },
    data: { isActive: !existing.isActive },
  });

  return { success: true, isActive: updated.isActive };
}

// =============================================================================
// Manager Staff Permission
// =============================================================================

export async function updateManagerStaffPermission(
  enabled: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { managerCanCreateStaff: enabled },
  });

  return { success: true };
}
