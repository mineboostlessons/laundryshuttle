import { notFound } from "next/navigation";
import { getCurrentTenant } from "@/lib/tenant";
import { ThemeProvider } from "@/components/theme/theme-provider";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    notFound();
  }

  return <ThemeProvider>{children}</ThemeProvider>;
}
