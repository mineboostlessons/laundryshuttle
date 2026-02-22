"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/ui/star-rating";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare, ExternalLink } from "lucide-react";
import { submitReview } from "../../actions";

interface ReviewFormProps {
  orderId: string;
  tenantSlug: string;
  googleReviewUrl?: string;
}

export function ReviewForm({
  orderId,
  tenantSlug,
  googleReviewUrl,
}: ReviewFormProps) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [showGooglePrompt, setShowGooglePrompt] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        const result = await submitReview({ orderId, rating, text: text || undefined });
        setSubmitted(true);
        if (result.routeToGoogle && googleReviewUrl) {
          setShowGooglePrompt(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to submit review");
      }
    });
  };

  if (submitted && !showGooglePrompt) {
    return (
      <div className="rounded-lg border p-4 text-center space-y-2">
        <p className="font-medium">Thank you for your review!</p>
        <StarRating value={rating} readOnly size="sm" className="justify-center" />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <MessageSquare className="h-4 w-4 mr-2" />
          Leave a Review
        </Button>
      </DialogTrigger>
      <DialogContent>
        {showGooglePrompt ? (
          <>
            <DialogHeader>
              <DialogTitle>Thank you for the great rating!</DialogTitle>
              <DialogDescription>
                We&apos;d love if you could share your experience on Google too.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <StarRating value={rating} readOnly className="justify-center" />
              {googleReviewUrl && (
                <Button
                  className="w-full"
                  onClick={() => window.open(googleReviewUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Leave a Google Review
                </Button>
              )}
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Maybe Later
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>How was your experience?</DialogTitle>
              <DialogDescription>
                Rate your order and let us know how we did.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex flex-col items-center gap-2">
                <StarRating value={rating} onChange={setRating} size="lg" />
                <p className="text-sm text-muted-foreground">
                  {rating === 0 && "Tap a star to rate"}
                  {rating === 1 && "Poor"}
                  {rating === 2 && "Fair"}
                  {rating === 3 && "Good"}
                  {rating === 4 && "Great"}
                  {rating === 5 && "Excellent!"}
                </p>
              </div>

              <Textarea
                placeholder="Tell us about your experience (optional)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={2000}
              />

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isPending || rating === 0}
                >
                  {isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
