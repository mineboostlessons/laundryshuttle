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
  { value: "map", label: "Map" },
  { value: "calendar", label: "Calendar" },
  { value: "leaf", label: "Leaf" },
  { value: "heart", label: "Heart" },
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.showAddressChecker ?? false}
              onChange={(e) => onChange({ ...block, showAddressChecker: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            Show address availability checker
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

    case "pricing":
      return (
        <div className="space-y-4">
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
          {block.tiers.map((tier, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tier {i + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    const tiers = block.tiers.filter((_, ti) => ti !== i);
                    onChange({ ...block, tiers });
                  }}
                >
                  Remove
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={tier.name}
                    onChange={(e) => {
                      const tiers = [...block.tiers];
                      tiers[i] = { ...tier, name: e.target.value };
                      onChange({ ...block, tiers });
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Price</Label>
                  <Input
                    value={tier.price}
                    onChange={(e) => {
                      const tiers = [...block.tiers];
                      tiers[i] = { ...tier, price: e.target.value };
                      onChange({ ...block, tiers });
                    }}
                    placeholder="$1.99"
                  />
                </div>
                <div>
                  <Label className="text-xs">Unit</Label>
                  <Input
                    value={tier.unit}
                    onChange={(e) => {
                      const tiers = [...block.tiers];
                      tiers[i] = { ...tier, unit: e.target.value };
                      onChange({ ...block, tiers });
                    }}
                    placeholder="/lb"
                  />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={tier.description}
                    onChange={(e) => {
                      const tiers = [...block.tiers];
                      tiers[i] = { ...tier, description: e.target.value };
                      onChange({ ...block, tiers });
                    }}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tier.featured ?? false}
                  onChange={(e) => {
                    const tiers = [...block.tiers];
                    tiers[i] = { ...tier, featured: e.target.checked };
                    onChange({ ...block, tiers });
                  }}
                  className="h-4 w-4 rounded border-input"
                />
                Featured / Most Popular
              </label>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const tiers = [
                ...block.tiers,
                { name: "", price: "", unit: "", description: "" },
              ];
              onChange({ ...block, tiers });
            }}
          >
            Add Tier
          </Button>
        </div>
      );

    case "how_it_works":
      return (
        <div className="space-y-4">
          <Field label="Heading">
            <Input
              value={block.heading}
              onChange={(e) => onChange({ ...block, heading: e.target.value })}
            />
          </Field>
          {block.steps.map((step, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Step {i + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    const steps = block.steps.filter((_, si) => si !== i);
                    onChange({ ...block, steps });
                  }}
                >
                  Remove
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Icon</Label>
                  <Select
                    value={step.icon}
                    onValueChange={(v) => {
                      const steps = [...block.steps];
                      steps[i] = { ...step, icon: v as FeatureIcon };
                      onChange({ ...block, steps });
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
                    value={step.title}
                    onChange={(e) => {
                      const steps = [...block.steps];
                      steps[i] = { ...step, title: e.target.value };
                      onChange({ ...block, steps });
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={step.description}
                    onChange={(e) => {
                      const steps = [...block.steps];
                      steps[i] = { ...step, description: e.target.value };
                      onChange({ ...block, steps });
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
              const steps = [
                ...block.steps,
                { title: "", description: "", icon: "sparkles" as FeatureIcon },
              ];
              onChange({ ...block, steps });
            }}
          >
            Add Step
          </Button>
        </div>
      );

    case "testimonials":
      return (
        <div className="space-y-4">
          <Field label="Heading">
            <Input
              value={block.heading}
              onChange={(e) => onChange({ ...block, heading: e.target.value })}
            />
          </Field>
          {block.testimonials.map((item, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Testimonial {i + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    const testimonials = block.testimonials.filter((_, ti) => ti !== i);
                    onChange({ ...block, testimonials });
                  }}
                >
                  Remove
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={item.name}
                    onChange={(e) => {
                      const testimonials = [...block.testimonials];
                      testimonials[i] = { ...item, name: e.target.value };
                      onChange({ ...block, testimonials });
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Rating (1-5)</Label>
                  <Select
                    value={String(item.rating)}
                    onValueChange={(v) => {
                      const testimonials = [...block.testimonials];
                      testimonials[i] = { ...item, rating: Number(v) };
                      onChange({ ...block, testimonials });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n} Star{n > 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Field label="Testimonial Text">
                <Textarea
                  value={item.text}
                  onChange={(e) => {
                    const testimonials = [...block.testimonials];
                    testimonials[i] = { ...item, text: e.target.value };
                    onChange({ ...block, testimonials });
                  }}
                  rows={3}
                />
              </Field>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const testimonials = [
                ...block.testimonials,
                { name: "", text: "", rating: 5 },
              ];
              onChange({ ...block, testimonials });
            }}
          >
            Add Testimonial
          </Button>
        </div>
      );

    case "contact":
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.showPhone}
              onChange={(e) => onChange({ ...block, showPhone: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            Show phone number
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.showEmail}
              onChange={(e) => onChange({ ...block, showEmail: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            Show email address
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.showForm}
              onChange={(e) => onChange({ ...block, showForm: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            Show contact form
          </label>
        </div>
      );

    case "service_areas":
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={block.showZipChecker}
              onChange={(e) => onChange({ ...block, showZipChecker: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            Show ZIP code checker
          </label>
        </div>
      );

    case "gallery":
      return (
        <div className="space-y-4">
          <Field label="Heading">
            <Input
              value={block.heading}
              onChange={(e) => onChange({ ...block, heading: e.target.value })}
            />
          </Field>
          {block.images.map((img, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Image {i + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    const images = block.images.filter((_, ii) => ii !== i);
                    onChange({ ...block, images });
                  }}
                >
                  Remove
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <Label className="text-xs">Image URL</Label>
                  <Input
                    value={img.url}
                    onChange={(e) => {
                      const images = [...block.images];
                      images[i] = { ...img, url: e.target.value };
                      onChange({ ...block, images });
                    }}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label className="text-xs">Alt Text</Label>
                  <Input
                    value={img.alt}
                    onChange={(e) => {
                      const images = [...block.images];
                      images[i] = { ...img, alt: e.target.value };
                      onChange({ ...block, images });
                    }}
                  />
                </div>
                <div>
                  <Label className="text-xs">Caption (optional)</Label>
                  <Input
                    value={img.caption || ""}
                    onChange={(e) => {
                      const images = [...block.images];
                      images[i] = { ...img, caption: e.target.value };
                      onChange({ ...block, images });
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
              const images = [...block.images, { url: "", alt: "" }];
              onChange({ ...block, images });
            }}
          >
            Add Image
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
