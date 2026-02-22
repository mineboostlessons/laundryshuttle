import { requireRole } from "@/lib/auth-helpers";
import { requireTenant } from "@/lib/tenant";
import { UserRole } from "@/types";
import prisma from "@/lib/prisma";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function EquipmentPage() {
  await requireRole(UserRole.OWNER, UserRole.MANAGER, UserRole.ATTENDANT);
  const tenant = await requireTenant();

  const [laundromats, processingOrders] = await Promise.all([
    prisma.laundromat.findMany({
      where: { tenantId: tenant.id, isActive: true },
      select: {
        id: true,
        name: true,
        numWashers: true,
        numDryers: true,
      },
    }),
    prisma.order.findMany({
      where: { tenantId: tenant.id, status: "processing" },
      select: {
        id: true,
        orderNumber: true,
        washerNumber: true,
        dryerNumber: true,
        binNumber: true,
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
    }),
  ]);

  // Map equipment to orders
  const washerMap = new Map<number, typeof processingOrders[0]>();
  const dryerMap = new Map<number, typeof processingOrders[0]>();
  for (const order of processingOrders) {
    if (order.washerNumber) washerMap.set(order.washerNumber, order);
    if (order.dryerNumber) dryerMap.set(order.dryerNumber, order);
  }

  const location = laundromats[0];

  if (!location || (location.numWashers === 0 && location.numDryers === 0)) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="text-2xl font-bold mb-2">Equipment</h1>
        <p className="text-muted-foreground">
          No equipment configured. Equipment counts can be set in location settings.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Equipment</h1>
        <p className="text-muted-foreground">
          {location.name} — washer and dryer status
        </p>
      </div>

      {/* Washers */}
      {location.numWashers > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Washers ({washerMap.size}/{location.numWashers} in use)
            </CardTitle>
            <CardDescription>Click a unit to see assigned order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {Array.from({ length: location.numWashers }, (_, i) => {
                const num = i + 1;
                const order = washerMap.get(num);
                const customerName = order?.customer
                  ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim()
                  : null;
                return (
                  <div
                    key={`w-${num}`}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg border p-3 text-center",
                      order
                        ? "bg-blue-50 border-blue-300"
                        : "bg-background"
                    )}
                  >
                    <span className="text-sm font-bold">W{num}</span>
                    {order ? (
                      <>
                        <span className="text-[10px] text-blue-700 mt-1 truncate max-w-full">
                          {order.orderNumber}
                        </span>
                        {customerName && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-full">
                            {customerName}
                          </span>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-[10px] mt-1">
                        Free
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dryers */}
      {location.numDryers > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Dryers ({dryerMap.size}/{location.numDryers} in use)
            </CardTitle>
            <CardDescription>Click a unit to see assigned order</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-3">
              {Array.from({ length: location.numDryers }, (_, i) => {
                const num = i + 1;
                const order = dryerMap.get(num);
                const customerName = order?.customer
                  ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim()
                  : null;
                return (
                  <div
                    key={`d-${num}`}
                    className={cn(
                      "flex flex-col items-center justify-center rounded-lg border p-3 text-center",
                      order
                        ? "bg-orange-50 border-orange-300"
                        : "bg-background"
                    )}
                  >
                    <span className="text-sm font-bold">D{num}</span>
                    {order ? (
                      <>
                        <span className="text-[10px] text-orange-700 mt-1 truncate max-w-full">
                          {order.orderNumber}
                        </span>
                        {customerName && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-full">
                            {customerName}
                          </span>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-[10px] mt-1">
                        Free
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
