import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface LegalSection {
  heading: string;
  paragraphs: string[];
}

interface LegalDocumentData {
  title: string;
  intro: string;
  sections: LegalSection[];
}

interface LegalDocumentProps {
  namespace: "legal.privacy" | "legal.terms";
}

export function LegalDocument({ namespace }: LegalDocumentProps) {
  const t = useTranslations();
  // t.raw()'s type only accepts leaf message keys, not the object-shaped
  // namespaces this component intentionally reads whole. The `as never` is
  // next-intl's own documented escape hatch for that case.
  const doc = t.raw(namespace as never) as LegalDocumentData;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Card className="border-warning/40 bg-warning/5">
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="space-y-1">
            <CardTitle className="text-sm">{t("legal.draftNotice.title")}</CardTitle>
            <CardDescription>{t("legal.draftNotice.body")}</CardDescription>
          </div>
        </CardHeader>
      </Card>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">{doc.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("legal.updatedLabel")}: 2026-07-15
      </p>
      <p className="mt-6 text-foreground">{doc.intro}</p>

      <div className="mt-8 space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-lg font-semibold tracking-tight">{section.heading}</h2>
            <div className="mt-2 space-y-3">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <Link
        href="/"
        className="mt-10 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t("legal.backLink")}
      </Link>
    </div>
  );
}
