"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ServiceAreaEditor } from "@/components/maps/service-area-editor";
import type { AvailableDriver } from "@/components/maps/service-area-editor";
import { updateServiceArea, createZoneOverride, deleteZoneOverride } from "./actions";
import { ArrowLeft, Plus, Trash2, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ZoneOverride {
  id: string;
  zoneFeatureId: string;
  startDate: Date;
  endDate: Date;
  reason: string | null;
  driver: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

interface ServiceAreaViewProps {
  laundromatId: string;
  laundromatName: string;
  center: [number, number]; // [lng, lat]
  initialPolygons: GeoJSON.FeatureCollection | null;
  availableDrivers: AvailableDriver[];
  initialOverrides: ZoneOverride[];
}

export function ServiceAreaView({
  laundromatId,
  laundromatName,
  center,
  initialPolygons,
  availableDrivers,
  initialOverrides,
}: ServiceAreaViewProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [overrides, setOverrides] = useState<ZoneOverride[]>(initialOverrides);
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Override form state
  const [overrideZoneId, setOverrideZoneId] = useState("");
  const [overrideDriverId, setOverrideDriverId] = useState("");
  const [overrideStartDate, setOverrideStartDate] = useState("");
  const [overrideEndDate, setOverrideEndDate] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  // Get zone names from initial polygons
  const zoneOptions = (initialPolygons?.features ?? []).map((f) => ({
    featureId: f.id as string,
    zoneName: ((f.properties as Record<string, unknown>)?.zoneName as string) || `Zone (${String(f.id ?? "").slice(0, 8) || "unknown"})`,
  }));

  async function handleSave(polygons: GeoJSON.FeatureCollection) {
    setSaving(true);
    setMessage(null);

    const result = await updateServiceArea({
      laundromatId,
      polygons,
    });

    setSaving(false);

    if (result.success) {
      const countMsg = result.reassignedCount
        ? ` ${result.reassignedCount} order${result.reassignedCount !== 1 ? "s" : ""} reassigned to updated drivers.`
        : "";
      setMessage({ type: "success", text: `Service area saved successfully.${countMsg}` });
    } else {
      setMessage({ type: "error", text: result.error ?? "Failed to save service area" });
    }
  }

  async function handleCreateOverride() {
    if (!overrideZoneId || !overrideDriverId || !overrideStartDate || !overrideEndDate) return;

    startTransition(async () => {
      const result = await createZoneOverride({
        laundromatId,
        zoneFeatureId: overrideZoneId,
        driverId: overrideDriverId,
        startDate: overrideStartDate,
        endDate: overrideEndDate,
        reason: overrideReason || undefined,
      });

      if (result.success) {
        setShowOverrideForm(false);
        setOverrideZoneId("");
        setOverrideDriverId("");
        setOverrideStartDate("");
        setOverrideEndDate("");
        setOverrideReason("");
        setMessage({ type: "success", text: "Override created. Existing confirmed orders in this zone have been reassigned." });
        // Refresh — the page will revalidate
        window.location.reload();
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to create override" });
      }
    });
  }

  async function handleDeleteOverride(overrideId: string) {
    startTransition(async () => {
      const result = await deleteZoneOverride(overrideId);
      if (result.success) {
        setOverrides((prev) => prev.filter((o) => o.id !== overrideId));
        setMessage({ type: "success", text: "Override removed" });
      } else {
        setMessage({ type: "error", text: result.error ?? "Failed to delete override" });
      }
    });
  }

  function getZoneName(featureId: string): string {
    const zone = zoneOptions.find((z) => z.featureId === featureId);
    return zone?.zoneName ?? featureId.slice(0, 8);
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
          Draw the delivery area for {laundromatName}. Assign a default driver to each zone.
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
        availableDrivers={availableDrivers}
      />

      {/* Zone Coverage Overrides */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Zone Coverage Overrides
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Temporarily reassign a zone to a substitute driver (PTO, sick leave, etc.)
            </p>
          </div>
          {zoneOptions.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOverrideForm(!showOverrideForm)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Override
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Override Form */}
          {showOverrideForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Zone</Label>
                  <select
                    value={overrideZoneId}
                    onChange={(e) => setOverrideZoneId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select zone...</option>
                    {zoneOptions.map((z) => (
                      <option key={z.featureId} value={z.featureId}>
                        {z.zoneName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Substitute Driver</Label>
                  <select
                    value={overrideDriverId}
                    onChange={(e) => setOverrideDriverId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select driver...</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {[d.firstName, d.lastName].filter(Boolean).join(" ") || "Unnamed"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={overrideStartDate}
                    onChange={(e) => setOverrideStartDate(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={overrideEndDate}
                    onChange={(e) => setOverrideEndDate(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Reason (optional)</Label>
                <Input
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="PTO, Sick leave, etc."
                  className="h-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateOverride}
                  disabled={isPending || !overrideZoneId || !overrideDriverId || !overrideStartDate || !overrideEndDate}
                >
                  {isPending ? "Creating..." : "Create Override"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowOverrideForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Active/Upcoming Overrides List */}
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active or upcoming overrides</p>
          ) : (
            <div className="divide-y">
              {overrides.map((o) => {
                const driverName = [o.driver.firstName, o.driver.lastName].filter(Boolean).join(" ") || "Unnamed";
                const start = new Date(o.startDate).toLocaleDateString();
                const end = new Date(o.endDate).toLocaleDateString();
                const isActive = new Date(o.startDate) <= new Date() && new Date(o.endDate) >= new Date();

                return (
                  <div key={o.id} className="flex items-center justify-between py-2 gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {getZoneName(o.zoneFeatureId)}
                        {isActive && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 rounded px-1.5 py-0.5">
                            Active
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {start} - {end} &middot; {driverName}
                        {o.reason && ` &middot; ${o.reason}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteOverride(o.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
