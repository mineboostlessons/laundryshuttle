import * as turf from "@turf/turf";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

// =============================================================================
// Types
// =============================================================================

export interface MapboxSuggestion {
  id: string;
  placeName: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  placeName: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  context?: Array<{
    id: string;
    text: string;
    short_code?: string;
  }>;
  address?: string;
  text?: string;
}

// =============================================================================
// Forward Geocoding (address → coordinates)
// =============================================================================

export async function geocodeAddress(query: string): Promise<GeocodingResult | null> {
  if (!query.trim()) return null;

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("country", "us");
  url.searchParams.set("types", "address");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  const feature = data.features?.[0] as MapboxFeature | undefined;
  if (!feature) return null;

  return {
    lat: feature.center[1],
    lng: feature.center[0],
    placeName: feature.place_name,
  };
}

// =============================================================================
// Reverse Geocoding (coordinates → address)
// =============================================================================

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("types", "address");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  return data.features?.[0]?.place_name ?? null;
}

// =============================================================================
// Address Autocomplete Suggestions
// =============================================================================

export async function getAddressSuggestions(query: string): Promise<MapboxSuggestion[]> {
  if (!query || query.length < 3) return [];

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("country", "us");
  url.searchParams.set("types", "address");
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("limit", "5");

  const res = await fetch(url.toString());
  if (!res.ok) return [];

  const data = await res.json();
  const features = (data.features ?? []) as MapboxFeature[];

  return features.map((feature) => {
    const context = feature.context ?? [];
    const city = context.find((c) => c.id.startsWith("place"))?.text ?? "";
    const state =
      context
        .find((c) => c.id.startsWith("region"))
        ?.short_code?.replace("US-", "") ?? "";
    const zip = context.find((c) => c.id.startsWith("postcode"))?.text ?? "";

    const streetNumber = feature.address ?? "";
    const streetName = feature.text ?? "";
    const addressLine1 = streetNumber
      ? `${streetNumber} ${streetName}`
      : streetName;

    return {
      id: feature.id,
      placeName: feature.place_name,
      addressLine1,
      city,
      state,
      zip,
      lat: feature.center[1],
      lng: feature.center[0],
    };
  });
}

// =============================================================================
// Service Area Validation
// =============================================================================

/**
 * Check if a point (lat, lng) falls within a GeoJSON service area polygon.
 * The serviceAreaPolygons should be a GeoJSON FeatureCollection stored on the Laundromat.
 */
export function isPointInServiceArea(
  lat: number,
  lng: number,
  serviceAreaPolygons: GeoJSON.FeatureCollection | null | undefined
): boolean {
  if (!serviceAreaPolygons || !serviceAreaPolygons.features?.length) {
    // No service area defined = serve everywhere
    return true;
  }

  const point = turf.point([lng, lat]);

  for (const feature of serviceAreaPolygons.features) {
    if (
      feature.geometry.type === "Polygon" ||
      feature.geometry.type === "MultiPolygon"
    ) {
      if (turf.booleanPointInPolygon(point, feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate distance in miles between two points.
 */
export function distanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const from = turf.point([lng1, lat1]);
  const to = turf.point([lng2, lat2]);
  return turf.distance(from, to, { units: "miles" });
}

// =============================================================================
// Route Optimization (Mapbox Optimization API v1)
// =============================================================================

export interface RouteWaypoint {
  id: string;
  lat: number;
  lng: number;
}

export interface OptimizedRoute {
  /** Stop IDs in optimized order */
  orderedStopIds: string[];
  /** Total duration in seconds */
  totalDurationSecs: number;
  /** Total distance in meters */
  totalDistanceMeters: number;
  /** GeoJSON LineString of the route geometry */
  geometry: GeoJSON.LineString | null;
  /** Per-leg durations in seconds */
  legDurations: number[];
}

/**
 * Optimize a route using Mapbox Optimization API.
 * Takes a depot (start/end point) and a list of waypoints.
 * Returns the optimized order of stops.
 *
 * Max 12 waypoints (Mapbox limit). The depot is coordinate 0
 * and is set as source + destination so the route is a round-trip.
 */
export async function optimizeRoute(
  depot: { lat: number; lng: number },
  waypoints: RouteWaypoint[]
): Promise<OptimizedRoute | null> {
  if (waypoints.length === 0) return null;
  if (waypoints.length === 1) {
    return {
      orderedStopIds: [waypoints[0].id],
      totalDurationSecs: 0,
      totalDistanceMeters: 0,
      geometry: null,
      legDurations: [],
    };
  }

  // Build coordinates: depot first, then waypoints
  const coords = [
    `${depot.lng},${depot.lat}`,
    ...waypoints.map((w) => `${w.lng},${w.lat}`),
  ].join(";");

  const url = new URL(
    `https://api.mapbox.com/optimized-trips/v1/mapbox/driving/${coords}`
  );
  url.searchParams.set("access_token", MAPBOX_TOKEN);
  url.searchParams.set("source", "first");
  url.searchParams.set("destination", "first");
  url.searchParams.set("roundtrip", "true");
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  if (data.code !== "Ok" || !data.trips?.length) return null;

  const trip = data.trips[0];

  // data.waypoints contains the optimized index for each input coordinate
  // Index 0 is the depot, indices 1+ are our waypoints
  const waypointIndices = data.waypoints as Array<{
    waypoint_index: number;
    trips_index: number;
  }>;

  // Build ordered stop IDs by sorting waypoints (skip depot at index 0)
  const stopOrder = waypointIndices
    .slice(1) // skip depot
    .map((wp, originalIndex) => ({
      originalIndex,
      optimizedIndex: wp.waypoint_index,
    }))
    .sort((a, b) => a.optimizedIndex - b.optimizedIndex)
    .map((entry) => waypoints[entry.originalIndex].id);

  const legDurations = (trip.legs as Array<{ duration: number }>).map(
    (leg) => leg.duration
  );

  return {
    orderedStopIds: stopOrder,
    totalDurationSecs: trip.duration,
    totalDistanceMeters: trip.distance,
    geometry: trip.geometry ?? null,
    legDurations,
  };
}

/**
 * Get directions between two points (for navigation link).
 */
export function getNavigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
