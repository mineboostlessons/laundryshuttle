"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toggleTenantStatus } from "../../actions";

export function TenantStatusToggle({
  tenantId,
  isActive,
}: {
  tenantId: string;
  isActive: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    await toggleTenantStatus(tenantId, !isActive);
    setLoading(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={isActive ? "destructive" : "default"} size="sm">
          {isActive ? "Deactivate" : "Activate"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isActive ? "Deactivate Tenant?" : "Activate Tenant?"}
          </DialogTitle>
          <DialogDescription>
            {isActive
              ? "This will disable the tenant's site and prevent all users from accessing it. The data will be preserved."
              : "This will re-enable the tenant's site and restore access for all users."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              variant={isActive ? "destructive" : "default"}
              onClick={handleToggle}
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : isActive
                  ? "Yes, Deactivate"
                  : "Yes, Activate"}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
