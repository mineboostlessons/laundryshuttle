import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";

interface StatusHistoryEntry {
  id: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  changedByUser: { firstName: string | null; role: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  picked_up: "Picked Up",
  processing: "Processing",
  ready: "Ready for Delivery",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function OrderTimeline({
  history,
}: {
  history: StatusHistoryEntry[];
}) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No status updates yet.
      </p>
    );
  }

  return (
    <div className="relative">
      {history.map((entry, index) => {
        const isLast = index === history.length - 1;
        const isCancelled = entry.status === "cancelled";

        return (
          <div key={entry.id} className="flex gap-4 pb-6 last:pb-0">
            {/* Line + Dot */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  isCancelled
                    ? "bg-destructive text-destructive-foreground"
                    : isLast
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/20 text-primary"
                )}
              >
                {isLast && !isCancelled ? (
                  <Circle className="h-3 w-3 fill-current" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </div>
              {!isLast && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium">
                {STATUS_LABELS[entry.status] ?? entry.status}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              {entry.notes && (
                <p className="text-xs text-muted-foreground mt-1">
                  {entry.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
