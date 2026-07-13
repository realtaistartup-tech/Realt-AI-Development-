import type { UserPriorities } from "@/types";
import { PRIORITY_CATEGORIES } from "@/types";
import { userPrioritiesSchema } from "@/lib/validation";
import { AiServiceUnavailableError, isAiConfigured, requestStructuredCompletion } from "./client";

const SYSTEM_PROMPT = `You are the intake reasoning layer for Realt AI, a calm and trustworthy housing decision assistant.
Read the person's free-text description of what they want in a home and extract structured priorities.
Only extract what the person actually stated or clearly implied. Do not invent numbers, amenities, or preferences
they did not mention. If something is not mentioned, use the provided defaults instead of guessing.`;

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

/**
 * Deterministic, dependency-free extraction used whenever the AI service is
 * unavailable (no API key configured, or the upstream call failed). It never
 * fabricates values it can't find in the text — anything not recognized
 * falls back to a stated default so the resulting priorities stay honest
 * about what the user actually said.
 */
export function extractPrioritiesHeuristically(freeText: string): UserPriorities {
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

  const bedroomMatch = text.match(/(\d+)\s*(?:bed|bedroom|br)/);
  if (bedroomMatch) {
    priorities.minBedrooms = Number(bedroomMatch[1]);
  }

  const bathroomMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)/);
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
  ];
  priorities.lifestyleTags = lifestyleKeywords.filter((keyword) =>
    text.includes(keyword.replace("-", " ")),
  );

  if (text.includes("school")) {
    priorities.weights = priorities.weights.map((w) =>
      w.category === "schools" ? { ...w, importance: 5 } : w,
    );
  }
  if (text.includes("safe") || text.includes("safety")) {
    priorities.weights = priorities.weights.map((w) =>
      w.category === "safety" ? { ...w, importance: 5 } : w,
    );
  }
  if (text.includes("tight budget") || text.includes("affordable") || text.includes("cheap")) {
    priorities.weights = priorities.weights.map((w) =>
      w.category === "budget" ? { ...w, importance: 5 } : w,
    );
  }

  return priorities;
}

export interface ExtractionResult {
  priorities: UserPriorities;
  source: "ai" | "heuristic";
}

/**
 * Understands the user's free-text description of what they want (step 1 of
 * the Realt Thinking Framework). Prefers the AI model for genuine natural
 * language understanding, but always falls back to the deterministic parser
 * rather than failing the request, and always validates whatever comes back
 * against the strict schema before trusting it.
 */
export async function extractPriorities(freeText: string): Promise<ExtractionResult> {
  if (isAiConfigured()) {
    try {
      const raw = await requestStructuredCompletion<UserPriorities>({
        systemPrompt: SYSTEM_PROMPT,
        userInput: freeText,
        jsonSchema: PRIORITIES_JSON_SCHEMA,
        schemaName: "user_priorities",
      });
      const validated = userPrioritiesSchema.parse(raw);
      return { priorities: validated, source: "ai" };
    } catch (error) {
      if (!(error instanceof AiServiceUnavailableError)) {
        console.error("AI priority extraction failed validation", error);
      }
    }
  }

  return { priorities: extractPrioritiesHeuristically(freeText), source: "heuristic" };
}
