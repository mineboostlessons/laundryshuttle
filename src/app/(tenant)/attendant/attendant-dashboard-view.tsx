"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import {
  Package,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import {
  startProcessingOrder,
  markOrderReady,
  updateEquipmentAssignment,
} from "./actions";

interface OrderItem {
  name: string;
  quantity: number;
}

interface IncomingOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  numBags: number | null;
  totalWeightLbs: number | null;
  binNumber: string | null;
  specialInstructions: string | null;
  preferencesSnapshot: unknown;
  createdAt: Date;
  customer: { firstName: string | null; lastName: string | null } | null;
  items: OrderItem[];
}

interface ProcessingOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  numBags: number | null;
  totalWeightLbs: number | null;
  binNumber: string | null;
  washerNumber: number | null;
  dryerNumber: number | null;
  specialInstructions: string | null;
  createdAt: Date;
  updatedAt: Date;
  customer: { firstName: string | null; lastName: string | null } | null;
  items: OrderItem[];
}

interface ReadyOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  binNumber: string | null;
  createdAt: Date;
  customer: { firstName: string | null; lastName: string | null } | null;
}

interface Equipment {
  totalWashers: number;
  totalDryers: number;
  washersInUse: number[];
  dryersInUse: number[];
}

interface AttendantData {
  incomingOrders: IncomingOrder[];
  processingOrders: ProcessingOrder[];
  readyOrders: ReadyOrder[];
  todayCompleted: number;
  equipment: Equipment;
}

