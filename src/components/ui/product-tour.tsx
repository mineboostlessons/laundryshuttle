"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { TourStep } from "@/lib/tours";

interface ProductTourProps {
  tourSlug: string;
  steps: TourStep[];
  initialStep?: number;
  onComplete: () => void;
  onDismiss: () => void;
  onStepChange?: (step: number) => void;
}

interface TooltipPosition {
  top: number;
  left: number;
  arrowDirection: "top" | "bottom" | "left" | "right";
}

function getTooltipPosition(
  rect: DOMRect,
  placement: TourStep["placement"],
  tooltipWidth: number,
  tooltipHeight: number
): TooltipPosition {
  const OFFSET = 12;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  let top = 0;
  let left = 0;
  let arrowDirection: TooltipPosition["arrowDirection"] = "top";

  switch (placement) {
    case "bottom":
      top = rect.bottom + OFFSET;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      arrowDirection = "top";
      break;
    case "top":
      top = rect.top - tooltipHeight - OFFSET;
      left = rect.left + rect.width / 2 - tooltipWidth / 2;
      arrowDirection = "bottom";
      break;
    case "right":
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.right + OFFSET;
      arrowDirection = "left";
      break;
    case "left":
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - OFFSET;
      arrowDirection = "right";
      break;
    case "center":
      top = viewportH / 2 - tooltipHeight / 2;
      left = viewportW / 2 - tooltipWidth / 2;
      arrowDirection = "top";
      break;
  }

  // Clamp to viewport
  left = Math.max(12, Math.min(left, viewportW - tooltipWidth - 12));
  top = Math.max(12, Math.min(top, viewportH - tooltipHeight - 12));

  return { top, left, arrowDirection };
}

export function ProductTour({
  steps,
  initialStep = 0,
  onComplete,
  onDismiss,
  onStepChange,
}: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  const positionTooltip = useCallback(() => {
    if (!step) return;

    if (step.placement === "center" || !step.target) {
      setSpotlightRect(null);
      const tooltipW = 360;
      const tooltipH = 200;
      setTooltipPos(
        getTooltipPosition(
          new DOMRect(0, 0, 0, 0),
          "center",
          tooltipW,
          tooltipH
        )
      );
      return;
    }

    const el = document.querySelector(step.target);
    if (!el) {
      // Element not found — show centered
      setSpotlightRect(null);
      setTooltipPos({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 180,
        arrowDirection: "top",
      });
      return;
    }

    const rect = el.getBoundingClientRect();
    const padding = step.spotlightPadding ?? 8;
    const paddedRect = new DOMRect(
      rect.x - padding,
      rect.y - padding,
      rect.width + padding * 2,
      rect.height + padding * 2
    );
    setSpotlightRect(paddedRect);

    // Scroll element into view
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });

    // Position tooltip after a brief delay for scroll
    requestAnimationFrame(() => {
      const tooltipW = tooltipRef.current?.offsetWidth ?? 360;
      const tooltipH = tooltipRef.current?.offsetHeight ?? 200;
      const updatedRect = el.getBoundingClientRect();
      const updatedPaddedRect = new DOMRect(
        updatedRect.x - padding,
        updatedRect.y - padding,
        updatedRect.width + padding * 2,
        updatedRect.height + padding * 2
      );
      setTooltipPos(
        getTooltipPosition(
          updatedPaddedRect,
          step.placement,
          tooltipW,
          tooltipH
        )
      );
    });
  }, [step]);

  useEffect(() => {
    positionTooltip();

    const handleResize = () => positionTooltip();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [positionTooltip]);

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      const next = currentStep + 1;
      setCurrentStep(next);
      onStepChange?.(next);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      onStepChange?.(prev);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onDismiss();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentStep, isLast]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!mounted || !step) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999]"
      role="dialog"
      aria-label="Product Tour"
      aria-modal="true"
    >
      {/* Overlay with spotlight cutout */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightRect && (
              <rect
                x={spotlightRect.x}
                y={spotlightRect.y}
                width={spotlightRect.width}
                height={spotlightRect.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tour-spotlight-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={onDismiss}
        />
      </svg>

      {/* Spotlight border ring */}
      {spotlightRect && (
        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 transition-all duration-300"
          style={{
            top: spotlightRect.y,
            left: spotlightRect.x,
            width: spotlightRect.width,
            height: spotlightRect.height,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          className="absolute z-[10000] w-[360px] rounded-lg border bg-background p-4 shadow-xl transition-all duration-300"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step content */}
          <div className="pr-6">
            <h3 className="text-sm font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {step.content}
            </p>
          </div>

          {/* Navigation */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} of {steps.length}
            </span>
            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button variant="ghost" size="sm" onClick={handlePrev}>
                  <ChevronLeft className="mr-1 h-3 w-3" />
                  Back
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {isLast ? (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    Done
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="ml-1 h-3 w-3" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="mt-3 flex justify-center gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === currentStep
                    ? "bg-primary"
                    : i < currentStep
                      ? "bg-primary/40"
                      : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
