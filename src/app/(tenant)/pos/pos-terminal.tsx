"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useStripeTerminal } from "@/hooks/use-stripe-terminal";
import { createPosOrder, openShift, closeShift } from "./actions";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Split,
  ShoppingCart,
  Package,
  WashingMachine,
  LogOut,
  Wifi,
  WifiOff,
  RotateCcw,
  DollarSign,
  Clock,
  CheckCircle2,
  X,
  Settings,
  Printer,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  pricingType: string;
  price: number;
  icon: string | null;
  taxable: boolean;
}

interface RetailProductItem {
  id: string;
  name: string;
  category: string | null;
  price: number;
  sku: string | null;
  imageUrl: string | null;
  taxable: boolean;
  stockQuantity: number | null;
}

interface CartItem {
  cartId: string;
  type: "service" | "retail_product";
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
}

interface PosTerminalProps {
  services: ServiceItem[];
  retailProducts: RetailProductItem[];
  laundromats: { id: string; name: string }[];
  activeShift: {
    id: string;
    openedAt: Date;
    openingBalance: number;
    cashSales: number;
    cardSales: number;
    totalOrders: number;
  } | null;
  todayStats: {
    totalOrders: number;
    totalRevenue: number;
    cashSales: number;
    cardSales: number;
  };
  taxRate: number;
  stripeConnected: boolean;
  userName: string;
  userEmail: string;
  userRole: string;
}

type PaymentMethod = "card" | "cash" | "split";

// =============================================================================
// Component
// =============================================================================

