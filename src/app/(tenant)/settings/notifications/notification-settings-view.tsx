"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  updateNotificationSettings,
  upsertNotificationTemplate,
  deleteNotificationTemplate,
  seedDefaultTemplates,
} from "./actions";
import {
  Mail,
  MessageSquare,
  Bell,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Wand2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// =============================================================================
// Types
// =============================================================================

interface NotificationSettings {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  pushEnabled?: boolean;
  smsBudgetCap?: number;
}

interface NotificationTemplate {
  id: string;
  tenantId: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NOTIFICATION_EVENTS = [
  { value: "order_confirmed", label: "Order Confirmed" },
  { value: "order_ready", label: "Order Ready" },
  { value: "order_completed", label: "Order Completed" },
  { value: "order_out_for_delivery", label: "Out for Delivery" },
  { value: "driver_en_route", label: "Driver En Route" },
  { value: "delivery_completed", label: "Delivery Completed" },
  { value: "payment_received", label: "Payment Received" },
  { value: "order_cancelled", label: "Order Cancelled" },
  { value: "pickup_reminder", label: "Pickup Reminder" },
  { value: "subscription_renewal", label: "Subscription Renewal" },
  { value: "promo_available", label: "Promo Available" },
];

const MERGE_TAGS = [
  "{{customerName}}",
  "{{orderNumber}}",
  "{{total}}",
  "{{businessName}}",
  "{{driverName}}",
  "{{pickupDate}}",
  "{{deliveryDate}}",
  "{{promoCode}}",
  "{{promoDescription}}",
  "{{reason}}",
];

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  sms: <MessageSquare className="h-3.5 w-3.5" />,
  push: <Bell className="h-3.5 w-3.5" />,
};

// =============================================================================
// Component
// =============================================================================

export function NotificationSettingsView({
  initialSettings,
  initialTemplates,
}: {
  initialSettings: NotificationSettings;
  initialTemplates: NotificationTemplate[];
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [templates, setTemplates] = useState(initialTemplates);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Template editing
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    channel: "email" as string,
    subject: "",
    body: "",
    isActive: true,
  });
  const [templateSaving, setTemplateSaving] = useState(false);

  // =============================================================================
  // Settings Handlers
  // =============================================================================

  const handleSaveSettings = async () => {
    setSaving(true);
    await updateNotificationSettings({
      emailEnabled: settings.emailEnabled ?? true,
      smsEnabled: settings.smsEnabled ?? true,
      pushEnabled: settings.pushEnabled ?? true,
      smsBudgetCap: settings.smsBudgetCap,
    });
    setSaving(false);
    router.refresh();
  };

  const handleSeedTemplates = async () => {
    setSeeding(true);
    const result = await seedDefaultTemplates();
    setSeeding(false);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error);
    }
  };

  // =============================================================================
  // Template Handlers
  // =============================================================================

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      channel: template.channel,
      subject: template.subject ?? "",
      body: template.body,
      isActive: template.isActive,
    });
    setShowEditor(true);
  };

  const handleNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "",
      channel: "email",
      subject: "",
      body: "",
      isActive: true,
    });
    setShowEditor(true);
  };

  const handleSaveTemplate = async () => {
    setTemplateSaving(true);
    const result = await upsertNotificationTemplate({
      id: editingTemplate?.id,
      ...templateForm,
      channel: templateForm.channel as "email" | "sms" | "push",
      subject: templateForm.subject || undefined,
    });
    setTemplateSaving(false);

    if (result.success) {
      setShowEditor(false);
      router.refresh();
    } else {
      alert(result.error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await deleteNotificationTemplate(id);
    router.refresh();
  };

  // Group templates by event name
  const templatesByEvent = templates.reduce<Record<string, NotificationTemplate[]>>(
    (acc, t) => {
      if (!acc[t.name]) acc[t.name] = [];
      acc[t.name].push(t);
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Settings
      </Link>

      {/* Channel Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Channel Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex items-center gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                checked={settings.emailEnabled ?? true}
                onChange={(e) =>
                  setSettings({ ...settings, emailEnabled: e.target.checked })
                }
                className="h-4 w-4 rounded"
              />
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm font-medium">Email (SES)</span>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                checked={settings.smsEnabled ?? true}
                onChange={(e) =>
                  setSettings({ ...settings, smsEnabled: e.target.checked })
                }
                className="h-4 w-4 rounded"
              />
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-medium">SMS (Telnyx)</span>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-lg border p-3">
              <input
                type="checkbox"
                checked={settings.pushEnabled ?? true}
                onChange={(e) =>
                  setSettings({ ...settings, pushEnabled: e.target.checked })
                }
                className="h-4 w-4 rounded"
              />
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="text-sm font-medium">Push (FCM)</span>
              </div>
            </label>
          </div>

          <div className="max-w-xs">
            <Label>SMS Monthly Budget Cap ($)</Label>
            <Input
              type="number"
              min="0"
              step="1"
              placeholder="No limit"
              value={settings.smsBudgetCap ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  smsBudgetCap: e.target.value
                    ? parseFloat(e.target.value)
                    : undefined,
                })
              }
            />
          </div>

          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Notification Templates</CardTitle>
          <div className="flex gap-2">
            {templates.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeedTemplates}
                disabled={seeding}
              >
                {seeding ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Wand2 className="mr-1 h-3.5 w-3.5" />
                )}
                Load Defaults
              </Button>
            )}
            <Button size="sm" onClick={handleNewTemplate}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No templates configured. Click &quot;Load Defaults&quot; to get started
              with pre-built templates.
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(templatesByEvent).map(([event, eventTemplates]) => {
                const eventLabel =
                  NOTIFICATION_EVENTS.find((e) => e.value === event)?.label ??
                  event.replace(/_/g, " ");
                return (
                  <div key={event}>
                    <h4 className="mb-2 text-sm font-semibold capitalize">
                      {eventLabel}
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {eventTemplates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-start justify-between rounded-lg border p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              {CHANNEL_ICON[template.channel]}
                              <Badge
                                variant={
                                  template.isActive ? "secondary" : "outline"
                                }
                                className="text-[10px]"
                              >
                                {template.channel}
                              </Badge>
                              {!template.isActive && (
                                <Badge variant="outline" className="text-[10px]">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            {template.subject && (
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {template.subject}
                              </p>
                            )}
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {template.body
                                .replace(/<[^>]*>/g, "")
                                .substring(0, 80)}
                            </p>
                          </div>
                          <div className="ml-2 flex shrink-0 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDeleteTemplate(template.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Merge Tags Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Merge Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {MERGE_TAGS.map((tag) => (
              <Badge key={tag} variant="outline" className="font-mono text-xs">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Use these tags in your templates — they&apos;ll be replaced with actual
            values when notifications are sent.
          </p>
        </CardContent>
      </Card>

      {/* Template Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "New Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Event</Label>
              <Select
                value={templateForm.name}
                onValueChange={(v) =>
                  setTemplateForm({ ...templateForm, name: v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event..." />
                </SelectTrigger>
                <SelectContent>
                  {NOTIFICATION_EVENTS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Channel</Label>
              <Select
                value={templateForm.channel}
                onValueChange={(v) =>
                  setTemplateForm({ ...templateForm, channel: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(templateForm.channel === "email" ||
              templateForm.channel === "push") && (
              <div>
                <Label>Subject</Label>
                <Input
                  value={templateForm.subject}
                  onChange={(e) =>
                    setTemplateForm({
                      ...templateForm,
                      subject: e.target.value,
                    })
                  }
                  placeholder="e.g. Order {{orderNumber}} Confirmed"
                />
              </div>
            )}

            <div>
              <Label>
                Body{" "}
                {templateForm.channel === "email" && (
                  <span className="text-muted-foreground">(HTML supported)</span>
                )}
              </Label>
              <Textarea
                rows={5}
                value={templateForm.body}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, body: e.target.value })
                }
                placeholder="Write your notification message..."
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={templateForm.isActive}
                onChange={(e) =>
                  setTemplateForm({
                    ...templateForm,
                    isActive: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded"
              />
              Active
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={
                templateSaving || !templateForm.name || !templateForm.body
              }
            >
              {templateSaving && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
