"use client";

// Thin shims over the shared {@link solid} client (see `client.ts`). Standalone
// these run Solid-OIDC; framed in the Mind shell the same calls take identity +
// brokered pod I/O over the capability bridge. Keeping these names stable lets
// the rest of the app stay agnostic to which world it runs in.

import {
  login,
  handleIncomingRedirect,
  type ISessionInfo,
} from "@inrupt/solid-client-authn-browser";
import { browserOidcLogin } from "@mind-studio/core";
import { profile } from "@/lib/profile";
import { solid } from "./client";

export function session() {
  return solid.session();
}

/** Broker fetch when embedded in the shell, session fetch standalone. */
export function authedFetch(): typeof fetch {
  return solid.authedFetch();
}

export function ensureSession(): Promise<ISessionInfo> {
  return solid.ensureSession();
}

/** Path to return to after the OIDC dance (set before login, read by the
    callback). Defaults to "/". */
export function consumeRestoredPath(): string {
  return solid.consumeReturnTo();
}

/**
 * Unified login handler from @mind-studio/core: with a username it completes the
 * whole OIDC flow in-app (credential POST → hidden-iframe callback → session
 * finished) with zero page loads; without one it falls back to the classic
 * full-page redirect.
 *
 * The in-app path captures the callback URL (carrying the one-time code) from a
 * script-disabled iframe and hands it here — so we MUST redeem that exact URL,
 * not `window.location` (which `solid.completeLoginRedirect()` reads and which,
 * mid-flow, is still the app's own page with no `?code=`). Redeem against
 * inrupt's default session — the same session `solid` wraps — so the live
 * session updates in place.
 */
export const startLogin = browserOidcLogin(login, {
  callbackPath: "/login/callback",
  clientName: profile.appName,
  handleIncomingRedirect: (url: string) =>
    handleIncomingRedirect({ url, restorePreviousSession: false }),
});

/**
 * Silent cross-subdomain SSO (company-hub `subdomain` mode only). The issuer
 * session cookie is shared by every project subdomain, so a `prompt=none`
 * redirect returns logged-in if a session is alive. Guarded per-tab so a failed
 * attempt can't loop.
 */
const SSO_FLAG = "projects-sso-tried";

export async function attemptSilentLogin(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (sessionStorage.getItem(SSO_FLAG)) return false;
  sessionStorage.setItem(SSO_FLAG, "1");
  await login({
    oidcIssuer: profile.issuer,
    redirectUrl: `${window.location.origin}${window.location.pathname}`,
    clientName: profile.appName,
    prompt: "none",
  } as Parameters<typeof login>[0]);
  return true;
}

export async function logout(): Promise<void> {
  if (typeof window !== "undefined") sessionStorage.removeItem(SSO_FLAG);
  await session().logout({ logoutType: "app" });
  if (typeof window !== "undefined") window.location.assign("/");
}

/** "alexander" from http(s)://host/alexander/profile/card#me */
export function usernameOf(webId: string): string {
  const m = webId.match(/^https?:\/\/[^/]+\/([^/]+)\//);
  return m ? m[1] : webId;
}