export function PosTerminal({
  services,
  retailProducts,
  laundromats,
  activeShift: initialShift,
  todayStats: initialStats,
  taxRate,
  stripeConnected,
  userName,
  userEmail,
  userRole,
}: PosTerminalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("services");

  // Shift state
  const [currentShift, setCurrentShift] = useState(initialShift);
  const [todayStats, setTodayStats] = useState(initialStats);
  const [showShiftDialog, setShowShiftDialog] = useState(!initialShift);
  const [showCloseShiftDialog, setShowCloseShiftDialog] = useState(false);
  const [shiftOpeningBalance, setShiftOpeningBalance] = useState("0");
  const [shiftClosingBalance, setShiftClosingBalance] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");

  // Payment state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [cashTendered, setCashTendered] = useState("");
  const [splitCash, setSplitCash] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState<{
    orderNumber: string;
    total: number;
    change?: number;
    items: CartItem[];
    subtotal: number;
    taxAmount: number;
    taxRate: number;
    paymentMethod: PaymentMethod;
    timestamp: Date;
  } | null>(null);

  // Terminal reader state
  const [showReaderDialog, setShowReaderDialog] = useState(false);
  const terminal = useStripeTerminal();

  // Laundromat selection (use first by default)
  const selectedLaundromat = laundromats[0];

  // =============================================================================
  // Cart calculations
  // =============================================================================

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const taxableAmount = cart
    .filter((item) => item.taxable)
    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const tax = Math.round(taxableAmount * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  // =============================================================================
  // Cart actions
  // =============================================================================

  const addToCart = useCallback(
    (
      type: "service" | "retail_product",
      id: string,
      name: string,
      price: number,
      taxable: boolean
    ) => {
      setCart((prev) => {
        const existing = prev.find(
          (item) => item.id === id && item.type === type
        );
        if (existing) {
          return prev.map((item) =>
            item.cartId === existing.cartId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [
          ...prev,
          {
            cartId: `${type}-${id}-${Date.now()}`,
            type,
            id,
            name,
            quantity: 1,
            unitPrice: price,
            taxable,
          },
        ];
      });
    },
    []
  );

  const updateQuantity = useCallback((cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartId === cartId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // =============================================================================
  // Filtering
  // =============================================================================

  const query = searchQuery.toLowerCase();
  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.category.toLowerCase().includes(query)
  );
  const filteredRetailProducts = retailProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(query) ||
      (p.sku?.toLowerCase().includes(query) ?? false) ||
      (p.category?.toLowerCase().includes(query) ?? false)
  );

  // Group services by category
  const servicesByCategory = filteredServices.reduce<
    Record<string, ServiceItem[]>
  >((acc, service) => {
    const cat = service.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {});

  // Group retail products by category
  const productsByCategory = filteredRetailProducts.reduce<
    Record<string, RetailProductItem[]>
  >((acc, product) => {
    const cat = product.category ?? "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  // =============================================================================
  // Shift management
  // =============================================================================

  const handleOpenShift = async () => {
    if (!selectedLaundromat) return;
    const result = await openShift({
      laundromatId: selectedLaundromat.id,
      openingBalance: parseFloat(shiftOpeningBalance) || 0,
    });
    if (result.success && result.data) {
      setCurrentShift(result.data);
      setShowShiftDialog(false);
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift) return;
    const result = await closeShift({
      shiftId: currentShift.id,
      closingBalance: parseFloat(shiftClosingBalance) || 0,
      notes: shiftNotes || undefined,
    });
    if (result.success) {
      setCurrentShift(null);
      setShowCloseShiftDialog(false);
      startTransition(() => router.refresh());
    }
  };

  // =============================================================================
  // Payment processing
  // =============================================================================

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMethod("card");
    setCashTendered("");
    setSplitCash("");
    setShowPaymentDialog(true);
  };

  const processPayment = async () => {
    if (!selectedLaundromat || isProcessing) return;

    setIsProcessing(true);
    try {
      let stripePaymentIntentId: string | undefined;
      let cashAmount: number | undefined;
      let cardAmount: number | undefined;

      if (paymentMethod === "card" && stripeConnected) {
        // Create payment intent for Terminal
        const piRes = await fetch("/api/stripe/terminal/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: total }),
        });
        const piData = await piRes.json();

        if (!piData.success) {
          throw new Error(piData.error || "Failed to create payment intent");
        }

        if (terminal.status.isConnected) {
          // Collect payment via Terminal reader
          const collectResult = await terminal.collectPayment(
            piData.data.clientSecret
          );
          if (!collectResult.success) {
            throw new Error(collectResult.error || "Card payment failed");
          }
          stripePaymentIntentId = collectResult.paymentIntent?.id;
        } else {
          // No reader — store PI ID for manual processing
          stripePaymentIntentId = piData.data.paymentIntentId;
        }
        cardAmount = total;
      } else if (paymentMethod === "cash") {
        cashAmount = total;
      } else if (paymentMethod === "split") {
        cashAmount = parseFloat(splitCash) || 0;
        cardAmount = total - cashAmount;

        if (cardAmount > 0 && stripeConnected) {
          const piRes = await fetch("/api/stripe/terminal/payment-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: cardAmount }),
          });
          const piData = await piRes.json();

          if (!piData.success) {
            throw new Error(piData.error || "Failed to create payment intent");
          }

          if (terminal.status.isConnected) {
            const collectResult = await terminal.collectPayment(
              piData.data.clientSecret
            );
            if (!collectResult.success) {
              throw new Error(collectResult.error || "Card payment failed");
            }
            stripePaymentIntentId = collectResult.paymentIntent?.id;
          } else {
            stripePaymentIntentId = piData.data.paymentIntentId;
          }
        }
      }

      // Create the order
      const result = await createPosOrder({
        items: cart.map((item) => ({
          type: item.type,
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxable: item.taxable,
        })),
        paymentMethod,
        cashAmount,
        cardAmount,
        stripePaymentIntentId,
        laundromatId: selectedLaundromat.id,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Calculate change for cash
      let change: number | undefined;
      if (paymentMethod === "cash") {
        const tendered = parseFloat(cashTendered) || 0;
        if (tendered > total) {
          change = Math.round((tendered - total) * 100) / 100;
        }
      }

      setOrderComplete({
        orderNumber: result.data.orderNumber,
        total: result.data.totalAmount,
        change,
        items: [...cart],
        subtotal,
        taxAmount: tax,
        taxRate,
        paymentMethod,
        timestamp: new Date(),
      });

      // Update local stats
      setTodayStats((prev) => ({
        totalOrders: prev.totalOrders + 1,
        totalRevenue: prev.totalRevenue + total,
        cashSales: prev.cashSales + (cashAmount ?? 0),
        cardSales: prev.cardSales + (cardAmount ?? 0),
      }));

      // Clear cart
      setCart([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOrderCompleteClose = () => {
    setOrderComplete(null);
    setShowPaymentDialog(false);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  // =============================================================================
  // Category label helper
  // =============================================================================

  const categoryLabel = (cat: string) =>
    cat
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">POS</h1>
          {selectedLaundromat && (
            <Badge variant="secondary">{selectedLaundromat.name}</Badge>
          )}
          {currentShift && (
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              Shift active
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Today's stats */}
          <div className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
            <span>{todayStats.totalOrders} orders</span>
            <span>{formatCurrency(todayStats.totalRevenue)}</span>
          </div>

          {/* Terminal reader status */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowReaderDialog(true)}
          >
            {terminal.status.isConnected ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-green-500" />
                <span className="hidden sm:inline">
                  {terminal.status.readerLabel}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">No reader</span>
              </>
            )}
          </Button>

          {/* Menu buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              currentShift
                ? setShowCloseShiftDialog(true)
                : setShowShiftDialog(true)
            }
          >
            <Settings className="mr-1 h-3.5 w-3.5" />
            Shift
          </Button>

          {(userRole === "owner" || userRole === "manager") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/pos/products")}
            >
              <Package className="mr-1 h-3.5 w-3.5" />
              Products
            </Button>
          )}

          <div className="flex items-center gap-2 border-l pl-3">
            <span className="text-xs text-muted-foreground">{userName}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content: catalog + cart */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: product catalog */}
        <div className="flex flex-1 flex-col overflow-hidden border-r">
          {/* Search */}
          <div className="border-b p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search services or products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Tabs: Services / Retail */}
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="border-b px-3 pt-2">
              <TabsList>
                <TabsTrigger value="services" className="gap-1">
                  <WashingMachine className="h-3.5 w-3.5" />
                  Services
                </TabsTrigger>
                <TabsTrigger value="retail" className="gap-1">
                  <Package className="h-3.5 w-3.5" />
                  Retail
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="services"
              className="flex-1 overflow-y-auto p-3"
            >
              {Object.keys(servicesByCategory).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No services found
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(servicesByCategory).map(([cat, items]) => (
                    <div key={cat}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {categoryLabel(cat)}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {items.map((service) => (
                          <button
                            key={service.id}
                            onClick={() =>
                              addToCart(
                                "service",
                                service.id,
                                service.name,
                                service.price,
                                service.taxable
                              )
                            }
                            className="flex flex-col items-start rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
                          >
                            <span className="text-sm font-medium">
                              {service.name}
                            </span>
                            <span className="mt-1 text-xs text-muted-foreground">
                              {formatCurrency(service.price)}
                              {service.pricingType !== "flat_rate" &&
                                ` / ${service.pricingType.replace("per_", "")}`}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="retail"
              className="flex-1 overflow-y-auto p-3"
            >
              {Object.keys(productsByCategory).length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No retail products found
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(productsByCategory).map(([cat, items]) => (
                    <div key={cat}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {categoryLabel(cat)}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {items.map((product) => (
                          <button
                            key={product.id}
                            onClick={() =>
                              addToCart(
                                "retail_product",
                                product.id,
                                product.name,
                                product.price,
                                product.taxable
                              )
                            }
                            className="flex flex-col items-start rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent"
                          >
                            <span className="text-sm font-medium">
                              {product.name}
                            </span>
                            <div className="mt-1 flex w-full items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(product.price)}
                              </span>
                              {product.stockQuantity !== null && (
                                <Badge
                                  variant={
                                    product.stockQuantity > 5
                                      ? "secondary"
                                      : "destructive"
                                  }
                                  className="text-[10px]"
                                >
                                  {product.stockQuantity} left
                                </Badge>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right panel: cart */}
        <div className="flex w-80 flex-col bg-muted/30 lg:w-96">
          {/* Cart header */}
          <div className="flex items-center justify-between border-b bg-background px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="font-semibold">Cart</span>
              {cart.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)}
                </Badge>
              )}
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={clearCart}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ShoppingCart className="mb-2 h-8 w-8" />
                <p className="text-sm">Cart is empty</p>
                <p className="text-xs">Tap items to add</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <Card key={item.cartId} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)} each
                        </p>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatCurrency(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.cartId, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.cartId, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <div className="flex-1" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeFromCart(item.cartId)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Cart totals + checkout */}
          <div className="border-t bg-background p-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Tax ({(taxRate * 100).toFixed(2)}%)
                  </span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <Button
              className="mt-3 w-full"
              size="lg"
              disabled={cart.length === 0 || isPending}
              onClick={handleCheckout}
            >
              <DollarSign className="mr-1 h-4 w-4" />
              Charge {formatCurrency(total)}
            </Button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* Payment Dialog */}
      {/* =================================================================== */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          {orderComplete ? (
            // Order complete with receipt
            <>
              <DialogHeader className="print:hidden">
                <DialogTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  Order Complete
                </DialogTitle>
              </DialogHeader>

              {/* Printable receipt */}
              <div
                id="pos-receipt"
                className="space-y-3 py-2 print:fixed print:inset-0 print:z-[9999] print:flex print:items-start print:justify-center print:bg-white print:p-0"
              >
                <div className="w-full max-w-[300px] font-mono text-xs print:mx-auto print:pt-4">
                  {/* Business header */}
                  <div className="text-center">
                    <p className="text-sm font-bold">
                      {selectedLaundromat?.name ?? "POS"}
                    </p>
                    <p className="text-[10px] text-muted-foreground print:text-black">
                      {orderComplete.timestamp.toLocaleDateString()}{" "}
                      {orderComplete.timestamp.toLocaleTimeString()}
                    </p>
                    <p className="mt-1 font-bold">
                      {orderComplete.orderNumber}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="my-2 border-t border-dashed" />

                  {/* Line items */}
                  <div className="space-y-1">
                    {orderComplete.items.map((item) => (
                      <div
                        key={item.cartId}
                        className="flex justify-between gap-2"
                      >
                        <span className="flex-1 truncate">
                          {item.quantity > 1 ? `${item.quantity}x ` : ""}
                          {item.name}
                        </span>
                        <span className="shrink-0">
                          {formatCurrency(item.unitPrice * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="my-2 border-t border-dashed" />

                  {/* Totals */}
                  <div className="space-y-0.5">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>
                        {formatCurrency(orderComplete.subtotal)}
                      </span>
                    </div>
                    {orderComplete.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span>
                          Tax (
                          {(orderComplete.taxRate * 100).toFixed(2)}%)
                        </span>
                        <span>
                          {formatCurrency(orderComplete.taxAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm">
                      <span>TOTAL</span>
                      <span>{formatCurrency(orderComplete.total)}</span>
                    </div>
                  </div>

                  {/* Payment method */}
                  <div className="my-2 border-t border-dashed" />
                  <div className="flex justify-between">
                    <span>Payment</span>
                    <span className="uppercase">
                      {orderComplete.paymentMethod}
                    </span>
                  </div>

                  {/* Change */}
                  {orderComplete.change !== undefined &&
                    orderComplete.change > 0 && (
                      <div className="flex justify-between font-bold">
                        <span>Change</span>
                        <span>{formatCurrency(orderComplete.change)}</span>
                      </div>
                    )}

                  {/* Footer */}
                  <div className="my-2 border-t border-dashed" />
                  <p className="text-center text-[10px] text-muted-foreground print:text-black">
                    Thank you for your business!
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 print:hidden">
                <Button
                  variant="outline"
                  onClick={handlePrintReceipt}
                  className="gap-1"
                >
                  <Printer className="h-4 w-4" />
                  Print Receipt
                </Button>
                <Button className="flex-1" onClick={handleOrderCompleteClose}>
                  New Order
                </Button>
              </DialogFooter>
            </>
          ) : (
            // Payment method selection
            <>
              <DialogHeader>
                <DialogTitle>Payment</DialogTitle>
                <DialogDescription>
                  Total: {formatCurrency(total)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Payment method buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod("card")}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors",
                      paymentMethod === "card"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    )}
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-xs font-medium">Card</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("cash")}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors",
                      paymentMethod === "cash"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    )}
                  >
                    <Banknote className="h-5 w-5" />
                    <span className="text-xs font-medium">Cash</span>
                  </button>
                  <button
                    onClick={() => setPaymentMethod("split")}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors",
                      paymentMethod === "split"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    )}
                  >
                    <Split className="h-5 w-5" />
                    <span className="text-xs font-medium">Split</span>
                  </button>
                </div>

                {/* Cash tendered input */}
                {paymentMethod === "cash" && (
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Cash tendered
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={total.toFixed(2)}
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                    />
                    {parseFloat(cashTendered) > total && (
                      <p className="mt-1 text-sm font-medium text-blue-600">
                        Change:{" "}
                        {formatCurrency(parseFloat(cashTendered) - total)}
                      </p>
                    )}
                    {/* Quick cash buttons */}
                    <div className="mt-2 flex gap-2">
                      {[1, 5, 10, 20, 50, 100]
                        .filter((v) => v >= total)
                        .slice(0, 4)
                        .map((v) => (
                          <Button
                            key={v}
                            variant="outline"
                            size="sm"
                            onClick={() => setCashTendered(v.toString())}
                          >
                            ${v}
                          </Button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Split payment input */}
                {paymentMethod === "split" && (
                  <div className="space-y-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">
                        Cash portion
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max={total}
                        placeholder="0.00"
                        value={splitCash}
                        onChange={(e) => setSplitCash(e.target.value)}
                      />
                    </div>
                    <div className="rounded bg-muted p-2 text-sm">
                      <div className="flex justify-between">
                        <span>Cash:</span>
                        <span>
                          {formatCurrency(parseFloat(splitCash) || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Card:</span>
                        <span>
                          {formatCurrency(
                            total - (parseFloat(splitCash) || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card terminal status */}
                {(paymentMethod === "card" || paymentMethod === "split") &&
                  !terminal.status.isConnected && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                      No card reader connected. Payment intent will be created
                      but card must be collected manually.
                    </div>
                  )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={processPayment}
                  disabled={isProcessing}
                  className="min-w-[120px]"
                >
                  {isProcessing ? (
                    <RotateCcw className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <DollarSign className="mr-1 h-4 w-4" />
                  )}
                  {isProcessing ? "Processing..." : `Pay ${formatCurrency(total)}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* Open Shift Dialog */}
      {/* =================================================================== */}
      <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Open Shift</DialogTitle>
            <DialogDescription>
              Start a new POS shift to begin taking orders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Opening cash balance
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={shiftOpeningBalance}
                onChange={(e) => setShiftOpeningBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowShiftDialog(false)}>
              Skip
            </Button>
            <Button onClick={handleOpenShift}>Open Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* Close Shift Dialog */}
      {/* =================================================================== */}
      <Dialog
        open={showCloseShiftDialog}
        onOpenChange={setShowCloseShiftDialog}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
            <DialogDescription>
              End your current shift and reconcile.
            </DialogDescription>
          </DialogHeader>
          {currentShift && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-muted p-3 text-sm">
                <div className="flex justify-between">
                  <span>Opening balance:</span>
                  <span>{formatCurrency(currentShift.openingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash sales:</span>
                  <span>{formatCurrency(currentShift.cashSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Card sales:</span>
                  <span>{formatCurrency(currentShift.cardSales)}</span>
                </div>
                <div className="flex justify-between border-t pt-1 font-medium">
                  <span>Expected cash:</span>
                  <span>
                    {formatCurrency(
                      currentShift.openingBalance + currentShift.cashSales
                    )}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total orders:</span>
                  <span>{currentShift.totalOrders}</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Closing cash balance (counted)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={shiftClosingBalance}
                  onChange={(e) => setShiftClosingBalance(e.target.value)}
                  placeholder="0.00"
                />
                {shiftClosingBalance && (
                  <p
                    className={cn(
                      "mt-1 text-sm font-medium",
                      Math.abs(
                        parseFloat(shiftClosingBalance) -
                          (currentShift.openingBalance +
                            currentShift.cashSales)
                      ) < 0.01
                        ? "text-green-600"
                        : "text-red-600"
                    )}
                  >
                    Difference:{" "}
                    {formatCurrency(
                      parseFloat(shiftClosingBalance) -
                        (currentShift.openingBalance + currentShift.cashSales)
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Notes (optional)
                </label>
                <Input
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="Any notes about this shift..."
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCloseShiftDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCloseShift}>
              Close Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =================================================================== */}
      {/* Reader Discovery Dialog */}
      {/* =================================================================== */}
      <Dialog open={showReaderDialog} onOpenChange={setShowReaderDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Card Reader</DialogTitle>
            <DialogDescription>
              Connect a Stripe Terminal card reader.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {terminal.status.isConnected ? (
              <div className="rounded-lg bg-green-50 p-3 text-center">
                <Wifi className="mx-auto mb-1 h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-700">
                  Connected to {terminal.status.readerLabel}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={async () => {
                    await terminal.disconnectReader();
                  }}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <>
                <Button
                  className="w-full"
                  onClick={terminal.discoverReaders}
                  disabled={terminal.status.isLoading}
                >
                  {terminal.status.isLoading ? (
                    <RotateCcw className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="mr-1 h-4 w-4" />
                  )}
                  {terminal.status.isLoading
                    ? "Searching..."
                    : "Discover Readers"}
                </Button>

                {terminal.availableReaders.length > 0 && (
                  <div className="space-y-2">
                    {terminal.availableReaders.map((reader) => (
                      <button
                        key={reader.id}
                        onClick={() => terminal.connectReader(reader)}
                        className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-accent"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {reader.label || reader.serial_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {reader.device_type}
                          </p>
                        </div>
                        <Badge
                          variant={
                            reader.status === "online"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {reader.status}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {terminal.availableReaders.length === 0 &&
                  !terminal.status.isLoading && (
                    <p className="text-center text-sm text-muted-foreground">
                      No readers found. Click discover to search.
                    </p>
                  )}
              </>
            )}

            {terminal.status.error && (
              <p className="text-sm text-destructive">
                {terminal.status.error}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
