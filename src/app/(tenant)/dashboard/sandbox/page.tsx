import Link from "next/link";
import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { getSandboxStatus } from "./actions";
import { SandboxControls } from "./sandbox-controls";

export default async function SandboxPage() {
  await requireRole(UserRole.OWNER);
  const tenant = await requireTenant();
  const status = await getSandboxStatus();

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Settings
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            <h1 className="text-xl font-bold">Sandbox Mode</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Test your setup with sample data without affecting real business
            operations
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl p-6">
        <SandboxControls
          isSandbox={status.isSandbox}
          sandboxExpiresAt={status.sandboxExpiresAt}
          sandboxOrders={status.sandboxOrders}
          sandboxUsers={status.sandboxUsers}
          businessName={tenant.businessName}
        />
      </div>
    </main>
  );
}
