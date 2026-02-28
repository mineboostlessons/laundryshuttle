import { requireRole } from "@/lib/auth-helpers";
import { UserRole } from "@/types";
import { getServiceArea, getZoneOverrides } from "./actions";
import { getAvailableDrivers } from "@/app/(tenant)/manager/actions";
import { ServiceAreaView } from "./service-area-loader";

export default async function ServiceAreaPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER);
  const [data, drivers, overrides] = await Promise.all([
    getServiceArea(),
    getAvailableDrivers(),
    getServiceArea().then((d) => (d ? getZoneOverrides(d.id) : [])),
  ]);

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

  return (
    <ServiceAreaView
      laundromatId={data.id}
      laundromatName={data.name}
      center={[data.lng, data.lat]}
      initialPolygons={data.serviceAreaPolygons}
      availableDrivers={drivers}
      initialOverrides={overrides}
    />
  );
}
