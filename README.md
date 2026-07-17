# Realt AI

An AI-first housing decision assistant — not a listings search engine. Realt AI helps someone
understand their own priorities, see honest trade-offs, and get a transparent, explainable match
score, following the "Realt Thinking Framework": understand → detect conflicts → rank → evaluate
trade-offs → recommend → explain. A guided, confidence-driven onboarding conversation feeds into
the Realt Decision Report — a Realt Score, a Confidence Score, priority ranking, detected
conflicts, compromise analysis, long-term consequences, a 12-months-later outlook, open questions,
and curated property matches, all on one explainable, printable page (`/recommendations`).

The full product and engineering guide lives in [`CLAUDE.md`](./CLAUDE.md). Start there for the
mission, principles, and standards this codebase is held to.

## Current status

This is a pre-launch build. It runs against 8 illustrative Swedish-market mock properties, not
real listings. Accounts and saved searches work for real (Supabase-backed) once configured — see
[`docs/supabase-setup.md`](./docs/supabase-setup.md) — and fall back to in-memory mocks otherwise.
See:

- [`docs/roadmap-v1.md`](./docs/roadmap-v1.md) — what's left before a real V1.0 launch, in
  priority order, and what's still blocked on external input (a real property data source,
  monitoring, deployment access).
- [`docs/architecture.md`](./docs/architecture.md) — how the app is built and why, including
  known limitations stated plainly rather than hidden.
- [`docs/supabase-setup.md`](./docs/supabase-setup.md) — how to connect a real Supabase project
  (migration + environment variables) for durable accounts/saved searches.
- [`docs/engineering-report.md`](./docs/engineering-report.md) — a full accounting of the initial
  build: what's production-ready, what's a placeholder, and why.
- [`docs/v1-completion-report.md`](./docs/v1-completion-report.md) — a full first-time-user product
  review (design, UX, accessibility, frontend, AI product lenses) with what was fixed, why, and
  what's honestly still rough.

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS · hand-authored
shadcn/ui-style components on Radix primitives · next-intl (Swedish + English) · next-themes
(light/dark/system) · Zod validation · Supabase (accounts + saved searches, optional — falls back
to in-memory mocks) · Vitest (unit) · Playwright + axe-core (E2E and accessibility) · OpenAI
Responses API (optional, with a deterministic offline fallback).

## Getting started

```bash
npm install
cp .env.example .env.local   # optional — the app runs fully without any keys set
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The site defaults to Swedish (`/`); English
is available at `/en`.

No environment variables are required to run the app. Without `OPENAI_API_KEY`, priority
extraction uses a deterministic rule-based fallback instead of a live model call, and the UI says
so explicitly. See [`.env.example`](./.env.example) for everything configurable.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve a production build (run `build` first) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Unit tests (Vitest) — business logic, validation, AI-extraction fallback |
| `npm run test:e2e` | End-to-end and accessibility tests (Playwright + axe-core), against a production build |

## Project structure

Feature-based, per `CLAUDE.md`:

```
app/[locale]/     Routes (App Router, under the locale segment) — layout, pages
app/api/          Route handlers (locale-independent)
components/       Shared UI — components/ui holds the design-system primitives
features/         UI specific to one product area (onboarding, recommendations)
services/         Business logic and orchestration — services/matching is the scoring
                  engine (the Realt Thinking Framework as code); services/ai is the
                  OpenAI integration and its offline fallback
lib/              Small stateless utilities (validation, rate limiting, mock data)
i18n/, messages/  Localization routing and message catalogs (sv, en)
types/            The shared domain model
tests/unit/       Vitest — business logic
tests/e2e/        Playwright — critical user flows and accessibility
docs/             Architecture decisions, engineering report, roadmap
```

## Testing philosophy

Per `CLAUDE.md`, tests prioritize business logic, AI orchestration, and critical user flows over
incidental UI detail. The scoring engine, validation schemas, and the AI-extraction fallback are
unit-tested; the full onboarding-to-recommendations flow (in both languages), the empty-priorities
state, locale switching, and theme switching are covered end-to-end, and every key page is
automatically scanned against WCAG 2.0/2.1 AA on every run.
