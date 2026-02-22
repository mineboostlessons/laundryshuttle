"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  QrCode,
  Copy,
  Check,
  Mail,
  Share2,
  FileText,
  Printer,
  CheckCircle2,
  Circle,
  ExternalLink,
  Megaphone,
} from "lucide-react";
import type { LaunchKitData } from "./actions";

export function LaunchKitView({ data }: { data: LaunchKitData }) {
  const completedCount = data.checklist.filter((c) => c.done).length;
  const totalCount = data.checklist.length;
  const readinessPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Launch Kit</h1>
        <p className="mt-1 text-muted-foreground">
          Everything you need to launch and promote {data.businessName}.
        </p>
      </div>

      {/* Readiness Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Launch Readiness
            </h2>
            <p className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} items complete
            </p>
          </div>
          <Badge
            variant={readinessPercent === 100 ? "default" : "secondary"}
            className="text-lg px-4 py-1"
          >
            {readinessPercent}%
          </Badge>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-3 w-full rounded-full bg-muted">
          <div
            className="h-3 rounded-full bg-primary transition-all"
            style={{ width: `${readinessPercent}%` }}
            role="progressbar"
            aria-valuenow={readinessPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Launch readiness: ${readinessPercent}%`}
          />
        </div>
        {/* Checklist */}
        <ul className="mt-4 space-y-2">
          {data.checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-3 text-sm">
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
              )}
              <span
                className={
                  item.done ? "text-muted-foreground line-through" : "text-foreground"
                }
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* QR Code & Links */}
      <div className="grid gap-6 md:grid-cols-2">
        <QrCodeCard url={data.orderUrl} label="Ordering Page" />
        <QrCodeCard url={data.websiteUrl} label="Website" />
      </div>

      {/* Marketing Templates */}
      <div className="grid gap-6 md:grid-cols-2">
        <SocialMediaTemplate data={data} />
        <EmailAnnouncementTemplate data={data} />
      </div>

      {/* Printable Flyer */}
      <FlyerTemplate data={data} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// QR Code Card (uses a free QR code API for generation)
