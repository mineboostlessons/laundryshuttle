"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Tag,
  CreditCard,
  ClipboardList,
  WashingMachine,
  UserCog,
  FileText,
  Upload,
  Truck,
  Route,
  ShoppingCart,
  Star,
  Sparkles,
  MessageSquare,
  Building2,
  Receipt,
  Webhook,
  Store,
  Calculator,
  Rocket,
  FlaskConical,
  Share2,
  BarChart3,
  ArrowRightLeft,
  Globe,
} from "lucide-react";
import type { UserRole } from "@/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  tourId?: string;
}

const NAV_ITEMS: NavItem[] = [
  // Owner items
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["owner"],
  },
  {
    href: "/dashboard/orders",
    label: "Orders",
    icon: Package,
    roles: ["owner"],
    tourId: "nav-orders",
  },
  {
    href: "/dashboard/promo-codes",
    label: "Promo Codes",
    icon: Tag,
    roles: ["owner"],
  },
  {
    href: "/dashboard/staff",
    label: "Staff",
    icon: Users,
    roles: ["owner"],
    tourId: "nav-staff",
  },
  {
    href: "/dashboard/reviews",
    label: "Reviews",
    icon: Star,
    roles: ["owner"],
  },
  {
    href: "/dashboard/campaigns",
    label: "Campaigns",
    icon: Sparkles,
    roles: ["owner"],
  },
  {
    href: "/dashboard/sms-inbox",
    label: "SMS Inbox",
    icon: MessageSquare,
    roles: ["owner"],
  },
  {
    href: "/dashboard/commercial",
    label: "Commercial",
    icon: Building2,
    roles: ["owner"],
  },
  {
    href: "/dashboard/invoices",
    label: "Invoices",
    icon: Receipt,
    roles: ["owner", "manager"],
  },
  {
    href: "/dashboard/webhooks",
    label: "Webhooks",
    icon: Webhook,
    roles: ["owner"],
  },
  {
    href: "/dashboard/tax-reports",
    label: "Tax Reports",
    icon: Calculator,
    roles: ["owner"],
  },
  {
    href: "/dashboard/marketplace",
    label: "Marketplace",
    icon: Store,
    roles: ["owner", "manager"],
  },
  {
    href: "/dashboard/launch-kit",
    label: "Launch Kit",
    icon: Rocket,
    roles: ["owner"],
    tourId: "nav-launch-kit",
  },
  {
    href: "/dashboard/sandbox",
    label: "Sandbox",
    icon: FlaskConical,
    roles: ["owner"],
  },
  {
    href: "/dashboard/referrals",
    label: "Referral Program",
    icon: Share2,
    roles: ["owner"],
  },
  {
    href: "/dashboard/benchmarks",
    label: "Benchmarks",
    icon: BarChart3,
    roles: ["owner"],
  },
  {
    href: "/dashboard/migrations",
    label: "Migration Tools",
    icon: ArrowRightLeft,
    roles: ["owner", "manager"],
  },
  {
    href: "/settings/domains",
    label: "Custom Domain",
    icon: Globe,
    roles: ["owner"],
  },
  {
    href: "/settings/payments",
    label: "Payments",
    icon: CreditCard,
    roles: ["owner"],
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["owner"],
    tourId: "nav-settings",
  },
  // Manager items
  {
    href: "/manager",
    label: "Operations",
    icon: LayoutDashboard,
    roles: ["manager"],
  },
  {
    href: "/manager/orders",
    label: "Orders",
    icon: Package,
    roles: ["manager"],
  },
  {
    href: "/manager/staff",
    label: "Staff",
    icon: UserCog,
    roles: ["manager"],
  },
  {
    href: "/manager/customers",
    label: "Customers",
    icon: Users,
    roles: ["manager"],
  },
  {
    href: "/manager/customers/import",
    label: "Import Customers",
    icon: Upload,
    roles: ["manager"],
  },
  {
    href: "/manager/reports",
    label: "Reports",
    icon: FileText,
    roles: ["manager"],
  },
  {
    href: "/dashboard/sms-inbox",
    label: "SMS Inbox",
    icon: MessageSquare,
    roles: ["manager"],
  },
  // Attendant items
  {
    href: "/attendant",
    label: "Order Queue",
    icon: ClipboardList,
    roles: ["attendant"],
  },
  {
    href: "/attendant/equipment",
    label: "Equipment",
    icon: WashingMachine,
    roles: ["attendant"],
  },
  // POS — available to owner, manager, attendant
  {
    href: "/pos",
    label: "POS",
    icon: ShoppingCart,
    roles: ["owner", "manager", "attendant"],
  },
  // Driver items
  {
    href: "/driver",
    label: "Dashboard",
    icon: Truck,
    roles: ["driver"],
  },
  {
    href: "/driver/routes",
    label: "Routes",
    icon: Route,
    roles: ["driver"],
  },
];

interface StaffSidebarProps {
  userName: string;
  userEmail: string;
  userRole: UserRole;
  businessName: string;
}

export function StaffSidebar({
  userName,
  userEmail,
  userRole,
  businessName,
}: StaffSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNavItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(userRole)
  );

  function isActive(href: string) {
    const basePaths = ["/dashboard", "/manager", "/attendant", "/driver"];
    if (basePaths.includes(href)) return pathname === href;
    return pathname.startsWith(href);
  }

  const roleLabels: Record<string, string> = {
    owner: "Owner",
    manager: "Manager",
    attendant: "Attendant",
    driver: "Driver",
  };

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? (
          <X className="h-4 w-4" />
        ) : (
          <Menu className="h-4 w-4" />
        )}
      </Button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-background border-r flex flex-col transition-transform lg:relative lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6">
          <p className="font-semibold text-sm text-primary">{businessName}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {roleLabels[userRole] ?? userRole}
          </p>
          <p className="text-sm font-medium mt-2 truncate">{userName}</p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        </div>

        <Separator />

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                data-tour={item.tourId}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Separator />

        <div className="p-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}
