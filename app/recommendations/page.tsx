import type { Metadata } from "next";

import { RecommendationsList } from "@/features/recommendations/recommendations-list";

export const metadata: Metadata = {
  title: "Your matches",
  description: "Properties matched and explained against your stated priorities.",
};

export default function RecommendationsPage() {
  return <RecommendationsList />;
}
