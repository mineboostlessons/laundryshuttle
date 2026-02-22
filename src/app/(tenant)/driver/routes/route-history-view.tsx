"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Route,
  ChevronRight,
  CheckCircle2,
  Clock,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RouteHistoryData = Awaited<
  ReturnType<typeof import("../actions").getDriverRouteHistory>
>;

interface RouteHistoryViewProps {
  data: RouteHistoryData;
}

export function RouteHistoryView({ data }: RouteHistoryViewProps) {
  const { routes, pagination } = data;

  if (routes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Route className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-1">No routes yet</h3>
          <p className="text-sm text-muted-foreground">
            Your completed routes will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {routes.map((route) => {
        const isComplete = route.status === "completed";
        const progress =
          route.totalStops > 0
            ? Math.round((route.completedStops / route.totalStops) * 100)
            : 0;

        return (
          <Link key={route.id} href={`/driver/routes/${route.id}`}>
            <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm capitalize">
                        {route.routeType} Route
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          isComplete
                            ? "bg-green-100 text-green-700"
                            : route.status === "in_progress"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-700"
                        )}
                      >
                        {isComplete
                          ? "Completed"
                          : route.status === "in_progress"
                          ? "Active"
                          : "Planned"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(route.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span>{route.laundromat.name}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        {route.completedStops}/{route.totalStops} stops
                      </span>
                      {!isComplete && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-500" />
                          <span>{progress}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          {Array.from({ length: pagination.totalPages }, (_, i) => (
            <Button
              key={i}
              variant={i + 1 === pagination.page ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`/driver/routes?page=${i + 1}`}>{i + 1}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
