"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { installApp, uninstallApp, toggleAppStatus } from "./actions";
import {
  Store,
  Search,
  CheckCircle,
  Zap,
  Calculator,
  Table2,
  MessageCircle,
  Mail,
  ExternalLink,
  Pause,
  Play,
  Trash2,
} from "lucide-react";

interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string | null;
  iconUrl: string | null;
  category: string;
  provider: string;
  docsUrl: string | null;
  isFeatured: boolean;
  isInstalled: boolean;
  installation: {
    id: string;
    status: string;
    config: unknown;
    lastSyncAt: Date | string | null;
  } | null;
}

const categoryLabels: Record<string, string> = {
  automation: "Automation",
  accounting: "Accounting",
  communication: "Communication",
  analytics: "Analytics",
  marketing: "Marketing",
};

const providerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  zapier: Zap,
  quickbooks: Calculator,
  google: Table2,
  slack: MessageCircle,
  mailchimp: Mail,
};

export function MarketplaceView({
  initialApps,
}: {
  initialApps: MarketplaceApp[];
}) {
  const [apps, setApps] = useState(initialApps);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [detailApp, setDetailApp] = useState<MarketplaceApp | null>(null);

  const filteredApps = apps.filter((app) => {
    const matchesSearch =
      !searchQuery ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || app.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(apps.map((a) => a.category))];
  const installedCount = apps.filter((a) => a.isInstalled).length;

  function handleInstall(appId: string) {
    startTransition(async () => {
      await installApp({ appId });
      setApps((prev) =>
        prev.map((app) =>
          app.id === appId
            ? {
                ...app,
                isInstalled: true,
                installation: { id: "", status: "active", config: {}, lastSyncAt: null },
              }
            : app
        )
      );
      setDetailApp(null);
    });
  }

  function handleUninstall(appId: string) {
    startTransition(async () => {
      await uninstallApp(appId);
      setApps((prev) =>
        prev.map((app) =>
          app.id === appId
            ? { ...app, isInstalled: false, installation: null }
            : app
        )
      );
      setDetailApp(null);
    });
  }

  function handleToggle(appId: string, status: "active" | "paused") {
    startTransition(async () => {
      await toggleAppStatus(appId, status);
      setApps((prev) =>
        prev.map((app) =>
          app.id === appId && app.installation
            ? {
                ...app,
                installation: { ...app.installation, status },
              }
            : app
        )
      );
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">
            Connect your laundry business with powerful integrations
            {installedCount > 0 && (
              <span className="ml-2">
                ({installedCount} installed)
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(cat)}
            >
              {categoryLabels[cat] ?? cat}
            </Button>
          ))}
        </div>
      </div>

      {/* App Grid */}
      {filteredApps.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No integrations found</p>
          <p className="text-sm">
            {searchQuery
              ? "Try a different search term"
              : "Check back soon for new integrations"}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => {
            const ProviderIcon = providerIcons[app.provider] ?? Zap;
            return (
              <div
                key={app.id}
                className="border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setDetailApp(app)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <ProviderIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{app.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {categoryLabels[app.category] ?? app.category}
                      </Badge>
                    </div>
                  </div>
                  {app.isFeatured && (
                    <Badge className="text-xs">Featured</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {app.shortDescription ?? app.description}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  {app.isInstalled ? (
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Installed
                      {app.installation?.status === "paused" && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          Paused
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Free
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailApp} onOpenChange={() => setDetailApp(null)}>
        {detailApp && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  {(() => {
                    const Icon = providerIcons[detailApp.provider] ?? Zap;
                    return <Icon className="h-5 w-5" />;
                  })()}
                </div>
                {detailApp.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant="outline">
                  {categoryLabels[detailApp.category] ?? detailApp.category}
                </Badge>
                <Badge variant="outline">{detailApp.provider}</Badge>
                {detailApp.isFeatured && <Badge>Featured</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">
                {detailApp.description}
              </p>
              {detailApp.docsUrl && (
                <a
                  href={detailApp.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Documentation
                </a>
              )}
              <div className="flex gap-2 pt-2">
                {detailApp.isInstalled ? (
                  <>
                    {detailApp.installation?.status === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleToggle(detailApp.id, "paused")
                        }
                        disabled={isPending}
                      >
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleToggle(detailApp.id, "active")
                        }
                        disabled={isPending}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Resume
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleUninstall(detailApp.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Uninstall
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleInstall(detailApp.id)}
                    disabled={isPending}
                    className="w-full"
                  >
                    {isPending ? "Installing..." : "Install"}
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
