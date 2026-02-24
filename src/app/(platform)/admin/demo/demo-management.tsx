"use client";

import { useState, useMemo } from "react";
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
  Play,
  RefreshCw,
  Users,
  Package,
  Globe,
  Activity,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { toggleDemoFlag, resetDemoTenant } from "./actions";

interface DemoTenant {
  id: string;
  slug: string;
  businessName: string;
  isDemo: boolean;
  isActive: boolean;
  demoResetInterval: number | null;
  userCount: number;
  orderCount: number;
  createdAt: string | Date;
}

interface DemoManagementProps {
  demoTenants: DemoTenant[];
  activeSessions: number;
  totalSessions: number;
}

export function DemoManagement({
  demoTenants,
  activeSessions,
  totalSessions,
}: DemoManagementProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string>("businessName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const sortedTenants = useMemo(() => {
    return [...demoTenants].sort((a, b) => {
      let aVal: string | number | boolean;
      let bVal: string | number | boolean;
      switch (sortColumn) {
        case "businessName": aVal = a.businessName.toLowerCase(); bVal = b.businessName.toLowerCase(); break;
        case "isDemo": aVal = a.isDemo ? 1 : 0; bVal = b.isDemo ? 1 : 0; break;
        case "isActive": aVal = a.isActive ? 1 : 0; bVal = b.isActive ? 1 : 0; break;
        case "userCount": aVal = a.userCount; bVal = b.userCount; break;
        case "orderCount": aVal = a.orderCount; bVal = b.orderCount; break;
        default: aVal = a.businessName.toLowerCase(); bVal = b.businessName.toLowerCase();
      }
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [demoTenants, sortColumn, sortOrder]);

  const toggleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortOrder === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
  };

  const handleToggleDemo = async (tenantId: string) => {
    setLoading(`toggle-${tenantId}`);
    await toggleDemoFlag(tenantId);
    setLoading(null);
  };

  const handleResetDemo = async (tenantId: string) => {
    setLoading(`reset-${tenantId}`);
    await resetDemoTenant(tenantId);
    setLoading(null);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Demo Tenants</CardDescription>
            <CardTitle className="text-2xl">{demoTenants.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {demoTenants.filter((t) => t.isDemo).length} flagged as demo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Demo Sessions</CardDescription>
            <CardTitle className="text-2xl">{activeSessions}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {totalSessions} total all-time
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Demo URL</CardDescription>
            <CardTitle className="text-sm font-mono">
              /demo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href="/demo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Open demo page
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Demo Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Tenants</CardTitle>
          <CardDescription>
            Tenants configured for public demo access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {demoTenants.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No demo tenants found. Run the seed script or mark a tenant as
              demo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">
                      <button onClick={() => toggleSort("businessName")} className="inline-flex items-center gap-1 hover:text-foreground">
                        Tenant <SortIcon column="businessName" />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <button onClick={() => toggleSort("isDemo")} className="inline-flex items-center gap-1 hover:text-foreground">
                        Status <SortIcon column="isDemo" />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <button onClick={() => toggleSort("userCount")} className="inline-flex items-center gap-1 hover:text-foreground">
                        Data <SortIcon column="userCount" />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">Auto Reset</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{tenant.businessName}</p>
                          <p className="text-xs text-muted-foreground">
                            {tenant.slug}.laundryshuttle.com
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {tenant.isDemo ? (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <Play className="mr-1 h-3 w-3" />
                              Demo
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Standard</Badge>
                          )}
                          {!tenant.isActive && (
                            <Badge variant="destructive">Inactive</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {tenant.userCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {tenant.orderCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {tenant.demoResetInterval ? (
                          <span className="text-xs">
                            Every {tenant.demoResetInterval}h
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleDemo(tenant.id)}
                            disabled={loading === `toggle-${tenant.id}`}
                          >
                            {tenant.isDemo ? (
                              <>
                                <Globe className="mr-1 h-3 w-3" />
                                Unmark Demo
                              </>
                            ) : (
                              <>
                                <Activity className="mr-1 h-3 w-3" />
                                Mark as Demo
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetDemo(tenant.id)}
                            disabled={loading === `reset-${tenant.id}`}
                          >
                            <RefreshCw
                              className={`mr-1 h-3 w-3 ${loading === `reset-${tenant.id}` ? "animate-spin" : ""}`}
                            />
                            Reset Data
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
