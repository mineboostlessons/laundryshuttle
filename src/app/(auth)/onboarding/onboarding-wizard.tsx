"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { submitOnboarding, type OnboardingState } from "./actions";

const STEPS = [
  { id: 1, title: "Business Info", description: "Tell us about your business" },
  { id: 2, title: "Your Account", description: "Create your owner account" },
  { id: 3, title: "Location", description: "Add your first location" },
  { id: 4, title: "Services & Theme", description: "Pick services and branding" },
];

const initialState: OnboardingState = {};

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [state, formAction, isPending] = useActionState(submitOnboarding, initialState);
  const router = useRouter();

  // Store form data across steps
  const [formValues, setFormValues] = useState<Record<string, string>>({
    businessType: "laundromat",
    timezone: "America/New_York",
    numWashers: "0",
    numDryers: "0",
    serviceTemplate: "standard",
    themePreset: "clean_luxe",
  });

  const updateField = (name: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  // Auto-generate slug from business name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40);
  };

  if (state.success && state.tenantSlug) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <CardTitle>You&apos;re All Set!</CardTitle>
          <CardDescription>
            Your business <strong>{formValues.businessName}</strong> has been created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Your site will be live at{" "}
            <code className="rounded bg-muted px-2 py-1 text-primary">
              {state.tenantSlug}.laundryshuttle.com
            </code>
          </p>
          <Button onClick={() => router.push("/login")} className="w-full">
            Sign In to Your Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s) => (
            <div key={s.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    s.id < step
                      ? "bg-primary text-primary-foreground"
                      : s.id === step
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.id < step ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.id
                  )}
                </div>
                <span className="mt-1 hidden text-xs sm:block">{s.title}</span>
              </div>
              {s.id < STEPS.length && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    s.id < step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step - 1].title}</CardTitle>
          <CardDescription>{STEPS[step - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {state.error && step === 4 && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <form
            action={formAction}
            onSubmit={(e) => {
              if (step < 4) {
                e.preventDefault();
                setStep(step + 1);
              }
            }}
          >
            {/* Hidden fields to carry data across steps */}
            {Object.entries(formValues).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}

            {/* Step 1: Business Info */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    value={formValues.businessName || ""}
                    onChange={(e) => {
                      updateField("businessName", e.target.value);
                      if (!formValues.slugManual) {
                        updateField("slug", generateSlug(e.target.value));
                      }
                    }}
                    placeholder="Fast Fresh Laundry"
                    required
                  />
                  {state.fieldErrors?.businessName && (
                    <p className="text-xs text-destructive">{state.fieldErrors.businessName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="slug"
                      name="slug"
                      value={formValues.slug || ""}
                      onChange={(e) => {
                        updateField("slug", e.target.value);
                        updateField("slugManual", "true");
                      }}
                      placeholder="fastfreshlaundry"
                      required
                      pattern="^[a-z0-9-]+$"
                      minLength={3}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your site: <strong>{formValues.slug || "yourname"}.laundryshuttle.com</strong>
                  </p>
                  {state.fieldErrors?.slug && (
                    <p className="text-xs text-destructive">{state.fieldErrors.slug}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type</Label>
                  <Select
                    value={formValues.businessType}
                    onValueChange={(v) => updateField("businessType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="laundromat">Laundromat</SelectItem>
                      <SelectItem value="dry_cleaner">Dry Cleaner</SelectItem>
                      <SelectItem value="wash_and_fold">Wash & Fold</SelectItem>
                      <SelectItem value="combo">Combo (Multiple Services)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Business Phone</Label>
                    <Input
                      id="businessPhone"
                      name="businessPhone"
                      type="tel"
                      value={formValues.businessPhone || ""}
                      onChange={(e) => updateField("businessPhone", e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessEmail">Business Email</Label>
                    <Input
                      id="businessEmail"
                      name="businessEmail"
                      type="email"
                      value={formValues.businessEmail || ""}
                      onChange={(e) => updateField("businessEmail", e.target.value)}
                      placeholder="info@yourbusiness.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Owner Account */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ownerFirstName">First Name</Label>
                    <Input
                      id="ownerFirstName"
                      name="ownerFirstName"
                      value={formValues.ownerFirstName || ""}
                      onChange={(e) => updateField("ownerFirstName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerLastName">Last Name</Label>
                    <Input
                      id="ownerLastName"
                      name="ownerLastName"
                      value={formValues.ownerLastName || ""}
                      onChange={(e) => updateField("ownerLastName", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerEmail">Email</Label>
                  <Input
                    id="ownerEmail"
                    name="ownerEmail"
                    type="email"
                    autoComplete="email"
                    value={formValues.ownerEmail || ""}
                    onChange={(e) => updateField("ownerEmail", e.target.value)}
                    required
                  />
                  {state.fieldErrors?.ownerEmail && (
                    <p className="text-xs text-destructive">{state.fieldErrors.ownerEmail}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerPhone">Phone (optional)</Label>
                  <Input
                    id="ownerPhone"
                    name="ownerPhone"
                    type="tel"
                    autoComplete="tel"
                    value={formValues.ownerPhone || ""}
                    onChange={(e) => updateField("ownerPhone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerPassword">Password</Label>
                  <Input
                    id="ownerPassword"
                    name="ownerPassword"
                    type="password"
                    value={formValues.ownerPassword || ""}
                    onChange={(e) => updateField("ownerPassword", e.target.value)}
                    minLength={8}
                    required
                    placeholder="At least 8 characters"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Location */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="locationName">Location Name</Label>
                  <Input
                    id="locationName"
                    name="locationName"
                    value={formValues.locationName || ""}
                    onChange={(e) => updateField("locationName", e.target.value)}
                    placeholder="Main Street Location"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formValues.address || ""}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="123 Main Street"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formValues.city || ""}
                      onChange={(e) => updateField("city", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formValues.state || ""}
                      onChange={(e) => updateField("state", e.target.value)}
                      placeholder="NY"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="zip">ZIP Code</Label>
                    <Input
                      id="zip"
                      name="zip"
                      value={formValues.zip || ""}
                      onChange={(e) => updateField("zip", e.target.value)}
                      placeholder="10001"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formValues.timezone}
                    onValueChange={(v) => updateField("timezone", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern</SelectItem>
                      <SelectItem value="America/Chicago">Central</SelectItem>
                      <SelectItem value="America/Denver">Mountain</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                      <SelectItem value="America/Anchorage">Alaska</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Hawaii</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numWashers">Number of Washers</Label>
                    <Input
                      id="numWashers"
                      name="numWashers"
                      type="number"
                      min={0}
                      value={formValues.numWashers}
                      onChange={(e) => updateField("numWashers", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="numDryers">Number of Dryers</Label>
                    <Input
                      id="numDryers"
                      name="numDryers"
                      type="number"
                      min={0}
                      value={formValues.numDryers}
                      onChange={(e) => updateField("numDryers", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Services & Theme */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label>Service Template</Label>
                  <p className="text-xs text-muted-foreground">
                    Choose a starting set of services. You can customize them later.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "standard", label: "Standard", desc: "5 popular services" },
                      { value: "premium", label: "Premium", desc: "8 services with express" },
                      { value: "minimal", label: "Minimal", desc: "2 essential services" },
                      { value: "custom", label: "Custom", desc: "Start from scratch" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => updateField("serviceTemplate", t.value)}
                        className={`rounded-lg border p-3 text-left transition-colors ${
                          formValues.serviceTemplate === t.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Theme Preset</Label>
                  <p className="text-xs text-muted-foreground">
                    Pick a visual style for your customer-facing site.
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[
                      { value: "clean_luxe", label: "Clean Luxe", desc: "Navy & Gold on Ivory", color: "bg-[#0D1B2A]" },
                      { value: "fresh_wave", label: "Fresh Wave", desc: "Blue tones, airy", color: "bg-[#2563EB]" },
                      { value: "eco_zen", label: "Eco Zen", desc: "Earthy forest green", color: "bg-[#2D4A3E]" },
                      { value: "neon_express", label: "Neon Express", desc: "Bold dark mode", color: "bg-[#0A0A0A]" },
                      { value: "soft_cloud", label: "Soft Cloud", desc: "Warm & friendly", color: "bg-[#E8927C]" },
                      { value: "metro_editorial", label: "Metro Editorial", desc: "Clean black & white", color: "bg-[#000000]" },
                    ].map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => updateField("themePreset", t.value)}
                        className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                          formValues.themePreset === t.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`h-8 w-8 shrink-0 rounded ${t.color}`} />
                        <div>
                          <p className="text-sm font-medium">{t.label}</p>
                          <p className="text-xs text-muted-foreground">{t.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex justify-between">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                >
                  Back
                </Button>
              ) : (
                <div />
              )}
              {step < 4 ? (
                <Button type="submit">Continue</Button>
              ) : (
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating your business..." : "Launch My Business"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
