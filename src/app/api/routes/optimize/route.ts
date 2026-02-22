import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { optimizeRoute } from "@/lib/mapbox";

const optimizeSchema = z.object({
  routeId: z.string(),
});

/**
 * POST /api/routes/optimize
 * Optimize a driver route using Mapbox Optimization API.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!["driver", "manager", "owner"].includes(session.user.role)) {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = optimizeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { routeId } = parsed.data;

    const route = await prisma.driverRoute.findFirst({
      where: {
        id: routeId,
        ...(session.user.role === "driver" && { driverId: session.user.id }),
      },
      include: {
        laundromat: { select: { lat: true, lng: true } },
        stops: {
          where: { status: "pending" },
          orderBy: { sequence: "asc" },
        },
      },
    });

    if (!route) {
      return NextResponse.json(
        { success: false, error: "Route not found" },
        { status: 404 }
      );
    }

    if (route.stops.length < 2) {
      return NextResponse.json({
        success: true,
        message: "Not enough pending stops to optimize",
      });
    }

    const depot = { lat: route.laundromat.lat, lng: route.laundromat.lng };
    const waypoints = route.stops.map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
    }));

    const result = await optimizeRoute(depot, waypoints);
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Optimization failed" },
        { status: 500 }
      );
    }

    // Update stop sequences
    const updates = result.orderedStopIds.map((stopId, index) =>
      prisma.routeStop.update({
        where: { id: stopId },
        data: { sequence: index + 1 },
      })
    );

    await prisma.$transaction([
      ...updates,
      prisma.driverRoute.update({
        where: { id: routeId },
        data: { optimizedOrder: result.orderedStopIds },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        orderedStopIds: result.orderedStopIds,
        totalDurationMins: Math.round(result.totalDurationSecs / 60),
        totalDistanceMiles:
          Math.round((result.totalDistanceMeters / 1609.34) * 10) / 10,
      },
    });
  } catch (error) {
    console.error("Route optimization error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
