"use client";

import { useState, useEffect } from "react";
import { ProductTour } from "@/components/ui/product-tour";
import type { TourStep } from "@/lib/tours";
import {
  completeTour,
  dismissTour,
  getTourProgress,
  updateTourStep,
} from "@/app/(tenant)/dashboard/tour-actions";

interface TourTriggerProps {
  tourSlug: string;
  steps: TourStep[];
  autoStart?: boolean;
}

export function TourTrigger({
  tourSlug,
  steps,
  autoStart = false,
}: TourTriggerProps) {
  const [isActive, setIsActive] = useState(false);
  const [initialStep, setInitialStep] = useState(0);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!autoStart) return;

    getTourProgress(tourSlug).then((progress) => {
      setChecked(true);
      if (!progress) {
        // Never started — auto-start the tour
        setInitialStep(0);
        setIsActive(true);
      } else if (!progress.isCompleted && !progress.dismissedAt) {
        // In progress — resume from last step
        setInitialStep(progress.completedSteps);
        setIsActive(true);
      }
    });
  }, [tourSlug, autoStart]);

  const handleComplete = async () => {
    setIsActive(false);
    await completeTour(tourSlug, steps.length);
  };

  const handleDismiss = async () => {
    setIsActive(false);
    await dismissTour(tourSlug, steps.length);
  };

  const handleStepChange = async (step: number) => {
    await updateTourStep(tourSlug, step, steps.length);
  };

  // Manual trigger for restart
  if (!autoStart && !isActive) {
    return null;
  }

  if (autoStart && !checked) {
    return null;
  }

  if (!isActive) {
    return null;
  }

  return (
    <ProductTour
      tourSlug={tourSlug}
      steps={steps}
      initialStep={initialStep}
      onComplete={handleComplete}
      onDismiss={handleDismiss}
      onStepChange={handleStepChange}
    />
  );
}

interface TourRestartButtonProps {
  tourSlug: string;
  steps: TourStep[];
  children: React.ReactNode;
}

export function TourRestartButton({
  tourSlug,
  steps,
  children,
}: TourRestartButtonProps) {
  const [isActive, setIsActive] = useState(false);

  const handleComplete = async () => {
    setIsActive(false);
    await completeTour(tourSlug, steps.length);
  };

  const handleDismiss = async () => {
    setIsActive(false);
  };

  return (
    <>
      <button
        onClick={() => setIsActive(true)}
        className="inline-flex items-center"
      >
        {children}
      </button>
      {isActive && (
        <ProductTour
          tourSlug={tourSlug}
          steps={steps}
          initialStep={0}
          onComplete={handleComplete}
          onDismiss={handleDismiss}
        />
      )}
    </>
  );
}
