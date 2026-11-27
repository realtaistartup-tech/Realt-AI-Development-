import type { PriorityConfidence, UserPriorities } from "@/types";

const STORAGE_KEY = "realt-ai:priorities";

/** Used whenever confidence wasn't tracked for this session — a saved
 * search loaded from a past visit, or a pre-existing sessionStorage entry
 * from before confidence was introduced. Treating it as fully confirmed is
 * the honest default: the user explicitly reviewed and saved those exact
 * values, which is itself a confirmation, even though the original
 * per-field signal wasn't persisted alongside it. */
const FULLY_CONFIRMED: PriorityConfidence = {
  budget: true,
  commute: true,
  space: true,
  weights: true,
};

interface StoredPriorities {
  priorities: UserPriorities;
  confidence: PriorityConfidence;
}

/**
 * Session-scoped persistence for the priorities (and how confidently they
 * were established) a user has already worked through. Supabase is planned
 * for durable, cross-device storage; until then this keeps the onboarding
 * -> decision report handoff working without a backend, and never touches
 * anything beyond this browser tab.
 */
export function savePriorities(priorities: UserPriorities, confidence?: PriorityConfidence): void {
  if (typeof window === "undefined") return;
  const stored: StoredPriorities = { priorities, confidence: confidence ?? FULLY_CONFIRMED };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function loadPriorities(): StoredPriorities | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredPriorities> & { budgetMin?: number };
    // Back-compat: earlier versions stored the UserPriorities object
    // directly at the top level, with no wrapping or confidence.
    if (parsed && typeof parsed.budgetMin === "number") {
      return { priorities: parsed as unknown as UserPriorities, confidence: FULLY_CONFIRMED };
    }
    if (!parsed?.priorities) return null;
    return { priorities: parsed.priorities, confidence: parsed.confidence ?? FULLY_CONFIRMED };
  } catch {
    return null;
  }
}

export function clearPriorities(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}

const CONTEXT_KEY = "realt-ai:report-context";

/** What the assistant chat learned beyond the scored priorities: shown back in the Decision Report. */
export interface ReportContext {
  tenure?: "rent" | "buy";
  place?: string;
  /** Lifestyle answers keyed by question (see features/assistant), in the person's own words. */
  profile?: Record<string, string>;
  householdSize?: number | null;
}

export function saveReportContext(context: ReportContext): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
}

export function loadReportContext(): ReportContext | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CONTEXT_KEY);
    return raw ? (JSON.parse(raw) as ReportContext) : null;
  } catch {
    return null;
  }
}
