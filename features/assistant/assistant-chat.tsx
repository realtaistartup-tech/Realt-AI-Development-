"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  MessageSquare,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Pin,
  PinOff,
  Send,
  SquarePen,
  Trash2,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import en from "@/messages/en.json";
import { useAccount } from "@/components/account-provider";
import { Logo } from "@/components/logo";
import { LogoMark } from "@/components/logo-mark";
import { AssistantAuthGate } from "@/features/assistant/auth-gate";
import { SidebarAccountMenu } from "@/features/assistant/sidebar-account-menu";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { savePriorities, saveReportContext } from "@/hooks/use-priorities-store";
import { detectPriorityConflicts } from "@/services/matching/conflict-detection";
import { nextClarifyingField } from "@/services/onboarding/clarifying-flow";
import type { PriorityConfidence, PriorityFieldKey, UserPriorities } from "@/types";
import { PriorityReviewForm } from "@/features/onboarding/priority-review-form";

type Category = UserPriorities["weights"][number]["category"];
type Stage = "chatting" | "review" | "editing";
/**
 * App-written messages store a translation key instead of fixed text, so they
 * switch language together with the rest of the app. Text the person typed is
 * stored as-is.
 */
type MessageSpec = { ns: "assistant" | "onboarding"; key: string; params?: Record<string, string> };
type ChatMessage = { id: string; role: "user" | "assistant"; text: string; i18n?: MessageSpec };

