# AGENTS.md — projects

Orientation rules for agents working in this app. **Read this before editing.**

## What it is

Mind Projects — an open-source project workspace on Solid Pods: overview
dashboard, kanban board + a `.mind`-native issue tracker, Gantt timeline,
meetings (ICS export), briefings/knowledge, team, and an optional AI assistant.
Extracted from the kai.emai.dev hub to be **flexible**: one codebase, three
worlds, selected by the deployment **profile** (`src/lib/profile.ts`). Dev port
**3160**. Sibling of drive/notes/chat/shell — don't unify with them.

## The profile is the seam — read `src/lib/profile.ts` first

Everything deployment-specific resolves from `profile`. Never hardcode a
workspace, project, domain, branding, or "is the assistant on" — add/read a
profile field. The three worlds:

| | workspace | project | writes | identity |
|---|---|---|---|---|
| **Personal (default, OSS)** | `identity` (user's own pod) | `single` (`workspace`) | `pod` | OIDC |
| **Company hub (EmAI)** | `fixed` (shared pod) | `subdomain` | `git` | OIDC + SSO |
| **Embedded in shell** | `identity` (shell-brokered pod) | `single`/`picker` | `pod` | broker |

- `src/lib/solid/config.ts` is **isomorphic** (server routes import it) — it must
  NOT import the browser `solid` client. Identity-mode workspace is injected at
  runtime by the client via `setIdentityWorkspace()` (called in `Shell.tsx`).
- `src/lib/solid/client.ts` is the one `@mind-studio/core/solid` client: OIDC
  standalone, capability bridge (broker) when framed in the shell. `auth.ts` are
  thin shims over it; `authedFetch()` is broker-aware automatically.

## Hard rules

1. **Default backend = pod, no server.** `pod` writes go straight to the pod as
   the signed-in user via `src/lib/solid/writes.ts` (WAC is the only enforcement).
   The `git` backend (`src/lib/server/*`, `/api/issues`, `/api/chat`) is EmAI-only
   and engages **only** when `profile.writes === "git"` / `profile.assistant`.
   Don't make the default profile depend on any `/api/*` route.
2. **Single-flight OIDC.** Handled inside the core client — never call
   `handleIncomingRedirect` here; route session checks through `ensureSession()`.
3. **AI is opt-in.** Gate every assistant surface on `profile.assistant`
   (nav tab, `/chat` page, `/api/chat`). Off by default.
4. **Never log** tokens/secrets. WebID/route/status are fine.
5. **Vocab is generic.** The tracker writes `mindp:` predicates; it still *reads*
   legacy `ekai:` so EmAI-origin pods round-trip (`src/lib/solid/turtle.ts`).

## Known follow-ups (not yet done)

- **i18n sweep** (done for the UI): every user-facing rendered string resolves
  through `src/lib/strings.ts` (the `t` table + `dateLocale`, keyed by
  `profile.locale`) or the tracker labels (`src/lib/labels.ts`). English is the
  default; German lives only in the `de` block. Covered: Shell/RouterShell
  chrome, `LoginCard`, `CommandMenu`, `Landing`, home `Overview` (`app/page.tsx`),
  board, and the pages/sheets (timeline, meetings, team, briefings, IssueSheet,
  EpicSheet, CommentThread, MeetingSheet, KeyboardShortcuts, WorkspaceShell,
  workspace/*). Brand words come from `profile.appName`/`profile.assistantName`,
  not the table. STILL German (server/data, not UI chrome — out of this pass):
  `src/lib/server/kai.ts` (LLM grounding — see assistant follow-up below),
  `userauth.ts`/`commitback.ts` error strings, `src/lib/orgs.ts`, and the
  `## Willkommen & Stand` briefing-template regex in `app/page.tsx`/data.
- **Brand theme is profile-driven** (done): `Providers.tsx` uses the built-in
  **Mind** theme of `@mind-studio/ui` with system light/dark by default; the
  EmAI orange brand + forced-dark only loads when `profile.brand === "emai"`
  (`NEXT_PUBLIC_BRAND=emai`). The atmospheric CSS in `globals.css`
  (`emai-aurora`/`emai-beam`) keys off `var(--primary)`, so it re-tints to the
  active theme automatically.
- **Shell embed-readiness** (done): the app is bridge-aware via the shared
  `@mind-studio/core/solid` client (its `ensureSession()` already awaits the
  broker handshake, so embedded identity + brokered pod I/O need no app code).
  Thin shims in `src/lib/solid/broker.ts`; `BrokerThemeSync` (mounted in
  `Providers`) follows the shell's color mode; `StandaloneOnly` wraps the
  `Shell` header/footer so the app's own chrome is suppressed when framed; and
  `Shell` fires `signalReady()` once the authed view is ready. Framing headers
  (`frame-ancestors`) are in `next.config.ts`. Registered shell-side as a
  built-in iframe app (`shell/src/lib/shell/context.tsx` `builtinApps()`,
  `core/src/apps/catalog.ts`). Standalone, all of this is inert.
- **Configurable assistant LLM**: `src/lib/server/kai.ts` still grounds via the
  EmAI pod script; generalize to a `PROJECTS_LLM_*` endpoint before enabling
  the assistant outside EmAI.

## Design system

`@mind-studio/ui` (shadcn-native, dark). `@mind-studio/*` install from GitHub
Packages — `export NODE_AUTH_TOKEN=<read:packages PAT>` before `npm install`.

## Never commit

`node_modules/`, `.next/`, `.env*`.
