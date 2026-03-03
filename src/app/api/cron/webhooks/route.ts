import { NextResponse } from "next/server";
import { retryFailedWebhooks } from "@/lib/webhooks";
import { verifyBearerSecret } from "@/lib/utils";

/**
 * Cron job: Retry failed webhook deliveries.
 * Runs every hour via Vercel Cron.
 */
export async function GET(request: Request) {
  if (!verifyBearerSecret(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await retryFailedWebhooks();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Webhook retry cron failed:", error);
    return NextResponse.json(
      { error: "Failed to retry webhooks" },
      { status: 500 }
    );
  }
}
