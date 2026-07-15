# Realt AI — Version 1.0 Roadmap

**Prepared by:** Lead Software Engineer
**Basis:** `CLAUDE.md` (product/engineering guide) + `docs/engineering-report.md` (as-built state as of commit `d735c7b`)
**Purpose:** Define everything required to responsibly call Realt AI "launched," in what order, and split MVP from what waits for V2.

---

## 1. What "launched" means here

Per `CLAUDE.md`'s Final Rule — *"Does this help users make better housing decisions?"* — a feature only belongs in V1.0 if it's required for a real person to safely, legally, and reliably use Realt AI to think through a housing decision. That excludes anything that's engineering polish for its own sake or a growth feature with no bearing on decision quality.

Three things are already true of the current build (landing page, AI-first onboarding, the Realt Thinking Framework scoring engine, recommendations dashboard, theming, Swedish/English localization, accessibility fundamentals, input validation, and a basic rate limiter) — see `docs/engineering-report.md` for the full breakdown. This roadmap covers what's **missing** between that and a real launch.

---

## 2. Feature list, complexity, and status

| # | Feature | Complexity | MVP or V2 | Depends on | Status |
|---|---|---|---|---|---|
| 1 | Automated end-to-end + accessibility regression tests | M | **MVP** | none | **Done** |
| 2 | Legal & compliance pages (privacy policy, terms, cookie notice) | S (scaffold) | **MVP** | none (content needs human legal review) | **Done** (draft — needs legal review) |
| 3 | CI pipeline (lint/typecheck/test/build on every change) | S | **MVP** | GitHub push access | **Authored, not active** — ready the moment push access exists |
| 4 | Pluggable rate limiting (interface + shared-store-ready) | M | **MVP** | Full effect needs Redis credentials | **Done** — runs in-memory today, upgrades itself automatically once `UPSTASH_REDIS_REST_URL`/`TOKEN` are set |
| 5 | Persistence layer (Supabase: priorities + properties) | L | **MVP** | Supabase project + credentials from you | Blocked — needs your input |
| 6 | Anonymous session persistence (cookie-based, no login) | M | **MVP** | #5 | Blocked (depends on #5) |
| 7 | Error monitoring / observability (e.g. Sentry) | S–M | **MVP** | Monitoring account + DSN from you | Blocked — needs your input |
| 8 | Real property data source (replace 6 mock listings) | XL | **MVP** | #5, and a business decision on data vendor | Blocked — needs your decision |
| 9 | Deployment to Vercel (real public URL) | S (config) | **MVP** | Vercel account, ideally #3 | Blocked — needs your input |
| 10 | Full user accounts (signup/login, multi-device sync) | L | **V2** | #5 | Deferred |
| 11 | Saved searches / revisit past sessions / comparison view | M | **V2** | #5, #10 | Deferred |
| 12 | Guided structured-question onboarding (alternative to free text) | M | **V2** | none | Deferred |
| 13 | Additional locales beyond sv/en | S each | **V2** | none — infra already supports this | Deferred |
| 14 | Structured data (JSON-LD) for property listings | S | **V2** | #8 (needs real listings to be worth doing) | Deferred |
| 15 | Email notifications for new matches | L | **V2** | #5, #8, email infra | Deferred |

**Why items are MVP vs. V2:** everything marked MVP is required for the product to be *real* — safe to run publicly (rate limiting, monitoring), legal to run in the EU (compliance pages), truthful (real property data instead of six fictional listings), durable (persistence), and trustworthy over time (tests that prove it still works after every change). Accounts, saved-search history, and richer onboarding are genuine improvements but the product is honestly usable — a single visit, one set of priorities, one set of matches — without them. That's the V1/V2 line.

---

## 3. Recommended build order

Ordered by what's actually actionable, given which items are blocked on something only you can provide:

1. **Automated E2E + accessibility tests** — no blockers. Doing this first protects every feature built after it, including the Swedish localization shipped last session, which currently has zero regression coverage beyond a one-off manual check.
2. **Legal & compliance page scaffolding** — no blockers, low effort, and Sweden/EU means GDPR isn't optional for a real launch.
3. **CI pipeline definition** — no blockers to *write*; it activates once GitHub push access is restored.
4. **Pluggable rate limiting** — no blockers to build the abstraction now; the production (multi-instance-safe) backend activates once you provide a Redis-compatible store.
5. **Persistence layer (Supabase)** — blocked until you create a Supabase project and share its URL/keys.
6. **Anonymous session persistence** — immediately follows #5.
7. **Observability** — blocked until you choose and connect a monitoring provider.
8. **Real property data source** — blocked on a business decision (which listings provider/partner for the Swedish market) before any engineering starts.
9. **Deployment** — blocked until GitHub and/or Vercel access is connected.

Items 10–15 (V2) are intentionally not sequenced yet — revisit after V1.0 ships.

---

## 4. What I'm building now

Per your instruction to implement only the highest-priority feature: **#1, automated end-to-end and accessibility regression tests.** It's the only MVP item with zero external dependencies, it directly serves `CLAUDE.md`'s explicit mandates (Testing → "critical user flows"; Accessibility → the full requirement list), and it closes the gap the engineering report already flagged: verification that currently only exists as something I ran once by hand, not as something that runs again on the next change.
