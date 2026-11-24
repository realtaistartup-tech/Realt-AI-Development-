import {
  Building2,
  Gauge,
  Handshake,
  Home,
  Landmark,
  MessageSquareText,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium">
      {children}
    </span>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StepCard({
  index,
  icon,
  title,
  description,
  children,
}: {
  index: number;
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="hover-pop motion-ok relative flex flex-col rounded-2xl border border-border bg-secondary p-6 shadow-sm hover:z-10">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
          {index}
        </span>
        <span className="text-foreground" aria-hidden="true">
          {icon}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      <div className="mt-5 flex-1 rounded-xl border border-dashed border-border bg-background p-4">{children}</div>
    </article>
  );
}

export function HowItWorks() {
  const t = useTranslations("home.how");

  return (
    <section aria-labelledby="how-heading">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="how-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t("heading")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("subheading")}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StepCard
            index={1}
            icon={<MessageSquareText className="h-5 w-5" />}
            title={t("steps.describe.title")}
            description={t("steps.describe.description")}
          >
            <p className="rounded-xl bg-foreground px-3 py-2 text-sm text-background">{t("visual.message")}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip>{t("visual.chipBudget")}</Chip>
              <Chip>{t("visual.chipCommute")}</Chip>
              <Chip>{t("visual.chipSpace")}</Chip>
              <Chip>{t("visual.chipLifestyle")}</Chip>
            </div>
          </StepCard>

          <StepCard
            index={2}
            icon={<SlidersHorizontal className="h-5 w-5" />}
            title={t("steps.weights.title")}
            description={t("steps.weights.description")}
          >
            <div className="space-y-3">
              <Bar label={t("visual.weightBudget")} value={90} />
              <Bar label={t("visual.weightCommute")} value={70} />
              <Bar label={t("visual.weightSpace")} value={40} />
            </div>
          </StepCard>

          <StepCard
            index={3}
            icon={<Scale className="h-5 w-5" />}
            title={t("steps.conflicts.title")}
            description={t("steps.conflicts.description")}
          >
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">{t("visual.conflictTitle")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Chip>{t("visual.conflictA")}</Chip>
                  <span className="text-xs text-muted-foreground">vs</span>
                  <Chip>{t("visual.conflictB")}</Chip>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{t("visual.conflictHint")}</p>
              </div>
            </div>
          </StepCard>

          <StepCard
            index={4}
            icon={<Gauge className="h-5 w-5" />}
            title={t("steps.score.title")}
            description={t("steps.score.description")}
          >
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
                style={{ background: "conic-gradient(var(--foreground) 87%, var(--secondary) 0)" }}
                aria-label={t("visual.score")}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-sm font-semibold">
                  87%
                </div>
              </div>
              <ul className="space-y-1 text-xs">
                <li>+ {t("visual.reasonBudget")}</li>
                <li>+ {t("visual.reasonCommute")}</li>
                <li className="text-muted-foreground">− {t("visual.reasonTradeoff")}</li>
              </ul>
            </div>
          </StepCard>

          <StepCard
            index={5}
            icon={<Handshake className="h-5 w-5" />}
            title={t("steps.connect.title")}
            description={t("steps.connect.description")}
          >
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                {t("visual.agencies")}
              </li>
              <li className="flex items-center gap-2">
                <Landmark className="h-4 w-4" aria-hidden="true" />
                {t("visual.companies")}
              </li>
              <li className="flex items-center gap-2">
                <Home className="h-4 w-4" aria-hidden="true" />
                {t("visual.platforms")}
              </li>
            </ul>
          </StepCard>

          <StepCard
            index={6}
            icon={<ShieldCheck className="h-5 w-5" />}
            title={t("steps.free.title")}
            description={t("steps.free.description")}
          >
            <p className="text-4xl font-bold tracking-tight">{t("visual.freeBig")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("visual.free")}</p>
          </StepCard>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">{t("visual.caption")}</p>
      </div>
    </section>
  );
}
