"use client";

import { useState } from "react";
import Link from "next/link";
import { ServiceAreaEditor } from "@/components/maps/service-area-editor";
import { updateServiceArea } from "./actions";
import { ArrowLeft } from "lucide-react";

interface ServiceAreaViewProps {
  laundromatId: string;
  laundromatName: string;
  center: [number, number]; // [lng, lat]
  initialPolygons: GeoJSON.FeatureCollection | null;
}

export function ServiceAreaView({
  laundromatId,
  laundromatName,
  center,
  initialPolygons,
}: ServiceAreaViewProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSave(polygons: GeoJSON.FeatureCollection) {
    setSaving(true);
    setMessage(null);

    const result = await updateServiceArea({
      laundromatId,
      polygons,
    });

    setSaving(false);

    if (result.success) {
      setMessage({ type: "success", text: "Service area saved successfully" });
    } else {
      setMessage({ type: "error", text: result.error ?? "Failed to save service area" });
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <h1 className="text-2xl font-bold">Service Area</h1>
        <p className="text-muted-foreground">
          Draw the delivery area for {laundromatName}. Orders outside this area will be rejected.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <ServiceAreaEditor
        initialPolygons={initialPolygons}
        center={center}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
