import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getServiceArea, getZoneOverrides } from "@/app/(tenant)/settings/service-area/actions";
import { getAvailableDrivers } from "@/app/(tenant)/manager/actions";
import { ServiceAreaView } from "./service-area-loader";

export default async function ManagerServiceAreaPage() {
  await requireRole(UserRole.MANAGER, UserRole.OWNER);

  let data = null;
  let drivers: { id: string; firstName: string | null; lastName: string | null }[] = [];
  let overrides: unknown[] = [];

  try {
    data = await getServiceArea();
  } catch {
    // Laundromat query failed
  }

  if (!data) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold">Service Area</h1>
        <p className="text-muted-foreground mt-2">
          No active laundromat found. Please set up a location first.
        </p>
      </div>
    );
  }

  try {
    drivers = await getAvailableDrivers();
  } catch {
    // Drivers query failed — continue with empty list
  }

  try {
    overrides = await getZoneOverrides(data.id);
  } catch {
    // Zone overrides query failed — continue with empty list
  }

  return (
    <ServiceAreaView
      laundromatId={data.id}
      laundromatName={data.name}
      center={[data.lng, data.lat]}
      initialPolygons={data.serviceAreaPolygons}
      availableDrivers={drivers}
      initialOverrides={overrides as never[]}
    />
  );
}