// ---------------------------------------------------------------------------
function QrCodeCard({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  // Use a data URL approach — generate a simple QR code via external API
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <QrCode className="h-5 w-5" aria-hidden="true" />
        {label} QR Code
      </h3>
      <div className="mt-4 flex items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt={`QR code for ${label}`}
          width={160}
          height={160}
          className="rounded-lg border"
        />
        <div className="flex-1 space-y-3">
          <div className="rounded-md bg-muted p-3">
            <p className="break-all text-sm font-mono text-foreground">{url}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? "Copied!" : "Copy URL"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Right-click the QR code to save it. Print it on flyers, business
            cards, or table tents.
          </p>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Social Media Post Templates
// ---------------------------------------------------------------------------
function SocialMediaTemplate({ data }: { data: LaunchKitData }) {
  const [copied, setCopied] = useState<string | null>(null);

  const posts = [
    {
      id: "launch",
      platform: "Facebook / Instagram",
      text: `We're excited to announce that ${data.businessName} now offers online ordering with pickup & delivery! Skip the laundromat — we'll pick up your dirty clothes and deliver them back fresh & folded. Order now: ${data.orderUrl}`,
    },
    {
      id: "convenience",
      platform: "Twitter / X",
      text: `No more laundry day hassle! ${data.businessName} picks up, washes, and delivers. Schedule your first pickup today: ${data.orderUrl}`,
    },
    {
      id: "promo",
      platform: "Any Platform",
      text: `Try our pickup & delivery service and get a special deal on your first order! Professional washing, folding, and delivery right to your door. Order at ${data.orderUrl}`,
    },
  ];

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Share2 className="h-5 w-5" aria-hidden="true" />
        Social Media Posts
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Copy and paste these ready-made posts.
      </p>
      <div className="mt-4 space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="rounded-md border p-3">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="secondary" className="text-xs">
                {post.platform}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(post.id, post.text)}
              >
                {copied === post.id ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                {copied === post.id ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {post.text}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Email Announcement Template
// ---------------------------------------------------------------------------
function EmailAnnouncementTemplate({ data }: { data: LaunchKitData }) {
  const [copied, setCopied] = useState(false);

  const subject = `${data.businessName} Now Offers Pickup & Delivery!`;
  const body = `Hi [Customer Name],

Great news! ${data.businessName} now offers a convenient laundry pickup & delivery service.

Here's how it works:
1. Schedule a pickup at ${data.orderUrl}
2. We pick up your laundry from your door
3. We wash, dry, and fold everything
4. We deliver it back fresh & clean

${data.services.length > 0 ? `Our services include: ${data.services.map((s) => s.name).join(", ")}.\n` : ""}${data.location ? `Visit us at ${data.location.address}, ${data.location.city}, ${data.location.state} ${data.location.zip}.\n` : ""}
Schedule your first pickup today: ${data.orderUrl}

Best regards,
${data.businessName}${data.phone ? `\n${data.phone}` : ""}`;

  function handleCopy() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <Mail className="h-5 w-5" aria-hidden="true" />
        Email Announcement
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Send this to your existing customer list.
      </p>
      <div className="mt-4 rounded-md border p-4 bg-muted/50">
        <p className="text-xs font-semibold text-muted-foreground mb-1">Subject:</p>
        <p className="text-sm font-medium text-foreground mb-3">{subject}</p>
        <p className="text-xs font-semibold text-muted-foreground mb-1">Body:</p>
        <p className="text-sm text-foreground whitespace-pre-wrap">{body}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 mr-1" />
        ) : (
          <Copy className="h-4 w-4 mr-1" />
        )}
        {copied ? "Copied!" : "Copy Email"}
      </Button>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Printable Flyer
// ---------------------------------------------------------------------------
function FlyerTemplate({ data }: { data: LaunchKitData }) {
  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data.orderUrl)}`;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${data.businessName} - Flyer</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 32px; }
          .header h1 { font-size: 36px; color: #1e3a8a; margin-bottom: 8px; }
          .header p { font-size: 18px; color: #6b7280; }
          .features { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 32px 0; }
          .feature { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .feature h3 { font-size: 16px; margin-bottom: 4px; }
          .feature p { font-size: 14px; color: #6b7280; }
          .cta { text-align: center; margin: 32px 0; padding: 24px; background: #eff6ff; border-radius: 12px; }
          .cta h2 { font-size: 24px; color: #1e3a8a; margin-bottom: 12px; }
          .cta img { margin: 12px auto; display: block; }
          .cta .url { font-size: 16px; font-weight: bold; color: #2563eb; word-break: break-all; }
          .contact { text-align: center; margin-top: 24px; font-size: 14px; color: #6b7280; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.businessName}</h1>
          <p>Professional Laundry Pickup & Delivery</p>
        </div>

        <div class="features">
          <div class="feature">
            <h3>Free Pickup & Delivery</h3>
            <p>We come to your door on your schedule.</p>
          </div>
          <div class="feature">
            <h3>24-Hour Turnaround</h3>
            <p>Get your clothes back fresh and fast.</p>
          </div>
          <div class="feature">
            <h3>Expert Care</h3>
            <p>Professional cleaning for all fabrics.</p>
          </div>
          <div class="feature">
            <h3>Satisfaction Guaranteed</h3>
            <p>Not happy? We'll re-clean for free.</p>
          </div>
        </div>

        ${data.services.length > 0 ? `
        <div style="margin: 24px 0;">
          <h2 style="font-size: 20px; margin-bottom: 12px;">Our Services</h2>
          <ul style="list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            ${data.services.map((s) => `<li style="padding: 8px 12px; background: #f9fafb; border-radius: 6px; font-size: 14px;">&#10003; ${s.name}</li>`).join("")}
          </ul>
        </div>
        ` : ""}

        <div class="cta">
          <h2>Order Online Today!</h2>
          <img src="${qrUrl}" alt="QR Code" width="160" height="160" />
          <p class="url">${data.orderUrl}</p>
        </div>

        <div class="contact">
          ${data.location ? `<p>${data.location.address}, ${data.location.city}, ${data.location.state} ${data.location.zip}</p>` : ""}
          ${data.phone ? `<p>Phone: ${data.phone}</p>` : ""}
          ${data.email ? `<p>Email: ${data.email}</p>` : ""}
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" aria-hidden="true" />
            Printable Flyer
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A ready-to-print flyer with your business info, services, and QR
            code. Great for door-to-door drops, in-store display, or community
            boards.
          </p>
        </div>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Flyer
        </Button>
      </div>

      {/* Preview */}
      <div className="mt-4 rounded-lg border bg-white p-8 text-black">
        <div className="text-center">
          <h4 className="text-2xl font-bold text-blue-900">
            {data.businessName}
          </h4>
          <p className="text-gray-600">
            Professional Laundry Pickup & Delivery
          </p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded border p-3">
            <p className="font-semibold">Free Pickup & Delivery</p>
          </div>
          <div className="rounded border p-3">
            <p className="font-semibold">24-Hour Turnaround</p>
          </div>
          <div className="rounded border p-3">
            <p className="font-semibold">Expert Care</p>
          </div>
          <div className="rounded border p-3">
            <p className="font-semibold">Satisfaction Guaranteed</p>
          </div>
        </div>
        <div className="mt-6 text-center rounded-lg bg-blue-50 p-4">
          <p className="font-semibold text-blue-900">Order Online Today!</p>
          <p className="mt-1 text-sm text-blue-600 break-all font-mono">
            {data.orderUrl}
          </p>
        </div>
      </div>
    </Card>
  );
}
