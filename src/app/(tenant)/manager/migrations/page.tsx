import type { Metadata } from "next";
import { getMigrations, getLocations } from "@/app/(tenant)/dashboard/migrations/actions";
import { MigrationView } from "@/app/(tenant)/dashboard/migrations/migration-view";

export const metadata: Metadata = {
  title: "Migration Tools",
};

export default async function ManagerMigrationsPage() {
  const [migrations, locations] = await Promise.all([
    getMigrations(),
    getLocations(),
  ]);

  return <MigrationView migrations={migrations} locations={locations} />;
}
