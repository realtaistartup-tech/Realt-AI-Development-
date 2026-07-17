import type { PriorityConfidence, UserPriorities } from "@/types";
import { PRIORITY_CATEGORIES } from "@/types";
import { priorityConfidenceSchema, userPrioritiesSchema } from "@/lib/validation";
import { AiServiceUnavailableError, isAiConfigured, requestStructuredCompletion } from "./client";

const SYSTEM_PROMPT = `You are the intake reasoning layer for Realt AI, a calm and trustworthy housing decision assistant.
Read the person's free-text description of what they want in a home and extract structured priorities.
Only extract what the person actually stated or clearly implied. Do not invent numbers, amenities, or preferences
they did not mention. If something is not mentioned, use the provided defaults instead of guessing.

You must also return a "confidence" object with a boolean for each of budget, commute, space, and weights.
Mark a field true only if the person actually stated that information themselves (an amount, a time, a count,
an explicit preference about what matters most). Mark it false if you had to fall back to a default or infer it
loosely — even if the value you returned is plausible, confidence reflects whether they actually said it, not
whether your guess seems reasonable. This drives whether Realt AI asks a short follow-up question, so it must be
honest, not optimistic.`;

const PRIORITIES_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "budgetMin",
    "budgetMax",
    "commuteMaxMinutes",
    "commuteMode",
    "minBedrooms",
    "minBathrooms",
    "mustHaves",
    "dealBreakers",
    "lifestyleTags",
    "weights",
    "confidence",
  ],
  properties: {
    budgetMin: { type: "number" },
    budgetMax: { type: "number" },
    commuteMaxMinutes: { type: "number" },
    commuteMode: { type: "string", enum: ["drive", "transit", "walk", "bike"] },
    minBedrooms: { type: "number" },
    minBathrooms: { type: "number" },
    mustHaves: { type: "array", items: { type: "string" } },
    dealBreakers: { type: "array", items: { type: "string" } },
    lifestyleTags: { type: "array", items: { type: "string" } },
    weights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "importance"],
        properties: {
          category: { type: "string", enum: PRIORITY_CATEGORIES },
          importance: { type: "number" },
        },
      },
    },
    confidence: {
      type: "object",
      additionalProperties: false,
      required: ["budget", "commute", "space", "weights"],
      properties: {
        budget: { type: "boolean" },
        commute: { type: "boolean" },
        space: { type: "boolean" },
        weights: { type: "boolean" },
      },
    },
  },
} as const;

const FALLBACK_DEFAULTS: UserPriorities = {
  budgetMin: 0,
  budgetMax: 500_000,
  commuteMaxMinutes: 45,
  commuteMode: "drive",
  minBedrooms: 1,
  minBathrooms: 1,
  mustHaves: [],
  dealBreakers: [],
  lifestyleTags: [],
  weights: PRIORITY_CATEGORIES.map((category) => ({ category, importance: 3 })),
};

export interface HeuristicExtraction {
  priorities: UserPriorities;
  /** Which of the essential fields were actually found in the text, as
   * opposed to resting on FALLBACK_DEFAULTS — this is what drives whether
   * the guided onboarding flow asks a follow-up question. */
  confidence: PriorityConfidence;
}

/**
 * Deterministic, dependency-free extraction used whenever the AI service is
 * unavailable (no API key configured, or the upstream call failed). It never
 * fabricates values it can't find in the text — anything not recognized
 * falls back to a stated default so the resulting priorities stay honest
 * about what the user actually said. Sweden is the initial market
 * (CLAUDE.md), so the keyword sets below recognize common Swedish phrasing
 * alongside English, not just English.
 */
