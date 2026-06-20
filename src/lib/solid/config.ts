// Deployment wiring, driven entirely by the deployment {@link profile}. The same
// bundle serves three worlds:
//   • identity workspace + single/picker project — a personal app in the user's
//     OWN pod (the open-source default), or the same app embedded in the shell.
//   • fixed workspace + subdomain project — a multi-tenant company hub where the
//     active project is resolved from the request host (EmAI).
// `paths`/`projectRoot`/`workspacePaths` are lazy so one image serves every
// project. This module is ISOMORPHIC (imported by server routes too), so it must
// not pull in the browser-only solid client — identity-mode workspace is injected
// at runtime by the client via {@link setIdentityWorkspace}.

import { profile } from "@/lib/profile";

const ensureSlash = (u: string) => (u.endsWith("/") ? u : u + "/");

export const ISSUER = profile.issuer;
export const APP_NAME = profile.appName;

// ------------------------------------------------------------- workspace root
// In `fixed` mode the workspace pod is a build-time constant (server-safe). In
// `identity` mode it is the signed-in user's pod root, which only the client
// knows — the client calls setIdentityWorkspace() once after the session (or the
// shell broker handshake) resolves.

let identityWorkspace: string | null = null;

/** Client-only: record the active user's pod root for `identity` mode. */
export function setIdentityWorkspace(root: string | null): void {
  identityWorkspace = root ? ensureSlash(root) : null;
}

// When embedded in the shell, the active project is the one the shell brokers —
// NOT profile.defaultProject. The client injects it after the handshake so the
// embedded app scopes to the shell's project switcher (null = "no project").
let identityProject: string | null = null;

/** Client-only: record the shell's brokered project id (overrides the default). */
export function setIdentityProject(projectId: string | null): void {
  identityProject = projectId || null;
}

/** The workspace pod root, or "" if identity-mode and not yet signed in. */
export function workspaceRoot(): string {
  if (profile.workspace === "fixed") return ensureSlash(profile.fixedWorkspace);
  return identityWorkspace ?? "";
}

// --------------------------------------------------------- subdomain routing
// Only meaningful in `subdomain` project mode; otherwise the active project is
// always profile.defaultProject and there is no apex router.

function parseAliases(): Record<string, string> {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_PROJECT_ALIASES ?? "{}");
  } catch {
    return {};
  }
}
const PROJECT_ALIASES = parseAliases();

export const PROJECT_ID = profile.defaultProject;

/** The subdomain label of a host under the configured base domain, or null. */
function subOf(hostname: string | undefined | null): string | null {
  if (!hostname) return null;
  const host = hostname.split(":")[0];
  const base = profile.baseDomain;
  if (base && host.endsWith("." + base)) {
    const label = host.slice(0, -(base.length + 1)).split(".")[0];
    return label || null;
  }
  // `*.localhost` for local multi-tenant testing.
  if (host.endsWith(".localhost")) return host.split(".")[0];
  return null;
}

/** Resolve the active project from a hostname (subdomain mode); otherwise the
    default project. Host is server-trusted, so a prompt can't change it. */
export function resolveProjectId(hostname: string | undefined | null): string {
  if (profile.project !== "subdomain") return PROJECT_ID;
  const sub = subOf(hostname);
  if (!sub || sub === "www") return PROJECT_ID;
  return PROJECT_ALIASES[sub] ?? sub;
}

/** Is this host the apex/router (no project subdomain)? Always false unless in
    subdomain mode. */
export function isRouterHost(hostname: string | undefined | null): boolean {
  if (profile.project !== "subdomain") return false;
  if (!hostname) return false;
  const sub = subOf(hostname);
  return !sub || sub === "www";
}

function currentProjectId(): string {
  // Embedded: the shell's brokered project wins over every other resolution.
  if (identityProject) return identityProject;
  if (profile.project === "subdomain" && typeof window !== "undefined")
    return resolveProjectId(window.location.hostname);
  return PROJECT_ID;
}

