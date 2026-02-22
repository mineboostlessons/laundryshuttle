"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RouteMap } from "@/components/driver/route-map";
import { StopCard } from "@/components/driver/stop-card";
import {
  updateStopStatus,
  completeDelivery,
  startRoute,
  optimizeDriverRoute,
} from "../../actions";
import {
  ArrowLeft,
  Route,
  Play,
  Sparkles,
  Loader2,
  CheckCircle2,
  MapPin,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RouteData = NonNullable<
  Extract<
    Awaited<ReturnType<typeof import("../../actions").getRouteDetail>>,
    { success: true }
  >["route"]
>;

interface RouteDetailViewProps {
  route: RouteData;
}

export function RouteDetailView({ route }: RouteDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimizing, setOptimizing] = useState(false);
  const [starting, setStarting] = useState(false);

  const completedStops = route.stops.filter(
    (s) => s.status === "completed"
  ).length;
  const totalStops = route.stops.length;
  const nextStop = route.stops.find(
    (s) => s.status !== "completed" && s.status !== "skipped"
  );

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

  async function handleStart() {
    setStarting(true);
    try {
      await startRoute(route.id);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setStarting(false);
    }
  }

  async function handleOptimize() {
    setOptimizing(true);
    try {
      await optimizeDriverRoute(route.id);
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href="/driver"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      {/* Route Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                <span className="capitalize">{route.routeType} Route</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(route.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                route.status === "in_progress"
                  ? "bg-blue-100 text-blue-700"
                  : route.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
              )}
            >
              {route.status === "in_progress"
                ? "Active"
                : route.status === "completed"
                ? "Completed"
                : "Planned"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Laundromat info */}
          <div className="flex items-start gap-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{route.laundromat.name}</p>
              <p className="text-muted-foreground">{route.laundromat.address}</p>
            </div>
          </div>
          {route.laundromat.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a
                href={`tel:${route.laundromat.phone}`}
                className="text-primary hover:underline"
              >
                {route.laundromat.phone}
              </a>
            </div>
          )}

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {completedStops}/{totalStops} stops
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${totalStops > 0 ? (completedStops / totalStops) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Actions */}
          {route.status !== "completed" && (
            <div className="flex gap-2">
              {route.status === "planned" && (
                <Button
                  size="sm"
                  onClick={handleStart}
                  disabled={starting}
                >
                  {starting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Start Route
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleOptimize}
                disabled={optimizing}
              >
                {optimizing ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                {route.status === "planned" ? "Optimize" : "Re-optimize"}
              </Button>
            </div>
          )}

          {route.status === "completed" && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Route completed
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <RouteMap
        depot={{
          lat: route.laundromat.lat,
          lng: route.laundromat.lng,
          name: route.laundromat.name,
        }}
        stops={route.stops.map((s) => ({
          id: s.id,
          sequence: s.sequence,
          lat: s.lat,
          lng: s.lng,
          address: s.address,
          stopType: s.stopType,
          status: s.status,
        }))}
      />

      {/* Stops */}
      <div>
        <h3 className="font-semibold mb-3">
          Stops ({totalStops})
        </h3>
        <div className="space-y-3">
          {route.stops.map((stop) => (
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
      </div>
    </div>
  );
}
