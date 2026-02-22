import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createConnectionToken } from "@/lib/stripe-terminal";
import { UserRole } from "@/types";

/**
 * POST /api/stripe/terminal/connection-token
 * Returns a connection token for the Stripe Terminal JS SDK.
 * Required for initializing the Terminal on the client.
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const staffRoles: string[] = [
      UserRole.OWNER,
      UserRole.MANAGER,
      UserRole.ATTENDANT,
    ];
    if (!staffRoles.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    if (!session.user.tenantId) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { stripeConnectAccountId: true, stripeConnectStatus: true },
    });

    if (!tenant?.stripeConnectAccountId || tenant.stripeConnectStatus !== "active") {
      return NextResponse.json(
        { success: false, error: "Stripe Connect not active for this tenant" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const locationId = (body as Record<string, unknown>).locationId as string | undefined;

    const secret = await createConnectionToken(
      tenant.stripeConnectAccountId,
      locationId
    );

    return NextResponse.json({ success: true, data: { secret } });
  } catch (error) {
    console.error("Terminal connection token error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create connection token" },
      { status: 500 }
    );
  }
}
