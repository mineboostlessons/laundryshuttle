"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ChevronRight } from "lucide-react";
import { changePassword } from "@/app/(tenant)/account/actions";

export function ChangePasswordForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (form.newPassword !== form.confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    startTransition(async () => {
      try {
        await changePassword(form);
        setMessage({ text: "Password changed successfully.", type: "success" });
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } catch (err) {
        setMessage({
          text:
            err instanceof Error ? err.message : "Failed to change password.",
          type: "error",
        });
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent/50"
      >
        <div className="flex items-center gap-3">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Change Password</p>
            <p className="text-xs text-muted-foreground">
              Update your account password
            </p>
          </div>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 px-1">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={form.currentPassword}
              onChange={(e) =>
                setForm({ ...form, currentPassword: e.target.value })
              }
              required
            />
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={form.newPassword}
              onChange={(e) =>
                setForm({ ...form, newPassword: e.target.value })
              }
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 8 characters.
            </p>
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
              required
              minLength={8}
            />
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.type === "success"
                  ? "text-green-600"
                  : "text-destructive"
              }`}
            >
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Changing..." : "Change Password"}
          </Button>
        </form>
      )}
    </div>
  );
}