/** The host that serves a given project (inverse of resolveProjectId). */
export function projectHost(projectId: string): string {
  const sub =
    Object.entries(PROJECT_ALIASES).find(([, v]) => v === projectId)?.[0] ?? projectId;
  if (typeof window !== "undefined") {
    const [h, port] = window.location.host.split(":");
    if (h.split(".").pop() === "localhost")
      return `${sub}.localhost${port ? `:${port}` : ""}`;
  }
  return profile.baseDomain ? `${sub}.${profile.baseDomain}` : sub;
}

// ----------------------------------------------------------------- pod paths

/** The workspace-level containers the apex router / Workspace hub reads. */
export const workspacePaths = {
  get projects() { return `${workspaceRoot()}projects/`; },
  get workspaceTtl() { return `${workspaceRoot()}workspace.ttl`; },
  memberIndex: (username: string) => `${workspaceRoot()}members/${username}/index.ttl`,
  get company() { return `${workspaceRoot()}company/company.ttl`; },
  get companyOrgs() { return `${workspaceRoot()}company/orgs.ttl`; },
  get companyKnowledge() { return `${workspaceRoot()}company/knowledge/`; },
};

/** Container root for a project, e.g. {workspace}/projects/<id>/. */
export function projectRoot(projectId: string = currentProjectId()): string {
  return `${workspaceRoot()}projects/${projectId}/`;
}

/** Per-project pod paths. Lazy getters resolve the project at access time. */
export const paths = {
  get projectTtl() { return `${projectRoot()}project.ttl`; },
  get tracker() { return `${projectRoot()}tracker/tracker.ttl`; },
  get trackerVocab() { return `${projectRoot()}tracker/tracker.ttl`; },
  get trackerEpics() { return `${projectRoot()}tracker/epics.ttl`; },
  get trackerState() { return `${projectRoot()}tracker/state.ttl`; },
  get meetings() { return `${projectRoot()}meetings/`; },
  get knowledge() { return `${projectRoot()}knowledge/`; },
  get briefings() { return `${projectRoot()}briefings/`; },
  get briefingDrafts() { return `${projectRoot()}briefings/drafts/`; },
  chat: (username: string) => `${projectRoot()}chat/${username}/`,
  get comments() { return `${projectRoot()}comments/`; },
};

// ------------------------------------------------------------------ branding
// Pre-login chrome (landing hero, login card, document <title>) has no pod data
// yet, so public display branding lives here. Defaults are a neutral "Projects"
// identity; a deployment may override per-project via NEXT_PUBLIC_BRANDING (a
// JSON map of projectId → Branding) and NEXT_PUBLIC_HUB_BRANDING.

export type Branding = {
  title: string;
  kicker: string;
  partners: string[];
  descriptor: string;
};

export const HUB_BRANDING: Branding = (() => {
  try {
    const o = JSON.parse(process.env.NEXT_PUBLIC_HUB_BRANDING ?? "null");
    if (o && typeof o === "object") return o as Branding;
  } catch {}
  return {
    title: profile.appName,
    kicker: "Workspace",
    partners: [],
    descriptor: "your projects, tasks, meetings and briefings in one place",
  };
})();

const BRANDING: Record<string, Branding> = (() => {
  try {
    const o = JSON.parse(process.env.NEXT_PUBLIC_BRANDING ?? "{}");
    if (o && typeof o === "object") return o as Record<string, Branding>;
  } catch {}
  return {};
})();

export function brandingFor(projectId: string): Branding {
  return BRANDING[projectId] ?? HUB_BRANDING;
}

export function currentBranding(): Branding {
  if (typeof window !== "undefined" && isRouterHost(window.location.hostname)) {
    return HUB_BRANDING;
  }
  return brandingFor(currentProjectId());
}

/** In-app login fields. */
export const LOGIN_FIELDS: "username" | "username-password" = profile.loginFields;
