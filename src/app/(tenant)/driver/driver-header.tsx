"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Route,
  LogOut,
  DollarSign,
} from "lucide-react";

interface DriverHeaderProps {
  userName: string;
  userEmail: string;
}

const NAV_ITEMS = [
  { href: "/driver", label: "Dashboard", icon: LayoutDashboard, tourId: "driver-header" },
  { href: "/driver/routes", label: "Routes", icon: Route, tourId: "routes-list" },
  { href: "/driver/earnings", label: "Earnings", icon: DollarSign, tourId: "nav-earnings" },
];

export function DriverHeader({ userName, userEmail }: DriverHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b bg-background">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{userName}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <nav className="flex gap-4 -mb-px">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/driver"
                ? pathname === "/driver"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-tour={item.tourId}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-medium transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
