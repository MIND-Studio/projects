# Mind Projects

An open-source project workspace on Solid Pods — overview, kanban board + a
`.mind`-native issue tracker, Gantt timeline, meetings (ICS export),
briefings/knowledge, team, and an optional AI assistant.

One codebase serves three worlds via the deployment **profile**
(`src/lib/profile.ts`): a personal app in your own pod (default), a multi-tenant
company hub on a shared workspace pod by subdomain, and an app embedded in the
Mind shell. See `AGENTS.md` for the architecture.

## Develop

```bash
export NODE_AUTH_TOKEN=<read:packages PAT>   # for @mind-studio/* from GitHub Packages
npm install
docker compose up -d          # shared CSS on :3011  (or use the mind-setup-dev skill)
npm run seed:demo             # seed alice's pod with a demo project
npm run dev                   # http://localhost:3160
```

Sign in as the seeded persona (e.g. `alice`) — the board, timeline, meetings and
briefings render from `{pod}/projects/workspace/`, and issue moves/edits/creates
write straight back to the pod (no server, no git).

## Configuration (profile env)

All build-time (`NEXT_PUBLIC_*`) unless noted. Defaults give the personal app.

| Var | Default | Meaning |
|---|---|---|
| `NEXT_PUBLIC_APP_TITLE` | `Projects` | Display name |
| `NEXT_PUBLIC_SOLID_ISSUER` | `https://pods.mindpods.org/` | OIDC issuer / pod base |
| `NEXT_PUBLIC_WORKSPACE_MODE` | `identity` | `identity` (own pod) or `fixed` |
| `NEXT_PUBLIC_WORKSPACE` | — | Shared workspace pod root (when `fixed`) |
| `NEXT_PUBLIC_PROJECT_MODE` | `single` | `single` / `picker` / `subdomain` |
| `NEXT_PUBLIC_PROJECT` | `workspace` | Project id (single) / apex fallback (subdomain) |
| `NEXT_PUBLIC_BASE_DOMAIN` | — | Base domain for `subdomain` mode, e.g. `projects.example.com` |
| `NEXT_PUBLIC_PROJECT_ALIASES` | `{}` | JSON `{ "sub": "project-id" }` (subdomain mode) |
| `NEXT_PUBLIC_BRANDING` | `{}` | JSON map `projectId → {title,kicker,partners,descriptor}` |
| `NEXT_PUBLIC_ASSISTANT` | `false` | `on` to enable the AI assistant |
| `NEXT_PUBLIC_ASSISTANT_NAME` | `Assistant` | Assistant display name |
| `NEXT_PUBLIC_LOCALE` | `en` | `en` or `de` |
| `NEXT_PUBLIC_LOGIN_FIELDS` | `username-password` | `username` for open-mode dev pods |
| `NEXT_PUBLIC_FRAME_ANCESTORS` | shell origins | CSP `frame-ancestors` for shell embedding |
| `NEXT_PUBLIC_WRITE_BACKEND` | `pod` | `git` to use the commit-back pipeline |
| `ISSUES_GIT_*` (server) | — | git remote/branch/bot for the `git` backend |
| `KAI_*` / LLM env (server) | — | worker creds for the assistant |

### Company hub (multi-tenant, subdomain-routed)

A shared workspace pod, one project per subdomain, with the optional assistant
and git commit-back turned on:

```
NEXT_PUBLIC_WORKSPACE_MODE=fixed
NEXT_PUBLIC_WORKSPACE=https://pods.mindpods.org/acme/
NEXT_PUBLIC_PROJECT_MODE=subdomain
NEXT_PUBLIC_BASE_DOMAIN=projects.example.com
NEXT_PUBLIC_PROJECT=main
NEXT_PUBLIC_PROJECT_ALIASES={"web":"website-relaunch"}
NEXT_PUBLIC_ASSISTANT=on
NEXT_PUBLIC_WRITE_BACKEND=git
ISSUES_GIT_URL=...   # + worker creds (server-only)
```
