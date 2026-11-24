import { useTranslations } from "next-intl";

const STEPS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"] as const;

export function GetStartedSteps() {
  const t = useTranslations("home.steps");

  return (
    <div className="hover-pop motion-ok relative aspect-[4/3] w-full rounded-2xl border border-border bg-secondary p-6 shadow-lg hover:z-10 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{t("eyebrow")}</p>
      <ol className="mt-5">
        {STEPS.map((step, index) => (
          <li key={step} className="relative flex gap-4 pb-4 last:pb-0">
            {index < STEPS.length - 1 && (
              <span aria-hidden="true" className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px bg-border" />
            )}
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-7">{t(`${step}.title`)}</p>
              <p className="text-[13px] leading-snug text-muted-foreground">{t(`${step}.description`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
