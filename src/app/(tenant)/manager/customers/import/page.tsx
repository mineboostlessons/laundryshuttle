import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CSVImporter } from "./csv-importer";

export default async function ImportCustomersPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/manager"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Manager Dashboard
          </Link>
          <h1 className="text-xl font-bold">Import Customers</h1>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file to bulk import customers.
          </p>
        </div>
      </header>
      <div className="mx-auto max-w-4xl p-6">
        <CSVImporter />
      </div>
    </main>
  );
}
