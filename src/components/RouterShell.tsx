"use client";

// The APEX (kai.emai.dev) is a router, not a project. After login it reads the
// user's member index and sends them on:
//   • workspace owner            → company dashboard (every project, aggregated)
//   • member/guest, 1 project    → silent redirect to that project's subdomain
//   • member/guest, 2+ projects  → launcher (pick a project)
//   • no projects                → empty state
// Anonymous visitors get the neutral hub landing + login. Owner detection is
// WAC-gated: only a workspace owner can enumerate /emai/projects/.

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  Logo,
  Spinner,
  Symbol,
} from "@mind-studio/ui";
import { ArrowRight, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ROLE_LABEL } from "@/lib/labels";
import { profile } from "@/lib/profile";
import { ensureSession, logout, usernameOf } from "@/lib/solid/auth";
import { projectHost } from "@/lib/solid/config";
import { loadAllProjects, loadMemberIndex, type ProjectSummary } from "@/lib/solid/data";
import type { ProjectRef } from "@/lib/solid/turtle";
import { t } from "@/lib/strings";
import { Landing } from "./Landing";
import { WorkspaceShell } from "./WorkspaceShell";

const ROLE_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  Owner: "default",
  Member: "secondary",
  Guest: "outline",
};

/** Cross-subdomain hop carrying ?sso=1 so the target silently re-auths. */
function hopUrl(host: string): string {
  const proto = typeof window !== "undefined" ? window.location.protocol : "https:";
  return `${proto}//${host}/?sso=1`;
}

type State =
  | { phase: "loading" }
  | { phase: "anonymous" }
  | { phase: "redirecting"; host: string }
  | { phase: "owner"; projects: ProjectSummary[]; displayName: string }
  | { phase: "launcher"; entries: ProjectRef[]; displayName: string }
  | { phase: "empty"; webId: string };

export function RouterShell() {
  const [state, setState] = useState<State>({ phase: "loading" });

  const check = useCallback(async () => {
    const info = await ensureSession();
    if (!info.isLoggedIn || !info.webId) {
      setState({ phase: "anonymous" });
      return;
    }
    const webId = info.webId;
    const username = usernameOf(webId);

    // Workspace owner? Enumerating /emai/projects/ needs owner WAC → throws for
    // everyone else. Success doubles as the company-view data fetch.
    let projects: ProjectSummary[] | null = null;
    try {
      projects = await loadAllProjects();
    } catch {
      projects = null;
    }
    if (projects && projects.length) {
      const name =
        projects.flatMap((p) => p.meta.members).find((m) => m.agent === webId)?.name ?? username;
      setState({ phase: "owner", projects, displayName: name });
      return;
    }

    const entries = await loadMemberIndex(username);
    if (entries.length === 0) {
      setState({ phase: "empty", webId });
      return;
    }
    if (entries.length === 1) {
      const host = entries[0].host || projectHost(entries[0].projectId);
      setState({ phase: "redirecting", host });
      window.location.assign(hopUrl(host));
      return;
    }
    setState({ phase: "launcher", entries, displayName: username });
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  if (state.phase === "loading") {
    return (
      <Centered>
        <Spinner className="size-6 text-primary" />
        <span className="text-sm text-muted-foreground">{t.connecting}</span>
      </Centered>
    );
  }

  if (state.phase === "anonymous") {
    return <Landing onLoggedIn={() => void check()} />;
  }

  if (state.phase === "redirecting") {
    return (
      <Centered>
        <Spinner className="size-6 text-primary" />
        <span className="text-sm text-muted-foreground">{t.redirectingTo(state.host)}</span>
      </Centered>
    );
  }

  if (state.phase === "empty") {
    return (
      <ApexChrome displayName={usernameOf(state.webId)}>
        <div className="mx-auto max-w-lg py-20 text-center">
          <Symbol className="mx-auto h-10 w-10 opacity-60" />
          <p className="mt-6 text-muted-foreground">{t.noProjectYet(state.webId)}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t.accessManaged}</p>
        </div>
      </ApexChrome>
    );
  }

  if (state.phase === "launcher") {
    return (
      <ApexChrome displayName={state.displayName}>
        <Header kicker={t.yourProjects} title={t.chooseProject} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {state.entries.map((e) => (
            <a
              key={e.projectId}
              href={hopUrl(e.host || projectHost(e.projectId))}
              className="group"
            >
              <Card className="glow-hover h-full transition-colors group-hover:border-primary/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Symbol className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold">{e.title}</p>
                    <Badge variant={ROLE_BADGE[e.role] ?? "secondary"} className="mt-1">
                      {ROLE_LABEL[e.role]}
                    </Badge>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </ApexChrome>
    );
  }

  // owner — the full Workspace hub (overview, board, calendar, people, briefings).
  return <WorkspaceShell projects={state.projects} displayName={state.displayName} />;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-3">
      <div className="emai-backdrop absolute inset-0 -z-10" aria-hidden />
      {children}
    </div>
  );
}

function Header({ kicker, title, meta }: { kicker: string; title: string; meta?: string }) {
  return (
    <section className="pt-2 pb-6">
      <p className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
        {kicker}
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h1>
      {meta && <p className="mt-2 text-sm text-muted-foreground">{meta}</p>}
    </section>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ApexChrome({ displayName, children }: { displayName: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="emai-backdrop fixed inset-0 -z-10" aria-hidden />
      <div
        className="emai-aurora pointer-events-none fixed inset-x-0 top-0 -z-10 h-[40vh]"
        aria-hidden
      />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
        <header className="flex items-center justify-between gap-3 border-b border-border/60 py-3">
          <div className="flex items-center gap-3">
            <Logo label={profile.appName} />
          </div>
          <div className="flex items-center gap-2.5">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm text-foreground sm:inline">{displayName}</span>
            <Button variant="ghost" size="sm" onClick={() => logout()} aria-label={t.signOut}>
              <LogOut className="size-4" /> {t.signOut}
            </Button>
          </div>
        </header>
        <main className="flex-1 py-6">{children}</main>
      </div>
    </div>
  );
}
