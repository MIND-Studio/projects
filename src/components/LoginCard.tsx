"use client";

// The unified Mind login card from @mind-studio/core, EmAI-accented.
// `credentials` makes the whole login happen IN the app (no redirect to the
// issuer's login page): the card collects username(+password), startLogin
// posts them to the issuer and jumps straight to /login/callback.

import { MindLoginCard } from "@mind-studio/core";
import { session, startLogin } from "@/lib/solid/auth";
import { APP_NAME, ISSUER, LOGIN_FIELDS, currentBranding } from "@/lib/solid/config";
import { profile } from "@/lib/profile";
import { t } from "@/lib/strings";

// German overrides for the core login card. English is the card's built-in
// default (omit `strings`), so this only loads when locale === "de".
const GERMAN = {
  continueWith: "Anmelden",
  continueAs: (name: string) => `Weiter als ${name}`,
  reconnect: "Erneut verbinden",
  sessionExpired: "Deine Sitzung ist abgelaufen. Verbinde dich erneut.",
  pendingRedirect: "Weiterleitung…",
  pendingCredentials: "Anmeldung…",
  usernameLabel: "Benutzername",
  passwordLabel: "Passwort",
  invalidCredentials: "Benutzername oder Passwort ist falsch.",
  loginFailed: "Anmeldung fehlgeschlagen",
  switchAccount: "Anderes Konto verwenden",
  useDifferentPod: "Anderen Pod verwenden",
  useDefaultPod: "Standard-Pod verwenden",
  issuerLabel: "Solid-OIDC-Issuer",
  issuerHint: (d: string) => `Standard: ${d}`,
  signInAt: (host: string) => `Die Anmeldung erfolgt direkt bei ${host}.`,
};

// The login card on its own (orbit halo + MindLoginCard + small print), with no
// full-screen wrapper — drops into the landing hero's right column or the
// centered <LoginCard/> below.
export function LoginPanel({ onLoggedIn }: { onLoggedIn?: () => void }) {
  const brand = currentBranding();
  const isEmai = profile.brand === "emai";
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative animate-rise">
        <div className="emai-orbit absolute -inset-12 -z-10 opacity-70" aria-hidden />
        <MindLoginCard
          appName={APP_NAME}
          defaultIssuer={ISSUER}
          // EmAI brand styling only; the OSS default uses the card's Mind look.
          accent={isEmai ? "#ff6700" : undefined}
          logoLetter={isEmai ? "K" : undefined}
          mode={isEmai ? "dark" : undefined}
          credentials={LOGIN_FIELDS}
          strings={profile.locale === "de" ? GERMAN : undefined}
          tagline={t.loginTagline(brand.title)}
          trustLine={t.loginTrust}
          onLogin={async (args) => {
            await startLogin(args);
            // The in-app flow completes without any page load — tell the Shell.
            if (session().info.isLoggedIn) onLoggedIn?.();
          }}
        />
      </div>
      {/* Company-hub access note — irrelevant when each user signs into their own pod. */}
      {profile.workspace === "fixed" && (
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          {t.accessManaged}
        </p>
      )}
    </div>
  );
}

// Full-screen centered login — the focused fallback for deep-linked routes
// (e.g. /board) hit while logged out.
export function LoginCard({ onLoggedIn }: { onLoggedIn?: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden p-6">
      <div className="emai-backdrop absolute inset-0 -z-10" aria-hidden />
      <div
        className="emai-aurora pointer-events-none absolute inset-x-0 top-0 -z-10 h-[45vh]"
        aria-hidden
      />
      <LoginPanel onLoggedIn={onLoggedIn} />
    </div>
  );
}
