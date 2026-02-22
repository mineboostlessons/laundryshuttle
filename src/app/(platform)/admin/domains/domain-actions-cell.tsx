"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { adminVerifyDomain, adminRemoveDomain } from "./actions";

export function DomainActionsCell({
  tenantId,
  domain,
  status,
}: {
  tenantId: string;
  domain: string;
  status: string;
}) {
  const [verifyPending, startVerify] = useTransition();
  const [removePending, startRemove] = useTransition();

  return (
    <div className="flex items-center gap-2">
      {status === "pending" && (
        <Button
          variant="outline"
          size="sm"
          disabled={verifyPending}
          onClick={() => {
            startVerify(async () => {
              await adminVerifyDomain(tenantId, domain);
            });
          }}
        >
          {verifyPending ? "Checking..." : "Verify"}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        disabled={removePending}
        onClick={() => {
          startRemove(async () => {
            await adminRemoveDomain(tenantId, domain);
          });
        }}
      >
        {removePending ? "Removing..." : "Remove"}
      </Button>
    </div>
  );
}
