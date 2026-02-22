"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PageBlock, BlockType } from "@/types/blocks";
import { BLOCK_TYPE_LABELS, createDefaultBlock } from "@/types/blocks";
import { updatePage, updatePageBlocks } from "../../actions";
import { BlockForm } from "./block-form";

interface BlockEditorProps {
  page: {
    id: string;
    title: string;
    slug: string;
    seoTitle: string;
    seoDescription: string;
    isPublished: boolean;
    blocks: PageBlock[];
  };
}

export function BlockEditor({ page }: BlockEditorProps) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<PageBlock[]>(page.blocks);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [addType, setAddType] = useState<BlockType>("text");
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingSettings(true);
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const result = await updatePage(page.id, formData);

    if (result.success) {
      setMessage("Settings saved.");
      router.refresh();
    } else {
      setMessage(result.error || "Failed to save.");
    }
    setSavingSettings(false);
  }

  async function handleSaveBlocks() {
    setSaving(true);
    setMessage("");

    const result = await updatePageBlocks(page.id, blocks);
    if (result.success) {
      setMessage("Blocks saved.");
    } else {
      setMessage(result.error || "Failed to save blocks.");
    }
    setSaving(false);
  }

  function addBlock() {
    const newBlock = createDefaultBlock(addType);
    setBlocks([...blocks, newBlock]);
    setExpandedIndex(blocks.length);
  }

  function moveBlock(index: number, direction: "up" | "down") {
    const newBlocks = [...blocks];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newBlocks.length) return;
    [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
    setBlocks(newBlocks);
    setExpandedIndex(swapIndex);
  }

  function removeBlock(index: number) {
    setBlocks(blocks.filter((_, i) => i !== index));
    setExpandedIndex(null);
  }

  function updateBlock(index: number, updated: PageBlock) {
    const newBlocks = [...blocks];
    newBlocks[index] = updated;
    setBlocks(newBlocks);
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Edit: {page.title}</h1>
            <p className="text-sm text-muted-foreground">
              {page.slug === "home" ? "/" : `/p/${page.slug}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {message && (
              <span className="text-sm text-muted-foreground">{message}</span>
            )}
            <Link href="/settings/pages">
              <Button variant="outline" size="sm">
                Back
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 p-6">
        {/* Page settings */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold">Page Settings</h2>
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={page.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  name="slug"
                  defaultValue={page.slug}
                  required
                  pattern="[a-z0-9-]+"
                  disabled={page.slug === "home"}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="seoTitle">SEO Title</Label>
                <Input
                  id="seoTitle"
                  name="seoTitle"
                  defaultValue={page.seoTitle}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seoDescription">SEO Description</Label>
                <Input
                  id="seoDescription"
                  name="seoDescription"
                  defaultValue={page.seoDescription}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isPublished"
                  value="true"
                  defaultChecked={page.isPublished}
                  className="h-4 w-4 rounded border-input"
                />
                Published
              </label>
              <Button type="submit" size="sm" disabled={savingSettings}>
                {savingSettings ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </div>

        {/* Block list */}
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Content Blocks ({blocks.length})
            </h2>
            <Button onClick={handleSaveBlocks} disabled={saving}>
              {saving ? "Saving..." : "Save Blocks"}
            </Button>
          </div>

          {blocks.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              No blocks yet. Add one below.
            </p>
          )}

          <div className="space-y-3">
            {blocks.map((block, index) => (
              <div key={index} className="rounded-lg border">
                <div
                  className="flex cursor-pointer items-center justify-between px-4 py-3"
                  onClick={() =>
                    setExpandedIndex(expandedIndex === index ? null : index)
                  }
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">
                      {BLOCK_TYPE_LABELS[block.type]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {getBlockPreview(block)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(index, "up");
                      }}
                      disabled={index === 0}
                    >
                      &uarr;
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(index, "down");
                      }}
                      disabled={index === blocks.length - 1}
                    >
                      &darr;
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBlock(index);
                      }}
                      className="text-destructive"
                    >
                      &times;
                    </Button>
                  </div>
                </div>

                {expandedIndex === index && (
                  <div className="border-t px-4 py-4">
                    <BlockForm
                      block={block}
                      onChange={(updated) => updateBlock(index, updated)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add block */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed p-4">
            <Select
              value={addType}
              onValueChange={(v) => setAddType(v as BlockType)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.entries(BLOCK_TYPE_LABELS) as [BlockType, string][]
                ).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={addBlock}>
              Add Block
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function getBlockPreview(block: PageBlock): string {
  switch (block.type) {
    case "hero":
      return block.heading || "Hero";
    case "text":
      return block.heading || block.body.slice(0, 50) || "Text";
    case "services":
      return block.heading || "Services";
    case "features":
      return `${block.features.length} features`;
    case "cta":
      return block.heading || "CTA";
    case "faq":
      return `${block.items.length} questions`;
  }
}
