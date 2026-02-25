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
  createCommercialAccount,
  toggleCommercialAccount,
} from "./actions";
import {
  Building2,
  Plus,
  Mail,
  Phone,
  DollarSign,
} from "lucide-react";

interface CommercialAccount {
  id: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  billingAddress: string | null;
  paymentTerms: string;
  billingCycle: string;
  preferredPayment: string;
  creditLimit: number | null;
  currentBalance: number;
  isActive: boolean;
  createdAt: string | Date;
  _count: { orders: number; invoices: number };
}

export function CommercialView({
  initialAccounts,
}: {
  initialAccounts: CommercialAccount[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("net_30");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [preferredPayment, setPreferredPayment] = useState("ach");
  const [creditLimit, setCreditLimit] = useState("");

  function resetForm() {
    setCompanyName("");
    setContactName("");
    setContactEmail("");
    setContactPhone("");
    setBillingAddress("");
    setPaymentTerms("net_30");
    setBillingCycle("monthly");
    setPreferredPayment("ach");
    setCreditLimit("");
  }

  function handleCreate() {
    startTransition(async () => {
      const account = await createCommercialAccount({
        companyName,
        contactName: contactName || undefined,
        contactEmail,
        contactPhone: contactPhone || undefined,
        billingAddress: billingAddress || undefined,
        paymentTerms: paymentTerms as "net_7" | "net_15" | "net_30",
        billingCycle: billingCycle as "weekly" | "biweekly" | "monthly",
        preferredPayment: preferredPayment as "ach" | "card",
        creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      });
      setAccounts((prev) => [
        { ...account, _count: { orders: 0, invoices: 0 }, createdAt: new Date().toISOString() } as CommercialAccount,
        ...prev,
      ]);
      resetForm();
      setDialogOpen(false);
    });
  }

  function handleToggle(accountId: string, isActive: boolean) {
    startTransition(async () => {
      await toggleCommercialAccount(accountId, isActive);
      setAccounts((prev) =>
        prev.map((a) => (a.id === accountId ? { ...a, isActive } : a))
      );
    });
  }

  const termsLabels: Record<string, string> = {
    net_7: "Net 7",
    net_15: "Net 15",
    net_30: "Net 30",
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Commercial Accounts</h1>
          <p className="text-muted-foreground">
            Manage B2B accounts with custom billing terms
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Commercial Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Company Name *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Hotels"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Contact Email *</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Credit Limit ($)</Label>
                  <Input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="5000"
                  />
                </div>
              </div>
              <div>
                <Label>Billing Address</Label>
                <Input
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Payment Terms</Label>
                  <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="net_7">Net 7</SelectItem>
                      <SelectItem value="net_15">Net 15</SelectItem>
                      <SelectItem value="net_30">Net 30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Billing Cycle</Label>
                  <Select value={billingCycle} onValueChange={setBillingCycle}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={preferredPayment} onValueChange={setPreferredPayment}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ach">ACH</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={isPending || !companyName || !contactEmail}
                className="w-full"
              >
                {isPending ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No commercial accounts yet</p>
          <p className="text-sm">
            Add B2B accounts for hotels, gyms, restaurants, and other businesses
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="border rounded-lg p-4 flex items-start justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{account.companyName}</h3>
                  <Badge variant={account.isActive ? "default" : "secondary"}>
                    {account.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline">
                    {termsLabels[account.paymentTerms] ?? account.paymentTerms}
                  </Badge>
                </div>
                {account.contactName && (
                  <p className="text-sm text-muted-foreground">
                    {account.contactName}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {account.contactEmail}
                  </span>
                  {account.contactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {account.contactPhone}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Balance: {formatCurrency(account.currentBalance)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{account._count.orders} orders</span>
                  <span>{account._count.invoices} invoices</span>
                  {account.creditLimit && (
                    <span>
                      Credit limit: {formatCurrency(account.creditLimit)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggle(account.id, !account.isActive)}
                disabled={isPending}
              >
                {account.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
