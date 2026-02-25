"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PaymentForm } from "@/components/checkout/payment-form";
import { Loader2, Plus, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { addFundsToWallet } from "./actions";
import { formatCurrency } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  orderId: string | null;
  createdAt: Date;
}

interface WalletViewProps {
  initialData: {
    balance: number;
    transactions: Transaction[];
  };
}

const QUICK_AMOUNTS = [10, 25, 50, 100];

const TYPE_LABELS: Record<string, string> = {
  top_up: "Added Funds",
  order_payment: "Order Payment",
  refund_credit: "Refund Credit",
  promo_credit: "Promo Credit",
  adjustment: "Adjustment",
};

export function WalletView({ initialData }: WalletViewProps) {
  const [showTopUp, setShowTopUp] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState(0);

  const handleTopUp = async (topUpAmt: number) => {
    if (topUpAmt < 5 || topUpAmt > 500) {
      setError("Amount must be between $5 and $500");
      return;
    }

    setLoading(true);
    setError(null);
    setTopUpAmount(topUpAmt);

    const result = await addFundsToWallet({ amount: topUpAmt });

    if (result.success && result.clientSecret) {
      setClientSecret(result.clientSecret);
    } else {
      setError(result.error ?? "Failed to initialize payment");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Balance Card */}
      <Card>
        <CardContent className="flex items-center justify-between py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <p className="text-3xl font-bold">
                {formatCurrency(initialData.balance)}
              </p>
            </div>
          </div>
          <Dialog open={showTopUp} onOpenChange={(open) => {
            setShowTopUp(open);
            if (!open) {
              setClientSecret(null);
              setAmount("");
              setError(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Funds
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Funds to Wallet</DialogTitle>
              </DialogHeader>

              {!clientSecret ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map((amt) => (
                      <Button
                        key={amt}
                        variant="outline"
                        onClick={() => {
                          setAmount(amt.toString());
                          handleTopUp(amt);
                        }}
                        disabled={loading}
                      >
                        ${amt}
                      </Button>
                    ))}
                  </div>

                  <div>
                    <Label htmlFor="custom-amount">Custom Amount</Label>
                    <div className="mt-1 flex gap-2">
                      <Input
                        id="custom-amount"
                        type="number"
                        min="5"
                        max="500"
                        step="0.01"
                        placeholder="$0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <Button
                        onClick={() => handleTopUp(parseFloat(amount))}
                        disabled={loading || !amount || parseFloat(amount) < 5}
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Add"
                        )}
                      </Button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Min $5, Max $500
                    </p>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>
              ) : (
                <PaymentForm
                  clientSecret={clientSecret}
                  orderId=""
                  amount={topUpAmount}
                  returnUrl={`${window.location.origin}/customer/wallet?topup=success`}
                  onSuccess={() => {
                    window.location.href = "/customer/wallet?topup=success";
                  }}
                  onError={(msg) => setError(msg)}
                />
              )}
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {initialData.transactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No transactions yet
            </p>
          ) : (
            <div className="space-y-3">
              {initialData.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    {tx.amount >= 0 ? (
                      <ArrowDownRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {TYPE_LABELS[tx.type] ?? tx.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tx.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-medium ${
                        tx.amount >= 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {formatCurrency(Math.abs(tx.amount))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bal: {formatCurrency(tx.balanceAfter)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
