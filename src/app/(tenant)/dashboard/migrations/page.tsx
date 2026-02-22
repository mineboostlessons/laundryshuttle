import type { Metadata } from "next";
import { getMigrations, getLocations } from "./actions";
import { MigrationView } from "./migration-view";

export const metadata: Metadata = {
  title: "Migration Tools",
};

export default async function MigrationsPage() {
  const [migrations, locations] = await Promise.all([
    getMigrations(),
    getLocations(),
  ]);

  return <MigrationView migrations={migrations} locations={locations} />;
}
