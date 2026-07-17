/**
 * The subset of UserPriorities that's essential to a meaningful match
 * score and worth a guided follow-up question if left uncertain.
 * mustHaves/dealBreakers/lifestyleTags are deliberately excluded — they're
 * genuinely optional (an empty list is a valid answer, not a gap), so
 * asking about them unprompted would violate "never ask unnecessary
 * questions."
 */
export type PriorityFieldKey = "budget" | "commute" | "space" | "weights";

export const PRIORITY_FIELD_ORDER: PriorityFieldKey[] = ["budget", "commute", "space", "weights"];

/** True means the person actually stated this (or confirmed it via a
 * follow-up question); false means it's resting on an unconfirmed default. */
export interface PriorityConfidence {
  budget: boolean;
  commute: boolean;
  space: boolean;
  weights: boolean;
}
