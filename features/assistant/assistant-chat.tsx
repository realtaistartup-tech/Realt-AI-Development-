"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Loader2,
  Menu,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Link, useRouter } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
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
type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

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
};

const STORAGE_KEY = "realtai.assistant.chats.v1";
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
  };
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

  function questionFor(field: PriorityFieldKey): string {
    switch (field) {
      case "budget":
        return t("clarify.budget.question");
      case "commute":
        return t("clarify.commute.question");
      case "space":
        return t("clarify.space.question");
      case "weights":
        return t("clarify.weights.question");
    }
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

  function deleteChat(id: string) {
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
          makeMessage("assistant", next ? questionFor(next) : ta("summaryIntro")),
        ],
      }));
      setSelectedWeights([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setIsSending(false);
    }
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
        makeMessage("user", t("clarify.skip")),
        makeMessage("assistant", next ? questionFor(next) : ta("summaryIntro")),
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
        makeMessage("assistant", next ? questionFor(next) : ta("summaryIntro")),
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
          placeholder={ta("placeholder")}
          aria-label={ta("inputLabel")}
          rows={1}
          maxLength={4000}
          disabled={isSending}
          className="min-h-[2.75rem] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
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

  return (
    <div className="fixed inset-0 z-50 flex bg-background text-foreground">
      {sidebarOpen && (
        <button
          type="button"
          aria-label={ta("hideMenu")}
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`${sidebarOpen ? "flex" : "hidden"} absolute inset-y-0 left-0 z-20 w-72 flex-col border-r border-border bg-card md:static md:z-auto`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/" aria-label={ta("backToSite")} className="flex items-center">
            <Logo className="h-4" />
          </Link>
          <Button variant="ghost" size="icon" aria-label={ta("hideMenu")} onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="px-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={startNewChat}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {ta("newChat")}
          </Button>
        </div>

        <nav aria-label={ta("history")} className="mt-4 flex-1 overflow-y-auto px-3">
          <p className="px-2 pb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {ta("history")}
          </p>
          {chats.filter((chat) => chat.messages.length > 0).length === 0 && (
            <p className="px-2 text-sm text-muted-foreground">{ta("noHistory")}</p>
          )}
          <ul className="space-y-1">
            {chats
              .filter((chat) => chat.messages.length > 0)
              .map((chat) => (
                <li key={chat.id} className="group flex items-center">
                  <button
                    type="button"
                    onClick={() => openChat(chat.id)}
                    className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted ${
                      chat.id === activeId ? "bg-muted font-medium" : ""
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{chat.title || ta("newChatTitle")}</span>
                  </button>
                  <button
                    type="button"
                    aria-label={ta("deleteChat")}
                    onClick={() => deleteChat(chat.id)}
                    className="ml-1 rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
          </ul>
        </nav>

        <div className="border-t border-border p-2">
          <SidebarAccountMenu />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 px-4 py-3">
          {!sidebarOpen && (
            <Button variant="ghost" size="icon" aria-label={ta("showMenu")} onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          )}
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          <h1 className="text-base font-semibold tracking-tight">{ta("name")}</h1>
        </div>

        {active && active.messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
            <div className="w-full max-w-2xl space-y-6">
              <div className="space-y-2 text-center">
                <h2 className="text-3xl font-semibold tracking-tight">{ta("emptyHeading")}</h2>
                <p className="text-muted-foreground">{ta("greeting")}</p>
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
                    <div key={message.id} className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-sm text-background">
                        {message.text}
                      </div>
                    </div>
                  ) : (
                    <div key={message.id} className="flex justify-start">
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-muted px-4 py-2.5 text-sm">
                        {message.text}
                      </div>
                    </div>
                  ),
                )}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      {ta("thinking")}
                    </div>
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
