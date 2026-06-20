// The deployment profile — the single seam that makes ONE codebase serve every
// world: a personal single-tenant app in the user's own pod (the open-source
// default), a multi-tenant company hub on a shared workspace pod addressed by
// subdomain (EmAI), and an app embedded in the Mind shell (identity + pod I/O
// arrive over the capability bridge).
//
// Everything here is resolved from build-time `NEXT_PUBLIC_*` env (Next only
// inlines STATIC `process.env.NEXT_PUBLIC_x` member accesses — never dynamic
// `process.env[k]` — so each var is read explicitly below). Server-only knobs
// (write backend, assistant creds) are read from non-public env where used.

/** Where the workspace pod root comes from. */
export type WorkspaceMode =
  /** The signed-in user's OWN pod (or, when embedded, the shell-brokered pod). */
  | "identity"
  /** A fixed shared workspace pod baked in at build time (company hub). */
  | "fixed";

/** How the active project is chosen. */
export type ProjectMode =
  /** One project, id = {@link Profile.defaultProject}. No picker, no router. */
  | "single"
  /** Pick from the projects under the workspace (multi-project, one pod). */
  | "picker"
  /** Resolve the project from the request host, e.g. `neodem.example.com`. */
  | "subdomain";

/** How issue writes are persisted. */
export type WriteBackend =
  /** Direct pod writes as the signed-in user — zero server infra (default). */
  | "pod"
  /** Append-only git events folded back to the pod (EmAI `.mind` pipeline). */
  | "git";

export type Locale = "en" | "de";

export type Profile = {
  /** Display name (document title, login card, footer). */
  appName: string;
  /** OIDC issuer / default pod base. */
  issuer: string;
  workspace: WorkspaceMode;
  /** Shared workspace pod root — only when `workspace === "fixed"`. */
  fixedWorkspace: string;
  project: ProjectMode;
  /** Project id for `single` mode, and the apex fallback for `subdomain`. */
  defaultProject: string;
  /** Base domain for `subdomain` mode, e.g. `kai.emai.dev`. */
  baseDomain: string;
  writes: WriteBackend;
  /** AI assistant feature flag. */
  assistant: boolean;
  /** Configurable assistant display name (default "Assistant"). */
  assistantName: string;
  /** Brand theme: the built-in Mind theme (OSS default) or EmAI's orange brand. */
  brand: "mind" | "emai";
  locale: Locale;
  /** Login card fields — `username` for open-mode dev pods, else password. */
  loginFields: "username" | "username-password";
};

function bool(v: string | undefined, dflt: boolean): boolean {
  if (v == null) return dflt;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "on";
}

export const profile: Profile = {
  appName: process.env.NEXT_PUBLIC_APP_TITLE ?? "Projects",
  issuer:
    process.env.NEXT_PUBLIC_SOLID_ISSUER ??
    process.env.NEXT_PUBLIC_POD_BASE_URL ??
    "https://pods.mindpods.org/",
  workspace: process.env.NEXT_PUBLIC_WORKSPACE_MODE === "fixed" ? "fixed" : "identity",
  fixedWorkspace: process.env.NEXT_PUBLIC_WORKSPACE ?? "",
  project:
    process.env.NEXT_PUBLIC_PROJECT_MODE === "subdomain"
      ? "subdomain"
      : process.env.NEXT_PUBLIC_PROJECT_MODE === "picker"
        ? "picker"
        : "single",
  defaultProject: process.env.NEXT_PUBLIC_PROJECT ?? "workspace",
  baseDomain: process.env.NEXT_PUBLIC_BASE_DOMAIN ?? "",
  // Client-visible (it picks the client write path), so NEXT_PUBLIC. `git` only
  // actually engages when the server git env is present too (gitConfigured()).
  writes: process.env.NEXT_PUBLIC_WRITE_BACKEND === "git" ? "git" : "pod",
  assistant: bool(process.env.NEXT_PUBLIC_ASSISTANT, false),
  assistantName: process.env.NEXT_PUBLIC_ASSISTANT_NAME ?? "Assistant",
  brand: process.env.NEXT_PUBLIC_BRAND === "emai" ? "emai" : "mind",
  locale: process.env.NEXT_PUBLIC_LOCALE === "de" ? "de" : "en",
  loginFields:
    process.env.NEXT_PUBLIC_LOGIN_FIELDS === "username" ? "username" : "username-password",
};
