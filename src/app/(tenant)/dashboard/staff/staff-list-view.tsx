"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  createStaffMember,
  updateStaffMember,
  toggleStaffActive,
} from "../actions";
import { Plus, Pencil, UserX, UserCheck } from "lucide-react";

interface StaffMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  manager: "default",
  attendant: "secondary",
  driver: "outline",
};

const STAFF_ROLES = [
  { value: "manager", label: "Manager" },
  { value: "attendant", label: "Attendant" },
  { value: "driver", label: "Driver" },
] as const;

// =============================================================================
// Add Staff Dialog
// =============================================================================

function AddStaffDialog({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const form = new FormData(e.currentTarget);
    const data = {
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
      email: form.get("email") as string,
      phone: (form.get("phone") as string) || undefined,
      role: form.get("role") as string,
      tenantSlug,
    };

    startTransition(async () => {
      const result = await createStaffMember(data);
      if (result.success) {
        if (result.emailError) {
          setError(result.emailError);
        } else {
          setSuccess(true);
        }
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setError(null);
          router.refresh();
        }, 2500);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setError(null); setSuccess(false); } }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
        </DialogHeader>
        {success ? (
          <div className="py-4 text-center">
            <p className="text-sm font-medium text-green-600">
              Staff member created! Temporary password sent via email.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" name="firstName" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" name="lastName" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select role...</option>
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Creating..." : "Create Staff Member"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Edit Staff Dialog
// =============================================================================

function EditStaffDialog({ member }: { member: StaffMember }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = {
      staffId: member.id,
      firstName: form.get("firstName") as string,
      lastName: form.get("lastName") as string,
      phone: (form.get("phone") as string) || undefined,
      role: form.get("role") as string,
    };

    startTransition(async () => {
      const result = await updateStaffMember(data);
      if (result.success) {
        setOpen(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(null); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Edit">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-firstName-${member.id}`}>First Name</Label>
              <Input
                id={`edit-firstName-${member.id}`}
                name="firstName"
                defaultValue={member.firstName ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`edit-lastName-${member.id}`}>Last Name</Label>
              <Input
                id={`edit-lastName-${member.id}`}
                name="lastName"
                defaultValue={member.lastName ?? ""}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={member.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-phone-${member.id}`}>Phone</Label>
            <Input
              id={`edit-phone-${member.id}`}
              name="phone"
              type="tel"
              defaultValue={member.phone ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-role-${member.id}`}>Role</Label>
            <select
              id={`edit-role-${member.id}`}
              name="role"
              defaultValue={member.role}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {STAFF_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Toggle Active Button
// =============================================================================

function ToggleActiveButton({ member }: { member: StaffMember }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleStaffActive(member.id);
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      title={member.isActive ? "Deactivate" : "Activate"}
      onClick={handleToggle}
      disabled={isPending}
    >
      {member.isActive ? (
        <UserX className="h-4 w-4 text-destructive" />
      ) : (
        <UserCheck className="h-4 w-4 text-green-600" />
      )}
    </Button>
  );
}

// =============================================================================
// Staff List View
// =============================================================================

export function StaffListView({
  staff,
  tenantSlug,
}: {
  staff: StaffMember[];
  tenantSlug?: string;
}) {
  const grouped = {
    manager: staff.filter((s) => s.role === "manager"),
    attendant: staff.filter((s) => s.role === "attendant"),
    driver: staff.filter((s) => s.role === "driver"),
  };

  return (
    <div className="space-y-6">
      {tenantSlug && (
        <div className="flex justify-end">
          <AddStaffDialog tenantSlug={tenantSlug} />
        </div>
      )}

      {staff.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              No staff members yet. Click &quot;Add Staff Member&quot; to create one.
            </p>
          </CardContent>
        </Card>
      ) : (
        (["manager", "attendant", "driver"] as const).map((role) => {
          const members = grouped[role];
          if (members.length === 0) return null;
          return (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="capitalize">
                  {role}s ({members.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {(member.firstName?.[0] ?? member.email[0]).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.firstName
                              ? `${member.firstName} ${member.lastName ?? ""}`
                              : member.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.email}
                            {member.phone ? ` | ${member.phone}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={ROLE_VARIANT[role] ?? "outline"} className="capitalize">
                          {role}
                        </Badge>
                        <Badge variant={member.isActive ? "success" : "destructive"}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {tenantSlug && (
                          <>
                            <EditStaffDialog member={member} />
                            <ToggleActiveButton member={member} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
