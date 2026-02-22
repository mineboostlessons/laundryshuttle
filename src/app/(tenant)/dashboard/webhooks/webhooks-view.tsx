"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  createWebhookEndpoint,
  updateWebhookEndpoint,
  deleteWebhookEndpoint,
  testWebhookEndpoint,
  getDeliveryLogs,
} from "./actions";
import {
  Webhook,
  Plus,
  Trash2,
  PlayCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Copy,
} from "lucide-react";

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
  _count: { deliveryLogs: number };
}

interface DeliveryLog {
  id: string;
  event: string;
  statusCode: number | null;
  success: boolean;
  responseBody: string | null;
  createdAt: string;
}

export function WebhooksView({
  initialEndpoints,
  availableEvents,
}: {
  initialEndpoints: WebhookEndpoint[];
  availableEvents: string[];
}) {
  const [endpoints, setEndpoints] = useState(initialEndpoints);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; statusCode: number | null } | null>>({});

  // Create form state
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  function handleCreate() {
    startTransition(async () => {
      const endpoint = await createWebhookEndpoint({
        url: newUrl,
        events: selectedEvents,
      });
      setEndpoints((prev) => [endpoint as WebhookEndpoint, ...prev]);
      setNewUrl("");
      setSelectedEvents([]);
      setDialogOpen(false);
    });
  }

  function handleToggle(endpointId: string, isActive: boolean) {
    startTransition(async () => {
      const updated = await updateWebhookEndpoint(endpointId, { isActive });
      setEndpoints((prev) =>
        prev.map((ep) => (ep.id === endpointId ? (updated as WebhookEndpoint) : ep))
      );
    });
  }

  function handleDelete(endpointId: string) {
    startTransition(async () => {
      await deleteWebhookEndpoint(endpointId);
      setEndpoints((prev) => prev.filter((ep) => ep.id !== endpointId));
    });
  }

  function handleTest(endpointId: string) {
    startTransition(async () => {
      const result = await testWebhookEndpoint(endpointId);
      setTestResults((prev) => ({ ...prev, [endpointId]: result }));
    });
  }

  function handleExpand(endpointId: string) {
    if (expandedId === endpointId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(endpointId);
    startTransition(async () => {
      const deliveryLogs = await getDeliveryLogs(endpointId);
      setLogs(deliveryLogs as DeliveryLog[]);
    });
  }

  function copySecret(secret: string) {
    navigator.clipboard.writeText(secret);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Send real-time event notifications to external services
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Endpoint
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Webhook Endpoint</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Endpoint URL *</Label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..."
                  type="url"
                />
              </div>
              <div>
                <Label>Events *</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select which events trigger this webhook
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {availableEvents.map((event) => (
                    <label
                      key={event}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedEvents.includes(event)}
                        onCheckedChange={() => toggleEvent(event)}
                      />
                      {event}
                    </label>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={isPending || !newUrl || selectedEvents.length === 0}
                className="w-full"
              >
                {isPending ? "Creating..." : "Create Endpoint"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {endpoints.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No webhook endpoints</p>
          <p className="text-sm">
            Connect to Zapier, custom apps, or other services via webhooks
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {endpoints.map((endpoint) => (
            <div key={endpoint.id} className="border rounded-lg">
              <div className="p-4 flex items-center justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono truncate max-w-md">
                      {endpoint.url}
                    </code>
                    {endpoint.failureCount >= 10 && (
                      <Badge variant="destructive">Disabled</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{(endpoint.events as string[]).length} events</span>
                    <span>{endpoint._count.deliveryLogs} deliveries</span>
                    {endpoint.lastTriggeredAt && (
                      <span>
                        Last:{" "}
                        {new Date(endpoint.lastTriggeredAt).toLocaleDateString()}
                      </span>
                    )}
                    {endpoint.failureCount > 0 && (
                      <span className="text-red-500">
                        {endpoint.failureCount} failures
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(endpoint.events as string[]).slice(0, 4).map((event) => (
                      <Badge key={event} variant="outline" className="text-xs">
                        {event}
                      </Badge>
                    ))}
                    {(endpoint.events as string[]).length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{(endpoint.events as string[]).length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={endpoint.isActive}
                    onCheckedChange={(checked) =>
                      handleToggle(endpoint.id, checked)
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(endpoint.id)}
                    disabled={isPending}
                  >
                    <PlayCircle className="h-3 w-3 mr-1" />
                    Test
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copySecret(endpoint.secret)}
                    title="Copy signing secret"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExpand(endpoint.id)}
                  >
                    {expandedId === endpoint.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(endpoint.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Test result */}
              {testResults[endpoint.id] && (
                <div
                  className={`mx-4 mb-3 p-2 rounded text-sm ${
                    testResults[endpoint.id]!.success
                      ? "bg-green-50 text-green-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {testResults[endpoint.id]!.success
                    ? `Test successful (${testResults[endpoint.id]!.statusCode})`
                    : `Test failed${testResults[endpoint.id]!.statusCode ? ` (${testResults[endpoint.id]!.statusCode})` : ""}`}
                </div>
              )}

              {/* Delivery Logs */}
              {expandedId === endpoint.id && (
                <div className="border-t p-4">
                  <h4 className="text-sm font-medium mb-2">
                    Recent Deliveries
                  </h4>
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No deliveries yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 text-sm"
                        >
                          {log.success ? (
                            <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                          ) : (
                            <XCircle className="h-3 w-3 text-red-500 shrink-0" />
                          )}
                          <Badge variant="outline" className="text-xs">
                            {log.event}
                          </Badge>
                          <span className="text-muted-foreground">
                            {log.statusCode ?? "timeout"}
                          </span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
