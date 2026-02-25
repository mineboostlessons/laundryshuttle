import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail, wrapInEmailLayout } from "@/lib/ses";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  businessName: z.string().min(1, "Business name is required").max(200),
  phone: z.string().min(1, "Phone number is required").max(30),
});

/** 3 requests per 10 minutes per IP */
const CONTACT_RATE_LIMIT = { limit: 3, windowSeconds: 600 };

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = rateLimit(`contact:${ip}`, CONTACT_RATE_LIMIT);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please try again later." },
      { status: 429, headers: rateLimitHeaders(rl) }
    );
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "Validation failed";
    return NextResponse.json(
      { success: false, error: firstError },
      { status: 400 }
    );
  }

  const { name, email, businessName, phone } = parsed.data;

  // Build email
  const emailBody = `
    <h2 style="margin:0 0 16px;color:#0D1B2A;font-size:20px;">New Demo Request</h2>
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;width:140px;"><strong>Name</strong></td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#0D1B2A;">${escapeHtml(name)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;"><strong>Email</strong></td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#0D1B2A;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td>
      </tr>
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666;"><strong>Business</strong></td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#0D1B2A;">${escapeHtml(businessName)}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;color:#666;"><strong>Phone</strong></td>
        <td style="padding:8px 12px;color:#0D1B2A;"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></td>
      </tr>
    </table>
    <p style="margin:24px 0 0;color:#999;font-size:13px;">
      Submitted from the Laundry Shuttle website.
    </p>
  `;

  const html = wrapInEmailLayout({
    body: emailBody,
    businessName: "Laundry Shuttle",
    preheader: `Demo request from ${name} at ${businessName}`,
  });

  const result = await sendEmail({
    to: "support@laundryshuttle.com",
    subject: `Demo Request: ${businessName} — ${name}`,
    html,
    replyTo: email,
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
