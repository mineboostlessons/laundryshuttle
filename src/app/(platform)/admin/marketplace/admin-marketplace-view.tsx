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
import { Switch } from "@/components/ui/switch";
import {
  createMarketplaceApp,
  toggleMarketplaceApp,
  seedDefaultApps,
} from "./actions";
import { Plus, Store, Sparkles } from "lucide-react";

interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string | null;
  category: string;
  provider: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string | Date;
  _count: { installations: number };
}

export function AdminMarketplaceView({
  initialApps,
}: {
  initialApps: MarketplaceApp[];
}) {
  const [apps, setApps] = useState(initialApps);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  // Form
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [category, setCategory] = useState("automation");
  const [provider, setProvider] = useState("");
  const [docsUrl, setDocsUrl] = useState("");

  function handleCreate() {
    startTransition(async () => {
      const app = await createMarketplaceApp({
        slug,
        name,
        description,
        shortDescription: shortDesc || undefined,
        category: category as "automation" | "accounting" | "communication" | "analytics" | "marketing",
        provider,
        docsUrl: docsUrl || undefined,
      });
      setApps((prev) => [app as MarketplaceApp, ...prev]);
      setDialogOpen(false);
      setSlug("");
      setName("");
      setDescription("");
      setShortDesc("");
      setProvider("");
      setDocsUrl("");
    });
  }

  function handleToggle(appId: string, isActive: boolean) {
    startTransition(async () => {
      const updated = await toggleMarketplaceApp(appId, isActive);
      setApps((prev) =>
        prev.map((a) => (a.id === appId ? (updated as MarketplaceApp) : a))
      );
    });
  }

  function handleSeed() {
    startTransition(async () => {
      const result = await seedDefaultApps();
      setSeedMessage(`Created ${result.created} of ${result.total} default apps`);
      // Refresh
      window.location.reload();
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketplace Apps</h1>
          <p className="text-muted-foreground">
            Manage integrations available to tenants
          </p>
        </div>
        <div className="flex gap-2">
          {apps.length === 0 && (
            <Button variant="outline" onClick={handleSeed} disabled={isPending}>
              <Sparkles className="h-4 w-4 mr-2" />
              Seed Defaults
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add App
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Marketplace App</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label>Slug *</Label>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="my-app"
                    />
                  </div>
                </div>
                <div>
                  <Label>Description *</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Short Description</Label>
                  <Input
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="automation">Automation</SelectItem>
                        <SelectItem value="accounting">Accounting</SelectItem>
                        <SelectItem value="communication">Communication</SelectItem>
                        <SelectItem value="analytics">Analytics</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Provider *</Label>
                    <Input
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      placeholder="zapier"
                    />
                  </div>
                </div>
                <div>
                  <Label>Docs URL</Label>
                  <Input
                    value={docsUrl}
                    onChange={(e) => setDocsUrl(e.target.value)}
                    type="url"
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  disabled={isPending || !slug || !name || !description || !provider}
                  className="w-full"
                >
                  {isPending ? "Creating..." : "Create App"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {seedMessage && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          {seedMessage}
        </div>
      )}

      {apps.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No marketplace apps</p>
          <p className="text-sm">
            Seed default apps or create new integrations
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3">App</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Provider</th>
                <th className="text-right p-3">Installations</th>
                <th className="text-left p-3">Featured</th>
                <th className="text-left p-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((app) => (
                <tr key={app.id} className="border-b">
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-xs text-muted-foreground">{app.slug}</p>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{app.category}</Badge>
                  </td>
                  <td className="p-3">{app.provider}</td>
                  <td className="p-3 text-right">{app._count.installations}</td>
                  <td className="p-3">
                    {app.isFeatured && <Badge>Featured</Badge>}
                  </td>
                  <td className="p-3">
                    <Switch
                      checked={app.isActive}
                      onCheckedChange={(checked) =>
                        handleToggle(app.id, checked)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
