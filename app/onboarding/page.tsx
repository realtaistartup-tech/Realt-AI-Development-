import type { Metadata } from "next";

import { PriorityIntakeFlow } from "@/features/onboarding/priority-intake-flow";

export const metadata: Metadata = {
  title: "Tell us what you're looking for",
  description: "Describe your priorities so Realt AI can understand what matters to you.",
};

export default function OnboardingPage() {
  return <PriorityIntakeFlow />;
}
