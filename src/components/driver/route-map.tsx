"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface RouteMapProps {
  depot: { lat: number; lng: number; name: string };
  stops: Array<{
    id: string;
    sequence: number;
    lat: number;
    lng: number;
    address: string;
    stopType: string;
    status: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#6b7280",
  en_route: "#3b82f6",
  arrived: "#f59e0b",
  completed: "#22c55e",
  skipped: "#ef4444",
};

export function RouteMap({ depot, stops }: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [depot.lng, depot.lat],
      zoom: 11,
    });

    const m = map.current;

    m.on("load", () => {
      // Add depot marker
      const depotEl = document.createElement("div");
      depotEl.className = "depot-marker";
      depotEl.style.cssText =
        "width:28px;height:28px;background:#7c3aed;border:3px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);";

      new mapboxgl.Marker({ element: depotEl })
        .setLngLat([depot.lng, depot.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 15 }).setHTML(
            `<strong>${depot.name}</strong><br/><span style="font-size:12px">Depot</span>`
          )
        )
        .addTo(m);

      // Add stop markers
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend([depot.lng, depot.lat]);

      for (const stop of stops) {
        bounds.extend([stop.lng, stop.lat]);

        const color = STATUS_COLORS[stop.status] ?? "#6b7280";

        const el = document.createElement("div");
        el.style.cssText = `
          width:24px;height:24px;background:${color};border:2px solid white;
          border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:bold;color:white;cursor:pointer;
        `;
        el.textContent = String(stop.sequence);

        new mapboxgl.Marker({ element: el })
          .setLngLat([stop.lng, stop.lat])
          .setPopup(
            new mapboxgl.Popup({ offset: 15 }).setHTML(
              `<strong>#${stop.sequence} ${stop.stopType === "pickup" ? "Pickup" : "Delivery"}</strong>
               <br/><span style="font-size:12px">${stop.address}</span>
               <br/><span style="font-size:11px;color:${color};text-transform:capitalize">${stop.status.replace("_", " ")}</span>`
            )
          )
          .addTo(m);
      }

      // Draw route line between stops in sequence
      if (stops.length > 0) {
        const coordinates: [number, number][] = [
          [depot.lng, depot.lat],
          ...stops
            .sort((a, b) => a.sequence - b.sequence)
            .map((s) => [s.lng, s.lat] as [number, number]),
          [depot.lng, depot.lat],
        ];

        m.addSource("route-line", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates,
            },
          },
        });

        m.addLayer({
          id: "route-line-layer",
          type: "line",
          source: "route-line",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#3b82f6",
            "line-width": 3,
            "line-opacity": 0.6,
            "line-dasharray": [2, 2],
          },
        });
      }

      m.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    });

    // Add navigation controls
    m.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      m.remove();
    };
  }, [depot, stops]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-64 sm:h-80 rounded-lg overflow-hidden border"
    />
  );
}
