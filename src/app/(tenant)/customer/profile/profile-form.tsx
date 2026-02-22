"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateProfile } from "../actions";

interface ProfileFormProps {
  initialData: {
    firstName: string;
    lastName: string;
    phone: string;
    notificationPreference: "email" | "sms" | "both" | "push";
  };
  email: string;
}

export function ProfileForm({ initialData, email }: ProfileFormProps) {
  const [form, setForm] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        await updateProfile(form);
        setMessage("Profile updated.");
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : "Failed to update profile."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            required
          />
        </div>
      </div>
      <div>
        <Label>Email</Label>
        <Input value={email} disabled />
        <p className="text-xs text-muted-foreground mt-1">
          Email cannot be changed.
        </p>
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="(555) 123-4567"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
      </div>
      <div>
        <Label>Notification Preference</Label>
        <Select
          value={form.notificationPreference}
          onValueChange={(value) =>
            setForm({
              ...form,
              notificationPreference: value as
                | "email"
                | "sms"
                | "both"
                | "push",
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">Email & SMS</SelectItem>
            <SelectItem value="email">Email Only</SelectItem>
            <SelectItem value="sms">SMS Only</SelectItem>
            <SelectItem value="push">Push Notifications</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
