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

// --- Swedish phrasing (budget, room types, commute, lifestyle) ---

function toNumber(value: string): number {
  return Number(value.replace(",", "."));
}

const MILLION_UNIT = "(?:miljoner|miljon|millions?|mille|mkr|mnkr)";

function parseSwedishBudget(text: string): { min?: number; max: number } | null {
  const spacedRange = text.match(
    /(\d{1,3}(?:[ \u00a0]\d{3})+)\s*(?:kr|sek|:-)?\s*(?:to|till|-|–|and|och)\s*(\d{1,3}(?:[ \u00a0]\d{3})+)/,
  );
  if (spacedRange) {
    const a = Number((spacedRange[1] ?? "").replace(/[ \u00a0]/g, ""));
    const b = Number((spacedRange[2] ?? "").replace(/[ \u00a0]/g, ""));
    if (a > 0 && b > 0) return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const millionRange = text.match(
    new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:-|–|to|till)\\s*(\\d+(?:[.,]\\d+)?)\\s*${MILLION_UNIT}`),
  );
  if (millionRange) {
    const a = Math.round(toNumber(millionRange[1] ?? "") * 1_000_000);
    const b = Math.round(toNumber(millionRange[2] ?? "") * 1_000_000);
    if (a > 0 && b > 0) return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const range = text.match(
    new RegExp(`(?:mellan|between)\\s+(\\d+(?:[.,]\\d+)?)\\s*(?:och|and|-|–)\\s*(\\d+(?:[.,]\\d+)?)\\s*${MILLION_UNIT}`),
  );
  if (range) {
    const a = Math.round(toNumber(range[1] ?? "") * 1_000_000);
    const b = Math.round(toNumber(range[2] ?? "") * 1_000_000);
    if (a > 0 && b > 0) return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const million = text.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${MILLION_UNIT}`));
  if (million) {
    const amount = Math.round(toNumber(million[1] ?? "") * 1_000_000);
    if (amount > 0) return { max: amount };
  }
  const thousand = text.match(/(\d+(?:[.,]\d+)?)\s*(?:tusen|tkr)\b/);
  if (thousand) {
    const amount = Math.round(toNumber(thousand[1] ?? "") * 1_000);
    if (amount > 0) return { max: amount };
  }
  const spaced = text.match(/(\d{1,3}(?:[ \u00a0]\d{3})+)/);
  if (spaced) {
    const amount = Number((spaced[1] ?? "").replace(/[ \u00a0]/g, ""));
    if (Number.isFinite(amount) && amount > 0) return { max: amount };
  }
  return null;
}

const SWEDISH_ROOM_TYPES: Record<string, number> = { ettan: 1, tvåa: 2, trea: 3, femma: 5 };
function roomsToBedrooms(rooms: number): number { return Math.max(1, rooms - 1); }

