export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Laundry Shuttle</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Multi-tenant SaaS platform for laundry pickup &amp; delivery
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Platform is initializing. Run the seed script to create the admin account.
      </p>
    </main>
  );
}
