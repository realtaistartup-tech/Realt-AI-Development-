"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { ChatVisual, MapVisual, MatchVisual } from "@/features/home/feature-visuals";

const FEATURES = [
  { key: "analysis", paragraphs: ["p1", "p2"], visual: <ChatVisual /> },
  { key: "area", paragraphs: ["p1", "p2", "p3"], visual: <MapVisual /> },
  { key: "matching", paragraphs: ["p1", "p2", "p3"], visual: <MatchVisual /> },
] as const satisfies readonly { key: string; paragraphs: readonly string[]; visual: ReactNode }[];

/** Height in px of the title row (also the whole card while collapsed). */
const TITLE_BLOCK = 92;
/** Height in px reserved for the picture above the title when open. */
const IMAGE_ZONE = 250;
/**
 * Overshooting curve: the card stretches slightly past its final height and
 * settles back, which gives the elastic "stretch" feel.
 */
const STRETCH = "cubic-bezier(0.34, 1.45, 0.5, 1)";
const GROW = `800ms ${STRETCH}`;

function FeatureCard({
  featureKey,
  paragraphs,
  visual,
}: {
  featureKey: string;
  paragraphs: readonly string[];
  visual: ReactNode;
}) {
  const t = useTranslations("home.features");
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(0);
  const [textHeight, setTextHeight] = useState(0);
  const cardRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const panelId = `feature-${featureKey}`;

  useEffect(() => {
    const card = cardRef.current;
    const text = textRef.current;
    if (!card || !text) return;
    const update = () => {
      setWidth(card.getBoundingClientRect().width);
      setTextHeight(text.offsetHeight);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(card);
    observer.observe(text);
    return () => observer.disconnect();
  }, []);

  // Phone format (9:16), but never shorter than the text needs.
  const phoneHeight = Math.round((width * 16) / 9);
  const needed = TITLE_BLOCK + IMAGE_ZONE + textHeight;
  const openHeight = Math.max(phoneHeight, needed);
  const textZone = openHeight - TITLE_BLOCK - IMAGE_ZONE;
  // Picture and text zones differ in height; shifting the card by half the
  // difference keeps the title on exactly the same spot while it grows.
  const shift = (textZone - IMAGE_ZONE) / 2;
  const ready = width > 0;

  return (
    <article
      ref={cardRef}
      className="hover-pop motion-ok relative flex flex-col overflow-hidden rounded-3xl border border-border bg-secondary px-6 shadow-sm hover:z-10"
      style={{
        height: open && ready ? openHeight : TITLE_BLOCK,
        translate: open && ready ? `0 ${shift}px` : "0 0",
        transition: `height ${GROW}, translate ${GROW}, transform 450ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
      }}
    >
      {/* Picture zone: zero height while collapsed. */}
      <div
        className="shrink-0 overflow-hidden"
        style={{ height: open && ready ? IMAGE_ZONE : 0, transition: `height ${GROW}` }}
        aria-hidden={!open}
      >
        <div
          className="motion-ok h-full pb-4 pt-5"
          style={{ opacity: open ? 1 : 0, transition: `opacity ${open ? "500ms 250ms" : "150ms"} ease` }}
        >
          <div className="h-full overflow-hidden rounded-2xl border border-border bg-background">{visual}</div>
        </div>
      </div>

      {/* Title row: stays put. */}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full shrink-0 items-center justify-between gap-4 rounded-xl py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ height: TITLE_BLOCK }}
      >
        <span>
          <span className="block text-xl font-bold leading-7 tracking-tight">{t(`${featureKey}.title`)}</span>
          <span
            className="motion-ok mt-1 block text-sm leading-5 text-muted-foreground"
            style={{ opacity: open ? 0 : 1, transition: "opacity 200ms ease" }}
          >
            {t("more")}
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background">
          {open ? (
            <ChevronUp className="h-4 w-4" aria-label={t("less")} />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
      </button>

      {/* Text zone. */}
      <div
        id={panelId}
        className="shrink-0 overflow-hidden"
        style={{ height: open && ready ? textZone : 0, transition: `height ${GROW}` }}
        aria-hidden={!open}
      >
        <div
          ref={textRef}
          className="motion-ok space-y-3 pb-5 pt-1"
          style={{ opacity: open ? 1 : 0, transition: `opacity ${open ? "500ms 350ms" : "150ms"} ease` }}
        >
          <p className="text-[15px] font-semibold leading-snug">{t(`${featureKey}.subtitle`)}</p>
          {paragraphs.map((p) => (
            <p key={p} className="text-[13px] leading-relaxed text-muted-foreground">
              {t(`${featureKey}.${p}`)}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}

export function KeyFeatures() {
  const t = useTranslations("home.features");

  return (
    <section aria-labelledby="features-heading">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="features-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("heading")}
          </h2>
        </div>

        {/* items-center keeps each title on the same spot when its card grows */}
        <div className="mx-auto mb-16 mt-12 grid max-w-md items-center gap-6 lg:max-w-none lg:grid-cols-3">
          {FEATURES.map(({ key, paragraphs, visual }) => (
            <FeatureCard key={key} featureKey={key} paragraphs={paragraphs} visual={visual} />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{t("caption")}</p>
      </div>
    </section>
  );
}
