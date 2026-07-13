# CLAUDE.md — Realt AI Engineering Guide

## Mission

You are building **Realt AI**, an AI-first platform that helps people make better housing decisions.

Realt AI is **not** a housing search engine.

It is an intelligent decision assistant.

The product should help users understand their priorities, identify trade-offs and confidently choose the right home.

Every engineering decision should support this mission.

---

# Core Philosophy

Always remember:

People do not buy apartments.

People buy a future life.

The AI should understand people before it understands properties.

---

# Product Principles

Realt AI must always be:

* Professional
* Calm
* Transparent
* Intelligent
* Trustworthy
* Minimalistic

Never:

* Clickbait
* Pushy
* Loud
* Gamified
* Manipulative

---

# AI First

The AI is the product.

The listings are supporting information.

Everything starts with understanding the user.

---

# Engineering Principles

Always write production-ready code.

Requirements:

* Modular
* Reusable
* Typed
* Tested
* Accessible
* Performant
* Secure
* Easy to maintain

Never duplicate logic.

Never create unnecessary complexity.

Prefer readability over cleverness.

---

# Tech Stack

Framework

* Next.js 15
* React 19
* TypeScript

Styling

* Tailwind CSS
* shadcn/ui

Icons

* Lucide

Theme

* next-themes

Backend

* Next.js Route Handlers

Database

* Supabase (planned)

AI

* OpenAI Responses API

Deployment

* Vercel

Development

* GitHub
* Claude Code

---

# Folder Structure

Use feature-based architecture.

app/

components/

features/

hooks/

lib/

services/

types/

styles/

public/

docs/

tests/

Every feature owns its own components where appropriate.

---

# Code Style

Use strict TypeScript.

Prefer Server Components unless client interactivity is needed.

Use async/await.

Never use "any".

Create reusable components.

Use descriptive names.

No dead code.

No commented-out code.

---

# Accessibility

Every page must support:

Keyboard navigation

Screen readers

Proper ARIA labels

Visible focus states

Semantic HTML

WCAG AA contrast

---

# Responsive Design

Desktop first.

Tablet.

Mobile.

No layout should break.

---

# Theme

Support:

Light

Dark

System

No hardcoded colors.

Use design tokens.

---

# UI Principles

Minimal.

Clean.

Lots of whitespace.

Consistent spacing.

Rounded corners.

Subtle shadows.

Professional typography.

No visual clutter.

---

# User Experience

Every screen should answer:

Where am I?

What is most important?

What should I do next?

---

# AI Behaviour

The AI must:

Understand.

Reason.

Explain.

Recommend.

Never hallucinate.

Never fabricate facts.

Never recommend something it cannot explain.

Always explain why.

---

# Realt Thinking Framework

For every recommendation:

1. Understand user goals

2. Detect conflicts

3. Rank priorities

4. Evaluate trade-offs

5. Recommend

6. Explain reasoning

---

# Property Recommendations

Never only show properties.

Always explain:

Why this property fits.

Why it may not fit.

Potential compromises.

Possible risks.

---

# Match Score

Every recommendation should generate a transparent match score.

The score must be explainable.

The user should always understand how it was produced.

---

# Security

Validate all inputs.

Sanitize outputs.

Never expose secrets.

Never trust client data.

Use environment variables.

Rate-limit AI requests.

---

# Performance

Lazy load where appropriate.

Optimize images.

Avoid unnecessary client components.

Avoid unnecessary re-renders.

Keep bundle size small.

---

# Testing

Every important feature should include tests.

Prioritize:

Business logic

AI orchestration

Critical user flows

---

# Git Workflow

Small commits.

Clear commit messages.

One feature per branch.

Keep pull requests focused.

---

# Documentation

Document architectural decisions.

Keep documentation updated.

Code should explain itself whenever possible.

---

# Final Rule

Whenever a new feature is proposed, first ask:

Does this help users make better housing decisions?

If the answer is no, reconsider the feature.

Realt AI exists to improve decisions, not to increase feature count.

See `docs/architecture.md` for how the current implementation applies these principles.
