"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PageBlock, FeatureIcon } from "@/types/blocks";

interface BlockFormProps {
  block: PageBlock;
  onChange: (block: PageBlock) => void;
}

const ICON_OPTIONS: { value: FeatureIcon; label: string }[] = [
  { value: "truck", label: "Truck" },
  { value: "clock", label: "Clock" },
  { value: "sparkles", label: "Sparkles" },
  { value: "shield", label: "Shield" },
  { value: "phone", label: "Phone" },
  { value: "dollar", label: "Dollar" },
];

export function BlockForm({ block, onChange }: BlockFormProps) {
  switch (block.type) {
    case "hero":
      return (
        <div className="space-y-3">
          <Field label="Heading">
            <Input
              value={block.heading}
              onChange={(e) => onChange({ ...block, heading: e.target.value })}
            />
          </Field>
          <Field label="Subheading">
            <Input
              value={block.subheading}
              onChange={(e) => onChange({ ...block, subheading: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button Text">
              <Input
                value={block.ctaText}
                onChange={(e) => onChange({ ...block, ctaText: e.target.value })}
              />
            </Field>
            <Field label="Button Link">
              <Input
                value={block.ctaLink}
                onChange={(e) => onChange({ ...block, ctaLink: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Background Image URL">
            <Input
              value={block.backgroundImage || ""}
              onChange={(e) =>
                onChange({ ...block, backgroundImage: e.target.value || undefined })
              }
              placeholder="Optional"
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.showGradient}
              onChange={(e) => onChange({ ...block, showGradient: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            Show gradient overlay
          </label>
        </div>
      );

    case "text":
      return (
        <div className="space-y-3">
          <Field label="Heading (optional)">
            <Input
              value={block.heading || ""}
              onChange={(e) => onChange({ ...block, heading: e.target.value })}
            />
          </Field>
          <Field label="Body">
            <Textarea
              value={block.body}
              onChange={(e) => onChange({ ...block, body: e.target.value })}
              rows={5}
            />
          </Field>
        </div>
      );

    case "services":
      return (
        <div className="space-y-3">
          <Field label="Heading">
            <Input
              value={block.heading}
              onChange={(e) => onChange({ ...block, heading: e.target.value })}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.showPrices}
              onChange={(e) => onChange({ ...block, showPrices: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            Show prices
          </label>
        </div>
      );

    case "features":
      return (
        <div className="space-y-4">
          <Field label="Heading">
            <Input
              value={block.heading}
              onChange={(e) => onChange({ ...block, heading: e.target.value })}
            />
          </Field>
          {block.features.map((feature, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Feature {i + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    const features = block.features.filter((_, fi) => fi !== i);
                    onChange({ ...block, features });
                  }}
                >
                  Remove
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Icon</Label>
                  <Select
                    value={feature.icon}
                    onValueChange={(v) => {
                      const features = [...block.features];
                      features[i] = { ...feature, icon: v as FeatureIcon };
                      onChange({ ...block, features });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    value={feature.title}
                    onChange={(e) => {
                      const features = [...block.features];
                      features[i] = { ...feature, title: e.target.value };
                      onChange({ ...block, features });
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={feature.description}
                    onChange={(e) => {
                      const features = [...block.features];
                      features[i] = { ...feature, description: e.target.value };
                      onChange({ ...block, features });
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const features = [
                ...block.features,
                { icon: "sparkles" as FeatureIcon, title: "", description: "" },
              ];
              onChange({ ...block, features });
            }}
          >
            Add Feature
          </Button>
        </div>
      );

    case "cta":
      return (
        <div className="space-y-3">
          <Field label="Heading">
            <Input
              value={block.heading}
              onChange={(e) => onChange({ ...block, heading: e.target.value })}
            />
          </Field>
          <Field label="Subheading (optional)">
            <Input
              value={block.subheading || ""}
              onChange={(e) => onChange({ ...block, subheading: e.target.value })}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button Text">
              <Input
                value={block.buttonText}
                onChange={(e) => onChange({ ...block, buttonText: e.target.value })}
              />
            </Field>
            <Field label="Button Link">
              <Input
                value={block.buttonLink}
                onChange={(e) => onChange({ ...block, buttonLink: e.target.value })}
              />
            </Field>
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="space-y-4">
          <Field label="Heading">
            <Input
              value={block.heading}
              onChange={(e) => onChange({ ...block, heading: e.target.value })}
            />
          </Field>
          {block.items.map((item, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Q{i + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    const items = block.items.filter((_, fi) => fi !== i);
                    onChange({ ...block, items });
                  }}
                >
                  Remove
                </Button>
              </div>
              <Field label="Question">
                <Input
                  value={item.question}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...item, question: e.target.value };
                    onChange({ ...block, items });
                  }}
                />
              </Field>
              <Field label="Answer">
                <Textarea
                  value={item.answer}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[i] = { ...item, answer: e.target.value };
                    onChange({ ...block, items });
                  }}
                  rows={2}
                />
              </Field>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const items = [...block.items, { question: "", answer: "" }];
              onChange({ ...block, items });
            }}
          >
            Add Question
          </Button>
        </div>
      );
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