export function AttendantDashboardView({ data }: { data: AttendantData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [processDialog, setProcessDialog] = useState<IncomingOrder | null>(null);
  const [assignDialog, setAssignDialog] = useState<ProcessingOrder | null>(null);

  // Process dialog form state
  const [binNumber, setBinNumber] = useState("");
  const [washerNumber, setWasherNumber] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [numBags, setNumBags] = useState("");

  // Assign dialog form state
  const [assignWasher, setAssignWasher] = useState("");
  const [assignDryer, setAssignDryer] = useState("");

  function customerName(c: { firstName: string | null; lastName: string | null } | null) {
    if (!c) return "Walk-in";
    return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unknown";
  }

  function handleStartProcessing() {
    if (!processDialog) return;
    startTransition(async () => {
      await startProcessingOrder({
        orderId: processDialog.id,
        binNumber: binNumber || undefined,
        washerNumber: washerNumber ? parseInt(washerNumber) : undefined,
        totalWeightLbs: weightLbs ? parseFloat(weightLbs) : undefined,
        numBags: numBags ? parseInt(numBags) : undefined,
      });
      setProcessDialog(null);
      setBinNumber("");
      setWasherNumber("");
      setWeightLbs("");
      setNumBags("");
      router.refresh();
    });
  }

  function handleUpdateEquipment() {
    if (!assignDialog) return;
    startTransition(async () => {
      await updateEquipmentAssignment({
        orderId: assignDialog.id,
        washerNumber: assignWasher ? parseInt(assignWasher) : undefined,
        dryerNumber: assignDryer ? parseInt(assignDryer) : undefined,
      });
      setAssignDialog(null);
      setAssignWasher("");
      setAssignDryer("");
      router.refresh();
    });
  }

  function handleMarkReady(orderId: string) {
    startTransition(async () => {
      await markOrderReady(orderId);
      router.refresh();
    });
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Order Queue</h1>
        <p className="text-muted-foreground">Process and manage laundry orders</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Link href="/pos" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Incoming</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.incomingOrders.length}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/pos" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Processing</CardTitle>
              <Loader2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.processingOrders.length}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/pos" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Ready</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.readyOrders.length}</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/pos" className="transition-shadow hover:shadow-md rounded-lg">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.todayCompleted}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Equipment Grid */}
      {(data.equipment.totalWashers > 0 || data.equipment.totalDryers > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Equipment Status</CardTitle>
            <CardDescription>Washer and dryer availability</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Washers */}
              {data.equipment.totalWashers > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    Washers ({data.equipment.washersInUse.length}/{data.equipment.totalWashers} in use)
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: data.equipment.totalWashers }, (_, i) => {
                      const num = i + 1;
                      const inUse = data.equipment.washersInUse.includes(num);
                      return (
                        <div
                          key={`w-${num}`}
                          className={cn(
                            "flex h-10 w-full items-center justify-center rounded-md border text-xs font-medium",
                            inUse
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground"
                          )}
                        >
                          W{num}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Dryers */}
              {data.equipment.totalDryers > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">
                    Dryers ({data.equipment.dryersInUse.length}/{data.equipment.totalDryers} in use)
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: data.equipment.totalDryers }, (_, i) => {
                      const num = i + 1;
                      const inUse = data.equipment.dryersInUse.includes(num);
                      return (
                        <div
                          key={`d-${num}`}
                          className={cn(
                            "flex h-10 w-full items-center justify-center rounded-md border text-xs font-medium",
                            inUse
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground"
                          )}
                        >
                          D{num}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Queue Tabs */}
      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">
            Incoming ({data.incomingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing ({data.processingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="ready">
            Ready ({data.readyOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Incoming Orders */}
        <TabsContent value="incoming" className="mt-4">
          {data.incomingOrders.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">No incoming orders</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.incomingOrders.map((order) => (
                <Link key={order.id} href={`/attendant/orders/${order.id}`} className="block">
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{order.orderNumber}</p>
                            <Badge variant="outline" className="text-xs capitalize">
                              {order.orderType.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {customerName(order.customer)}
                          </p>
                          {order.items.length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              {order.items.map((item, i) => (
                                <span key={i}>
                                  {item.name} x{item.quantity}
                                  {i < order.items.length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </div>
                          )}
                          {order.specialInstructions && (
                            <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                              Note: {order.specialInstructions}
                            </p>
                          )}
                          {order.numBags && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {order.numBags} bags
                              {order.totalWeightLbs
                                ? ` | ${order.totalWeightLbs} lbs`
                                : ""}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={(e) => {
                            e.preventDefault();
                            setProcessDialog(order);
                            setBinNumber(order.binNumber ?? "");
                          }}
                        >
                          Process
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Processing Orders */}
        <TabsContent value="processing" className="mt-4">
          {data.processingOrders.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">No orders processing</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.processingOrders.map((order) => (
                <Link key={order.id} href={`/attendant/orders/${order.id}`} className="block">
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{order.orderNumber}</p>
                            {order.binNumber && (
                              <Badge variant="outline">Bin: {order.binNumber}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {customerName(order.customer)}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {order.washerNumber && (
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                Washer #{order.washerNumber}
                              </span>
                            )}
                            {order.dryerNumber && (
                              <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded">
                                Dryer #{order.dryerNumber}
                              </span>
                            )}
                            {order.totalWeightLbs && (
                              <span>{order.totalWeightLbs} lbs</span>
                            )}
                          </div>
                          {order.specialInstructions && (
                            <p className="mt-2 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1">
                              Note: {order.specialInstructions}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={(e) => {
                              e.preventDefault();
                              setAssignDialog(order);
                              setAssignWasher(order.washerNumber?.toString() ?? "");
                              setAssignDryer(order.dryerNumber?.toString() ?? "");
                            }}
                          >
                            Assign
                          </Button>
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={(e) => { e.preventDefault(); handleMarkReady(order.id); }}
                          >
                            Mark Ready
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Ready Orders */}
        <TabsContent value="ready" className="mt-4">
          {data.readyOrders.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">No orders ready</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {data.readyOrders.map((order) => (
                <Link key={order.id} href={`/attendant/orders/${order.id}`} className="block">
                  <Card className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{order.orderNumber}</p>
                            <Badge variant="success">Ready</Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {order.orderType.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {customerName(order.customer)}
                            {order.binNumber ? ` | Bin: ${order.binNumber}` : ""}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Start Processing Dialog */}
      <Dialog
        open={!!processDialog}
        onOpenChange={(open) => !open && setProcessDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Process Order {processDialog?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Assign bin, washer, and enter weight to start processing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bin">Bin Number</Label>
                <Input
                  id="bin"
                  placeholder="e.g. A-12"
                  value={binNumber}
                  onChange={(e) => setBinNumber(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="washer">Washer #</Label>
                <Input
                  id="washer"
                  type="number"
                  placeholder="e.g. 3"
                  value={washerNumber}
                  onChange={(e) => setWasherNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Weight (lbs)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 15.5"
                  value={weightLbs}
                  onChange={(e) => setWeightLbs(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="bags">Number of Bags</Label>
                <Input
                  id="bags"
                  type="number"
                  placeholder="e.g. 2"
                  value={numBags}
                  onChange={(e) => setNumBags(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProcessDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleStartProcessing} disabled={isPending}>
              {isPending ? "Processing..." : "Start Processing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Equipment Dialog */}
      <Dialog
        open={!!assignDialog}
        onOpenChange={(open) => !open && setAssignDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Assign Equipment — {assignDialog?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Update washer or dryer assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assign-washer">Washer #</Label>
              <Input
                id="assign-washer"
                type="number"
                value={assignWasher}
                onChange={(e) => setAssignWasher(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="assign-dryer">Dryer #</Label>
              <Input
                id="assign-dryer"
                type="number"
                value={assignDryer}
                onChange={(e) => setAssignDryer(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEquipment} disabled={isPending}>
              {isPending ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
