"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPage } from "../actions";

export default function CreatePagePage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createPage(formData);

    if (result.success && result.pageId) {
      router.push(`/settings/pages/${result.pageId}/edit`);
    } else {
      setError(result.error || "Something went wrong.");
      setLoading(false);
    }
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const slugInput = document.getElementById("slug") as HTMLInputElement;
    if (slugInput && !slugInput.dataset.touched) {
      slugInput.value = e.target.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-xl font-bold">Create Page</h1>
          <Link href="/settings/pages">
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>New Page</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="About Us"
                  onChange={handleTitleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  name="slug"
                  required
                  placeholder="about-us"
                  pattern="[a-z0-9-]+"
                  onFocus={(e) => { e.currentTarget.dataset.touched = "true"; }}
                />
                <p className="text-xs text-muted-foreground">
                  Appears in the URL: /p/your-slug
                </p>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Page"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
