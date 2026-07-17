# Realt AI — Version 1 Completion Report

**Prepared by:** Claude Code, acting as Senior Product Designer, UX Researcher, Accessibility Expert, Frontend Engineer, and AI Product Manager
**Date:** 2026-07-17
**Branch:** `claude/realt-ai-guide-t1kyfq`
**Scope:** A full first-time-user product review across every screen and interaction, followed by a refinement pass — no new features, only polish of what already exists, per explicit instruction.

---

## 1. Verdict

Realt AI's core product — guided onboarding, the deep conflict-detection engine, and the Realt Decision Report — is **functionally complete and holds up under real scrutiny**. This review found no fundamental gaps in the product logic; everything wrong with it was in the *finishing*: a mobile layout bug, a few missing safety nets (retry, focus management, reduced motion), one genuinely broken promise (the printable report wasn't actually printing its own reasoning), and some copy that had gone stale as the product's vocabulary evolved. All of it is now fixed and verified. Section 6 is an honest list of what's still rough; none of it, in this reviewer's judgment, blocks moving to real property data and deployment — but it's worth reading before that decision.

---

## 2. Review methodology

This was not a read-through. For each persona, the review combined:

- **Static code reading** of every screen's implementation — component structure, state machines, i18n content, CSS.
- **Live browser walkthroughs** via a scripted Chromium session (the same technique used throughout this project's verification), across:
  - Desktop (1280px) and mobile (390px, and the smaller 375px "iPhone SE" width specifically, since it's the tightest common viewport)
  - Light and dark theme
  - Swedish and English locale
  - Every onboarding path: a fully-specified free-text description (skips straight to the summary), a vague one (triggers all four clarifying questions), and the skip path
  - A decision report scenario deliberately engineered to trigger multiple conflicts, critical concerns, and an expanded property card, so the busiest possible state of the busiest page was actually seen, not assumed
  - A simulated API failure (via request interception) to see the error state as a real user would
  - Print/PDF output, via Chromium's print media emulation
- **Automated accessibility scans** (`@axe-core/playwright`) against WCAG 2.0/2.1 A and AA, including two new scans added specifically for this review: the decision report with conflicts and an expanded card, and the guided-onboarding clarify/summary screens.

Every finding below was confirmed visually or in the accessibility tree before being called a finding — not theorized from reading component code alone.

---

## 3. What was improved, and why

### 3.1 Mobile header overflow (Product Designer / Frontend Engineer / UX Researcher)

**Found:** At 390px and narrower — the most common phone viewport — the "Realt AI" logo wrapped onto two lines ("Realt" / "AI"), and once signed in, the theme toggle was pushed entirely off-screen and unreachable. This happened on *every single page*, since the header is global.

**Why it mattered:** This is the kind of bug that undermines "premium" faster than almost anything else — a broken brand mark on first paint, on the device most people will actually use. An unreachable control is also a hard functionality loss, not just a cosmetic one.

**Fix:** `components/site-header.tsx` — the brand link no longer wraps (`whitespace-nowrap`, `shrink-0`); the "Find my home" nav link hides below the `sm` breakpoint (redundant there — the home page already has two prominent CTAs, and it's confusing mid-flow); nav gaps tighten on mobile. `components/locale-switcher.tsx` — the language switcher collapses to an icon-only 44px control on mobile instead of a full "English ▾" label, expanding back to full text at `sm:`. `components/account-menu.tsx` — matching gap tightening. Verified at both 390px and 375px, signed in and signed out, in both languages (Swedish has longer words, a good stress test) — the full control set now fits with room to spare, and the language dropdown still opens and switches correctly.

### 3.2 The printable report wasn't actually printing its reasoning (AI Product Manager / Frontend Engineer)

**Found:** The Decision Report's "Print / Save as PDF" button worked, and the site chrome correctly disappeared — but every `<details>` disclosure (conflict compromises, each property card's full analysis, the match-score breakdown) is collapsed by default on screen, and printing captured them *in that collapsed state*. A saved PDF would contain the headline numbers and a few paragraphs, but silently drop essentially all of the actual reasoning — strengths, risks, factor-by-factor breakdowns, compromise options — the exact content that makes this "a decision document, not a results page."

**Why it mattered:** This is the single most consequential finding in this review. The previous milestone's entire premise was "something users want to save, revisit, and share." A save button that quietly produces an incomplete document doesn't just look unfinished — it breaks a promise the product explicitly makes about itself.

**Fix:** First attempt was a CSS-only `@media print` override of the collapsed-content rule — it turned out not to reliably repaint in Chromium even with `display: block !important` (confirmed by direct DOM/computed-style inspection: the override applied, the layout height changed, but pixels still weren't painted — a real, reproducible Chromium quirk with native `<details>`, not a mistake in the CSS). The actual fix is `components/print-expand-details.tsx`: it listens for the browser's genuine `beforeprint`/`afterprint` events and toggles the real `open` attribute on every `<details>` on the page, restoring the original state afterward. This is the spec-sanctioned mechanism and is guaranteed to work in every browser, not just the one this environment could test against. Verified by dispatching a real `beforeprint` event and diffing the rendered pixels before and after: every property card's full analysis, every conflict's compromises, and every factor breakdown now appear correctly in the printed output, while the on-screen collapsed-by-default experience is untouched (confirmed the `open` state resets after printing).

### 3.3 No recovery path when the report fails to load (Frontend Engineer / UX Researcher)

**Found:** If the report's fetch to `/api/ai/recommend` failed for any reason (a real risk once this talks to a live backend, even though it's mocked today), the user saw a static error sentence and had no in-page way to try again — only a full page reload, which loses scroll position and re-runs the entire page bootstrap.

**Fix:** `features/recommendations/decision-report.tsx` was restructured around a single reusable `load()` function (also simplified — the manual unmount-cancellation-flag pattern from the original `useEffect` was dropped as unnecessary boilerplate under React 18+, where a `setState` after unmount is a silent no-op, not a bug). The error state now shows a "Try again" button that re-runs the exact same load. Verified end-to-end by intercepting the network request to force a failure, confirming the error and retry button appear, then confirming a successful retry lands on the real report.

### 3.4 Screen reader users got no signal that the report had loaded (Accessibility Expert)

**Found:** The loading spinner had no ARIA role, and when it was replaced by the finished report, nothing told an assistive-technology user that new content had arrived — they'd have to go exploring to discover it, with no cue that anything had changed.

**Fix:** The loading state now has `role="status"` (implicitly polite live-region semantics). More importantly, focus now moves programmatically to the report container the moment it's ready (`tabIndex={-1}` + a `ref`, focused via `useEffect` keyed on the load state) — the same pattern already used successfully for onboarding's step transitions, now applied consistently to the report page too.

### 3.5 No accommodation for reduced motion (Accessibility Expert)

**Found:** Nothing in the app respected the OS-level "prefers reduced motion" setting. Every transition (chevron rotation, hover states, color transitions) played at full speed regardless.

**Fix:** A global rule in `app/globals.css` collapses all animation/transition durations to effectively zero under `@media (prefers-reduced-motion: reduce)`. Nothing in this app conveys information *through* motion, so this is a pure accommodation with no functional trade-off.

### 3.6 A badge that looked clickable but wasn't (UX Researcher / Product Designer)

**Found:** Each property card's "View original listing" indicator was styled identically to a real button — a bordered, padded pill, visually indistinguishable from the actual "Realt Score" badge next to it. It sits inside the card's larger clickable region (which expands the analysis, not a listing), so a user who clicked it expecting to leave the app would instead just see the card expand — a small but real mismatch between what the interface promises and what it does.

**Fix:** Restyled to plain muted text with an icon — no border, no button-like padding. It now reads unambiguously as a status label ("this is coming"), not a call to action. The `title` tooltip explaining "not connected yet" was kept. Also hidden from print output entirely (`print:hidden`), since it's meaningless on paper.

### 3.7 The long-term-consequences list read as repetitive (Product Designer / AI Product Manager)

**Found:** Each conflict typically has two or three resolution options, and the original format repeated the *entire conflict title* as a parenthetical on every single bullet: "Prioritize nightlife (Nightlife and noise sensitivity are in direct tension): ...", immediately followed by "Prioritize quiet (Nightlife and noise sensitivity are in direct tension): ...". With two conflicts and several options each, this produced a visibly mechanical, repetitive list — exactly the failure mode called out in this review's brief.

**Fix:** Restructured the underlying data (`DecisionReport.longTermConsequences` changed from `string[]` to a grouped `LongTermConsequenceGroup[]` — see `types/report.ts` and `services/report/decision-report.ts`) and built a dedicated `LongTermConsequencesSection` component that states each conflict's title once, as a sub-heading, with its options listed underneath. Same information, same severity-first ordering, same cap — stated once instead of N times.

### 3.8 Stale terminology left over from the product's evolution (content consistency)

**Found:** The empty state on `/my-searches` still said "Save a search from your recommendations page to see it here" (English) / referenced "din matchningssida" (Swedish) — leftover language from before the Decision Report existed as a named concept.

**Fix:** Updated both locales to say "decision report" / "beslutsrapport," consistent with how the rest of the product now refers to itself.

### 3.9 Smaller items

- **Lazy-loaded property images** (`loading="lazy"` on the property card `<img>`) — a free performance improvement for a report that can show up to five images below the fold.
- Carried forward from the prior session's own QA (documented here for a complete record, not re-claimed as new): a scoring engine bug where a factor could be listed as both a strength and a risk simultaneously (a shortfall of exactly one bedroom scores exactly 75, the strength threshold, while correctly still being a risk) was found and fixed with regression tests in both `score-engine.ts` and `decision-report.ts`.

---

## 4. Screens and flows explicitly reviewed

| Area | Verdict |
|---|---|
| Home page | Clean, calm, no issues found beyond the header (3.1) |
| Onboarding — describe step | Solid; see 6.1 for a noted-but-not-fixed gap |
| Onboarding — clarifying questions (all 4 types) | Chip picker wraps well on mobile; no issues |
| Onboarding — summary / "Edit details" | Clean; confidence-transparency note reads well |
| Decision Report — header & headline scores | Strong; confidence tone deliberately avoids alarming colors (3.4-adjacent design decision, already correct) |
| Decision Report — all content sections | Fixed: 3.2, 3.7; otherwise reads clearly at every screen size |
| Property cards, collapsed & expanded | Fixed: 3.2, 3.6, 3.9; otherwise strong |
| my-searches (empty & populated) | Fixed: 3.8 |
| Error states | Fixed: 3.3 |
| Loading states | Fixed: 3.4; intentionally left as a spinner rather than a skeleton — see 6.4 |
| Dark mode | No issues found in any reviewed screen |
| Keyboard navigation | No issues found — every interactive element is a real, natively-focusable element (`<button>`, `<a>`, `<details>/<summary>`); nothing relies on non-interactive elements with click handlers |
| Print / Save as PDF | Fixed: 3.2 |

---

## 5. Verification performed

- `tsc --noEmit` — clean
- `eslint .` — clean, zero warnings
- `vitest run` — **120/120 unit tests passing** (2 new regression tests added this pass, covering the long-term-consequences grouping)
- `next build` — succeeds, all routes prerender
- Full Playwright E2E + accessibility suite — **28/28 passing**, including two new accessibility scans added this pass
- Manual, scripted browser verification of every fix in this report, at the viewport/theme/locale combinations described in Section 2, with before/after screenshots compared pixel-by-pixel where a fix's effect wasn't otherwise provable (notably 3.2)

---

## 6. Remaining weaknesses

Honestly, not exhaustively fixed — these were identified and deliberately left as-is, either because fixing them risked scope creep into new features, or because the fix carries more risk than the problem justifies at this stage.

1. **No back-navigation within the clarifying-question sequence.** If a user answers a question and immediately regrets it, their only recourse is to finish the sequence and use "Edit details" at the end. This is a real, if minor, gap — the "Edit details" escape hatch does fully cover it functionally, just not in the moment. Adding a "back" step would mean tracking answer history, which felt like new complexity for a low-frequency scenario rather than a refinement.
2. **Budget number inputs have no visible unit indicator.** Typing a budget shows a bare number ("500000") with no "kr" suffix or thousand-separator formatting while typing (it's correctly formatted everywhere it's *displayed* afterward, via `lib/format.ts`). A real premium fintech-style masked input was judged higher-risk to implement under this review's time budget than its payoff justified — noted for V2 rather than rushed.
3. **No custom 404 page.** Realt AI currently falls back to Next.js's default not-found page for unmatched routes — unbranded, and outside this review's original scope, but worth listing since a full "every screen" audit should say so plainly.
4. **The report's loading state is a spinner, not a skeleton.** Given the report is computed in-memory and returns almost instantly in this environment, a skeleton screen would be effort spent on a state most users will barely see. This calculus changes once a real backend introduces real network latency — worth revisiting post-deployment, not before.
5. **The heuristic (non-AI) priority extraction is pattern-based and will miss phrasing outside its keyword vocabulary**, even though it now covers both English and Swedish for the fields that matter most. This is clearly disclosed to the user ("Running in offline mode") rather than hidden, which is the right call for now, but it's a real capability ceiling until a real AI key is configured.
6. **Touch targets are mostly 36px (`h-9`)**, consistently, throughout the app — functional and consistent, but below the 44px many accessibility guidelines recommend as ideal. Changing this is an app-wide design-system decision, not a spot fix, and was out of scope for a polish pass.
7. **Session-only persistence.** Priorities live in `sessionStorage` and are lost on tab close unless the user explicitly saves the search. This is a deliberate, documented architectural choice (see `docs/architecture.md`), not an oversight, but it's worth restating as a real user-facing limitation.
8. **No analytics or telemetry.** Every finding in this report came from a reviewer manually driving the product. Once real users are involved, actual usage data will surface things a review like this — however thorough — cannot.

---

## 7. Suggested Version 2+ improvements

Not commitments, not scoped — directional suggestions for after real property data and deployment are in place, since CLAUDE.md is explicit that feature growth should only follow "does this help users make better housing decisions":

- **Masked/formatted currency input** for budget fields, addressing weakness 2 properly rather than as a rushed fix.
- **A lightweight back-navigation affordance in the clarifying-question sequence** (weakness 1), if user behavior after launch shows people actually want to revise an answer mid-flow rather than using "Edit details."
- **A branded 404 / error boundary page** (weakness 3), matching the calm, professional tone of the rest of the product instead of the framework default.
- **Skeleton loading states**, once real backend latency makes the spinner-vs-skeleton trade-off actually matter (weakness 4).
- **Expand the heuristic extraction vocabulary further**, or treat the AI path as closer to a requirement than an optional upgrade, once budget allows a real API key in every environment, addressing weakness 5.
- **A real design-system pass on touch targets and spacing scale**, informed by whatever device mix real users actually show up on (weakness 6).
- **Durable cross-session persistence** for in-progress (not yet saved) searches, if user behavior shows people frequently lose work by closing a tab mid-session (weakness 7).
- **Basic analytics** on the onboarding funnel and report engagement — which sections people actually expand, where they drop off — the single highest-leverage next investment, since everything above is a guess until real usage data exists (weakness 8).
- **A shareable link for a saved report**, once there's a backend that can host one — the natural next step beyond "print/save," since CLAUDE.md's product principles frame this as something people "revisit and share," and a link is a more modern sharing mechanism than a PDF for most people.

---

## 8. Recommendation

The product is in genuinely good shape. This review's job was to find what a first-time user would actually hit, not to speculate about theoretical gaps — and what it found was one serious bug (the print/save promise being broken), one meaningful cross-cutting bug (mobile header overflow), and a handful of real-but-minor accessibility and consistency gaps. All are now fixed and verified. Nothing found in this review is a reason to delay moving to real property data providers and deployment planning — but Section 6 is worth a deliberate "accept as V1" decision rather than a silent one, and Section 7 is a reasonable starting point for what comes after.
