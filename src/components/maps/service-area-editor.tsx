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
  const [featureCount, setFeatureCount] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [zones, setZones] = useState<ZoneInfo[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const syncZones = useCallback(() => {
    if (!draw.current) return;
    const all = draw.current.getAll();
    const polygons = all.features.filter(
      (f) => f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
    );
    setFeatureCount(polygons.length);

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
  }, []);

  const updateCounts = useCallback(() => {
    if (!draw.current) return;
    syncZones();
    const selected = draw.current.getSelectedIds();
    setSelectedCount(selected.length);
    setSelectedFeatureId(selected.length === 1 ? selected[0] : null);
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
    m.on("draw.create", updateCounts);
    m.on("draw.delete", updateCounts);
    m.on("draw.selectionchange", updateCounts);
    m.on("draw.update", updateCounts);

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
  }, []);

  const handleDriverChange = useCallback((featureId: string, driverId: string) => {
    setZones((prev) =>
      prev.map((z) => (z.featureId === featureId ? { ...z, driverId } : z))
    );
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
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Service Area"}
        </Button>
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
                <div className="flex items-center gap-2 sm:w-8 flex-shrink-0">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-mono">
                    {idx + 1}
                  </span>
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
