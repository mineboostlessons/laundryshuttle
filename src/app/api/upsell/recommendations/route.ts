import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import { getUpsellsForCustomer } from "@/lib/upsell";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "customer") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await getCurrentTenant();
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const recommendations = await getUpsellsForCustomer(
      session.user.id,
      tenant.id
    );

    return NextResponse.json({ success: true, data: recommendations });
  } catch (error) {
    console.error("Error fetching upsell recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
