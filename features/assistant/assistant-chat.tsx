"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Loader2, Send, Sparkles } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { savePriorities } from "@/hooks/use-priorities-store";
import { nextClarifyingField } from "@/services/onboarding/clarifying-flow";
import type { PriorityConfidence, PriorityFieldKey, UserPriorities } from "@/types";
import { PriorityReviewForm } from "@/features/onboarding/priority-review-form";
import { PrioritySummary } from "@/features/onboarding/priority-summary";

type ChatMessage = { id: number; role: "user" | "assistant"; text: string };
type Stage = "chatting" | "review" | "editing";

function ChatBubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  const isUser = role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
            : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm"
        }
      >
        {children}
      </div>
    </div>
  );
}

export function AssistantChat() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const ta = useTranslations("assistant");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userTexts, setUserTexts] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [priorities, setPriorities] = useState<UserPriorities | null>(null);
  const [confidence, setConfidence] = useState<PriorityConfidence | null>(null);
  const [source, setSource] = useState<"ai" | "heuristic" | null>(null);
  const [askedFields, setAskedFields] = useState<PriorityFieldKey[]>([]);
  const [pendingField, setPendingField] = useState<PriorityFieldKey | null>(null);
  const [stage, setStage] = useState<Stage>("chatting");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, stage, isSending, error]);

  function addMessage(role: "user" | "assistant", text: string) {
    const id = nextId.current++;
    setMessages((prev) => [...prev, { id, role, text }]);
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

  function advance(updatedConfidence: PriorityConfidence, updatedAsked: PriorityFieldKey[]) {
    setAskedFields(updatedAsked);
    const next = nextClarifyingField(updatedConfidence, updatedAsked);
    if (next) {
      setPendingField(next);
      setStage("chatting");
      addMessage("assistant", questionFor(next));
    } else {
      setPendingField(null);
      setStage("review");
      addMessage("assistant", ta("summaryIntro"));
    }
  }

  async function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const previousTexts = userTexts;
    const allTexts = [...userTexts, trimmed];

    addMessage("user", trimmed);
    setUserTexts(allTexts);
    setDraft("");
    setError(null);
    setStage("chatting");
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
      setPriorities(data.priorities);
      setConfidence(data.confidence);
      setSource(data.source);

      const asked = pendingField ? [...askedFields, pendingField] : askedFields;
      advance(data.confidence, asked);
    } catch (err) {
      setUserTexts(previousTexts);
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setIsSending(false);
    }
  }

  function handleSkip() {
    if (!pendingField || !confidence || isSending) return;
    addMessage("user", t("clarify.skip"));
    advance(confidence, [...askedFields, pendingField]);
  }

  function handleConfirm() {
    if (!priorities || !confidence) return;
    savePriorities(priorities, confidence);
    router.push("/recommendations");
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit(draft);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] min-h-[28rem] max-w-3xl flex-col px-4 py-6 sm:px-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-semibold tracking-tight">{ta("name")}</h1>
      </div>

      <div role="log" aria-live="polite" className="flex-1 space-y-4 overflow-y-auto pr-1">
        <ChatBubble role="assistant">{ta("greeting")}</ChatBubble>

        {messages.map((message) => (
          <ChatBubble key={message.id} role={message.role}>
            {message.text}
          </ChatBubble>
        ))}

        {isSending && (
          <ChatBubble role="assistant">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {ta("thinking")}
            </span>
          </ChatBubble>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        {stage === "review" && priorities && confidence && !isSending && (
          <div className="space-y-4">
            {source === "heuristic" && (
              <Card className="border-warning/40 bg-warning/5">
                <CardHeader className="flex-row items-start gap-3 space-y-0">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  <div>
                    <CardTitle className="text-sm">{t("review.offlineTitle")}</CardTitle>
                    <CardDescription>{t("review.offlineDescription")}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            )}
            <PrioritySummary
              priorities={priorities}
              confidence={confidence}
              onEdit={() => setStage("editing")}
              onConfirm={handleConfirm}
            />
          </div>
        )}

        {stage === "editing" && priorities && (
          <div className="space-y-4">
            <PriorityReviewForm priorities={priorities} onChange={setPriorities} />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStage("review")}>
                {t("review.back")}
              </Button>
              <Button onClick={handleConfirm}>
                {t("review.confirm")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(draft);
        }}
        className="mt-4 space-y-2"
      >
        {pendingField && stage === "chatting" && !isSending && (
          <Button type="button" variant="outline" size="sm" onClick={handleSkip}>
            {t("clarify.skip")}
          </Button>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={ta("placeholder")}
            aria-label={ta("inputLabel")}
            rows={2}
            maxLength={4000}
            disabled={isSending}
          />
          <Button type="submit" disabled={isSending || draft.trim().length === 0}>
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{ta("send")}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
