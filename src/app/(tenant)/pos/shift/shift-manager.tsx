"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { openShift, closeShift } from "../actions";
import {
  ArrowLeft,
  Clock,
  DollarSign,
  CreditCard,
  Banknote,
  Package,
  Play,
  Square,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface PosShift {
  id: string;
  laundromatId: string;
  attendantId: string;
  openedAt: Date;
  closedAt: Date | null;
  openingBalance: number;
  closingBalance: number | null;
  cashSales: number;
  cardSales: number;
  totalOrders: number;
  notes: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function ShiftManager({
  currentShift: initialShift,
  shiftHistory,
}: {
  currentShift: PosShift | null;
  shiftHistory: PosShift[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentShift, setCurrentShift] = useState(initialShift);

  // Open shift form
  const [openingBalance, setOpeningBalance] = useState("0");

  // Close shift form
  const [closingBalance, setClosingBalance] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setError(null);
    // Use first laundromat — in production this would be selected
    const result = await openShift({
      laundromatId: shiftHistory[0]?.laundromatId ?? "",
      openingBalance: parseFloat(openingBalance) || 0,
    });
    if (result.success && result.data) {
      setCurrentShift(result.data);
    } else if (!result.success) {
      setError(result.error);
    }
  };

  const handleClose = async () => {
    if (!currentShift) return;
    setError(null);

    const result = await closeShift({
      shiftId: currentShift.id,
      closingBalance: parseFloat(closingBalance) || 0,
      notes: shiftNotes || undefined,
    });
    if (result.success) {
      setCurrentShift(null);
      startTransition(() => router.refresh());
    } else if (!result.success) {
      setError(result.error);
    }
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/pos")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to POS
          </Button>
          <div>
            <h1 className="text-lg font-bold">Shift Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage POS shifts and view history
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Current Shift */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold">Current Shift</h2>

            {currentShift ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Active since {formatDate(currentShift.openedAt)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <DollarSign className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                    <p className="text-lg font-bold">
                      {formatCurrency(currentShift.openingBalance)}
                    </p>
                    <p className="text-xs text-muted-foreground">Opening</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <Banknote className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                    <p className="text-lg font-bold">
                      {formatCurrency(currentShift.cashSales)}
                    </p>
                    <p className="text-xs text-muted-foreground">Cash Sales</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <CreditCard className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                    <p className="text-lg font-bold">
                      {formatCurrency(currentShift.cardSales)}
                    </p>
                    <p className="text-xs text-muted-foreground">Card Sales</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3 text-center">
                    <Package className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                    <p className="text-lg font-bold">
                      {currentShift.totalOrders}
                    </p>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="mb-1 text-sm font-medium">
                    Expected cash in drawer
                  </p>
                  <p className="text-xl font-bold">
                    {formatCurrency(
                      currentShift.openingBalance + currentShift.cashSales
                    )}
                  </p>
                </div>

                <div className="space-y-3 border-t pt-3">
                  <div>
                    <Label>Closing cash balance (counted)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={closingBalance}
                      onChange={(e) => setClosingBalance(e.target.value)}
                      placeholder="Count cash in drawer..."
                    />
                    {closingBalance && (
                      <p className="mt-1 text-sm">
                        Difference:{" "}
                        <span
                          className={
                            Math.abs(
                              parseFloat(closingBalance) -
                                (currentShift.openingBalance +
                                  currentShift.cashSales)
                            ) < 0.01
                              ? "font-medium text-green-600"
                              : "font-medium text-red-600"
                          }
                        >
                          {formatCurrency(
                            parseFloat(closingBalance) -
                              (currentShift.openingBalance +
                                currentShift.cashSales)
                          )}
                        </span>
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Input
                      value={shiftNotes}
                      onChange={(e) => setShiftNotes(e.target.value)}
                      placeholder="Shift notes..."
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleClose}
                    disabled={isPending}
                  >
                    <Square className="mr-1 h-4 w-4" />
                    Close Shift
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No active shift. Open a shift to start tracking POS sales.
                </p>
                <div>
                  <Label>Opening cash balance</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button className="w-full" onClick={handleOpen} disabled={isPending}>
                  <Play className="mr-1 h-4 w-4" />
                  Open Shift
                </Button>
              </div>
            )}
          </Card>

          {/* Shift History */}
          <Card className="p-6">
            <h2 className="mb-4 text-base font-semibold">Shift History</h2>
            {shiftHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No shift history yet.
              </p>
            ) : (
              <div className="space-y-3">
                {shiftHistory.map((shift) => {
                  const expectedCash =
                    shift.openingBalance + shift.cashSales;
                  const difference =
                    shift.closingBalance !== null
                      ? shift.closingBalance - expectedCash
                      : null;

                  return (
                    <div
                      key={shift.id}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {formatDate(shift.openedAt)}
                        </span>
                        <Badge
                          variant={shift.closedAt ? "secondary" : "outline"}
                        >
                          {shift.closedAt ? "Closed" : "Active"}
                        </Badge>
                      </div>
                      {shift.closedAt && (
                        <p className="text-xs text-muted-foreground">
                          Closed: {formatDate(shift.closedAt)}
                        </p>
                      )}
                      <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Orders</p>
                          <p className="font-medium">{shift.totalOrders}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Cash</p>
                          <p className="font-medium">
                            {formatCurrency(shift.cashSales)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Card</p>
                          <p className="font-medium">
                            {formatCurrency(shift.cardSales)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-medium">
                            {formatCurrency(
                              shift.cashSales + shift.cardSales
                            )}
                          </p>
                        </div>
                      </div>
                      {difference !== null && (
                        <p
                          className={`mt-1 text-xs font-medium ${
                            Math.abs(difference) < 0.01
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          Cash variance: {formatCurrency(difference)}
                        </p>
                      )}
                      {shift.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {shift.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
