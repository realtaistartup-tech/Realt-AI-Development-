import Image from "next/image";
import { Dumbbell, House, Star, TrainFront, User, Users } from "lucide-react";
import { useTranslations } from "next-intl";

/** Small roof-shaped "A" mark (striped left side), single color. */
function LogoMark({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M10.6 2.5 21.5 21.5H18.6L9.2 5.2z" />
      <rect x="3" y="20" width="4.2" height="1.5" />
      <rect x="4.4" y="16.8" width="4.2" height="1.5" />
      <rect x="5.8" y="13.6" width="4.2" height="1.5" />
      <rect x="7.2" y="10.4" width="3.6" height="1.5" />
    </svg>
  );
}

export function ChatVisual() {
  const t = useTranslations("home.features.visual");
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1.5 p-2.5 text-[10.5px] leading-snug">
      <div className="flex items-center gap-2 font-medium">
        <span className="flex h-6 w-6 items-center justify-center rounded-md border border-border">
          <LogoMark className="h-3.5 w-3.5" />
        </span>
        {t("chatTitle")}
      </div>
      <div className="w-fit rounded-xl border border-border bg-secondary px-2.5 py-1.5 font-medium">
        {t("question")}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(["Location", "Price", "Space", "Safety"] as const).map((chip) => (
          <span key={chip} className="rounded-full border border-border px-2 py-0.5">
            {t(`chip${chip}`)}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-end gap-2">
        <p className="max-w-[78%] rounded-xl border border-border bg-secondary px-2.5 py-1.5">{t("userMessage")}</p>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border">
          <User className="h-3 w-3" aria-hidden="true" />
        </span>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-border bg-secondary px-2.5 py-2">
        <span className="mt-0.5 shrink-0">
          <LogoMark className="h-4 w-4" />
        </span>
        <div>
          <p>{t("reply")}</p>
          <div className="mt-1.5 flex gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapNode({
  left,
  top,
  icon,
  label,
  minutes,
  labelAbove,
}: {
  left: string;
  top: string;
  icon: React.ReactNode;
  label: string;
  minutes: string;
  labelAbove?: boolean;
}) {
  return (
    <div
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      style={{ left, top }}
    >
      {labelAbove && (
        <span className="whitespace-nowrap text-[11px]">
          <b>{label}</b> <span className="text-muted-foreground">{minutes}</span>
        </span>
      )}
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background">
        {icon}
      </span>
      {!labelAbove && (
        <span className="whitespace-nowrap text-[11px]">
          <b>{label}</b> <span className="text-muted-foreground">{minutes}</span>
        </span>
      )}
    </div>
  );
}

export function MapVisual() {
  const t = useTranslations("home.features.visual");
  const min = t("minutes");
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* street grid */}
      <div className="absolute inset-y-0 left-[28%] w-3 bg-secondary" />
      <div className="absolute inset-y-0 left-[72%] w-3 bg-secondary" />
      <div className="absolute inset-x-0 top-[34%] h-3 bg-secondary" />
      <div className="absolute inset-x-0 top-[74%] h-3 bg-secondary" />
      <div className="absolute left-[-10%] top-[62%] h-3 w-[130%] origin-left -rotate-[18deg] bg-secondary" />

      {/* dotted routes from home to each place */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full text-foreground"
        aria-hidden="true"
      >
        {[
          [50, 52, 22, 28],
          [50, 52, 78, 34],
          [50, 52, 66, 82],
        ].map(([x1, y1, x2, y2]) => (
          <line
            key={`${x2}-${y2}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="0.1 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <MapNode
        left="22%"
        top="28%"
        icon={<TrainFront className="h-5 w-5" aria-hidden="true" />}
        label={t("work")}
        minutes={`22 ${min}`}
        labelAbove
      />
      <MapNode
        left="78%"
        top="34%"
        icon={<Dumbbell className="h-5 w-5" aria-hidden="true" />}
        label={t("gym")}
        minutes={`6 ${min}`}
        labelAbove
      />
      <MapNode
        left="66%"
        top="82%"
        icon={<Users className="h-5 w-5" aria-hidden="true" />}
        label={t("friends")}
        minutes={`15 ${min}`}
      />
      <span className="absolute left-1/2 top-[52%] flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-muted-foreground/25">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
          <House className="h-5 w-5" aria-hidden="true" />
        </span>
      </span>
    </div>
  );
}

export function MatchVisual() {
  const t = useTranslations("home.features.visual");
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div className="absolute left-[8%] top-[16%] h-[62%] w-[56%] -rotate-6 overflow-hidden rounded-xl opacity-50">
        <Image src="/images/hero/balcony-apartment.jpg" alt="" fill sizes="200px" className="object-cover" />
      </div>
      <div className="absolute right-[8%] top-[16%] h-[62%] w-[56%] rotate-6 overflow-hidden rounded-xl opacity-50">
        <Image src="/images/hero/townhouses.jpg" alt="" fill sizes="200px" className="object-cover" />
      </div>
      <div className="relative h-[84%] w-[66%] overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
        <Image src="/images/hero/modern-apartment.jpg" alt="" fill sizes="260px" className="object-cover" />
        <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[11px] font-semibold">
          <Star className="h-3 w-3" aria-hidden="true" />
          {t("match")}
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/85 to-transparent p-2.5 pt-8 text-white">
          <div>
            <p className="text-[12px] font-semibold">{t("address")}</p>
            <p className="text-[10px] text-white/70">{t("city")}</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-semibold">{t("price")}</p>
            <p className="text-[10px] text-white/70">{t("size")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
