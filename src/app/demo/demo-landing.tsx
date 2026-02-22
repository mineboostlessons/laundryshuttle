"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Monitor,
  ShoppingCart,
  Play,
  Copy,
  Check,
  Shield,
} from "lucide-react";

interface DemoUser {
  role: string;
  email: string;
  name: string;
}

interface DemoLandingProps {
  tenantSlug: string;
  businessName: string;
  demoUsers: DemoUser[];
}

const ROLE_CONFIG: Record<
  string,
  {
    label: string;
    description: string;
    icon: React.ElementType;
    color: string;
    dashboardPath: string;
  }
> = {
  owner: {
    label: "Business Owner",
    description:
      "Full dashboard with analytics, staff management, orders, revenue, and all settings.",
    icon: LayoutDashboard,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    dashboardPath: "/dashboard",
  },
  manager: {
    label: "Manager",
    description:
      "Day-to-day operations: order queue, staff assignments, and washer/dryer management.",
    icon: ClipboardList,
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    dashboardPath: "/manager",
  },
  attendant: {
    label: "Attendant",
    description:
      "Process incoming orders, operate the washer/dryer grid, and handle walk-in POS.",
    icon: Monitor,
    color:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    dashboardPath: "/attendant",
  },
  driver: {
    label: "Driver",
    description:
      "Pickup & delivery routes with optimized navigation, delivery photos, and earnings tracking.",
    icon: Truck,
    color:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    dashboardPath: "/driver",
  },
  customer: {
    label: "Customer",
    description:
      "Place orders, track laundry status, manage addresses, leave reviews, and view history.",
    icon: ShoppingCart,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
    dashboardPath: "/customer",
  },
};

export function DemoLanding({
  tenantSlug,
  businessName,
  demoUsers,
}: DemoLandingProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleDemoLogin = async (role: string) => {
    const user = demoUsers.find((u) => u.role === role);
    if (!user) return;

    setLoading(role);

    // Redirect to login page with demo credentials pre-filled
    const params = new URLSearchParams({
      demo: "true",
      email: user.email,
      tenant: tenantSlug,
      redirect: ROLE_CONFIG[role]?.dashboardPath ?? "/dashboard",
    });

    router.push(`/login?${params.toString()}`);
  };

  const copyCredentials = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold">Laundry Shuttle</h1>
            <p className="text-sm text-muted-foreground">Live Demo</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {businessName}
          </Badge>
        </div>
      </header>

      {/* Hero */}
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="text-center">
          <Badge className="mb-4 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
            <Shield className="mr-1 h-3 w-3" />
            No signup required
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Try Laundry Shuttle
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">
            Explore the full platform from any perspective. Pick a role below to
            instantly log in and see exactly how Laundry Shuttle works for your
            team.
          </p>
        </div>

        {/* Role Cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {demoUsers.map((user) => {
            const config = ROLE_CONFIG[user.role];
            if (!config) return null;
            const Icon = config.icon;

            return (
              <Card
                key={user.role}
                className="relative overflow-hidden transition-shadow hover:shadow-lg"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.color}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {config.label}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {user.name}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {config.description}
                  </p>

                  {/* Credentials */}
                  <div className="mb-4 rounded-md bg-muted/50 p-2">
                    <div className="flex items-center justify-between">
                      <code className="text-xs text-muted-foreground">
                        {user.email}
                      </code>
                      <button
                        onClick={() => copyCredentials(user.email)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Copy email"
                      >
                        {copiedEmail === user.email ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password: <code>demo1234</code>
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => handleDemoLogin(user.role)}
                    disabled={loading !== null}
                  >
                    {loading === user.role ? (
                      "Loading..."
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Try as {config.label}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            This demo uses sample data that resets periodically. No real
            transactions are processed.
          </p>
        </div>
      </div>
    </div>
  );
}
