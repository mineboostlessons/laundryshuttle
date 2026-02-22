import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { listPromoCodes } from "./actions";
import { PromoCodeManager } from "./promo-code-manager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PromoCodesPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const promoCodes = await listPromoCodes();

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <h1 className="text-xl font-bold">Promo Codes</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage discount codes for your customers
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-4xl p-6">
        <PromoCodeManager initialCodes={promoCodes} />
      </div>
    </main>
  );
}
