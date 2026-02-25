import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const headersList = await headers();
  const hostname = request.headers.get("host") || "";
  const platformDomain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "laundryshuttle.com").trim();
  const vercelUrl = process.env.VERCEL_URL || "";

  return NextResponse.json({
    hostname,
    platformDomain,
    vercelUrl,
    xTenantSlug: headersList.get("x-tenant-slug"),
    xCustomDomain: headersList.get("x-custom-domain"),
    checks: {
      includesLocalhost: hostname.includes("localhost"),
      equalsVercelUrl: hostname === vercelUrl,
      endsWithVercelApp: hostname.endsWith(".vercel.app"),
      equalsPlatformDomain: hostname === platformDomain,
      equalsAdminPlatform: hostname === `admin.${platformDomain}`,
      endsWithPlatformDomain: hostname.endsWith(`.${platformDomain}`),
    },
  });
}
