"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Loader2,
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
import { savePriorities } from "@/hooks/use-priorities-store";
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
  intake?: "location" | "tenure" | "done";
  location?: string;
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

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [selectedWeights, setSelectedWeights] = useState<Category[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
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

    if (chat.intake === "location") {
      patchChat(chat.id, (c) => ({
        ...c,
        title: c.title || trimmed.slice(0, 48),
        location: trimmed,
        intake: "tenure",
        userTexts: [...c.userTexts, `Where I want to live: ${trimmed}`],
        messages: [...c.messages, makeMessage("user", trimmed)],
      }));
      setDraft("");
      setError(null);
      await assistantSays(chat.id, { ns: "assistant", key: "askTenure" });
      return;
    }

    if (chat.intake === "tenure") {
      const kind = /rent|hyr/i.test(trimmed) ? "rent" : /buy|köp|kop|purchase/i.test(trimmed) ? "buy" : null;
      setDraft("");
      if (kind) {
        await chooseTenure(kind, trimmed);
      } else {
        patchChat(chat.id, (c) => ({ ...c, messages: [...c.messages, makeMessage("user", trimmed)] }));
        await assistantSays(chat.id, { ns: "assistant", key: "askTenureAgain" });
      }
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
        messages: [
          ...c.messages,
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
  async function chooseTenure(kind: "rent" | "buy", label?: string) {
    const chat = active;
    if (!chat || isSending) return;
    const city = cleanCity(chat.location ?? "");
    patchChat(chat.id, (c) => ({
      ...c,
      tenure: kind,
      intake: "done",
      userTexts: [...c.userTexts, kind === "rent" ? "I want to rent" : "I want to buy"],
      messages: [
        ...c.messages,
        label ? makeMessage("user", label) : specMessage("user", { ns: "assistant", key: kind }),
      ],
    }));
    await assistantSays(chat.id, { ns: "assistant", key: kind === "rent" ? "rentNext" : "buyNext", params: { city } });
    await assistantSays(chat.id, { ns: "assistant", key: "continuePrompt" }, 700);
  }

  /** Shows the "Thinking…" line for a moment, then the assistant's message fades in. */
  async function assistantSays(chatId: string, spec: MessageSpec, thinkMs = 1000) {
    setIsSending(true);
    await sleep(thinkMs);
    patchChat(chatId, (c) => ({ ...c, messages: [...c.messages, specMessage("assistant", spec)] }));
    setIsSending(false);
  }

  function isLateNight(): boolean {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 5;
  }

  function timeGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 10) return ta("greetMorning");
    if (hour >= 10 && hour < 17) return ta("greetDay");
    if (hour >= 17 && hour < 22) return ta("greetEvening");
    return ta("greetLate");
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
    savePriorities(active.priorities, active.confidence);
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
            active?.intake === "location"
              ? ta("placeholderLocation")
              : active?.intake === "tenure"
                ? ta("placeholderTenure")
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
                  {isLateNight() || !(account?.displayName ?? account?.firstName)
                    ? timeGreeting()
                    : `${timeGreeting()}, ${account?.displayName ?? account?.firstName}`}
                </h2>
                <p className="text-muted-foreground">
                  {isLateNight()
                    ? (account?.displayName ?? account?.firstName)
                      ? ta("startLate", { name: account?.displayName ?? account?.firstName ?? "" })
                      : ta("startLateNoName")
                    : ta("startLine")}
                </p>
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
                    <p className="motion-ok animate-pulse px-1 text-sm text-muted-foreground">{ta("thinking")}</p>
                  </div>
                )}

                {active?.intake === "tenure" && !isSending && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-full px-6" onClick={() => chooseTenure("rent")}>
                      {ta("rent")}
                    </Button>
                    <Button variant="outline" className="rounded-full px-6" onClick={() => chooseTenure("buy")}>
                      {ta("buy")}
                    </Button>
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
                          {formatKr(priorities.budgetMin)} – {formatKr(priorities.budgetMax)}
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
              <div className="mx-auto max-w-3xl">{composer}</div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
