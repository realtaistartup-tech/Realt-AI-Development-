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
| 5 | Persistence layer (accounts, saved searches, properties) | L | **MVP** | Real durability needs a Supabase project + credentials from you | **Mocked** — repository interfaces + in-memory implementations built (`services/persistence/`); functionally works today, not durable across restarts/instances yet |
| 6 | Authentication (sign-in, tied to persistence) | M | **MVP** | Real verification needs Supabase Auth (or similar) from you | **Mocked** — email-only passwordless sign-in, no real verification (`app/api/auth/*`); same UX shape a real magic-link/OTP flow would have |
| 7 | Error monitoring / observability (e.g. Sentry) | S–M | **MVP** | Monitoring account + DSN from you | Blocked — needs your input |
| 8 | Real property data source (replace mock listings) | XL | **MVP** | Real persistence, and a business decision on data vendor | Blocked on the vendor decision — but the mock data was upgraded to 8 realistic Swedish-market listings (real neighborhoods, SEK, m²) so the product is at least internally coherent for its actual market while this is pending |
| 9 | Deployment to Vercel (real public URL) | S (config) | **MVP** | Vercel account, ideally #3 | Blocked — needs your input |
| 10 | Saved searches (save a search, revisit it, delete it) | M | **MVP** (pulled forward) | #5, #6 | **Done** — `/my-searches`, `SaveSearchButton` on the recommendations page |
| 11 | Multi-device account sync, full account settings | M | **V2** | Real Supabase Auth | Deferred — the mock account system covers "come back later and find your searches" on the same server; true cross-device sync needs real auth |
| 12 | Saved-search comparison view (side-by-side) | S | **V2** | #10 | Deferred |
| 13 | Guided structured-question onboarding (alternative to free text) | M | **V2** | none | Deferred |
| 14 | Additional locales beyond sv/en | S each | **V2** | none — infra already supports this | Deferred |
| 15 | Structured data (JSON-LD) for property listings | S | **V2** | #8 (needs real listings to be worth doing) | Deferred |
| 16 | Email notifications for new matches | L | **V2** | #5, #8, email infra | Deferred |

**Why items are MVP vs. V2:** everything marked MVP is required for the product to be *real* — safe to run publicly (rate limiting, monitoring), legal to run in the EU (compliance pages), truthful (real property data instead of six fictional listings), durable (persistence), and trustworthy over time (tests that prove it still works after every change). Accounts, saved-search history, and richer onboarding are genuine improvements but the product is honestly usable — a single visit, one set of priorities, one set of matches — without them. That's the V1/V2 line.

---

## 3. Recommended build order (superseded — see §5)

This was the original order, planned when persistence/auth/data were
treated as hard-blocked on external services:

1. Automated E2E + accessibility tests
2. Legal & compliance page scaffolding
3. CI pipeline definition
4. Pluggable rate limiting
5. Persistence layer (Supabase) — *originally blocked*
6. Anonymous session persistence — *originally blocked*
7. Observability — still blocked
8. Real property data source — still blocked on the vendor decision
9. Deployment — still blocked

Items 1–4 shipped as planned. Item §5 changed the plan for 5 and 6 — see
below.

---

## 4. What's still actually blocked on you

Only three things now require external input before they can move:

- **Real durability for accounts/searches** — a Supabase project + credentials, to replace the in-memory mock repositories in `services/persistence/`.
- **Real property data** — a business decision on a Swedish listings data source/vendor.
- **Observability and deployment** — a monitoring account (Sentry or similar) and Vercel/GitHub access.

Everything else that was on the "blocked" list has either shipped or been
unblocked by mocking it — see below.

---

## 5. Mock-first pivot

Instruction: don't block product development waiting on external services
— mock Supabase, authentication, and persistence; keep the architecture
ready to swap in the real thing later; keep building the actual product.

What changed as a result:

- **Persistence (`services/persistence/`)**: three repository interfaces
  (`AccountRepository`, `SavedSearchRepository`, `PropertyRepository`),
  each with an in-memory mock implementation today. Every consumer goes
  through the interface; a real Supabase-backed implementation is a
  three-file swap, not a rewrite.
- **Authentication (`app/api/auth/*`, `lib/session.ts`)**: passwordless
  mock sign-in — enter an email, no verification, account created on
  first use — signed with a session cookie so it's not trivially
  forgeable. Same UX shape a real magic-link/OTP flow would have.
- **Saved searches** (roadmap item #10, pulled forward from V2 to MVP):
  save a search from the recommendations page, revisit or delete it from
  `/my-searches`. This was previously listed as depending on real
  Supabase; mocking the persistence layer unblocked it without waiting.
- **Mock property data upgraded to the Swedish market** (item #8's mock
  side): 8 realistic listings — real neighborhoods, SEK, m² — replacing
  what had still been US/USD data despite the app defaulting to Swedish.

What's explicitly *not* pretended to be real: none of this survives a
server restart or coordinates across multiple instances. That's stated
plainly in `docs/architecture.md`, not hidden — mocking infrastructure to
keep moving is different from claiming it's production-ready.
