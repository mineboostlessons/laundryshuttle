import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { listServices } from "@/app/(tenant)/dashboard/services/actions";
import { ServiceManager } from "@/app/(tenant)/dashboard/services/service-manager";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function ManagerServicesPage() {
  await requireRole(UserRole.MANAGER, UserRole.OWNER);
  const services = await listServices();

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/manager"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Operations
          </Link>
          <h1 className="text-xl font-bold">Services</h1>
          <p className="text-sm text-muted-foreground">
            Manage the services you offer to customers
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-4xl p-6">
        <ServiceManager initialServices={services} />
      </div>
    </main>
  );
}
