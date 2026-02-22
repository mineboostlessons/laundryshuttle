import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadDeliveryPhoto, uploadSignature } from "@/lib/r2";

/**
 * POST /api/upload
 * Upload a delivery photo or signature to R2.
 * Expects multipart/form-data with:
 *   - file: the image file
 *   - type: "delivery_photo" | "signature"
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (session.user.role !== "driver") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
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

    if (!type || !["delivery_photo", "signature"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid type. Must be delivery_photo or signature" },
        { status: 400 }
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

    let url: string;
    if (type === "delivery_photo") {
      url = await uploadDeliveryPhoto(buffer, session.user.tenantId);
    } else {
      url = await uploadSignature(buffer, session.user.tenantId);
    }

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Upload failed" },
      { status: 500 }
    );
  }
}