/** "nacka, stockholm." -> "Nacka, Stockholm" (for showing a place back to the person). */
function cleanCity(raw: string): string {
  return raw
    .trim()
    .replace(/[\s.,;:!?]+$/, "")
    .replace(/(^|[\s,-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
}

/**
 * Pulls the city and (optional) area out of a free-text first answer such as
 * "I want to live in göteborg, in the Lindholmen Area" or "Södermalm, Stockholm".
 * Without an explicit "area" word, a two-part answer is read as "area, city".
 */
function placeOf(raw: string): { place: string; city: string; area: string; hasArea: boolean } {
  const cleaned = raw
    .trim()
    .replace(
      /^(?:(?:i|we)\s+(?:would\s+like|want|wanna|'d\s+like|need|am looking)\s+to\s+(?:live|rent|buy|move|stay|find\s+\w+)?\s*|(?:jag|vi)\s+(?:vill|skulle\s+vilja)\s+(?:bo|hyra|köpa|flytta|hitta)\s*)(?:in|to|at|i|till)?\s+/i,
      "",
    );
  // Only the first clause names the main place ("…in Limhamn, but I could also go to Lomma").
  const mainClause = cleaned.split(/\s+(?:but|however|though|men|fast)\s+|;/i)[0] ?? cleaned;
  const intent = /\b(?:want|looking|searching|search|apartment|flat|house|home|live|rent|buy|find|bo|söker|letar|lägenhet|hus|bostad|hyra|köpa)\b/i;
  const prepSplit = mainClause.split(/\s+(?:in|i|near|nära|vid|around|at)\s+/i);
  const trimmedClause =
    prepSplit.length > 1 && intent.test(prepSplit[0] ?? "") ? prepSplit.slice(1).join(", ") : mainClause;
  const parts = trimmedClause
    .replace(/\b(?:only|just|bara|endast)\s+/gi, "")
    .split(/,|\s+(?:in|i|near|nära|vid|around)\s+/i)
    .map((part) => part.trim().replace(/^(?:in|i|the|området|in the)\s+/i, ""))
    .filter(Boolean);
  const marker = /\b(?:area|neighbou?rhood|district|området|område|stadsdelen|delen)\b/i;
  const strip = (part: string) => cleanCity(part.replace(marker, "").replace(/\s{2,}/g, " "));
  const markedIdx = parts.findIndex((part) => marker.test(part));
  if (parts.length === 0) return { place: "", city: "", area: "", hasArea: false };
  if (parts.length === 1) {
    const only = strip(parts[0] ?? "");
    return { place: only, city: only, area: only, hasArea: false };
  }
  let areaPart: string;
  let cityPart: string;
  if (markedIdx >= 0) {
    areaPart = parts[markedIdx] ?? "";
    cityPart = parts.find((_, i) => i !== markedIdx) ?? "";
  } else {
    areaPart = parts[0] ?? "";
    cityPart = parts[1] ?? "";
    const big = /^(?:stockholm|göteborg|goteborg|gothenburg|malmö|malmo|uppsala|västerås|örebro|linköping|helsingborg|jönköping|norrköping|lund)$/i;
    if (big.test(areaPart.trim()) && !big.test(cityPart.trim())) [areaPart, cityPart] = [cityPart, areaPart];
  }
  const area = strip(areaPart);
  const city = strip(cityPart);
  return { place: `${city}, ${area}`, city, area, hasArea: true };
}

function placeFor(chat: { location?: string; primaryPlace?: string }) {
  if (chat.primaryPlace) {
    const name = chat.primaryPlace;
    return { place: name, city: name, area: name, hasArea: false };
  }
  return placeOf(chat.location ?? "");
}

type IntakeAiResult = {
  reply: string;
  followUp: string | null;
  advance: boolean;
  summary: string;
  primaryPlace: string | null;
  tenure: "rent" | "buy" | null;
  scope: Scope | null;
  householdKind: HouseholdKind | null;
  householdSize: number | null;
  separateRooms: boolean | null;
};

type Scope = "only" | "nearby" | "wider";
/**
 * The conversation after the basics, grouped into parts so the person sees
 * where they are. Every question can be skipped. Some only apply to some
 * people (schools to families, condition to buyers, contract to renters).
 */
const LIFE_STEPS = [
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
] as const;
const HOME_STEPS = [
  "housing",
  "outdoor",
  "environment",
  "accessibility",
  "condition",
  "contract",
  "rentalTerms",
  "mustHaves",
] as const;
const TIMING_STEPS = ["moveIn", "stayLength", "financing", "monthly", "moneyPriority"] as const;
const EXTRA_STEPS = [...LIFE_STEPS, ...HOME_STEPS, ...TIMING_STEPS] as const;
type ExtraStep = (typeof EXTRA_STEPS)[number];
type IntakeStepKey = "location" | "tenure" | "scope" | "household" | "rooms" | "budget" | ExtraStep;

/** English labels for the search profile text (fed to the extraction step, not shown). */
const EXTRA_LABEL: Record<ExtraStep, string> = {
  reason: "Why I want to move",
  current: "Where I live now",
  pets: "Pets",
  hobbies: "Hobbies and free time",
  network: "Where family and friends live",
  work: "Work or studies",
  transport: "Getting around day to day",
  parking: "Own car space",
  vibe: "Neighbourhood feel",
  schools: "Kids' education",
  future: "Plans for the coming years",
  housing: "Home type",
  outdoor: "Outdoor space",
  environment: "Light, noise and floor",
  accessibility: "Access needs",
  condition: "Condition of the home",
  contract: "Rental contract",
  rentalTerms: "Furnishing and rental length",
  mustHaves: "Must-haves and dealbreakers",
  moveIn: "Move-in timing",
  stayLength: "How long I plan to stay",
  financing: "Financing",
  monthly: "Monthly costs I can handle",
  moneyPriority: "What matters most with money",
};

/** Quick-reply buttons per question (translation keys). Free text always works too. */
const EXTRA_CHIPS: Partial<Record<ExtraStep, readonly string[]>> = {
  reason: ["reasonSmall", "reasonCost", "reasonWork", "reasonLife", "reasonArea", "reasonFirst"],
  current: ["currentParents", "currentRent", "currentSublet", "currentOwn", "currentStudent"],
  pets: ["petsNone", "petsDog", "petsCat", "petsMore"],
  transport: ["trCar", "trTransit", "trBike", "trWalk"],
  parking: ["parkYes", "parkEv", "parkMaybe", "parkNo"],
  vibe: ["vibeQuiet", "vibeSafe", "vibeLively", "vibeFamily", "vibeNature"],
  schools: ["schoolsImportant", "schoolsSome", "schoolsNo"],
  future: ["futureKids", "futurePartner", "futureRemote", "futureSame"],
  housing: ["housingApartment", "housingHouse", "housingTownhouse", "housingAny"],
  outdoor: ["outBalcony", "outGarden", "outTerrace", "outNone"],
  environment: ["envQuiet", "envLight", "envHigh", "envNone"],
  accessibility: ["accElevator", "accStepFree", "accCare", "accNone"],
  condition: ["condReady", "condSmall", "condRenovate"],
  contract: ["contractFirst", "contractSecond", "contractEither"],
  rentalTerms: ["termUnfurnishedLong", "termFurnishedLong", "termShort", "termAny"],
  mustHaves: ["mhSmokeFree", "mhAllergy", "mhLaundry", "mhStorage"],
  moveIn: ["moveAsap", "moveSoon", "move3to6", "move6to12", "moveLooking"],
  stayLength: ["stay1to2", "stay3to5", "stay5plus", "stayUnsure"],
  financing: ["finPromise", "finApplying", "finCash", "finNotYet"],
  moneyPriority: ["moneyLowest", "moneyBest", "moneySafe", "moneyInvest"],
};

type StepContext = { tenure?: "rent" | "buy"; householdKind?: HouseholdKind; transport?: string };

function stepApplies(step: ExtraStep, ctx: StepContext): boolean {
  if (step === "schools") return ctx.householdKind === "family";
  if (step === "parking") return /\b(car|cars|drive|driving|bil|bilen)\b/i.test(ctx.transport ?? "");
  if (step === "condition") return ctx.tenure === "buy";
  if (step === "contract" || step === "rentalTerms") return ctx.tenure === "rent";
  if (step === "financing") return ctx.tenure === "buy";
  // Renters already gave a monthly figure as their budget.
  if (step === "monthly") return ctx.tenure !== "rent";
  return true;
}

/** The next lifestyle question after `from` (or the first one), or "done" when they are all asked. */
function nextExtraStep(from: ExtraStep | null, ctx: StepContext): ExtraStep | "done" {
  const start = from ? EXTRA_STEPS.indexOf(from) + 1 : 0;
  return EXTRA_STEPS.slice(start).find((step) => stepApplies(step, ctx)) ?? "done";
}

function isExtraStep(value: string | undefined): value is ExtraStep {
  return (EXTRA_STEPS as readonly string[]).includes(value ?? "");
}

const SECTION_KEYS = ["sectionBasics", "sectionLife", "sectionHome", "sectionTiming", "sectionNumbers"] as const;
const SKIP_KEY = "skipQuestion";

/** Which part of the conversation a chat is in (0-4), or null once it is summarised. */
function sectionOf(chat: { intake?: string; stage?: string }): number | null {
  if (chat.stage && chat.stage !== "chatting") return null;
  const step = chat.intake;
  if (step && step !== "done") {
    if ((LIFE_STEPS as readonly string[]).includes(step)) return 1;
    if ((HOME_STEPS as readonly string[]).includes(step)) return 2;
    if ((TIMING_STEPS as readonly string[]).includes(step)) return 3;
    return 0;
  }
  return 4;
}
type HouseholdKind = "alone" | "couple" | "friends" | "family" | "other";

function parseTenure(text: string): "rent" | "buy" | null {
  if (/rent|hyr/i.test(text)) return "rent";
  if (/buy|köp|kop|purchase/i.test(text)) return "buy";
  return null;
}

function parseScope(text: string): Scope | null {
  if (/\b(but also|also|but i could|but could|as well|även|men också|men kan)\b/i.test(text)) return "nearby";
  if (/\b(next to|adjacent|bredvid|närområd)/i.test(text)) return "nearby";
  if (/\b(only|just|bara|endast)\b/i.test(text)) return "only";
  if (/\b(wider|wide|bigger|more|större|bredare|mer|längre)\b/i.test(text)) return "wider";
  if (/(nearby|near|neighbou?r|around|närliggande|intill|bredvid|runt)/i.test(text)) return "nearby";
  return null;
}

const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, två: 2, tva: 2, tre: 3, fyra: 4, fem: 5, sex: 6,
};

function parseHousehold(text: string): { kind: HouseholdKind; people: number | null } | null {
  const lower = text.toLowerCase();
  const digit = /(?:^|\s)(\d{1,2})(?:\s|$|[.,!?])/.exec(lower);
  const word = new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join("|")})\\b`).exec(lower);
  const count = digit ? Number(digit[1]) : word ? NUMBER_WORDS[word[1]] : null;

  if (/\b(alone|just me|only me|myself|själv|ensam|bara jag|endast jag)\b/.test(lower)) {
    return { kind: "alone", people: 1 };
  }
  if (/\b(kid|kids|child|children|son|daughter|baby|toddler|family|barn|dotter|familj|bebis)\b/.test(lower)) {
    const kidsWord = new RegExp(`(\\d{1,2}|${Object.keys(NUMBER_WORDS).join("|")}|one|en|ett)\\s+(?:kid|kids|child|children|barn|sons?|daughters?)\\b`).exec(lower);
    const familyOf = /\b(?:family of|we are|we're|vi är|är)\s+(\d{1,2}|[a-zåäö]+)\b/.exec(lower);
    const toNum = (w: string | undefined) =>
      w === undefined ? null : /^\d+$/.test(w) ? Number(w) : w === "one" || w === "en" || w === "ett" ? 1 : (NUMBER_WORDS[w] ?? null);
    const kids = toNum(kidsWord?.[1]);
    const partner = /\b(wife|husband|partner|girlfriend|boyfriend|spouse|sambo|särbo|fru|man|maka|make|fianc)/.test(lower);
    const familySize = toNum(familyOf?.[1]);
    if (familySize) return { kind: "family", people: familySize };
    if (kids) return { kind: "family", people: kids + (partner ? 2 : 1) };
    return { kind: "family", people: null };
  }
  if (/\b(parents?|mom|dad|mother|father|mamma|pappa|föräldrar)\b/.test(lower)) {
    return { kind: "other", people: count ?? null };
  }
  if (/\b(boyfriend|girlfriend|wife|husband|partner|fianc[eé]e?|spouse|couple|sambo|särbo|pojkvän|flickvän|fru|man|make|maka|gift)\b/.test(lower)) {
    return { kind: "couple", people: 2 };
  }
  if (/\b(friend|friends|roommate|roommates|flatmate|flatmates|housemate|sibling|siblings|brother|sister|kompis|kompisar|vän|vänner|rumskompis|rumskompisar|syskon|bror|syster)\b/.test(lower)) {
    return { kind: "friends", people: count ?? 2 };
  }
  if (count !== null) {
    const withMe = /\b(and i|and me|me and|jag och|and myself)\b/.test(lower);
    return { kind: "other", people: withMe ? count + 1 : count };
  }
  if (/\b(dog|cat|pet|dogs|cats|hund|katt|husdjur)\b/.test(lower)) return { kind: "alone", people: 1 };
  return null;
}

/**
 * "two adults and two kids, 4 and 8 years old" -> 4. Counts numbers that belong
 * to people words; ages ("4 and 8 years old") are not people.
 */
function countPeople(text: string): number {
  const lower = text.toLowerCase();
  const words = { ...NUMBER_WORDS, one: 1, en: 1, ett: 1, a: 1 } as Record<string, number>;
  const num = `(\\d{1,2}|${Object.keys(words).join("|")})`;
  const people = new RegExp(
    `\\b${num}\\s+(?:adults?|grown-?ups?|vuxna|vuxen|kids?|children|child|barn|sons?|daughters?|people|persons|personer|teenagers?|tonåringar|babies|baby|bebis)\\b`,
    "g",
  );
  let total = 0;
  for (const match of lower.matchAll(people)) {
    const value = match[1] ?? "";
    total += /^\d+$/.test(value) ? Number(value) : (words[value] ?? 0);
  }
  if (total > 0) {
    const plusMe = /\b(me and|and me|and i|jag och|och jag)\b/.test(lower) && !/\b(adults?|vuxna|vuxen)\b/.test(lower);
    return plusMe ? total + 1 : total;
  }
  const familyOf = /\b(?:family of|we are|we're|vi är)\s+(\d{1,2}|[a-zåäö]+)\b/.exec(lower);
  if (familyOf) {
    const value = familyOf[1] ?? "";
    return /^\d+$/.test(value) ? Number(value) : (words[value] ?? 0);
  }
  const lone = /^\s*(\d{1,2})\s*$/.exec(lower);
  return lone ? Number(lone[1]) : 0;
}

/** true = separate bedrooms, false = sharing, null = could not tell. */
function parseRooms(text: string, kind: HouseholdKind | undefined): boolean | null {
  if (/\b(separate|own room|own rooms|egna|separata|eget rum|each)\b/i.test(text)) return true;
  if (/\b(share|together|same|tillsammans|dela|samma|ett rum|one room)\b/i.test(text)) return false;
  if (kind === "friends") {
    if (/^\s*(yes|yep|yeah|ja|japp|stämmer|correct|right)\b/i.test(text)) return true;
    if (/^\s*(no|nej|nope)\b/i.test(text)) return false;
  }
  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Chats saved before messages carried translation keys hold the app's English
 * sentences as plain text. Recognise those so old searches switch language too.
 */
function legacySpec(message: ChatMessage): MessageSpec | null {
  const a = en.assistant;
  const clarify = en.onboarding.clarify;
  const text = message.text;
  if (message.role === "user") {
    if (text === a.rent) return { ns: "assistant", key: "rent" };
    if (text === a.buy) return { ns: "assistant", key: "buy" };
    if (text === clarify.skip) return { ns: "onboarding", key: "clarify.skip" };
    return null;
  }
  const exact: [string, MessageSpec][] = [
    [a.askTenure, { ns: "assistant", key: "askTenure" }],
    [a.askTenureAgain, { ns: "assistant", key: "askTenureAgain" }],
    [a.continuePrompt, { ns: "assistant", key: "continuePrompt" }],
    [a.summaryIntro, SUMMARY_SPEC],
    [clarify.budget.question, { ns: "onboarding", key: "clarify.budget.question" }],
    [clarify.commute.question, { ns: "onboarding", key: "clarify.commute.question" }],
    [clarify.space.question, { ns: "onboarding", key: "clarify.space.question" }],
    [clarify.weights.question, { ns: "onboarding", key: "clarify.weights.question" }],
  ];
  const hit = exact.find(([sentence]) => sentence === text);
  if (hit) return hit[1];
  for (const key of ["rentNext", "buyNext"] as const) {
    const pattern = new RegExp("^" + escapeRegExp(a[key]).replace("\\{city\\}", "(.+)") + "$", "s");
    const match = pattern.exec(text);
    if (match) return { ns: "assistant", key, params: { city: cleanCity(match[1]) } };
  }
  return null;
}

const SUMMARY_SPEC: MessageSpec = { ns: "assistant", key: "summaryIntro" };

function specMessage(role: "user" | "assistant", spec: MessageSpec): ChatMessage {
  return { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, role, text: "", i18n: spec };
}

type Chat = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
  userTexts: string[];
  priorities: UserPriorities | null;
  confidence: PriorityConfidence | null;
  source: "ai" | "heuristic" | null;
  askedFields: PriorityFieldKey[];
  pendingField: PriorityFieldKey | null;
  stage: Stage;
  /** Pinned searches are listed first in the sidebar. */
  pinned?: boolean;
  /** Opening questions: where to live, then rent or buy. Missing = already past it (older chats). */
  intake?: "location" | "tenure" | "scope" | "household" | "rooms" | "budget" | ExtraStep | "done";
  /** Answers to the lifestyle questions, shown back in the summary. */
  profile?: Partial<Record<ExtraStep, string>>;
  scope?: Scope;
  householdKind?: HouseholdKind;
  householdSize?: number | null;
  separateRooms?: boolean;
  location?: string;
  /** First-choice place as understood by the AI (e.g. "Limhamn, Malmö"). */
  primaryPlace?: string;
  /** Follow-up questions already asked on the current step (caps the AI loop). */
  retries?: number;
  tenure?: "rent" | "buy";
};

const STORAGE_KEY = "realtai.assistant.chats.v1";
export const CHATS_STORAGE_KEY = STORAGE_KEY;
const CATEGORIES: Category[] = ["budget", "commute", "space", "safety", "schools", "lifestyle"];

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createChat(): Chat {
  return {
    id: newId(),
    title: "",
    updatedAt: Date.now(),
    messages: [],
    userTexts: [],
    priorities: null,
    confidence: null,
    source: null,
    askedFields: [],
    pendingField: null,
    stage: "chatting",
    intake: "location",
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function makeMessage(role: "user" | "assistant", text: string): ChatMessage {
  return { id: newId(), role, text };
}

function formatKr(value: number): string {
  return `${Math.round(value).toLocaleString("sv-SE")} kr`;
}

/** The reader fills in a minimum of 70 % of the maximum when only a maximum was said; don't show that as if it was stated. */
function onlyMaxBudget(p: { budgetMin: number; budgetMax: number }): boolean {
  return p.budgetMin === Math.round(p.budgetMax * 0.7);
}

function prettyTag(tag: string): string {
  return tag.replace(/-/g, " ");
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-sm">
      {children}
    </span>
  );
}

export function AssistantChat() {
  const router = useRouter();
  const { account } = useAccount();
  const t = useTranslations("onboarding");
  const ta = useTranslations("assistant");
  const locale = useLocale();
  /** null = not known yet, false = no AI key on the server (use the built-in flow). */
  const aiOk = useRef<boolean | null>(null);
  /** After an AI failure, skip the AI for a couple of minutes so every message does not wait for a timeout. */
  const aiDownUntil = useRef(0);

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [selectedWeights, setSelectedWeights] = useState<Category[]>([]);
  const [editingStep, setEditingStep] = useState<ExtraStep | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [thinkingLine, setThinkingLine] = useState<string | null>(null);
  const [menuChatId, setMenuChatId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  // Close the "..." menu when clicking elsewhere or pressing Escape.
  useEffect(() => {
    if (!menuChatId) return;
    function onDown(event: MouseEvent) {
      if (!(event.target as HTMLElement).closest("[data-chat-menu]")) setMenuChatId(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuChatId(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuChatId]);

  const active = chats.find((chat) => chat.id === activeId) ?? null;
  const activeChatId = active?.id ?? "";
  const messageCount = active?.messages.length ?? 0;
  const activeStage = active?.stage;

  // Load saved chats (this browser only) once, then start with a fresh chat.
  useEffect(() => {
    let saved: Chat[] = [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) saved = parsed as Chat[];
      }
    } catch {
      saved = [];
    }
    const fresh = createChat();
    setChats([fresh, ...saved.filter((chat) => chat.messages.length > 0)]);
    setActiveId(fresh.id);
    setSidebarOpen(window.innerWidth >= 768);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      const toSave = chats.filter((chat) => chat.messages.length > 0).slice(0, 50);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // Storage can be unavailable (private window, full disk); the chat still works.
    }
  }, [chats, loaded]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageCount, activeStage, isSending, error]);

  function patchChat(id: string, update: (chat: Chat) => Chat) {
    setChats((prev) =>
      prev.map((chat) => (chat.id === id ? { ...update(chat), updatedAt: Date.now() } : chat)),
    );
  }

  function questionFor(field: PriorityFieldKey): MessageSpec {
    return { ns: "onboarding", key: `clarify.${field}.question` };
  }

  function messageText(message: ChatMessage): string {
    const spec = message.i18n ?? legacySpec(message);
    if (!spec) return message.text;
    const { ns, key, params } = spec;
    return (ns === "assistant" ? ta : t)(key as never, params as never);
  }

  function categoryLabel(category: Category): string {
    switch (category) {
      case "budget":
        return t("fields.categories.budget");
      case "commute":
        return t("fields.categories.commute");
      case "space":
        return t("fields.categories.space");
      case "safety":
        return t("fields.categories.safety");
      case "schools":
        return t("fields.categories.schools");
      case "lifestyle":
        return t("fields.categories.lifestyle");
    }
  }

  function modeLabel(mode: UserPriorities["commuteMode"]): string {
    switch (mode) {
      case "drive":
        return t("fields.commute.modes.drive");
      case "transit":
        return t("fields.commute.modes.transit");
      case "walk":
        return t("fields.commute.modes.walk");
      case "bike":
        return t("fields.commute.modes.bike");
    }
  }

  function fieldLabel(field: PriorityFieldKey): string {
    switch (field) {
      case "budget":
        return t("summary.fieldLabels.budget");
      case "commute":
        return t("summary.fieldLabels.commute");
      case "space":
        return t("summary.fieldLabels.space");
      case "weights":
        return t("summary.fieldLabels.weights");
    }
  }

  function startNewChat() {
    if (active && active.messages.length === 0) return;
    const fresh = createChat();
    setChats((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
    setDraft("");
    setError(null);
    setSelectedWeights([]);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function openChat(id: string) {
    setActiveId(id);
    setDraft("");
    setError(null);
    setSelectedWeights([]);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function togglePin(id: string) {
    setChats((prev) => prev.map((chat) => (chat.id === id ? { ...chat, pinned: !chat.pinned } : chat)));
    setMenuChatId(null);
  }

  function startRename(id: string) {
    const chat = chats.find((item) => item.id === id);
    setRenameDraft(chat?.title ?? "");
    setRenamingId(id);
    setMenuChatId(null);
  }

  function commitRename() {
    const id = renamingId;
    const name = renameDraft.trim();
    setRenamingId(null);
    if (!id || !name) return;
    setChats((prev) => prev.map((chat) => (chat.id === id ? { ...chat, title: name.slice(0, 60) } : chat)));
  }

  function deleteChat(id: string) {
    setMenuChatId(null);
    const remaining = chats.filter((chat) => chat.id !== id);
    if (id !== activeId) {
      setChats(remaining);
      return;
    }
    const fresh = createChat();
    setChats([fresh, ...remaining.filter((chat) => chat.messages.length > 0)]);
    setActiveId(fresh.id);
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    const chat = active;
    if (!chat || !trimmed || isSending) return;

    if (chat.intake && chat.intake !== "done") {
      setDraft("");
      setError(null);
      await handleIntakeAnswer(chat, trimmed);
      return;
    }

    const allTexts = [...chat.userTexts, trimmed];
    patchChat(chat.id, (c) => ({
      ...c,
      title: c.title || trimmed.slice(0, 48),
      messages: [...c.messages, makeMessage("user", trimmed)],
      userTexts: allTexts,
      stage: "chatting",
    }));
    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      const step = (chat.pendingField ?? "budget") as "budget" | "commute" | "space" | "weights";
      const ai = chat.stage === "review" ? null : await askIntakeAi(chat, step, trimmed);
      if (ai && !ai.advance && ai.followUp && (chat.retries ?? 0) < 1) {
        patchChat(chat.id, (c) => ({
          ...c,
          retries: (c.retries ?? 0) + 1,
          userTexts: [...c.userTexts, ai.summary],
          messages: [...c.messages, makeMessage("assistant", [ai.reply, ai.followUp].filter(Boolean).join("\n\n"))],
        }));
        return;
      }
      if (ai) allTexts.push(ai.summary);
      const response = await fetch("/api/ai/priorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: allTexts.join("\n\n") }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? t("errors.generic"));
      }
      const data = (await response.json()) as {
        priorities: UserPriorities;
        source: "ai" | "heuristic";
        confidence: PriorityConfidence;
      };

      const asked = chat.pendingField ? [...chat.askedFields, chat.pendingField] : chat.askedFields;
      const next = nextClarifyingField(data.confidence, asked);
      patchChat(chat.id, (c) => ({
        ...c,
        priorities: data.priorities,
        confidence: data.confidence,
        source: data.source,
        askedFields: asked,
        pendingField: next,
        stage: next ? "chatting" : "review",
        retries: 0,
        userTexts: ai ? [...c.userTexts, ai.summary] : c.userTexts,
        messages: [
          ...c.messages,
          ...(ai?.reply ? [makeMessage("assistant", ai.reply)] : []),
          ...(!ai && step === "budget" && data.confidence.budget
            ? [
                makeMessage(
                  "assistant",
                  onlyMaxBudget(data.priorities)
                    ? ta(chat.tenure === "rent" ? "ackRentMax" : "ackBudgetMax", {
                        max: data.priorities.budgetMax.toLocaleString("sv-SE"),
                      })
                    : ta("ackBudget", {
                        min: data.priorities.budgetMin.toLocaleString("sv-SE"),
                        max: data.priorities.budgetMax.toLocaleString("sv-SE"),
                      }),
                ),
              ]
            : []),
          ...(!ai && step === "commute" && data.confidence.commute
            ? [
                makeMessage(
                  "assistant",
                  ta("ackCommute", {
                    minutes: String(data.priorities.commuteMaxMinutes),
                    mode: ta(`mode_${data.priorities.commuteMode}` as Parameters<typeof ta>[0]),
                  }),
                ),
              ]
            : []),
          specMessage("assistant", next ? questionFor(next) : SUMMARY_SPEC),
        ],
      }));
      setSelectedWeights([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setIsSending(false);
    }
  }

  /**
   * Rent and buy lead to different places: rentals go to a rental-homes page,
   * buying goes to a broker in the chosen city. Those destinations do not
   * exist yet, so for now the assistant says so and carries on with the
   * normal questions. The choice is stored on the chat for when they do.
   */
  function addUserMessage(chatId: string, message: ChatMessage) {
    patchChat(chatId, (c) => ({ ...c, messages: [...c.messages, message] }));
  }

  /** Typed answers during the opening questions (buttons call the choose… functions directly). */
  async function handleIntakeAnswer(chat: Chat, text: string) {
    const typed = makeMessage("user", text);
    const step = chat.intake as IntakeStepKey;
    if (isExtraStep(chat.intake) && text === ta(SKIP_KEY)) return answerExtra(chat, chat.intake, text);
    if (chat.intake === "budget" && text === ta(SKIP_KEY)) return answerBudget(chat, text);
    if (aiOk.current !== false && Date.now() >= aiDownUntil.current) {
      addUserMessage(chat.id, typed);
      setIsSending(true);
      const ai = await askIntakeAi(chat, step, text);
      setIsSending(false);
      if (ai) return applyAiTurn(chat, step, text, ai);
      // No AI on the server: take the typed message back and use the built-in flow.
      patchChat(chat.id, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== typed.id) }));
    }
    if (isExtraStep(chat.intake)) return answerExtra(chat, chat.intake, text);
    if (chat.intake === "budget") return answerBudget(chat, text);
    switch (chat.intake) {
      case "location": {
        patchChat(chat.id, (c) => ({
          ...c,
          title: c.title || text.slice(0, 48),
          location: text,
          intake: "tenure",
          userTexts: [...c.userTexts, `Where I want to live: ${text}`],
          messages: [...c.messages, typed],
        }));
        await assistantSays(chat.id, { ns: "assistant", key: "askTenure" });
        return;
      }
      case "tenure": {
        const kind = parseTenure(text);
        if (kind) return chooseTenure(kind, text);
        addUserMessage(chat.id, typed);
        return assistantSays(chat.id, { ns: "assistant", key: "askTenureAgain" });
      }
      case "scope": {
        const scope = parseScope(text);
        if (scope) return chooseScope(scope, text);
        addUserMessage(chat.id, typed);
        return assistantSays(chat.id, {
          ns: "assistant",
          key: "scopeAgain",
          params: { area: placeFor(chat).area },
        });
      }
      case "household": {
        if (chat.householdKind === "family" && chat.householdSize == null) {
          const count = countPeople(text);
          if (count > 0) return submitHousehold({ kind: "family", people: count }, text);
          addUserMessage(chat.id, typed);
          return assistantSays(chat.id, { ns: "assistant", key: "householdCountAsk" });
        }
        const household = parseHousehold(text);
        if (household) return submitHousehold(household, text);
        addUserMessage(chat.id, typed);
        return assistantSays(chat.id, { ns: "assistant", key: "householdAgain" });
      }
      case "rooms": {
        const separate = parseRooms(text, chat.householdKind);
        if (separate !== null) return chooseRooms(separate, text);
        addUserMessage(chat.id, typed);
        return assistantSays(chat.id, { ns: "assistant", key: "roomsAgain" });
      }
    }
  }

  /**
   * Rent and buy lead to different places (rentals page / a broker in the
   * city). Those destinations do not exist yet, so the choice is stored on the
   * chat and the conversation carries on.
   */
  async function chooseTenure(kind: "rent" | "buy", label?: string) {
    const chat = active;
    if (!chat || isSending) return;
    const { place, area, city, hasArea } = placeFor(chat);
    patchChat(chat.id, (c) => ({
      ...c,
      title: ta(kind === "rent" ? "titleRent" : "titleBuy", { place }),
      tenure: kind,
      intake: "scope",
      userTexts: [...c.userTexts, kind === "rent" ? "I want to rent" : "I want to buy"],
      messages: [
        ...c.messages,
        label ? makeMessage("user", label) : specMessage("user", { ns: "assistant", key: kind }),
      ],
    }));
    await assistantSays(
      chat.id,
      hasArea
        ? { ns: "assistant", key: kind === "rent" ? "tenureAckRentArea" : "tenureAckBuyArea", params: { city, area } }
        : { ns: "assistant", key: kind === "rent" ? "tenureAckRent" : "tenureAckBuy", params: { place } },
      1200,
      [ta("stepReading"), ta("stepPlace", { place })],
    );
    await assistantSays(chat.id, { ns: "assistant", key: "scopeAsk", params: { area } }, 1000, [
      ta("stepAreas", { area }),
    ]);
  }

  async function chooseScope(scope: Scope, label?: string) {
    const chat = active;
    if (!chat || isSending) return;
    const { area } = placeFor(chat);
    const labelKey = scope === "only" ? "scopeOnly" : scope === "nearby" ? "scopeNearby" : "scopeWider";
    patchChat(chat.id, (c) => ({
      ...c,
      scope,
      intake: "household",
      userTexts: [
        ...c.userTexts,
        scope === "only"
          ? `Search only in ${area}`
          : scope === "nearby"
            ? `Search in ${area} and nearby areas`
            : `Search ${area} and a wider area around it`,
      ],
      messages: [
        ...c.messages,
        label ? makeMessage("user", label) : specMessage("user", { ns: "assistant", key: labelKey, params: { area } }),
      ],
    }));
    await assistantSays(chat.id, { ns: "assistant", key: `${labelKey}Reply`, params: { area } });
    await assistantSays(chat.id, { ns: "assistant", key: "householdAsk" }, 900);
  }

  async function submitHousehold(household: { kind: HouseholdKind; people: number | null }, raw: string) {
    const chat = active;
    if (!chat || isSending) return;
    if (household.kind === "family" && household.people === null) {
      patchChat(chat.id, (c) => ({
        ...c,
        householdKind: "family",
        householdSize: null,
        userTexts: [...c.userTexts, `Who will live there: ${raw}`],
        messages: [...c.messages, makeMessage("user", raw)],
      }));
      await assistantSays(chat.id, { ns: "assistant", key: "householdCountAsk" });
      return;
    }
    const needsRooms = household.kind !== "alone";
    patchChat(chat.id, (c) => ({
      ...c,
      householdKind: household.kind,
      householdSize: household.people,
      intake: needsRooms ? "rooms" : "budget",
      userTexts: [...c.userTexts, `Who will live there: ${raw}`],
      messages: [...c.messages, makeMessage("user", raw)],
    }));
    if (!needsRooms) {
      await askStep(chat.id, "budget", chat.tenure);
      return;
    }
    const key = household.kind === "couple" ? "roomsCouple" : household.kind === "friends" ? "roomsFriends" : "roomsOther";
    await assistantSays(chat.id, { ns: "assistant", key });
  }

  async function chooseRooms(separate: boolean, label?: string, labelKey?: string) {
    const chat = active;
    if (!chat || isSending) return;
    patchChat(chat.id, (c) => ({
      ...c,
      separateRooms: separate,
      intake: "budget",
      userTexts: [...c.userTexts, separate ? "We want separate bedrooms" : "We can share a bedroom"],
      messages: [
        ...c.messages,
        label
          ? makeMessage("user", label)
          : specMessage("user", { ns: "assistant", key: labelKey ?? (separate ? "roomsSeparate" : "roomsShare") }),
      ],
    }));
    await askStep(chat.id, "budget", chat.tenure);
  }

  /**
   * Asks the next question. When the lifestyle part is over ("done"), the
   * collected answers are read into priorities and only the details that are
   * still missing (commute, size, what matters most) are asked.
   */
  async function askStep(
    chatId: string,
    step: Chat["intake"],
    tenure?: "rent" | "buy",
    texts?: string[],
    asked?: PriorityFieldKey[],
  ) {
    if (step === "budget") {
      await assistantSays(chatId, { ns: "assistant", key: tenure === "buy" ? "budgetBuy" : "budgetRent" }, 700);
    } else if (isExtraStep(step)) {
      const intro =
        step === LIFE_STEPS[0] ? "sectionIntroLife" : step === HOME_STEPS[0] ? "sectionIntroHome" : step === TIMING_STEPS[0] ? "sectionIntroTiming" : null;
      if (intro) await assistantSays(chatId, { ns: "assistant", key: intro }, 500);
      await assistantSays(chatId, { ns: "assistant", key: `ask_${step}` }, 700);
    } else if (texts) {
      await finishIntake(chatId, texts, asked ?? []);
    }
  }

  async function readPriorities(texts: string[]) {
    const response = await fetch("/api/ai/priorities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: texts.join("\n\n") }),
    });
    if (!response.ok) throw new Error(t("errors.generic"));
    return (await response.json()) as {
      priorities: UserPriorities;
      source: "ai" | "heuristic";
      confidence: PriorityConfidence;
    };
  }

  /** End of the guided part: work out what is still missing and ask only that, or show the summary. */
  async function finishIntake(chatId: string, texts: string[], asked: PriorityFieldKey[]) {
    setIsSending(true);
    try {
      const data = await readPriorities(texts);
      const next = nextClarifyingField(data.confidence, asked);
      if (next) {
        setIsSending(false);
        await assistantSays(chatId, { ns: "assistant", key: "sectionIntroNumbers" }, 500);
        setIsSending(true);
      }
      patchChat(chatId, (c) => ({
        ...c,
        priorities: data.priorities,
        confidence: data.confidence,
        source: data.source,
        askedFields: asked,
        pendingField: next,
        stage: next ? "chatting" : "review",
        messages: [...c.messages, specMessage("assistant", next ? questionFor(next) : SUMMARY_SPEC)],
      }));
      setSelectedWeights([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setIsSending(false);
    }
  }

  /** Budget, asked right after the basics because it decides the most. */
  async function answerBudget(chat: Chat, text: string) {
    const skipped = text === ta(SKIP_KEY);
    const firstLife = nextExtraStep(null, { tenure: chat.tenure, householdKind: chat.householdKind });
    const texts = skipped ? chat.userTexts : [...chat.userTexts, `Budget: ${text}`];
    patchChat(chat.id, (c) => ({
      ...c,
      intake: firstLife,
      askedFields: c.askedFields.includes("budget") ? c.askedFields : [...c.askedFields, "budget"],
      userTexts: texts,
      messages: [...c.messages, makeMessage("user", text)],
    }));
    if (skipped) {
      await assistantSays(chat.id, { ns: "assistant", key: "extraAckSkip" }, 500);
    } else {
      setIsSending(true);
      const data = await readPriorities(texts).catch(() => null);
      setIsSending(false);
      if (data?.confidence.budget) {
        await assistantSaysText(
          chat.id,
          onlyMaxBudget(data.priorities)
            ? ta(chat.tenure === "rent" ? "ackRentMax" : "ackBudgetMax", {
                max: data.priorities.budgetMax.toLocaleString("sv-SE"),
              })
            : ta("ackBudget", {
                min: data.priorities.budgetMin.toLocaleString("sv-SE"),
                max: data.priorities.budgetMax.toLocaleString("sv-SE"),
              }),
          500,
        );
      } else {
        await assistantSays(chat.id, { ns: "assistant", key: "extraAck2" }, 500);
      }
    }
    await askStep(chat.id, firstLife, chat.tenure);
  }

  /** Built-in (no AI) handling of the lifestyle questions: store the answer, acknowledge, ask the next one. */
  async function answerExtra(chat: Chat, step: ExtraStep, text: string) {
    const ctx = {
      tenure: chat.tenure,
      householdKind: chat.householdKind,
      transport: step === "transport" ? text : chat.profile?.transport,
    };
    const next = nextExtraStep(step, ctx);
    const skipped = text === ta(SKIP_KEY);
    const negative = step === "pets" && /^\s*(no|none|nope|nej|inga|nothing|inget)\b/i.test(text);
    const line = skipped ? null : negative ? "Animals at home: none" : `${EXTRA_LABEL[step]}: ${text}`;
    const texts = line ? [...chat.userTexts, line] : chat.userTexts;
    patchChat(chat.id, (c) => ({
      ...c,
      intake: next,
      profile: skipped ? c.profile : { ...c.profile, [step]: text },
      userTexts: line ? [...c.userTexts, line] : c.userTexts,
      messages: [...c.messages, makeMessage("user", text)],
    }));
    const ackKey = skipped ? "extraAckSkip" : `extraAck${(EXTRA_STEPS.indexOf(step) % 6) + 1}`;
    await assistantSays(chat.id, { ns: "assistant", key: ackKey }, 600);
    await askStep(chat.id, next, chat.tenure, texts, chat.askedFields);
  }

  /** Changes one answer from the summary and re-reads the priorities. */
  async function saveProfileEdit(step: ExtraStep, value: string) {
    const chat = active;
    const trimmed = value.trim();
    setEditingStep(null);
    if (!chat || !trimmed || trimmed === chat.profile?.[step]) return;
    const none = step === "pets" && /^\s*(no|none|nope|nej|inga|nothing|inget)\b/i.test(trimmed);
    const texts = [...chat.userTexts, none ? "Animals at home (updated): none" : `${EXTRA_LABEL[step]} (updated): ${trimmed}`];
    patchChat(chat.id, (c) => ({ ...c, profile: { ...c.profile, [step]: trimmed }, userTexts: texts }));
    const data = await readPriorities(texts).catch(() => null);
    if (data) {
      patchChat(chat.id, (c) => ({ ...c, priorities: data.priorities, confidence: data.confidence, source: data.source }));
    }
  }

  async function askIntakeAi(chat: Chat, step: string, answer: string): Promise<IntakeAiResult | null> {
    if (aiOk.current === false || Date.now() < aiDownUntil.current) return null;
    try {
      const response = await fetch("/api/ai/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: locale === "sv" ? "sv" : "en",
          step,
          known: chat.userTexts.slice(-30).map((entry) => entry.slice(0, 300)),
          transcript: chat.messages
            .slice(-10)
            .map((m) => ({ role: m.role, text: messageText(m).slice(0, 1500) })),
          answer: answer.slice(0, 2000),
        }),
      });
      if (!response.ok) return null;
      const data = (await response.json()) as { result: IntakeAiResult | null; configured: boolean };
      aiOk.current = data.configured;
      if (data.configured && !data.result) aiDownUntil.current = Date.now() + 120_000;
      return data.result;
    } catch {
      return null;
    }
  }

  /** Applies one AI-read answer: store what it understood, reply like a person, then ask what is still missing. */
  async function applyAiTurn(chat: Chat, step: IntakeStepKey, text: string, r: IntakeAiResult) {
    const order: IntakeStepKey[] = ["location", "tenure", "scope", "household", "rooms", "budget", ...EXTRA_STEPS];
    const labels: Record<IntakeStepKey, string> = {
      location: "Where I want to live",
      tenure: "Rent or buy",
      scope: "Search area",
      household: "Who will live there",
      rooms: "Bedrooms",
      budget: "Budget",
      ...EXTRA_LABEL,
    };
    const tenure = r.tenure ?? chat.tenure;
    const scope = r.scope ?? chat.scope;
    const kind = r.householdKind ?? chat.householdKind;
    const size = r.householdSize ?? chat.householdSize ?? null;
    const separate = r.separateRooms ?? chat.separateRooms;
    const primaryPlace = step === "location" ? (r.primaryPlace ?? undefined) : chat.primaryPlace;
    const location = step === "location" ? text : chat.location;

    let advance = r.advance || (chat.retries ?? 0) >= 2;
    let followUp = r.followUp;
    if (advance && step === "household" && kind === "family" && size == null && (chat.retries ?? 0) < 2) {
      advance = false;
      followUp = ta("householdCountAsk");
    }

    const needs = (st: IntakeStepKey): boolean => {
      if (st === "tenure") return !tenure;
      if (st === "scope") return !scope;
      if (st === "household") return !kind;
      if (st === "rooms") return Boolean(kind) && kind !== "alone" && separate == null;
      if (isExtraStep(st)) {
        return stepApplies(st, { tenure, householdKind: kind, transport: step === "transport" ? text : chat.profile?.transport });
      }
      return true;
    };
    const next: Chat["intake"] = advance
      ? (order.slice(order.indexOf(step) + 1).find(needs) ?? "done")
      : step;
    const place = placeFor({ location, primaryPlace });

    patchChat(chat.id, (c) => ({
      ...c,
      title:
        tenure && place.place
          ? ta(tenure === "rent" ? "titleRent" : "titleBuy", { place: place.place })
          : c.title || text.slice(0, 48),
      location,
      primaryPlace,
      tenure,
      scope,
      householdKind: kind,
      householdSize: size,
      separateRooms: separate ?? undefined,
      intake: next,
      retries: advance ? 0 : (c.retries ?? 0) + 1,
      profile: isExtraStep(step) ? { ...c.profile, [step]: text } : c.profile,
      askedFields: step === "budget" && !c.askedFields.includes("budget") ? [...c.askedFields, "budget"] : c.askedFields,
      userTexts: [...c.userTexts, `${labels[step]}: ${r.summary}`],
    }));

    if (!advance) {
      await assistantSaysText(chat.id, [r.reply, followUp].filter(Boolean).join("\n\n"), 500);
      return;
    }
    if (r.reply) await assistantSaysText(chat.id, r.reply, 500);
    if (next === "tenure") {
      await assistantSays(chat.id, { ns: "assistant", key: "askTenure" }, 700);
    } else if (next === "scope") {
      await assistantSays(chat.id, { ns: "assistant", key: "scopeAsk", params: { area: place.area } }, 700);
    } else if (next === "household") {
      await assistantSays(chat.id, { ns: "assistant", key: "householdAsk" }, 700);
    } else if (next === "rooms") {
      const key = kind === "couple" ? "roomsCouple" : kind === "friends" ? "roomsFriends" : "roomsOther";
      await assistantSays(chat.id, { ns: "assistant", key }, 700);
    } else {
      const asked: PriorityFieldKey[] =
        step === "budget" && !chat.askedFields.includes("budget") ? [...chat.askedFields, "budget"] : chat.askedFields;
      await askStep(chat.id, next, tenure, [...chat.userTexts, `${labels[step]}: ${r.summary}`], asked);
    }
  }

  /** Same as assistantSays but for text written by the AI (not a translation key). */
  async function assistantSaysText(chatId: string, text: string, thinkMs = 700) {
    setIsSending(true);
    await sleep(thinkMs);
    patchChat(chatId, (c) => ({ ...c, messages: [...c.messages, makeMessage("assistant", text)] }));
    setIsSending(false);
  }

  /** Shows what the assistant is doing in grey (like "Thinking…"), then the message fades in. */
  async function assistantSays(chatId: string, spec: MessageSpec, thinkMs = 1000, steps?: string[]) {
    setIsSending(true);
    if (steps && steps.length > 0) {
      const each = Math.max(500, Math.round(thinkMs / steps.length));
      for (const step of steps) {
        setThinkingLine(step);
        await sleep(each);
      }
    } else {
      await sleep(thinkMs);
    }
    setThinkingLine(null);
    patchChat(chatId, (c) => ({ ...c, messages: [...c.messages, specMessage("assistant", spec)] }));
    setIsSending(false);
  }

  /** Stable pick per chat so the greeting does not flicker on re-render. */
  function pick(count: number): number {
    const seed = `${active?.id ?? ""}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return (h % count) + 1;
  }

  function timeGreeting(name?: string): string {
    const hour = new Date().getHours();
    const [slot, count] =
      hour >= 5 && hour < 12
        ? ["greetMorning", 10]
        : hour >= 12 && hour < 17
          ? ["greetDay", 10]
          : hour >= 17 && hour < 22
            ? ["greetEvening", 10]
            : ["greetLate", 10];
    const raw = ta(`${slot}${pick(count as number)}` as Parameters<typeof ta>[0], { name: "\u0001" });
    return name ? raw.replace("\u0001", name) : raw.replace(/,?\s*\u0001/, "");
  }

  function handleSkip() {
    const chat = active;
    if (!chat || !chat.pendingField || !chat.confidence || isSending) return;
    const asked = [...chat.askedFields, chat.pendingField];
    const next = nextClarifyingField(chat.confidence, asked);
    patchChat(chat.id, (c) => ({
      ...c,
      askedFields: asked,
      pendingField: next,
      stage: next ? "chatting" : "review",
      messages: [
        ...c.messages,
        specMessage("user", { ns: "onboarding", key: "clarify.skip" }),
        specMessage("assistant", next ? questionFor(next) : SUMMARY_SPEC),
      ],
    }));
  }

  function confirmWeights(balanced: boolean) {
    const chat = active;
    if (!chat || !chat.priorities || !chat.confidence || isSending) return;
    const chosen = balanced ? [] : selectedWeights;
    if (!balanced && chosen.length === 0) return;

    const priorities: UserPriorities = {
      ...chat.priorities,
      weights: chat.priorities.weights.map((weight) => ({
        ...weight,
        importance: chosen.includes(weight.category) ? 5 : 3,
      })),
    };
    const confidence: PriorityConfidence = { ...chat.confidence, weights: true };
    const asked = [...chat.askedFields, "weights" as PriorityFieldKey];
    const next = nextClarifyingField(confidence, asked);
    const label = balanced
      ? t("clarify.weights.balanced")
      : chosen.map((category) => categoryLabel(category)).join(", ");

    patchChat(chat.id, (c) => ({
      ...c,
      priorities,
      confidence,
      askedFields: asked,
      pendingField: next,
      stage: next ? "chatting" : "review",
      messages: [
        ...c.messages,
        makeMessage("user", label),
        specMessage("assistant", next ? questionFor(next) : SUMMARY_SPEC),
      ],
    }));
    setSelectedWeights([]);
  }

  function toggleWeight(category: Category) {
    setSelectedWeights((prev) => {
      if (prev.includes(category)) return prev.filter((item) => item !== category);
      if (prev.length >= 2) return prev;
      return [...prev, category];
    });
  }

  function handleConfirm() {
    if (!active?.priorities || !active.confidence) return;
    savePriorities(
      active.tenure ? { ...active.priorities, housingIntent: active.tenure } : active.priorities,
      active.confidence,
    );
    saveReportContext({
      tenure: active.tenure,
      place: active.location ? placeFor(active).place : undefined,
      profile: active.profile,
      householdSize: active.householdSize ?? null,
    });
    router.push("/recommendations");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit(draft);
    }
  }

  const composer = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(draft);
      }}
      className="space-y-2"
    >
      {active?.pendingField && active.pendingField !== "weights" && active.stage === "chatting" && !isSending && (
        <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
          {t("clarify.skip")}
        </Button>
      )}
      <div className="flex items-end gap-2 rounded-3xl border border-border bg-card p-2 shadow-sm">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            active?.intake === "budget" && active.tenure === "rent"
              ? ta("placeholder_budgetRent")
              : isExtraStep(active?.intake) || active?.intake === "budget"
              ? ta(`placeholder_${active?.intake}` as Parameters<typeof ta>[0])
              : active?.intake === "location"
              ? ta("placeholderLocation")
              : active?.intake === "tenure"
                ? ta("placeholderTenure")
                : active?.intake === "scope"
                  ? ta("placeholderScope")
                  : active?.intake === "household"
                    ? ta("placeholderHousehold")
                    : active?.intake === "rooms"
                      ? ta("placeholderRooms")
                      : ta("placeholder")
          }
          aria-label={ta("inputLabel")}
          rows={1}
          maxLength={4000}
          disabled={isSending}
          className="min-h-[3rem] resize-none rounded-none border-0 bg-transparent px-3 py-3 text-base leading-6 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 md:text-lg"
        />
        <Button
          type="submit"
          size="icon"
          className="shrink-0 rounded-full"
          disabled={isSending || draft.trim().length === 0}
          aria-label={ta("send")}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <p className="px-4 text-center text-xs text-muted-foreground">{ta("disclaimer")}</p>
    </form>
  );

  const priorities = active?.priorities ?? null;
  const confidence = active?.confidence ?? null;
  const showResults = (active?.stage === "review" || active?.stage === "editing") && priorities && confidence;
  const conflicts = showResults && priorities ? detectPriorityConflicts(priorities) : [];
  const topWeights = priorities
    ? priorities.weights.filter((weight) => weight.importance >= 5).map((weight) => categoryLabel(weight.category))
    : [];
  const assumed = confidence
    ? (["budget", "commute", "space", "weights"] as PriorityFieldKey[]).filter((field) => !confidence[field])
    : [];

  const userLabel = account?.displayName ?? account?.firstName ?? ta("you");

  const saved = chats.filter((chat) => chat.messages.length > 0);
  const pinnedChats = saved.filter((chat) => chat.pinned);
  const recentChats = saved.filter((chat) => !chat.pinned);

  function renderChatRow(chat: Chat) {
    const isActive = chat.id === activeId;
    const menuOpen = menuChatId === chat.id;

    if (renamingId === chat.id) {
      return (
        <li key={chat.id} className="px-1">
          <input
            autoFocus
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitRename();
              if (event.key === "Escape") setRenamingId(null);
            }}
            maxLength={60}
            aria-label={ta("rename")}
            className="w-full rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </li>
      );
    }

    return (
      <li key={chat.id} className="group relative" data-chat-menu>
        <button
          type="button"
          onClick={() => openChat(chat.id)}
          className={`flex w-full min-w-0 items-center gap-2 rounded-lg py-2 pl-2 pr-9 text-left text-sm hover:bg-muted ${
            isActive || menuOpen ? "bg-muted font-medium" : ""
          }`}
        >
          {chat.pinned ? (
            <Pin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="truncate">{chat.title || ta("newChatTitle")}</span>
        </button>
        <button
          type="button"
          aria-label={ta("moreOptions")}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuChatId(menuOpen ? null : chat.id)}
          className={`absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-foreground focus:opacity-100 group-hover:opacity-100 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-1 top-full z-30 mt-1 w-44 rounded-xl border border-border bg-popover p-1 text-sm shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => startRename(chat.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-muted"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {ta("rename")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => togglePin(chat.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-muted"
            >
              {chat.pinned ? <PinOff className="h-4 w-4" aria-hidden="true" /> : <Pin className="h-4 w-4" aria-hidden="true" />}
              {chat.pinned ? ta("unpin") : ta("pin")}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => deleteChat(chat.id)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-destructive hover:bg-muted"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {ta("deleteChat")}
            </button>
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-background text-foreground">
      <AssistantAuthGate />
      {sidebarOpen && (
        <button
          type="button"
          aria-label={ta("hideMenu")}
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Collapsed rail: the roof mark opens the sidebar (desktop). */}
      {!sidebarOpen && (
        <div className="hidden w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-3 md:flex">
          <button
            type="button"
            aria-label={ta("showMenu")}
            title={ta("showMenu")}
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-muted"
          >
            <LogoMark className="h-6 w-6" />
          </button>
          <button
            type="button"
            aria-label={ta("newChat")}
            title={ta("newChat")}
            onClick={startNewChat}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <SquarePen className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={ta("pinned")}
            title={ta("pinned")}
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pin className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={ta("history")}
            title={ta("history")}
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MessageSquare className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      <aside
        className={`${sidebarOpen ? "flex" : "hidden"} absolute inset-y-0 left-0 z-20 w-72 flex-col border-r border-border bg-card md:static md:z-auto`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" aria-label={ta("backToSite")} className="flex items-center">
            <Logo className="h-4" />
          </Link>
          <Button variant="ghost" size="icon" aria-label={ta("hideMenu")} title={ta("hideMenu")} onClick={() => setSidebarOpen(false)}>
            <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>

        <div className="px-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={startNewChat}>
            <SquarePen className="h-4 w-4" aria-hidden="true" />
            {ta("newChat")}
          </Button>
        </div>

        <nav aria-label={ta("history")} className="mt-4 flex-1 overflow-y-auto px-3">
          {saved.length === 0 && <p className="px-2 text-sm text-muted-foreground">{ta("noHistory")}</p>}
          {pinnedChats.length > 0 && (
            <>
              <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{ta("pinned")}</p>
              <ul className="mb-4 space-y-1">{pinnedChats.map(renderChatRow)}</ul>
            </>
          )}
          {recentChats.length > 0 && (
            <>
              <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{ta("history")}</p>
              <ul className="space-y-1">{recentChats.map(renderChatRow)}</ul>
            </>
          )}
        </nav>

        <div className="border-t border-border p-2">
          <SidebarAccountMenu />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        {!sidebarOpen && (
          <div className="flex items-center px-3 py-3 md:hidden">
            <button
              type="button"
              aria-label={ta("showMenu")}
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
            >
              <LogoMark className="h-6 w-6" />
            </button>
          </div>
        )}

        {active && active.messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
            <div className="w-full max-w-2xl space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-semibold tracking-tight">
                  {timeGreeting(account?.displayName ?? account?.firstName ?? undefined)}
                </h2>
                <p className="text-muted-foreground">{ta(`startLine${pick(8)}` as Parameters<typeof ta>[0])}</p>
                <p className="text-lg font-medium">{ta("firstQuestion")}</p>
              </div>
              {composer}
              {error && (
                <p role="alert" className="text-center text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <div role="log" aria-live="polite" className="flex-1 overflow-y-auto px-4">
              <div className="mx-auto max-w-3xl space-y-5 py-4">
                {active?.messages.map((message) =>
                  message.role === "user" ? (
                    <div key={message.id} className="chat-message-in motion-ok flex flex-col items-end gap-1">
                      <span className="px-1 text-xs font-medium text-muted-foreground">{userLabel}</span>
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-sm text-background">
                        {messageText(message)}
                      </div>
                    </div>
                  ) : (
                    <div key={message.id} className="chat-message-in motion-ok flex flex-col items-start gap-1">
                      <span className="px-1 text-xs font-medium text-muted-foreground">{ta("name")}</span>
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm">
                        {messageText(message)}
                      </div>
                    </div>
                  ),
                )}

                {isSending && (
                  <div className="chat-message-in motion-ok flex flex-col items-start gap-1">
                    <span className="px-1 text-xs font-medium text-muted-foreground">{ta("name")}</span>
                    <p className="motion-ok animate-pulse px-1 text-sm text-muted-foreground">{thinkingLine ?? ta("thinking")}</p>
                  </div>
                )}

                {active?.intake === "tenure" && !isSending && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-full px-6" onClick={() => void chooseTenure("rent")}>
                      {ta("rent")}
                    </Button>
                    <Button variant="outline" className="rounded-full px-6" onClick={() => void chooseTenure("buy")}>
                      {ta("buy")}
                    </Button>
                  </div>
                )}

                {active?.intake === "scope" && !isSending && (
                  <div className="flex flex-wrap gap-2">
                    {(["only", "nearby", "wider"] as const).map((option) => (
                      <Button
                        key={option}
                        variant="outline"
                        className="rounded-full px-5"
                        onClick={() => void chooseScope(option)}
                      >
                        {ta(option === "only" ? "scopeOnly" : option === "nearby" ? "scopeNearby" : "scopeWider", {
                          area: placeFor(active).area,
                        })}
                      </Button>
                    ))}
                  </div>
                )}

                {active?.intake === "household" && !(active.householdKind === "family" && active.householdSize == null) && !isSending && (
                  <div className="flex flex-wrap gap-2">
                    {(["hhAlone", "hhCouple", "hhFamily", "hhFriends", "hhSiblings"] as const).map((key) => (
                      <Button key={key} variant="outline" className="rounded-full px-5" onClick={() => void submit(ta(key))}>
                        {ta(key)}
                      </Button>
                    ))}
                  </div>
                )}

                {(isExtraStep(active?.intake) || active?.intake === "budget") && !isSending && (
                  <p className="motion-ok chat-message-in -mt-2 px-1 text-xs text-muted-foreground">
                    {ta(`why_${active?.intake}` as Parameters<typeof ta>[0])}
                  </p>
                )}

                {(isExtraStep(active?.intake) || active?.intake === "budget") && !isSending && (
                  <div className="flex flex-wrap gap-2">
                    {[...(isExtraStep(active?.intake) ? (EXTRA_CHIPS[active.intake] ?? []) : []), SKIP_KEY].map((key) => (
                      <Button
                        key={key}
                        variant={key === "skipQuestion" ? "ghost" : "outline"}
                        className={key === "skipQuestion" ? "rounded-full px-4 text-muted-foreground" : "rounded-full px-5"}
                        onClick={() => void submit(ta(key as Parameters<typeof ta>[0]))}
                      >
                        {ta(key as Parameters<typeof ta>[0])}
                      </Button>
                    ))}
                  </div>
                )}

                {active?.intake === "rooms" && !isSending && (
                  <div className="flex flex-wrap gap-2">
                    {(active.householdKind === "couple"
                      ? ([["roomsShare", false], ["roomsSeparate", true]] as const)
                      : active.householdKind === "friends"
                        ? ([["roomsYesSeparate", true], ["roomsNoShare", false]] as const)
                        : ([["roomsOwn", true], ["roomsSome", false]] as const)
                    ).map(([key, separate]) => (
                      <Button
                        key={key}
                        variant="outline"
                        className="rounded-full px-5"
                        onClick={() => void chooseRooms(separate, undefined, key)}
                      >
                        {ta(key)}
                      </Button>
                    ))}
                  </div>
                )}

                {active?.pendingField === "weights" && active.stage === "chatting" && !isSending && (
                  <div className="space-y-3 rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((category) => {
                        const selected = selectedWeights.includes(category);
                        return (
                          <button
                            key={category}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleWeight(category)}
                            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                              selected
                                ? "border-foreground bg-foreground text-background"
                                : "border-border hover:bg-muted"
                            }`}
                          >
                            {categoryLabel(category)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground">{t("clarify.weights.hint")}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" disabled={selectedWeights.length === 0} onClick={() => confirmWeights(false)}>
                        {t("clarify.continue")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => confirmWeights(true)}>
                        {t("clarify.weights.balanced")}
                      </Button>
                    </div>
                  </div>
                )}

                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}

                {showResults && priorities && confidence && (
                  <div className="space-y-4">
                    <section className="rounded-2xl border border-border p-4">
                      <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {ta("situationTitle")}
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        <Chip>
                          {onlyMaxBudget(priorities)
                            ? ta(active?.tenure === "rent" ? "budgetUpToMonth" : "budgetUpTo", { max: formatKr(priorities.budgetMax) })
                            : `${formatKr(priorities.budgetMin)} – ${formatKr(priorities.budgetMax)}`}
                        </Chip>
                        <Chip>
                          {t("summary.commuteValue", {
                            mode: modeLabel(priorities.commuteMode),
                            minutes: priorities.commuteMaxMinutes,
                          })}
                        </Chip>
                        <Chip>
                          {t("summary.spaceValue", {
                            bedrooms: priorities.minBedrooms,
                            bathrooms: priorities.minBathrooms,
                          })}
                        </Chip>
                        {topWeights.length > 0 ? (
                          <Chip>
                            {t("summary.topPriorities")}: {topWeights.join(", ")}
                          </Chip>
                        ) : (
                          <Chip>{t("summary.topPrioritiesBalanced")}</Chip>
                        )}
                        {priorities.mustHaves.map((item) => (
                          <Chip key={`must-${item}`}>{prettyTag(item)}</Chip>
                        ))}
                        {priorities.lifestyleTags.map((item) => (
                          <Chip key={`life-${item}`}>{prettyTag(item)}</Chip>
                        ))}
                        {priorities.dealBreakers.map((item) => (
                          <Chip key={`deal-${item}`}>
                            {t("summary.dealBreakers")}: {prettyTag(item)}
                          </Chip>
                        ))}
                      </div>
                      {assumed.length > 0 && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          {t("summary.assumedNote", { fields: assumed.map((field) => fieldLabel(field)).join(", ") })}
                        </p>
                      )}
                    </section>

                    {active?.profile && Object.keys(active.profile).length > 0 && (
                      <section className="rounded-2xl border border-border p-4">
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {ta("profileTitle")}
                        </p>
                        <p className="mb-3 text-xs text-muted-foreground">{ta("profileHint")}</p>
                        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
                          {EXTRA_STEPS.filter((step) => active.profile?.[step]).map((step) => (
                            <div key={step} className="contents">
                              <dt className="text-muted-foreground">{ta(`profile_${step}` as Parameters<typeof ta>[0])}</dt>
                              <dd>
                                {editingStep === step ? (
                                  <form
                                    className="flex gap-2"
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      void saveProfileEdit(step, editDraft);
                                    }}
                                  >
                                    <input
                                      autoFocus
                                      value={editDraft}
                                      onChange={(event) => setEditDraft(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === "Escape") setEditingStep(null);
                                      }}
                                      maxLength={300}
                                      aria-label={ta(`profile_${step}` as Parameters<typeof ta>[0])}
                                      className="min-w-0 flex-1 rounded-lg border border-border bg-transparent px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
                                    />
                                    <Button type="submit" size="sm" className="rounded-full">
                                      {ta("profileSave")}
                                    </Button>
                                  </form>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStep(step);
                                      setEditDraft(active.profile?.[step] ?? "");
                                    }}
                                    className="group inline-flex items-start gap-2 rounded text-left hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground"
                                    aria-label={ta("profileEdit", { field: ta(`profile_${step}` as Parameters<typeof ta>[0]) })}
                                  >
                                    <span>{active.profile?.[step]}</span>
                                    <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-40 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                                  </button>
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    )}

                    <section className="rounded-2xl border border-border p-4">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {ta("checklistTitle")}
                      </p>
                      <p className="mb-3 text-sm text-muted-foreground">{ta("checklistIntro")}</p>
                      <ul className="space-y-2 text-sm">
                        {(active?.tenure === "rent"
                          ? (["checkRent1", "checkRent2", "checkRent3", "checkRent4", "checkRent5"] as const)
                          : active?.tenure === "buy"
                            ? (["checkBuy1", "checkBuy2", "checkBuy3", "checkBuy4", "checkBuy5", "checkBuy6"] as const)
                            : ([] as const)
                        )
                          .concat(["checkAll1", "checkAll2", "checkAll3"] as never)
                          .map((key) => (
                            <li key={key} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
                              <span>{ta(key as Parameters<typeof ta>[0])}</span>
                            </li>
                          ))}
                      </ul>
                    </section>

                    {conflicts.map((conflict) => (
                      <section key={conflict.id} className="rounded-2xl border border-border p-4">
                        <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          <span className="h-2 w-2 rounded-full bg-foreground" aria-hidden="true" />
                          {ta("conflictsTitle")}
                        </p>
                        <h3 className="font-medium">{conflict.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{conflict.description}</p>
                        <ul className="mt-3 space-y-2">
                          {conflict.options.map((option) => (
                            <li key={option.label} className="rounded-xl bg-muted px-3 py-2 text-sm">
                              <p className="font-medium">{option.label}</p>
                              <p className="text-muted-foreground">{option.description}</p>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}

                    {active?.stage === "editing" ? (
                      <div className="space-y-4">
                        <PriorityReviewForm
                          priorities={priorities}
                          onChange={(updated) =>
                            patchChat(activeChatId, (c) => ({ ...c, priorities: updated }))
                          }
                        />
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => patchChat(activeChatId, (c) => ({ ...c, stage: "review" }))}
                          >
                            {t("review.back")}
                          </Button>
                          <Button onClick={handleConfirm}>
                            {t("review.confirm")}
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          onClick={() => patchChat(activeChatId, (c) => ({ ...c, stage: "editing" }))}
                        >
                          {t("summary.edit")}
                        </Button>
                        <Button onClick={handleConfirm}>
                          {t("summary.confirm")}
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            </div>

            <div className="px-4 pb-4">
              <div className="mx-auto max-w-3xl space-y-2">
                {active && sectionOf(active) !== null && (
                  <div className="px-1" aria-live="polite">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {ta("progressLabel", {
                          n: String((sectionOf(active) ?? 0) + 1),
                          total: String(SECTION_KEYS.length),
                        })}
                        {" · "}
                        <span className="text-foreground">{ta(SECTION_KEYS[sectionOf(active) ?? 0])}</span>
                      </span>
                    </div>
                    <div className="flex gap-1" aria-hidden="true">
                      {SECTION_KEYS.map((key, index) => (
                        <span
                          key={key}
                          className={`h-1 flex-1 rounded-full transition-colors duration-500 ${
                            index <= (sectionOf(active) ?? 0) ? "bg-foreground" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {composer}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