export function extractPrioritiesHeuristically(freeText: string): HeuristicExtraction {
  const text = freeText.toLowerCase();
  const priorities: UserPriorities = structuredClone(FALLBACK_DEFAULTS);

  const budgetMatch = text.match(/\$?\s?(\d{2,3}(?:,\d{3})+|\d{5,7})/);
  if (budgetMatch) {
    const amount = Number(budgetMatch[1].replace(/,/g, ""));
    if (Number.isFinite(amount) && amount > 0) {
      priorities.budgetMax = amount;
      priorities.budgetMin = Math.round(amount * 0.7);
    }
  }

  const bedroomMatch = text.match(/(\d+)\s*(?:bed|bedroom|br|sovrum)/);
  if (bedroomMatch) {
    priorities.minBedrooms = Number(bedroomMatch[1]);
  }

  const bathroomMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba|badrum)/);
  if (bathroomMatch) {
    priorities.minBathrooms = Number(bathroomMatch[1]);
  }

  const commuteMatch = text.match(/(\d+)\s*(?:min|minute)/);
  if (commuteMatch) {
    priorities.commuteMaxMinutes = Number(commuteMatch[1]);
  }

  if (text.includes("transit") || text.includes("train") || text.includes("bus")) {
    priorities.commuteMode = "transit";
  } else if (text.includes("bike") || text.includes("cycling")) {
    priorities.commuteMode = "bike";
  } else if (text.includes("walk")) {
    priorities.commuteMode = "walk";
  }

  const lifestyleKeywords = [
    "quiet",
    "walkable",
    "family-friendly",
    "urban",
    "suburban",
    "nightlife",
    "near-parks",
    "city-center",
    "nature",
  ];
  priorities.lifestyleTags = lifestyleKeywords.filter((keyword) =>
    text.includes(keyword.replace("-", " ")),
  );

  // Additional signals used by detectPriorityConflicts to surface hidden
  // trade-offs (pets vs. rental restrictions, WFH vs. layout, etc.). These
  // only ever get added when the exact phrase is present in what the person
  // wrote — never inferred or guessed, consistent with the rest of this
  // deterministic fallback.
  if (/\bpets?\b/.test(text) || /\bdogs?\b/.test(text) || /\bcats?\b/.test(text)) {
    priorities.lifestyleTags.push("pets");
  }
  if (
    text.includes("home office") ||
    text.includes("work from home") ||
    text.includes("remote work") ||
    /\bwfh\b/.test(text)
  ) {
    priorities.lifestyleTags.push("home-office");
  }
  if (text.includes("wheelchair") || text.includes("step-free") || text.includes("step free") || text.includes("accessib")) {
    priorities.lifestyleTags.push("accessible");
  }
  if (
    text.includes("historic") ||
    text.includes("character") ||
    text.includes("period property") ||
    text.includes("old building") ||
    text.includes("pre-war")
  ) {
    priorities.lifestyleTags.push("historic-character");
  }
  if (
    text.includes("flexible") ||
    text.includes("short-term") ||
    text.includes("short term") ||
    text.includes("may relocate") ||
    text.includes("might relocate")
  ) {
    priorities.lifestyleTags.push("flexible-tenure");
  }
  if (
    text.includes("forever home") ||
    text.includes("settle down") ||
    text.includes("long-term home") ||
    text.includes("buying")
  ) {
    priorities.lifestyleTags.push("long-term-ownership");
  }
  if (
    text.includes("growing family") ||
    text.includes("planning a family") ||
    text.includes("more kids") ||
    text.includes("expecting") ||
    text.includes("want kids") ||
    text.includes("future kids")
  ) {
    priorities.lifestyleTags.push("family-growth-planned");
  }
  if (text.includes("parking") || text.includes("garage")) {
    priorities.mustHaves.push("parking");
  }

  const schoolsMentioned = text.includes("school") || text.includes("skol");
  if (schoolsMentioned) {
    priorities.weights = priorities.weights.map((w) =>
      w.category === "schools" ? { ...w, importance: 5 } : w,
    );
  }
  const safetyMentioned =
    text.includes("safe") || text.includes("safety") || text.includes("säker") || text.includes("trygg");
  if (safetyMentioned) {
    priorities.weights = priorities.weights.map((w) =>
      w.category === "safety" ? { ...w, importance: 5 } : w,
    );
  }
  const budgetIsPriority =
    text.includes("tight budget") ||
    text.includes("affordable") ||
    text.includes("cheap") ||
    text.includes("billig") ||
    text.includes("prisvärd");
  if (budgetIsPriority) {
    priorities.weights = priorities.weights.map((w) =>
      w.category === "budget" ? { ...w, importance: 5 } : w,
    );
  }

  return {
    priorities,
    confidence: {
      budget: Boolean(budgetMatch),
      commute: Boolean(commuteMatch),
      space: Boolean(bedroomMatch),
      weights: schoolsMentioned || safetyMentioned || budgetIsPriority,
    },
  };
}

export interface ExtractionResult {
  priorities: UserPriorities;
  source: "ai" | "heuristic";
  confidence: PriorityConfidence;
}

/**
 * Understands the user's free-text description of what they want (step 1 of
 * the Realt Thinking Framework). Prefers the AI model for genuine natural
 * language understanding, but always falls back to the deterministic parser
 * rather than failing the request, and always validates whatever comes back
 * against the strict schema before trusting it. Alongside the priorities
 * themselves, this reports per-field confidence — the signal the guided
 * onboarding flow (features/onboarding) uses to decide whether it actually
 * understands the user yet, or needs to ask one short follow-up question.
 */
export async function extractPriorities(freeText: string): Promise<ExtractionResult> {
  if (isAiConfigured()) {
    try {
      const raw = await requestStructuredCompletion<UserPriorities & { confidence: PriorityConfidence }>({
        systemPrompt: SYSTEM_PROMPT,
        userInput: freeText,
        jsonSchema: PRIORITIES_JSON_SCHEMA,
        schemaName: "user_priorities",
      });
      const validated = userPrioritiesSchema.parse(raw);
      const confidence = priorityConfidenceSchema.parse(raw.confidence);
      return { priorities: validated, source: "ai", confidence };
    } catch (error) {
      if (!(error instanceof AiServiceUnavailableError)) {
        console.error("AI priority extraction failed validation", error);
      }
    }
  }

  const { priorities, confidence } = extractPrioritiesHeuristically(freeText);
  return { priorities, source: "heuristic", confidence };
}
