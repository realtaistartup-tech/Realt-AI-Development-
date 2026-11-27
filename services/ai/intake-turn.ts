import { z } from "zod";

import { isAiConfigured, requestStructuredCompletion } from "./client";

export const INTAKE_STEPS = [
  "location",
  "tenure",
  "scope",
  "household",
  "rooms",
  "reason",
  "current",
  "pets",
  "hobbies",
  "network",
  "work",
  "transport",
  "parking",
  "vibe",
  "schools",
  "future",
  "housing",
  "outdoor",
  "environment",
  "accessibility",
  "condition",
  "contract",
  "rentalTerms",
  "mustHaves",
  "moveIn",
  "stayLength",
  "financing",
  "monthly",
  "moneyPriority",
  "budget",
  "commute",
  "space",
  "weights",
] as const;
export type IntakeStep = (typeof INTAKE_STEPS)[number];

export const intakeTurnRequestSchema = z.object({
  locale: z.enum(["en", "sv"]),
  step: z.enum(INTAKE_STEPS),
  /** What is already known, as short plain sentences. */
  known: z.array(z.string().max(300)).max(40),
  /** Recent conversation, oldest first. */
  transcript: z
    .array(z.object({ role: z.enum(["assistant", "user"]), text: z.string().max(2000) }))
    .max(30),
  answer: z.string().min(1).max(2000),
});
export type IntakeTurnRequest = z.infer<typeof intakeTurnRequestSchema>;

export interface IntakeTurnResult {
  reply: string;
  followUp: string | null;
  advance: boolean;
  summary: string;
  primaryPlace: string | null;
  tenure: "rent" | "buy" | null;
  scope: "only" | "nearby" | "wider" | null;
  householdKind: "alone" | "couple" | "friends" | "family" | "other" | null;
  householdSize: number | null;
  separateRooms: boolean | null;
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "reply",
    "followUp",
    "advance",
    "summary",
    "primaryPlace",
    "tenure",
    "scope",
    "householdKind",
    "householdSize",
    "separateRooms",
  ],
  properties: {
    reply: { type: "string" },
    followUp: { type: ["string", "null"] },
    advance: { type: "boolean" },
    summary: { type: "string" },
    primaryPlace: { type: ["string", "null"] },
    tenure: { type: ["string", "null"], enum: ["rent", "buy", null] },
    scope: { type: ["string", "null"], enum: ["only", "nearby", "wider", null] },
    householdKind: {
      type: ["string", "null"],
      enum: ["alone", "couple", "friends", "family", "other", null],
    },
    householdSize: { type: ["number", "null"] },
    separateRooms: { type: ["boolean", "null"] },
  },
} as const;

const resultSchema = z.object({
  reply: z.string(),
  followUp: z.string().nullable(),
  advance: z.boolean(),
  summary: z.string(),
  primaryPlace: z.string().nullable(),
  tenure: z.enum(["rent", "buy"]).nullable(),
  scope: z.enum(["only", "nearby", "wider"]).nullable(),
  householdKind: z.enum(["alone", "couple", "friends", "family", "other"]).nullable(),
  householdSize: z.number().nullable(),
  separateRooms: z.boolean().nullable(),
});

