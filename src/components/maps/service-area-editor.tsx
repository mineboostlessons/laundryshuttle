"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { Button } from "@/components/ui/button";

interface ServiceAreaEditorProps {
  initialPolygons: GeoJSON.FeatureCollection | null;
  center: [number, number]; // [lng, lat]
  onSave: (polygons: GeoJSON.FeatureCollection) => void;
  saving?: boolean;
}

export function ServiceAreaEditor({
  initialPolygons,
  center,
  onSave,
  saving,
}: ServiceAreaEditorProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);

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
    });

    return () => {
      m.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(() => {
    if (!draw.current) return;
    const allFeatures = draw.current.getAll() as GeoJSON.FeatureCollection;

    // Filter to only polygon features
    const polygonFeatures: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: allFeatures.features.filter(
        (f) => f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"
      ),
    };

    onSave(polygonFeatures);
  }, [onSave]);

  return (
    <div className="space-y-4">
      <div
        ref={mapContainer}
        className="w-full h-[500px] rounded-lg overflow-hidden border"
      />
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Use the polygon tool to draw your service area. Click to add points, double-click to finish.
        </p>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Service Area"}
        </Button>
      </div>
    </div>
  );
}
