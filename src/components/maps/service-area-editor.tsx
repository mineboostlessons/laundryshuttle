"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, MapPin } from "lucide-react";

export interface AvailableDriver {
  id: string;
  firstName: string | null;
  lastName: string | null;
}

interface ZoneInfo {
  featureId: string;
  zoneName: string;
  driverId: string;
}

interface ServiceAreaEditorProps {
  initialPolygons: GeoJSON.FeatureCollection | null;
  center: [number, number]; // [lng, lat]
  onSave: (polygons: GeoJSON.FeatureCollection) => void;
  saving?: boolean;
  availableDrivers?: AvailableDriver[];
}

export function ServiceAreaEditor({
  initialPolygons,
  center,
  onSave,
  saving,
  availableDrivers = [],
}: ServiceAreaEditorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const zoneMarkers = useRef<mapboxgl.Marker[]>([]);
  const [featureCount, setFeatureCount] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const ZONE_COLORS = ["#7c3aed", "#059669", "#dc2626", "#d97706", "#2563eb", "#db2777", "#0891b2", "#65a30d"];

  // Compute centroid of a polygon's coordinates
  const getPolygonCentroid = useCallback((feature: GeoJSON.Feature): [number, number] | null => {
    let coords: number[][] = [];
    if (feature.geometry.type === "Polygon") {
      coords = (feature.geometry as GeoJSON.Polygon).coordinates[0];
    } else if (feature.geometry.type === "MultiPolygon") {
      coords = (feature.geometry as GeoJSON.MultiPolygon).coordinates[0]?.[0] ?? [];
    }
    if (coords.length === 0) return null;
    let sumLng = 0, sumLat = 0;
    for (const c of coords) {
      sumLng += c[0];
      sumLat += c[1];
    }
    return [sumLng / coords.length, sumLat / coords.length];
  }, []);

  // Update numbered markers on the map
  const updateZoneMarkers = useCallback((polygons: GeoJSON.Feature[]) => {
    if (!map.current) return;
    // Remove old markers
    for (const m of zoneMarkers.current) m.remove();
    zoneMarkers.current = [];

    polygons.forEach((feature, idx) => {
      const centroid = getPolygonCentroid(feature);
      if (!centroid) return;
      const color = ZONE_COLORS[idx % ZONE_COLORS.length];
      const el = document.createElement("div");
      el.style.cssText = `width:28px;height:28px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;font-family:system-ui,sans-serif;pointer-events:none;`;
      el.textContent = String(idx + 1);
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(centroid)
        .addTo(map.current!);
      zoneMarkers.current.push(marker);
    });
  }, [getPolygonCentroid]);

  const syncZones = useCallback(() => {
    if (!draw.current) return;
    const all = draw.current.getAll();
    const polygons = all.features.filter(
      (f) => f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
    );
    setFeatureCount(polygons.length);
    updateZoneMarkers(polygons);

    setZones((prev) => {
      const newZones: ZoneInfo[] = [];
      for (const feature of polygons) {
        const fid = feature.id as string;
        const existing = prev.find((z) => z.featureId === fid);
        const props = (feature.properties ?? {}) as Record<string, unknown>;
        newZones.push({
          featureId: fid,
          zoneName: existing?.zoneName ?? (props.zoneName as string) ?? "",
          driverId: existing?.driverId ?? (props.driverId as string) ?? "",
        });
      }
      return newZones;
    });
  }, [updateZoneMarkers]);

  const updateCounts = useCallback((markDirty = false) => {
    if (!draw.current) return;
    syncZones();
    const selected = draw.current.getSelectedIds();
    setSelectedCount(selected.length);
    setSelectedFeatureId(selected.length === 1 ? selected[0] : null);
    if (markDirty) setHasUnsavedChanges(true);
  }, [syncZones]);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 11,
    });

    const m = map.current;

    const drawInstance = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "simple_select",
    });

    draw.current = drawInstance;
    m.addControl(drawInstance, "top-left");
    m.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add laundromat marker
    const markerEl = document.createElement("div");
    markerEl.style.cssText =
      "width:28px;height:28px;background:#7c3aed;border:3px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);";

    new mapboxgl.Marker({ element: markerEl })
      .setLngLat(center)
      .addTo(m);

    m.on("load", () => {
      // Load existing polygons
      if (initialPolygons && initialPolygons.features.length > 0) {
        drawInstance.set(initialPolygons as GeoJSON.FeatureCollection);

        // Fit bounds to existing polygons
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(center);
        for (const feature of initialPolygons.features) {
          if (feature.geometry.type === "Polygon") {
            const coords = (feature.geometry as GeoJSON.Polygon).coordinates;
            for (const ring of coords) {
              for (const coord of ring) {
                bounds.extend(coord as [number, number]);
              }
            }
          } else if (feature.geometry.type === "MultiPolygon") {
            const coords = (feature.geometry as GeoJSON.MultiPolygon).coordinates;
            for (const polygon of coords) {
              for (const ring of polygon) {
                for (const coord of ring) {
                  bounds.extend(coord as [number, number]);
                }
              }
            }
          }
        }
        m.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      }

      updateCounts();
    });

    // Track feature/selection changes
    m.on("draw.create", () => updateCounts(true));
    m.on("draw.delete", () => updateCounts(true));
    m.on("draw.selectionchange", () => updateCounts(false));
    m.on("draw.update", () => updateCounts(true));

    return () => {
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (!draw.current) return;
    const selectedIds = draw.current.getSelectedIds();
    if (selectedIds.length === 0) return;
    draw.current.delete(selectedIds);
    updateCounts();
  }, [updateCounts]);

  const handleDeleteAll = useCallback(() => {
    if (!draw.current) return;
    draw.current.deleteAll();
    updateCounts();
  }, [updateCounts]);

  const handleZoneNameChange = useCallback((featureId: string, name: string) => {
    setZones((prev) =>
      prev.map((z) => (z.featureId === featureId ? { ...z, zoneName: name } : z))
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleDriverChange = useCallback((featureId: string, driverId: string) => {
    setZones((prev) =>
      prev.map((z) => (z.featureId === featureId ? { ...z, driverId } : z))
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleSelectZone = useCallback((featureId: string) => {
    if (!draw.current || !map.current) return;
    draw.current.changeMode("simple_select", { featureIds: [featureId] });
    setSelectedFeatureId(featureId);
    setSelectedCount(1);

    // Pan to selected polygon
    const feature = draw.current.get(featureId);
    if (feature && feature.geometry.type === "Polygon") {
      const coords = (feature.geometry as GeoJSON.Polygon).coordinates[0];
      const bounds = new mapboxgl.LngLatBounds();
      for (const coord of coords) {
        bounds.extend(coord as [number, number]);
      }
      map.current.fitBounds(bounds, { padding: 80, maxZoom: 14 });
    }
  }, []);

  const handleSave = useCallback(() => {
    if (!draw.current) return;
    const allFeatures = draw.current.getAll() as GeoJSON.FeatureCollection;

    // Filter to only polygon features and inject zone metadata into properties
    const polygonFeatures: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: allFeatures.features
        .filter(
          (f) => f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
        )
        .map((f) => {
          const zoneInfo = zones.find((z) => z.featureId === (f.id as string));
          return {
            ...f,
            properties: {
              ...(f.properties ?? {}),
              zoneName: zoneInfo?.zoneName ?? "",
              driverId: zoneInfo?.driverId ?? "",
            },
          };
        }),
    };

    onSave(polygonFeatures);
    setHasUnsavedChanges(false);
  }, [onSave, zones]);

  return (
    <div className="space-y-4">
      <div
        ref={mapContainer}
        className="w-full h-[500px] rounded-lg overflow-hidden border"
      />
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={selectedCount === 0}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Selected
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            disabled={featureCount === 0}
          >
            Delete All
          </Button>
          <span className="text-sm text-muted-foreground">
            {featureCount} polygon{featureCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-sm font-medium text-amber-600">Unsaved changes</span>
          )}
          <Button onClick={handleSave} disabled={saving} variant={hasUnsavedChanges ? "default" : "outline"}>
            {saving ? "Saving..." : "Save Service Area"}
          </Button>
        </div>
      </div>

      {/* Zone Configuration Panel */}
      {zones.length > 0 && (
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold">Zone Configuration</h3>
          <div className="divide-y">
            {zones.map((zone, idx) => (
              <div
                key={zone.featureId}
                className={`py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-end gap-3 cursor-pointer rounded px-2 ${
                  selectedFeatureId === zone.featureId ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50"
                }`}
                onClick={() => handleSelectZone(zone.featureId)}
              >
                <div className="flex items-center gap-2 sm:w-10 flex-shrink-0">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: ZONE_COLORS[idx % ZONE_COLORS.length] }}
                  >
                    {idx + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <Label className="text-xs text-muted-foreground">Zone Name</Label>
                  <Input
                    value={zone.zoneName}
                    onChange={(e) => handleZoneNameChange(zone.featureId, e.target.value)}
                    placeholder={`Zone ${idx + 1}`}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="sm:w-48 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Label className="text-xs text-muted-foreground">Default Driver</Label>
                  <select
                    value={zone.driverId}
                    onChange={(e) => handleDriverChange(zone.featureId, e.target.value)}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Unassigned</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {[d.firstName, d.lastName].filter(Boolean).join(" ") || "Unnamed"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Use the polygon tool to draw your service area. Click to add points, double-click to finish.
        Select a polygon and click &quot;Delete Selected&quot; to remove it.
        Assign a zone name and default driver to each polygon below the map.
      </p>
    </div>
  );
}
