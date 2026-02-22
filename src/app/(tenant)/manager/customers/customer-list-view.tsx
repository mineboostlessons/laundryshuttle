"use client";

import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Customer {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  createdAt: Date;
  walletBalance: number;
  _count: { ordersAsCustomer: number };
}

export function CustomerListView({ customers }: { customers: Customer[] }) {
  if (customers.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No customers yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{customers.length} customers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {customers.map((c) => {
            const name = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
            return (
              <div
                key={c.id}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-medium flex-shrink-0">
                    {(c.firstName?.[0] ?? c.email[0]).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {name || c.email}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {c.email} {c.phone ? `| ${c.phone}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Badge variant="outline">
                    {c._count.ordersAsCustomer} orders
                  </Badge>
                  {c.walletBalance > 0 && (
                    <Badge variant="secondary">
                      {formatCurrency(c.walletBalance)} wallet
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
