"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateManagerStaffPermission } from "../dashboard/actions";

export function StaffPermissionToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(enabled);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.checked;
    setChecked(value);
    setError(null);

    startTransition(async () => {
      const result = await updateManagerStaffPermission(value);
      if (!result.success) {
        setChecked(!value);
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={isPending}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="text-sm font-medium">
          Allow managers to create staff members
        </span>
      </label>
      <p className="text-xs text-muted-foreground">
        When enabled, managers can add new staff from their dashboard. They cannot edit or deactivate existing staff.
      </p>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
