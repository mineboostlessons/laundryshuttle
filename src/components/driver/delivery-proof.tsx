"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Pen, Check, RotateCcw, Loader2 } from "lucide-react";

interface DeliveryProofProps {
  onSubmit: (data: {
    deliveryPhotoUrl?: string;
    signatureUrl?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function DeliveryProof({ onSubmit, loading }: DeliveryProofProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Signature canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    initCanvas();
  }, [initCanvas]);

  function getCanvasCoords(
    e: React.MouseEvent | React.TouchEvent
  ): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0];
      if (!touch) return null;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleDrawStart(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    isDrawing.current = true;
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  }

  function handleDrawMove(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing.current) return;
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  }

  function handleDrawEnd() {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    // Save signature data URL
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL("image/png"));
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl(null);
  }

  function handlePhotoCapture(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setPhotoPreview(null);
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function uploadFile(
    file: File | Blob,
    type: "delivery_photo" | "signature"
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? "Upload failed");
    return data.url;
  }

  async function handleSubmit() {
    setError(null);
    setUploading(true);

    try {
      let deliveryPhotoUrl: string | undefined;
      let signatureUrl: string | undefined;

      // Upload photo if captured
      if (photoFile) {
        deliveryPhotoUrl = await uploadFile(photoFile, "delivery_photo");
      }

      // Upload signature if drawn
      if (signatureDataUrl) {
        const res = await fetch(signatureDataUrl);
        const blob = await res.blob();
        signatureUrl = await uploadFile(blob, "signature");
      }

      await onSubmit({ deliveryPhotoUrl, signatureUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete delivery");
    } finally {
      setUploading(false);
    }
  }

  const isSubmitting = uploading || loading;

  return (
    <div className="space-y-4">
      {/* Photo Capture */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            Delivery Photo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Delivery photo"
                className="w-full rounded-lg object-cover max-h-64"
              />
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={removePhoto}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Retake
              </Button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full h-32 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Take delivery photo
                  </span>
                </div>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature Pad */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pen className="h-4 w-4" />
              Customer Signature
            </CardTitle>
            {signatureDataUrl && (
              <Button variant="ghost" size="sm" onClick={clearSignature}>
                <RotateCcw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg bg-white touch-none">
            <canvas
              ref={canvasRef}
              className="w-full h-40 cursor-crosshair"
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
              onMouseLeave={handleDrawEnd}
              onTouchStart={handleDrawStart}
              onTouchMove={handleDrawMove}
              onTouchEnd={handleDrawEnd}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Sign above with finger or mouse
          </p>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Submit */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Completing...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            Complete Delivery
          </>
        )}
      </Button>
    </div>
  );
}
