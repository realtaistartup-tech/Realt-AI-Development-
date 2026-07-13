import Link from "next/link";
import { ArrowRight, Compass, Scale, ListChecks, MessageSquareText, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const FRAMEWORK_STEPS = [
  {
    icon: MessageSquareText,
    title: "Understand your goals",
    description:
      "Tell Realt AI what matters to you in plain language — budget, commute, space, safety, schools, lifestyle.",
  },
  {
    icon: Scale,
    title: "See the trade-offs",
    description:
      "Realt AI flags conflicts between your priorities honestly, instead of pretending every box can be checked.",
  },
  {
    icon: ListChecks,
    title: "Get a transparent match",
    description:
      "Every property comes with an explainable score — you always see exactly why it fits, or why it doesn't.",
  },
  {
    icon: Compass,
    title: "Decide with confidence",
    description:
      "Compromises and risks are called out up front, so you choose a home knowingly, not by accident.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      <section className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          An AI-first decision assistant
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          People don&apos;t buy apartments. People buy a future life.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance">
          Realt AI helps you understand what actually matters to you, weighs the trade-offs
          honestly, and explains every recommendation — so you can choose a home with
          confidence, not guesswork.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/onboarding">
              Start understanding my priorities
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="how-it-works-heading"
        className="border-t border-border bg-secondary/40"
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="how-it-works-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              The Realt Thinking Framework
            </h2>
            <p className="mt-3 text-muted-foreground">
              The same reasoning process behind every recommendation Realt AI makes.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FRAMEWORK_STEPS.map((step, index) => (
              <Card key={step.title} className="text-left">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <step.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <CardTitle className="mt-3 text-base">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{step.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Ready to think through your next home?
        </h2>
        <p className="mt-3 text-muted-foreground">
          It takes a few minutes to describe what matters to you. No account required.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/onboarding">
            Get started
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