const STEP_GOALS: Record<IntakeStep, string> = {
  location:
    "Where they want to live. They may name several places (a first choice and alternatives). primaryPlace = the first-choice place as a short display name (city, or area + city).",
  tenure: "Whether they want to rent or buy.",
  scope:
    "Whether to search only the named place, also neighbouring areas, or wider. Pick scope from what they say; if they name an extra place or town as an option, that is 'nearby' or 'wider' and must be kept in summary.",
  household:
    "Who will live in the home and how many people. A family/children answer is NOT enough: you need the number of adults and children (householdSize = total people). If missing, advance=false and ask for it in followUp.",
  rooms: "Whether everyone needs their own bedroom or some can share.",
  reason: "Why they want to move (too small, too expensive, new job, life change, the area, first home). This is the most telling answer; reflect it.",
  current: "Their current housing (with parents, renting, sublet, owning, student housing). If they own, they may need to sell first.",
  rentalTerms: "Furnished or unfurnished, and short or long term rental.",
  financing: "How they will finance a purchase: loan promise, applying, cash, or not yet started.",
  moneyPriority: "What they value most financially: lowest cost, best home within budget, low risk, or long-term investment.",
  pets: "Whether they have or plan to get pets (type and number), which affects building and home choice.",
  hobbies: "Hobbies and free-time habits that should influence the area (nature, training, nightlife, quiet).",
  network: "Where family and friends live, whether that is the same city, and how important proximity is.",
  work: "Where they work or study, and whether they work from home some days.",
  housing: "Preferred home type (apartment, house, townhouse) or openness to any.",
  mustHaves: "Must-haves and dealbreakers for the home.",
  transport: "How they get around day to day (car, public transport, bike, walking).",
  parking: "Whether they need their own parking space (only asked to car users).",
  vibe: "What the neighbourhood should feel like (quiet, lively, family friendly, close to nature).",
  schools: "How important schools and preschools nearby are.",
  future: "Life changes expected in the next few years (kids, someone moving in, more remote work).",
  outdoor: "Wish for outdoor space (balcony, garden, terrace).",
  environment: "Preferences about daylight, noise and floor level.",
  accessibility: "Access needs such as an elevator, step-free access or proximity to healthcare.",
  condition: "Whether they accept a home needing renovation (buyers).",
  contract: "First-hand or second-hand rental contract (renters).",
  moveIn: "When they want to move in.",
  stayLength: "How long they expect to live there.",
  monthly: "The highest total monthly cost they are comfortable with (rent or fees, utilities, insurance). This is NOT the purchase budget.",
  budget:
    "Their budget (price range or monthly rent) and, when buying, financing (cash, mortgage approval, down payment).",
  commute: "How they travel and the longest commute they accept; there can be different limits per place.",
  space: "Minimum bedrooms and bathrooms, and any size wishes.",
  weights: "What matters most to them in a home.",
};

function buildSystemPrompt(locale: "en" | "sv"): string {
  const language = locale === "sv" ? "Swedish" : "English";
  return `You are Realt AI Assistant, a warm, sharp housing advisor in a chat, talking to someone who is searching for a home in Sweden. Sound like a thoughtful human advisor, never like a form.
Write every user-facing string ("reply", "followUp") in ${language}.

Each turn you receive the step being answered, what is already known, the recent conversation and the user's latest answer. Read the WHOLE answer carefully, including side remarks (extra places, conditions, exceptions), and respond to what they actually said.

"reply": 1-3 short sentences. Acknowledge the specifics in your own words (mention the places, numbers and conditions they gave, never echo their text verbatim). Where useful, add one honest, general insight about the situation, for example that a large budget opens up more of the market, or that a house in a nearby town usually costs less per square metre than an apartment in the city centre. Do not invent statistics, prices or listings; keep market remarks qualitative and clearly general. Do not ask the next question in "reply" (the app asks it), unless you are using followUp.
"followUp": only when the answer is missing something essential for THIS step (for example a family without the number of people). One short natural question. Otherwise null.
"advance": true when this step's information is sufficient; false only when followUp is set.
"summary": one plain English sentence capturing everything the user said in this answer, including every place and condition (this feeds the search profile).
Also fill any field you can infer from the answer, even if it belongs to another step (for example tenure from "I want to rent in X"); use null when not stated. Never guess.
Step goal: see the step description in the input.`;
}

/** Last failure message, exposed by the route in development only. */
export let lastIntakeError: string | null = null;

export async function runIntakeTurn(input: IntakeTurnRequest): Promise<IntakeTurnResult | null> {
  if (!isAiConfigured()) return null;
  const userInput = [
    `STEP: ${input.step} - ${STEP_GOALS[input.step]}`,
    `KNOWN SO FAR:\n${input.known.length ? input.known.map((k) => `- ${k}`).join("\n") : "- nothing yet"}`,
    `RECENT CONVERSATION:\n${input.transcript.map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`).join("\n")}`,
    `USER'S LATEST ANSWER:\n${input.answer}`,
  ].join("\n\n");
  try {
    const raw = await requestStructuredCompletion<IntakeTurnResult>({
      systemPrompt: buildSystemPrompt(input.locale),
      userInput,
      jsonSchema: SCHEMA as unknown as Record<string, unknown>,
      schemaName: "intake_turn",
    });
    lastIntakeError = null;
    const parsed = resultSchema.parse(raw);
    if (!parsed.advance && !parsed.followUp) parsed.advance = true;
    return parsed;
  } catch (error) {
    lastIntakeError = error instanceof Error ? error.message : String(error);
    console.error("Intake turn failed", error);
    return null;
  }
}
