"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Plus,
  Users,
  Calendar,
  Percent,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  createSubscriptionPlan,
  updateSubscriptionPlan,
  togglePlanActive,
  getPlanSubscribers,
} from "./actions";

interface Plan {
  id: string;
  name: string;
  frequency: string;
  discountPercentage: number | null;
  stripePriceId: string | null;
  isActive: boolean;
  createdAt: Date;
  subscriberCount: number;
}

interface Summary {
  totalPlans: number;
  activePlans: number;
  totalSubscribers: number;
  activeSubscribers: number;
}

interface Subscriber {
  id: string;
  status: string;
  preferredDay: string | null;
  preferredTimeSlot: string | null;
  nextPickupDate: Date | null;
  createdAt: Date;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-Weekly",
  monthly: "Monthly",
};

export function SubscriptionsManager({
  initialPlans,
  summary,
}: {
  initialPlans: Plan[];
  summary: Summary;
}) {
  const [plans, setPlans] = useState(initialPlans);
  const [showCreate, setShowCreate] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [subscribers, setSubscribers] = useState<Record<string, Subscriber[]>>({});
  const [isPending, startTransition] = useTransition();

  const handleToggle = (planId: string) => {
    startTransition(async () => {
      await togglePlanActive(planId);
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId ? { ...p, isActive: !p.isActive } : p
        )
      );
    });
  };

  const handleExpand = (planId: string) => {
    if (expandedPlan === planId) {
      setExpandedPlan(null);
      return;
    }
    setExpandedPlan(planId);
    if (!subscribers[planId]) {
      startTransition(async () => {
        const subs = await getPlanSubscribers(planId);
        setSubscribers((prev) => ({ ...prev, [planId]: subs as Subscriber[] }));
      });
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">
            Manage recurring pickup plans for your customers
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Subscription Plan</DialogTitle>
            </DialogHeader>
            <PlanForm
              onSubmit={async (data) => {
                const result = await createSubscriptionPlan(data);
                if (result.success) {
                  setShowCreate(false);
                  setPlans((prev) => [
                    {
                      ...result.plan,
                      subscriberCount: 0,
                    },
                    ...prev,
                  ]);
                }
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Plans</p>
                <p className="text-xl font-bold">{summary.totalPlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Active Plans</p>
                <p className="text-xl font-bold">{summary.activePlans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">Total Subscribers</p>
                <p className="text-xl font-bold">{summary.totalSubscribers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Active Subscribers</p>
                <p className="text-xl font-bold">{summary.activeSubscribers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans List */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              No subscription plans yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card key={plan.id} className={!plan.isActive ? "opacity-60" : ""}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{plan.name}</h3>
                        <Badge variant={plan.isActive ? "success" : "secondary"}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {FREQUENCY_LABELS[plan.frequency] ?? plan.frequency}
                        </span>
                        {plan.discountPercentage != null && plan.discountPercentage > 0 && (
                          <span className="flex items-center gap-1">
                            <Percent className="h-3.5 w-3.5" />
                            {plan.discountPercentage}% discount
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {plan.subscriberCount} subscriber{plan.subscriberCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggle(plan.id)}
                      disabled={isPending}
                    >
                      {plan.isActive ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>

                    <Dialog
                      open={editingPlan?.id === plan.id}
                      onOpenChange={(open) => {
                        if (!open) setEditingPlan(null);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPlan(plan)}
                        >
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Plan</DialogTitle>
                        </DialogHeader>
                        <PlanForm
                          defaultValues={{
                            name: plan.name,
                            frequency: plan.frequency as "weekly" | "biweekly" | "monthly",
                            discountPercentage: plan.discountPercentage,
                            isActive: plan.isActive,
                          }}
                          onSubmit={async (data) => {
                            const result = await updateSubscriptionPlan(plan.id, data);
                            if (result.success) {
                              setEditingPlan(null);
                              setPlans((prev) =>
                                prev.map((p) =>
                                  p.id === plan.id
                                    ? { ...p, ...result.plan }
                                    : p
                                )
                              );
                            }
                          }}
                        />
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExpand(plan.id)}
                    >
                      {expandedPlan === plan.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Subscribers */}
                {expandedPlan === plan.id && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-medium mb-3">Subscribers</h4>
                    {!subscribers[plan.id] ? (
                      <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : subscribers[plan.id].length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No subscribers yet
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {subscribers[plan.id].map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between rounded-md border p-3 text-sm"
                          >
                            <div>
                              <p className="font-medium">
                                {sub.user.firstName
                                  ? `${sub.user.firstName} ${sub.user.lastName ?? ""}`
                                  : sub.user.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {sub.user.email}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              {sub.preferredDay && (
                                <span className="text-xs text-muted-foreground capitalize">
                                  {sub.preferredDay}s
                                  {sub.preferredTimeSlot ? ` ${sub.preferredTimeSlot}` : ""}
                                </span>
                              )}
                              <Badge
                                variant={
                                  sub.status === "active"
                                    ? "success"
                                    : sub.status === "paused"
                                    ? "warning"
                                    : "secondary"
                                }
                              >
                                {sub.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Plan Form
// =============================================================================

function PlanForm({
  defaultValues,
  onSubmit,
}: {
  defaultValues?: {
    name: string;
    frequency: "weekly" | "biweekly" | "monthly";
    discountPercentage: number | null;
    isActive: boolean;
  };
  onSubmit: (data: {
    name: string;
    frequency: "weekly" | "biweekly" | "monthly";
    discountPercentage: number | null;
    isActive: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [frequency, setFrequency] = useState(defaultValues?.frequency ?? "weekly");
  const [discount, setDiscount] = useState(
    defaultValues?.discountPercentage?.toString() ?? ""
  );
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await onSubmit({
        name,
        frequency,
        discountPercentage: discount ? parseFloat(discount) : null,
        isActive,
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="planName">Plan Name</Label>
        <Input
          id="planName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Weekly Pickup"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="frequency">Frequency</Label>
        <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Bi-Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="discount">Discount Percentage (optional)</Label>
        <Input
          id="discount"
          type="number"
          min="0"
          max="100"
          step="0.1"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
          placeholder="e.g., 10"
        />
        <p className="text-xs text-muted-foreground">
          Subscribers get this % off each order
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded border-gray-300"
        />
        <Label htmlFor="isActive">Active (visible to customers)</Label>
      </div>

      <Button type="submit" disabled={isPending || !name} className="w-full">
        {isPending ? "Saving..." : defaultValues ? "Update Plan" : "Create Plan"}
      </Button>
    </form>
  );
}
