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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  Calendar,
  Percent,
  Pause,
  Play,
  XCircle,
  CheckCircle,
  Settings,
} from "lucide-react";
import {
  subscribeToPlan,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  updateSubscriptionPreferences,
} from "./actions";

interface Plan {
  id: string;
  name: string;
  frequency: string;
  discountPercentage: number | null;
}

interface ActiveSubscription {
  id: string;
  status: string;
  preferredDay: string | null;
  preferredTimeSlot: string | null;
  nextPickupDate: Date | null;
  plan: Plan;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
};

const DAYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

const TIME_SLOTS = [
  "9am-12pm",
  "12pm-3pm",
  "3pm-6pm",
];

export function SubscriptionView({
  plans,
  activeSubscription: initialSub,
}: {
  plans: Plan[];
  activeSubscription: ActiveSubscription | null;
}) {
  const [activeSub, setActiveSub] = useState(initialSub);
  const [isPending, startTransition] = useTransition();
  const [showCancel, setShowCancel] = useState(false);
  const [showPrefs, setShowPrefs] = useState(false);

  // If customer has an active/paused subscription, show management view
  if (activeSub) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Subscription</h1>
          <p className="text-muted-foreground">
            Manage your recurring pickup plan
          </p>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-6 w-6 text-primary" />
                <div>
                  <CardTitle>{activeSub.plan.name}</CardTitle>
                  <CardDescription>
                    {FREQUENCY_LABELS[activeSub.plan.frequency] ?? activeSub.plan.frequency} pickup
                    {activeSub.plan.discountPercentage
                      ? ` - ${activeSub.plan.discountPercentage}% discount`
                      : ""}
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant={activeSub.status === "active" ? "success" : "warning"}
                className="text-sm"
              >
                {activeSub.status === "active" ? "Active" : "Paused"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Schedule Info */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Preferred Day</p>
                <p className="font-medium capitalize mt-1">
                  {activeSub.preferredDay ?? "Not set"}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Time Slot</p>
                <p className="font-medium mt-1">
                  {activeSub.preferredTimeSlot ?? "Not set"}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Next Pickup</p>
                <p className="font-medium mt-1">
                  {activeSub.nextPickupDate
                    ? new Date(activeSub.nextPickupDate).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })
                    : "Not scheduled"}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              {activeSub.status === "active" ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    startTransition(async () => {
                      await pauseSubscription();
                      setActiveSub((s) => s ? { ...s, status: "paused" } : null);
                    });
                  }}
                  disabled={isPending}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    startTransition(async () => {
                      await resumeSubscription();
                      setActiveSub((s) => s ? { ...s, status: "active" } : null);
                    });
                  }}
                  disabled={isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              )}

              <Dialog open={showPrefs} onOpenChange={setShowPrefs}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Update Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Pickup Schedule</DialogTitle>
                    <DialogDescription>
                      Choose your preferred pickup day and time.
                    </DialogDescription>
                  </DialogHeader>
                  <PreferencesForm
                    defaultDay={activeSub.preferredDay ?? "monday"}
                    defaultSlot={activeSub.preferredTimeSlot ?? TIME_SLOTS[0]}
                    onSubmit={async (day, slot) => {
                      await updateSubscriptionPreferences({
                        preferredDay: day,
                        preferredTimeSlot: slot,
                      });
                      setActiveSub((s) =>
                        s ? { ...s, preferredDay: day, preferredTimeSlot: slot } : null
                      );
                      setShowPrefs(false);
                    }}
                  />
                </DialogContent>
              </Dialog>

              <Dialog open={showCancel} onOpenChange={setShowCancel}>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="ml-auto">
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Subscription
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Subscription?</DialogTitle>
                    <DialogDescription>
                      You will lose your {activeSub.plan.discountPercentage
                        ? `${activeSub.plan.discountPercentage}% discount and `
                        : ""}scheduled pickups. You can re-subscribe anytime.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex gap-3 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowCancel(false)}
                    >
                      Keep Subscription
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          await cancelSubscription();
                          setActiveSub(null);
                          setShowCancel(false);
                        });
                      }}
                    >
                      {isPending ? "Cancelling..." : "Yes, Cancel"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No active subscription — show available plans
  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription Plans</h1>
        <p className="text-muted-foreground">
          Save time and money with automatic scheduled pickups
        </p>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-muted-foreground">
              No subscription plans are available yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onSubscribed={(sub) => setActiveSub(sub)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Plan Card with Subscribe Flow
// =============================================================================

function PlanCard({
  plan,
  onSubscribed,
}: {
  plan: Plan;
  onSubscribed: (sub: ActiveSubscription) => void;
}) {
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [preferredDay, setPreferredDay] = useState<string>("monday");
  const [preferredSlot, setPreferredSlot] = useState(TIME_SLOTS[0]);
  const [isPending, startTransition] = useTransition();

  const handleSubscribe = () => {
    startTransition(async () => {
      const result = await subscribeToPlan({
        planId: plan.id,
        preferredDay: preferredDay as "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday",
        preferredTimeSlot: preferredSlot,
      });
      if (result.success) {
        onSubscribed({
          id: result.subscription.id,
          status: "active",
          preferredDay,
          preferredTimeSlot: preferredSlot,
          nextPickupDate: result.subscription.nextPickupDate,
          plan,
        });
      }
    });
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          {plan.name}
        </CardTitle>
        <CardDescription>
          {FREQUENCY_LABELS[plan.frequency] ?? plan.frequency} scheduled pickup
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{FREQUENCY_LABELS[plan.frequency] ?? plan.frequency} pickup</span>
          </div>
          {plan.discountPercentage != null && plan.discountPercentage > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Percent className="h-4 w-4 text-green-600" />
              <span className="text-green-600 font-medium">
                {plan.discountPercentage}% off every order
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <span>Pause or cancel anytime</span>
          </div>
        </div>

        <Dialog open={showSubscribe} onOpenChange={setShowSubscribe}>
          <DialogTrigger asChild>
            <Button className="w-full">Subscribe</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subscribe to {plan.name}</DialogTitle>
              <DialogDescription>
                Choose your preferred pickup schedule
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred Day</Label>
                <Select value={preferredDay} onValueChange={setPreferredDay}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day} className="capitalize">
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Preferred Time</Label>
                <Select value={preferredSlot} onValueChange={setPreferredSlot}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {plan.discountPercentage != null && plan.discountPercentage > 0 && (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
                  You&apos;ll save {plan.discountPercentage}% on every order with
                  this plan.
                </div>
              )}

              <Button
                onClick={handleSubscribe}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? "Subscribing..." : "Confirm Subscription"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Preferences Form
// =============================================================================

type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

function PreferencesForm({
  defaultDay,
  defaultSlot,
  onSubmit,
}: {
  defaultDay: string;
  defaultSlot: string;
  onSubmit: (day: DayOfWeek, slot: string) => Promise<void>;
}) {
  const [day, setDay] = useState(defaultDay);
  const [slot, setSlot] = useState(defaultSlot);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Preferred Day</Label>
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS.map((d) => (
              <SelectItem key={d} value={d} className="capitalize">
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Preferred Time</Label>
        <Select value={slot} onValueChange={setSlot}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_SLOTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="w-full"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await onSubmit(day as DayOfWeek, slot);
          });
        }}
      >
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}
