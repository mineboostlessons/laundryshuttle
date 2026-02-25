"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  createInvoice,
  sendInvoice,
  markInvoicePaid,
  voidInvoice,
  getInvoices,
} from "./actions";
import {
  FileText,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  DollarSign,
  AlertTriangle,
  Trash2,
} from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  dueDate: string | Date;
  paidAt: string | Date | null;
  createdAt: string | Date;
  commercialAccount: {
    companyName: string;
    contactEmail: string;
    paymentTerms: string;
  };
}

interface InvoiceStats {
  totalOutstanding: number;
  totalPaid: number;
  overdueCount: number;
}

interface CommercialAccount {
  id: string;
  companyName: string;
  isActive: boolean;
}

interface LineItem {
  description: string;
  amount: string;
}

export function InvoicesView({
  initialInvoices,
  initialStats,
  commercialAccounts,
}: {
  initialInvoices: Invoice[];
  initialStats: InvoiceStats;
  commercialAccounts: CommercialAccount[];
}) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [stats, setStats] = useState(initialStats);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  // Create form state
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", amount: "" },
  ]);

  function addLineItem() {
    setLineItems((prev) => [...prev, { description: "", amount: "" }]);
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLineItem(index: number, field: keyof LineItem, value: string) {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function handleCreate() {
    startTransition(async () => {
      const invoice = await createInvoice({
        commercialAccountId: selectedAccountId,
        lineItems: lineItems
          .filter((item) => item.description && item.amount)
          .map((item) => ({
            description: item.description,
            amount: parseFloat(item.amount),
          })),
      });
      setInvoices((prev) => [invoice as Invoice, ...prev]);
      setDialogOpen(false);
      setSelectedAccountId("");
      setLineItems([{ description: "", amount: "" }]);
    });
  }

  function handleSend(invoiceId: string) {
    startTransition(async () => {
      const updated = await sendInvoice(invoiceId);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? (updated as Invoice) : inv))
      );
    });
  }

  function handleMarkPaid(invoiceId: string) {
    startTransition(async () => {
      const updated = await markInvoicePaid(invoiceId);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? (updated as Invoice) : inv))
      );
    });
  }

  function handleVoid(invoiceId: string) {
    startTransition(async () => {
      const updated = await voidInvoice(invoiceId);
      setInvoices((prev) =>
        prev.map((inv) => (inv.id === invoiceId ? (updated as Invoice) : inv))
      );
    });
  }

  function handleFilter(status: string) {
    setStatusFilter(status);
    startTransition(async () => {
      const filtered = await getInvoices({
        status: status === "all" ? undefined : status,
      });
      setInvoices(filtered as Invoice[]);
    });
  }

  const statusColors: Record<string, string> = {
    draft: "secondary",
    sent: "default",
    paid: "default",
    overdue: "destructive",
    void: "outline",
  };

  const statusIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    draft: FileText,
    sent: Send,
    paid: CheckCircle,
    overdue: AlertTriangle,
    void: XCircle,
  };

  const activeAccounts = commercialAccounts.filter((a) => a.isActive);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">
            Manage commercial invoices and billing
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={activeAccounts.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Commercial Account *</Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Line Items</Label>
                {lineItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(index, "description", e.target.value)
                      }
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={item.amount}
                      onChange={(e) =>
                        updateLineItem(index, "amount", e.target.value)
                      }
                      className="w-28"
                    />
                    {lineItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLineItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </div>

              {lineItems.some((i) => i.amount) && (
                <div className="text-right text-sm text-muted-foreground">
                  Subtotal:{" "}
                  {formatCurrency(
                    lineItems.reduce(
                      (sum, i) => sum + (parseFloat(i.amount) || 0),
                      0
                    )
                  )}
                </div>
              )}

              <Button
                onClick={handleCreate}
                disabled={
                  isPending ||
                  !selectedAccountId ||
                  !lineItems.some((i) => i.description && i.amount)
                }
                className="w-full"
              >
                {isPending ? "Creating..." : "Create Draft Invoice"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            Outstanding
          </div>
          <p className="text-2xl font-bold">
            {formatCurrency(stats.totalOutstanding)}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CheckCircle className="h-4 w-4" />
            Collected
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalPaid)}
          </p>
        </div>
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4" />
            Overdue
          </div>
          <p className="text-2xl font-bold text-red-600">
            {stats.overdueCount}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", "draft", "sent", "paid", "overdue", "void"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Invoice List */}
      {invoices.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No invoices yet</p>
          <p className="text-sm">
            Create your first invoice for a commercial account
          </p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {invoices.map((invoice) => {
            const StatusIcon = statusIcons[invoice.status] ?? FileText;
            return (
              <div
                key={invoice.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusIcon className="h-4 w-4" />
                    <span className="font-mono text-sm font-medium">
                      {invoice.invoiceNumber}
                    </span>
                    <Badge
                      variant={
                        (statusColors[invoice.status] as "default" | "secondary" | "destructive" | "outline") ??
                        "secondary"
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {invoice.commercialAccount.companyName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    {invoice.paidAt &&
                      ` | Paid: ${new Date(invoice.paidAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-semibold">
                    {formatCurrency(invoice.totalAmount)}
                  </p>
                  <div className="flex gap-1">
                    {invoice.status === "draft" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSend(invoice.id)}
                          disabled={isPending}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Send
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVoid(invoice.id)}
                          disabled={isPending}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {(invoice.status === "sent" ||
                      invoice.status === "overdue") && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkPaid(invoice.id)}
                          disabled={isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Paid
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVoid(invoice.id)}
                          disabled={isPending}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
