import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadToR2, uploadDeliveryPhoto, uploadSignature } from "@/lib/r2";

const ALLOWED_UPLOAD_TYPES: Record<string, { roles: string[]; folder: string; contentType: string; ext: string }> = {
  delivery_photo: { roles: ["driver"], folder: "delivery-photos", contentType: "image/jpeg", ext: ".jpg" },
  signature: { roles: ["driver"], folder: "signatures", contentType: "image/png", ext: ".png" },
  logo: { roles: ["owner", "manager", "platform_admin"], folder: "logos", contentType: "image/png", ext: ".png" },
  block_image: { roles: ["owner", "manager"], folder: "block-images", contentType: "image/jpeg", ext: ".jpg" },
};

/**
 * POST /api/upload
 * Upload images to R2.
 * Expects multipart/form-data with:
 *   - file: the image file
 *   - type: "delivery_photo" | "signature" | "logo" | "block_image"
 */
export async function POST(request: NextRequest) {
  // Pre-flight: check R2 configuration before doing anything
  const missingVars = [
    !process.env.R2_ACCOUNT_ID && "R2_ACCOUNT_ID",
    !process.env.R2_ACCESS_KEY_ID && "R2_ACCESS_KEY_ID",
    !process.env.R2_SECRET_ACCESS_KEY && "R2_SECRET_ACCESS_KEY",
    !process.env.R2_PUBLIC_URL && "R2_PUBLIC_URL",
  ].filter(Boolean);

  if (missingVars.length > 0) {
    return NextResponse.json(
      { success: false, error: `Storage not configured. Missing: ${missingVars.join(", ")}` },
      { status: 500 }
    );
  }

  const session = await auth();
  if (!session?.user?.tenantId && session?.user?.role !== "platform_admin") {
    return NextResponse.json(
      { success: false, error: "Unauthorized — no session or tenant" },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (!type || !ALLOWED_UPLOAD_TYPES[type]) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${Object.keys(ALLOWED_UPLOAD_TYPES).join(", ")}` },
        { status: 400 }
      );
    }

    const uploadConfig = ALLOWED_UPLOAD_TYPES[type];
    if (!uploadConfig.roles.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: `Forbidden — role "${session.user.role}" not allowed for "${type}"` },
        { status: 403 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "File too large. Max 10MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect content type from file
    const contentType = file.type || uploadConfig.contentType;
    const ext = file.name?.match(/\.\w+$/)?.[0] || uploadConfig.ext;

    let url: string;
    if (type === "delivery_photo") {
      url = await uploadDeliveryPhoto(buffer, session.user.tenantId!);
    } else if (type === "signature") {
      url = await uploadSignature(buffer, session.user.tenantId!);
    } else {
      const tenantId = session.user.tenantId || "platform";
      url = await uploadToR2(buffer, tenantId, uploadConfig.folder, contentType, ext);
    }

    return NextResponse.json({ success: true, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Upload error:", message, error);

    return NextResponse.json(
      { success: false, error: `Upload failed: ${message}` },
      { status: 500 }
    );
  }
}
