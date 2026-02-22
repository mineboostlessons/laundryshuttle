import { Suspense } from "react";
import { OnboardingWizard } from "./onboarding-wizard";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="h-[600px]" />}>
      <OnboardingWizard />
    </Suspense>
  );
}
