"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StopCard } from "@/components/driver/stop-card";
import { AddressAutocomplete, type AddressValue } from "@/components/maps/address-autocomplete";
import { Checkbox } from "@/components/ui/checkbox";
import {
  updateStopStatus,
  completeDelivery,
  startRoute,
  optimizeDriverRoute,
  buildTodaysRoute,
  removeRoute,
} from "./actions";
import {
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  Route,
  Play,
  Sparkles,
  Loader2,
  ChevronRight,
  Package,
  AlertCircle,
  Navigation,
  ArrowDownUp,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardData = Awaited<
  ReturnType<typeof import("./actions").getDriverDashboardData>
>;

interface DriverDashboardViewProps {
  data: DashboardData;
  userName: string;
}

export function DriverDashboardView({
  data,
  userName,
}: DriverDashboardViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimizingRouteId, setOptimizingRouteId] = useState<string | null>(null);
  const [startingRouteId, setStartingRouteId] = useState<string | null>(null);
  const [customDepot, setCustomDepot] = useState<AddressValue | null>(null);
  const [useCustomDepot, setUseCustomDepot] = useState(false);
  const [buildingRoute, setBuildingRoute] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [removingRouteId, setRemovingRouteId] = useState<string | null>(null);

  const { routes, stats, upcomingOrders, depot } = data;

  // Find the active/first route for today
  const activeRoute =
    routes.find((r) => r.status === "in_progress") ?? routes.find((r) => r.status === "planned");

  // Next pending stop in active route
  const nextStop = activeRoute?.stops.find((s) => s.status !== "completed" && s.status !== "skipped");

  async function handleUpdateStopStatus(
    stopId: string,
    status: "en_route" | "arrived" | "completed" | "skipped"
  ) {
    await updateStopStatus({ stopId, status });
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCompleteDelivery(
    stopId: string,
    proof: { deliveryPhotoUrl?: string; signatureUrl?: string }
  ) {
    await completeDelivery({ stopId, ...proof });
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleStartRoute(routeId: string) {
    setStartingRouteId(routeId);
    try {
      await startRoute(routeId);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setStartingRouteId(null);
    }
  }

  async function handleOptimize(routeId: string) {
    setOptimizingRouteId(routeId);
    try {
      await optimizeDriverRoute(routeId);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setOptimizingRouteId(null);
    }
  }

  async function handleBuildRoute() {
    setBuildingRoute(true);
    setBuildError(null);
    try {
      const input = useCustomDepot && customDepot
        ? { depotLat: customDepot.lat, depotLng: customDepot.lng }
        : {};
      const result = await buildTodaysRoute(input);
      if (result.success) {
        startTransition(() => {
          router.refresh();
        });
      } else {
        setBuildError(result.error);
      }
    } catch {
      setBuildError("Failed to build route. Please try again.");
    } finally {
      setBuildingRoute(false);
    }
  }

  async function handleRemoveRoute(routeId: string) {
    setRemovingRouteId(routeId);
    try {
      const result = await removeRoute(routeId);
      if (result.success) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setRemovingRouteId(null);
    }
  }

  // Compute order breakdown for route builder
  const pickupCount = upcomingOrders.filter((o) => o.status === "confirmed").length;
  const deliveryCount = upcomingOrders.length - pickupCount;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-bold">
          {getGreeting()}, {userName}
        </h2>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<MapPin className="h-4 w-4" />}
          label="Total Stops"
          value={stats.totalStops}
          href="/driver/earnings"
        />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
          label="Completed"
          value={stats.completed}
          href="/driver/earnings"
        />
        <StatCard
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          label="Remaining"
          value={stats.pending + stats.inProgress}
          href="/driver/earnings"
        />
        <StatCard
          icon={<Truck className="h-4 w-4 text-blue-600" />}
          label="In Progress"
          value={stats.inProgress}
          href="/driver/earnings"
        />
      </div>

      {/* No routes — show route builder or empty state */}
      {routes.length === 0 && upcomingOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Build Today&apos;s Route
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Depot info */}
            {depot && (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Starting from:</p>
                <p className="font-medium">{depot.name}</p>
                <p className="text-muted-foreground text-xs">{depot.address}</p>
              </div>
            )}

            {/* Custom depot toggle */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="custom-depot"
                  checked={useCustomDepot}
                  onCheckedChange={(checked) => {
                    setUseCustomDepot(checked === true);
                    if (!checked) setCustomDepot(null);
                  }}
                />
                <label htmlFor="custom-depot" className="text-sm cursor-pointer">
                  Start from a different location
                </label>
              </div>
              {useCustomDepot && (
                <AddressAutocomplete
                  value={customDepot}
                  onChange={setCustomDepot}
                  label="Custom starting location"
                  placeholder="Enter your starting address..."
                />
              )}
            </div>

            <Separator />

            {/* Order breakdown */}
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium">
                {upcomingOrders.length} order{upcomingOrders.length !== 1 ? "s" : ""}
              </span>
              {pickupCount > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {pickupCount} pickup{pickupCount !== 1 ? "s" : ""}
                </Badge>
              )}
              {deliveryCount > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {deliveryCount} deliver{deliveryCount !== 1 ? "ies" : "y"}
                </Badge>
              )}
            </div>

            {buildError && (
              <p className="text-sm text-destructive">{buildError}</p>
            )}

            <Button
              onClick={handleBuildRoute}
              disabled={buildingRoute || (useCustomDepot && !customDepot)}
              className="w-full"
            >
              {buildingRoute ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowDownUp className="h-4 w-4 mr-2" />
              )}
              Build Today&apos;s Route
            </Button>
          </CardContent>
        </Card>
      )}

      {routes.length === 0 && upcomingOrders.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Route className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-1">No routes today</h3>
            <p className="text-sm text-muted-foreground text-center">
              You don&apos;t have any routes assigned for today. Check back later or
              contact your manager.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Active Route */}
      {activeRoute && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  {activeRoute.routeType === "pickup"
                    ? "Pickup Route"
                    : activeRoute.routeType === "delivery"
                    ? "Delivery Route"
                    : "Mixed Route"}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {activeRoute.laundromat.name} &middot;{" "}
                  {activeRoute.stops.length} stops
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    activeRoute.status === "in_progress"
                      ? "bg-blue-100 text-blue-700"
                      : activeRoute.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  )}
                >
                  {activeRoute.status === "in_progress"
                    ? "Active"
                    : activeRoute.status === "completed"
                    ? "Done"
                    : "Planned"}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Route actions */}
            {activeRoute.status === "planned" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => handleStartRoute(activeRoute.id)}
                  disabled={startingRouteId === activeRoute.id}
                >
                  {startingRouteId === activeRoute.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Start Route
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOptimize(activeRoute.id)}
                  disabled={optimizingRouteId === activeRoute.id}
                >
                  {optimizingRouteId === activeRoute.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Optimize
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/driver/routes/${activeRoute.id}`}>
                    View Map
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemoveRoute(activeRoute.id)}
                  disabled={removingRouteId === activeRoute.id}
                >
                  {removingRouteId === activeRoute.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Remove Route
                </Button>
              </div>
            )}

            {activeRoute.status === "in_progress" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOptimize(activeRoute.id)}
                  disabled={optimizingRouteId === activeRoute.id}
                >
                  {optimizingRouteId === activeRoute.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Re-optimize
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/driver/routes/${activeRoute.id}`}>
                    View Map
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRemoveRoute(activeRoute.id)}
                  disabled={removingRouteId === activeRoute.id}
                >
                  {removingRouteId === activeRoute.id ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Remove Route
                </Button>
              </div>
            )}

            <Separator />

            {/* Stop List */}
            <div className="space-y-3">
              {activeRoute.stops.map((stop) => (
                <StopCard
                  key={stop.id}
                  stop={{
                    ...stop,
                    completedAt: stop.completedAt?.toISOString() ?? null,
                  }}
                  isNext={stop.id === nextStop?.id}
                  onUpdateStatus={handleUpdateStopStatus}
                  onCompleteDelivery={handleCompleteDelivery}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other routes for today */}
      {routes.length > 1 && (
        <div>
          <h3 className="font-semibold mb-3">Other Routes Today</h3>
          <div className="space-y-2">
            {routes
              .filter((r) => r.id !== activeRoute?.id)
              .map((route) => (
                <Card key={route.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          {route.routeType === "pickup"
                            ? "Pickup Route"
                            : route.routeType === "delivery"
                            ? "Delivery Route"
                            : "Mixed Route"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {route.laundromat.name} &middot; {route.stops.length}{" "}
                          stops
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={cn(
                            route.status === "completed"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          )}
                        >
                          {route.status === "completed" ? "Done" : "Planned"}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/driver/routes/${route.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}

      {/* Unrouted orders list */}
      {upcomingOrders.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            {routes.length > 0 ? "Unrouted Orders" : "Orders Awaiting Route"}
          </h3>
          <div className="space-y-2">
            {upcomingOrders.map((order) => {
              const isPickup = order.status === "confirmed";
              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {order.orderNumber}
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn(
                              order.status === "confirmed"
                                ? "bg-blue-100 text-blue-700"
                                : order.status === "ready"
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                            )}
                          >
                            {order.status === "confirmed"
                              ? "Awaiting Pickup"
                              : order.status === "ready"
                              ? "Ready for Delivery"
                              : "Out for Delivery"}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">
                            {isPickup ? "Pickup" : "Delivery"}
                          </span>
                        </div>
                        {order.customer && (
                          <p className="text-xs text-muted-foreground">
                            {order.customer.firstName} {order.customer.lastName}
                          </p>
                        )}
                        {order.pickupAddress && (
                          <p className="text-xs text-muted-foreground">
                            {order.pickupAddress.addressLine1},{" "}
                            {order.pickupAddress.city}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {isPickup
                          ? order.pickupTimeSlot
                          : order.deliveryTimeSlot}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
}) {
  const card = (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">{icon}</div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="transition-shadow hover:shadow-md rounded-lg">
        {card}
      </Link>
    );
  }

  return card;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
