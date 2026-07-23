# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Privacy-conscious individuals managing their own logins on their own machine. They reach for KeyNest when they want a credential store that never leaves the browser — no account, no sync, no server. The core job is fast: stash a login, find it later, reveal or copy it, and get out.

## Product Purpose
KeyNest is a local-first credential vault. It exists so a person can keep usernames and passwords in one place without trusting a cloud service. Success is the user trusting the app enough to make it their default store, and being able to add / find / copy a credential in seconds.

## Positioning
Everything stays in the browser's IndexedDB (via Dexie) — nothing is ever sent to a server. Import/export is a plain JSON file the user controls. The differentiator is honest locality: no network dependency, no lock-in, portable data.

## Operating Context
Single-screen web app. A topbar (brand + import/export), a toolbar (search + add), a responsive grid of credential cards, an add/edit modal, empty states, and toasts. Common actions: add a credential, search, reveal/mask a password, copy username or password, share as text, edit, delete, and back up via JSON export/import.

## Capabilities and Constraints
- Angular 21 (standalone components, signals, OnPush), TypeScript strict, SCSS with a token-driven design system (`--kn-*` in `src/styles.scss`).
- Persistence is browser-local IndexedDB via Dexie (`keynest` DB, `credentials` table); no backend, no auth.
- Clipboard via `@angular/cdk`. No router — one screen.
- Fonts currently Inter (UI) + JetBrains Mono (credential values).

## Brand Commitments
- Name: **KeyNest** (styled "Key" + accented "Nest"), tagline "Local-first vault". Nest/shield iconography.
- Voice: calm, trustworthy, plain-spoken, security-minded.
- Binding visual direction (user-set): **black / near-black surfaces with a deep-emerald green accent** (muted, not neon), replacing the previous generic indigo. The old indigo "AI dashboard" look is an explicit anti-reference.

## Evidence on Hand
No testimonials, customers, benchmarks, or pricing exist — this is a personal-use local app; future work must not fabricate any. Real product copy lives in the empty-state and modal components.

## Product Principles
- Local-first and private by default — never imply data leaves the device.
- Speed of retrieval over decoration; the app is a tool (Operate mode).
- Trust is the brand — precise, restrained craft signals security.
- The user owns their data — transparent JSON import/export.

## Accessibility & Inclusion
Keep WCAG AA contrast on text and controls, visible focus rings, and non-color cues for state (reveal/copy/delete). No color-only communication.
