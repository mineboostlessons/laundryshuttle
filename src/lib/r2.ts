import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// =============================================================================
// Cloudflare R2 (S3-compatible) Upload Helpers
// =============================================================================

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "laundryshuttle";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate a unique key for a file upload.
 */
function generateKey(tenantId: string, folder: string, ext: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  return `${tenantId}/${folder}/${date}/${randomUUID()}${ext}`;
}

/**
 * Upload a file buffer directly to R2.
 */
export async function uploadToR2(
  buffer: Buffer,
  tenantId: string,
  folder: string,
  contentType: string,
  ext: string
): Promise<string> {
  const key = generateKey(tenantId, folder, ext);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Generate a presigned URL for client-side direct upload.
 */
export async function getPresignedUploadUrl(
  tenantId: string,
  folder: string,
  contentType: string,
  ext: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const key = generateKey(tenantId, folder, ext);

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

  return {
    uploadUrl,
    publicUrl: `${R2_PUBLIC_URL}/${key}`,
  };
}

/**
 * Upload a delivery photo to R2.
 */
export async function uploadDeliveryPhoto(
  buffer: Buffer,
  tenantId: string
): Promise<string> {
  return uploadToR2(buffer, tenantId, "delivery-photos", "image/jpeg", ".jpg");
}

/**
 * Upload a signature image to R2.
 */
export async function uploadSignature(
  buffer: Buffer,
  tenantId: string
): Promise<string> {
  return uploadToR2(buffer, tenantId, "signatures", "image/png", ".png");
}