const SWEDISH_LIFESTYLE: Array<[string[], string]> = [
  [["lugn", "tyst"], "quiet"],
  [["familjevänlig", "barnvänlig"], "family-friendly"],
  [["naturnära", "natur", "grönområde", "skog"], "nature"],
  [["green", "grönt", "parks", "parker"], "near-parks"],
  [["centralt", "innerstad"], "city-center"],
  [["nattliv", "uteliv"], "nightlife"],
  [["gångvänlig", "gångavstånd"], "walkable"],
];

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

  const addTag = (tag: string) => { if (!priorities.lifestyleTags.includes(tag)) priorities.lifestyleTags.push(tag); };
  const addMustHave = (item: string) => { if (!priorities.mustHaves.includes(item)) priorities.mustHaves.push(item); };

  let budgetFound = false;
  // Monthly running costs are not the budget; keep them out of the budget parsing.
  const budgetText = text
    .split("\n")
    .filter((line) => !line.startsWith("monthly costs"))
    .join("\n");
  const swedishBudget = parseSwedishBudget(budgetText);
  if (swedishBudget) {
    priorities.budgetMax = swedishBudget.max;
    priorities.budgetMin = swedishBudget.min ?? Math.round(swedishBudget.max * 0.7);
    budgetFound = true;
  } else {
    const budgetMatch = budgetText.match(/\$?\s?(\d{2,3}(?:,\d{3})+|\d{5,7})/);
    if (budgetMatch) {
      const amount = Number((budgetMatch[1] ?? "").replace(/,/g, ""));
      if (Number.isFinite(amount) && amount > 0) {
        priorities.budgetMax = amount;
        priorities.budgetMin = Math.round(amount * 0.7);
        budgetFound = true;
      }
    }
  }

  let spaceFound = false;
  const NUM = "(\\d+|one|two|three|four|five|två|tre|fyra)";
  const FILL = "(?:\\s+[a-zåäö]+){0,2}?";
  const num = (w: string | undefined): number => {
    const map: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, två: 2, tre: 3, fyra: 4 };
    return /^\d+$/.test(w ?? "") ? Number(w) : (map[w ?? ""] ?? 1);
  };
  const bedroomRange = text.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:bed|bedroom|br|sovrum)/);
  const bedroomMatch = text.match(new RegExp(`\\b${NUM}${FILL}\\s+(?:bedrooms?|beds?|br|sovrum)\\b`));
  const roomMatch = text.match(/(\d+)\s*(?:rum|rok)\b/);
  const roomTypeMatch = text.match(/\b(ettan|tvåa|trea|femma)\b/);
  const fourRoomMatch = /\b(?:en|ett)\s+fyra\b/.test(text);
  if (bedroomRange) {
    priorities.minBedrooms = Math.min(Number(bedroomRange[1]), Number(bedroomRange[2]));
    spaceFound = true;
  } else if (bedroomMatch) {
    priorities.minBedrooms = num(bedroomMatch[1]);
    spaceFound = true;
  } else if (roomMatch) {
    priorities.minBedrooms = roomsToBedrooms(Number(roomMatch[1]));
    spaceFound = true;
  } else if (roomTypeMatch) {
    priorities.minBedrooms = roomsToBedrooms(SWEDISH_ROOM_TYPES[roomTypeMatch[1] ?? ""] ?? 2);
    spaceFound = true;
  } else if (fourRoomMatch) {
    priorities.minBedrooms = roomsToBedrooms(4);
    spaceFound = true;
  }

  const bathroomMatch = text.match(new RegExp(`\\b(\\d+(?:\\.\\d+)?|one|two|three|en|ett|två)${FILL}\\s+(?:baths?|bathrooms?|badrum|toalett(?:er)?)\\b`));
  if (bathroomMatch) priorities.minBathrooms = num(bathroomMatch[1] === "en" || bathroomMatch[1] === "ett" ? "one" : bathroomMatch[1]);

  const commuteAll = [...text.matchAll(/(\d+)\s*(?:min|minute)/g)].map((m) => Number(m[1]));
  const commuteMatch = commuteAll.length > 0;
  if (commuteMatch) priorities.commuteMaxMinutes = Math.max(...commuteAll);

  // The latest line that names a way of travelling wins ("by car" in the commute
  // answer beats "bike" mentioned earlier). Whole words only, so "busy" is not "bus".
  const MODES: Array<[UserPriorities["commuteMode"], RegExp]> = [
    ["drive", /\b(?:car|cars|drive|driving|bil|bilen|köra|kör)\b/],
    ["transit", /\b(?:transit|public transport|train|trains|bus|buses|metro|tram|tunnelbana|pendeltåg|buss|bussen|tåg|tåget|kollektivtrafik|kollektivt|spårvagn)\b/],
    ["bike", /\b(?:bike|biking|cycle|cycling|cykel|cykla|cyklar)\b/],
    ["walk", /\b(?:walk|walking|on foot|promenad|promenera|gå|gångavstånd)\b/],
  ];
  const modeLines = text.split("\n").reverse();
  for (const line of modeLines) {
    const hit = MODES.find(([, pattern]) => pattern.test(line));
    if (hit) {
      priorities.commuteMode = hit[0];
      break;
    }
  }

  const lifestyleKeywords = ["quiet","walkable","family-friendly","urban","suburban","nightlife","near-parks","city-center","nature"];
  priorities.lifestyleTags = lifestyleKeywords.filter((keyword) => text.includes(keyword.replace("-", " ")));
  for (const [needles, tag] of SWEDISH_LIFESTYLE) {
    if (needles.some((needle) => text.includes(needle))) addTag(tag);
  }

  if (/\bpets?\b/.test(text) || /\bdogs?\b/.test(text) || /\bcats?\b/.test(text) || /\b(?:husdjur|hunden|hundar|hund|katten|katter|katt)\b/.test(text)) addTag("pets");
  if (["home office","work from home","remote work","hemmakontor","jobba hemifrån","jobbar hemifrån","arbeta hemifrån","distansarbete"].some((w) => text.includes(w)) || /\bwfh\b/.test(text)) addTag("home-office");
  if (["wheelchair","step-free","step free","accessib","rullstol","tillgänglighet","trappfri","stegfri"].some((w) => text.includes(w))) addTag("accessible");
  if (["historic","character","period property","old building","pre-war","historisk","sekelskifte","äldre fastighet","gammal byggnad","karaktär"].some((w) => text.includes(w))) addTag("historic-character");
  if (["flexible","short-term","short term","may relocate","might relocate","flexibelt boende","korttid","kanske flytta","kan komma att flytta"].some((w) => text.includes(w))) addTag("flexible-tenure");
  if (["forever home","settle down","long-term home","buying","evighetshem","bosätta oss","långsiktigt boende"].some((w) => text.includes(w))) addTag("long-term-ownership");
  if (["growing family","planning a family","more kids","expecting","want kids","future kids","växande familj","fler barn","planerar barn","vill ha barn"].some((w) => text.includes(w))) addTag("family-growth-planned");
  if (["parking","garage","parkering","p-plats","ev charging","laddplats"].some((w) => text.includes(w))) addMustHave("parking");

  const schoolsMentioned = text.includes("school") || text.includes("skol");
  if (schoolsMentioned) priorities.weights = priorities.weights.map((w) => w.category === "schools" ? { ...w, importance: 5 } : w);
  const safetyMentioned = ["safe","safety","säker","trygg"].some((w) => text.includes(w));
  if (safetyMentioned) priorities.weights = priorities.weights.map((w) => w.category === "safety" ? { ...w, importance: 5 } : w);
  const budgetIsPriority = ["tight budget","lowest possible cost","lägsta möjliga kostnad","affordable","cheap","billig","prisvärd","stram budget","låg budget","begränsad budget","överkomlig"].some((w) => text.includes(w));
  if (budgetIsPriority) priorities.weights = priorities.weights.map((w) => w.category === "budget" ? { ...w, importance: 5 } : w);

  return { priorities, confidence: { budget: budgetFound, commute: commuteMatch, space: spaceFound, weights: schoolsMentioned || safetyMentioned || budgetIsPriority } };
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
