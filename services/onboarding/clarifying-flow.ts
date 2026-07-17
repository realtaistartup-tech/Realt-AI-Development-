import type { PriorityConfidence, PriorityFieldKey } from "@/types";
import { PRIORITY_FIELD_ORDER } from "@/types";

/** There are exactly 4 askable fields (see types/onboarding.ts) — this is
 * the natural cap, not an arbitrary limit. It exists as a named constant so
 * a future field addition is a deliberate decision, not a silent change in
 * how many questions someone can be asked. */
export const MAX_FOLLOW_UP_QUESTIONS = PRIORITY_FIELD_ORDER.length;

/**
 * The core "does the AI know enough yet" decision for the guided onboarding
 * conversation (features/onboarding). Picks the single highest-priority
 * field that's still low-confidence and hasn't already been asked about —
 * never more than one at a time, per CLAUDE.md's "avoid overwhelming the
 * user." Returns null once every field is either confident or has already
 * been asked (answered or explicitly skipped), which is the caller's signal
 * to move on to the final review.
 */
export function nextClarifyingField(
  confidence: PriorityConfidence,
  askedFields: PriorityFieldKey[],
): PriorityFieldKey | null {
  if (askedFields.length >= MAX_FOLLOW_UP_QUESTIONS) return null;
  return (
    PRIORITY_FIELD_ORDER.find((field) => !confidence[field] && !askedFields.includes(field)) ?? null
  );
}

/** Whether the conversation has gathered enough to move on — i.e. there is
 * no more relevant follow-up question to ask right now. */
export function isReadyForReview(
  confidence: PriorityConfidence,
  askedFields: PriorityFieldKey[],
): boolean {
  return nextClarifyingField(confidence, askedFields) === null;
}
