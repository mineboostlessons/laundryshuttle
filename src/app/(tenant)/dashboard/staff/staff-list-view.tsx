"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

export function StaffListView({ staff }: { staff: StaffMember[] }) {
  const grouped = {
    manager: staff.filter((s) => s.role === "manager"),
    attendant: staff.filter((s) => s.role === "attendant"),
    driver: staff.filter((s) => s.role === "driver"),
  };

  if (staff.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            No staff members yet. Staff accounts can be created through the
            registration flow.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {(["manager", "attendant", "driver"] as const).map((role) => {
        const members = grouped[role];
        if (members.length === 0) return null;
        return (
          <Card key={role}>
            <CardHeader>
              <CardTitle className="capitalize">{role}s ({members.length})</CardTitle>
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
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
