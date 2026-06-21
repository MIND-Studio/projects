"use client";

import { writeLastIdentity } from "@mind-studio/core";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Logo,
  Spinner,
  Symbol,
} from "@mind-studio/ui";
import {
  CalendarDays,
  ChevronsUpDown,
  CircleUser,
  FileText,
  GanttChartSquare,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  SquareKanban,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ROLE_LABEL } from "@/lib/labels";
import { profile } from "@/lib/profile";
import { attemptSilentLogin, ensureSession, logout, usernameOf } from "@/lib/solid/auth";
import {
  brokeredProject,
  isBrokered,
  signalReady,
  subscribeBrokeredIdentity,
} from "@/lib/solid/broker";
import { solid } from "@/lib/solid/client";
import {
  ISSUER,
  isRouterHost,
  projectHost,
  setIdentityProject,
  setIdentityWorkspace,
} from "@/lib/solid/config";
import { loadMemberIndex, loadProject, roleOf } from "@/lib/solid/data";
import type { ProjectMeta, ProjectRef, Role } from "@/lib/solid/turtle";
import { t } from "@/lib/strings";
import { CommandMenu } from "./CommandMenu";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { Landing } from "./Landing";
import { LoginCard } from "./LoginCard";
import { RouterShell } from "./RouterShell";
import { StandaloneOnly } from "./StandaloneOnly";

export type Hub = {
  webId: string;
  username: string;
  role: Role;
  project: ProjectMeta;
  displayName: string;
};

const HubContext = createContext<Hub | null>(null);

export function useHub(): Hub {
  const hub = useContext(HubContext);
  if (!hub) throw new Error("useHub outside <Shell>");
  return hub;
}

const TABS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  // The AI assistant tab only appears when the deployment enables it.
  ...(profile.assistant
    ? [{ href: "/chat", label: profile.assistantName, icon: MessageSquare }]
    : []),
  { href: "/board", label: "Board", icon: SquareKanban },
  { href: "/timeline", label: "Timeline", icon: GanttChartSquare },
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/briefings", label: "Briefings", icon: FileText },
  { href: "/team", label: "Team", icon: Users },
];

const ROLE_BADGE_VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  Owner: "default",
  Member: "secondary",
  Guest: "outline",
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isRouter, setIsRouter] = useState<boolean | null>(null);
  const [myProjects, setMyProjects] = useState<ProjectRef[]>([]);
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "anonymous" }
    | { phase: "noaccess"; webId: string }
    | { phase: "noproject" }
    | { phase: "ready"; hub: Hub }
  >({ phase: "loading" });

  const check = useCallback(async () => {
    const info = await ensureSession();
    if (!info.isLoggedIn || !info.webId) {
      // Arrived via a cross-project hop (?sso=1): try a silent re-auth before
      // the login card — the issuer session is shared across all subdomains.
      if (new URLSearchParams(window.location.search).get("sso") === "1") {
        if (await attemptSilentLogin()) return; // navigating to the issuer
      }
      setState({ phase: "anonymous" });
      return;
    }
    // identity-mode workspace = the signed-in (or shell-brokered) user's pod
    // root; a no-op under a fixed workspace. Must run before any path resolves.
    setIdentityWorkspace(solid.currentIdentity()?.podRoot ?? null);
    // Embedded: scope to the shell's active project (its switcher is the source
    // of truth). "No project" / whole-workspace has no single project to render —
    // the shell already provides the picker, so we show a prompt to use it.
    if (isBrokered()) {
      const bp = brokeredProject();
      setIdentityProject(bp?.id ?? null);
      if (!bp) {
        setState({ phase: "noproject" });
        return;
      }
    }
    try {
      const project = await loadProject();
      const role = roleOf(project, info.webId);
      if (!role) {
        setState({ phase: "noaccess", webId: info.webId });
        return;
      }
      const me = project.members.find((m) => m.agent === info.webId);
      const displayName = me?.name ?? usernameOf(info.webId);
      writeLastIdentity(profile.appName, {
        webId: info.webId,
        displayName,
        issuer: ISSUER,
      });
      // The user's other projects → the header "Projekt ▾" switcher (best-effort).
      void loadMemberIndex(usernameOf(info.webId))
        .then(setMyProjects)
        .catch(() => {});
      setState({
        phase: "ready",
        hub: {
          webId: info.webId,
          username: usernameOf(info.webId),
          role,
          project,
          displayName,
        },
      });
    } catch {
      setState({ phase: "noaccess", webId: info.webId });
    }
  }, []);

  // Apex (kai.emai.dev) is the router, not a project — resolved client-side after
  // mount to avoid SSR/host mismatch. Project hosts run the phase machine.
  useEffect(() => {
    setIsRouter(isRouterHost(window.location.hostname));
  }, []);
  useEffect(() => {
    if (isRouter === false) void check();
  }, [isRouter, check]);

  // Embedded: when the shell switches project (it pushes a new welcome to the
  // live bridge without reloading the frame), re-resolve so the board/timeline
  // follow the shell's switcher instead of stranding on the old project. Subscribe
  // unconditionally — standalone it never fires (nothing is brokered), and gating
  // on isBrokered() here would race the handshake and miss the subscription.
  useEffect(() => {
    return subscribeBrokeredIdentity(() => {
      setState({ phase: "loading" });
      void check();
    });
  }, [check]);

  // Embedded in the shell, tell it we're interactive so it clears its loading
  // overlay. No-op standalone (nothing is brokered).
  useEffect(() => {
    if (state.phase === "ready" && isBrokered()) signalReady();
  }, [state.phase]);

  if (isRouter === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <Spinner className="size-6 text-primary" />
        <span className="text-sm">{t.connecting}</span>
      </div>
    );
  }
  if (isRouter) return <RouterShell />;
  if (state.phase === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <Spinner className="size-6 text-primary" />
        <span className="text-sm">{t.connecting}</span>
      </div>
    );
  }
  if (state.phase === "noproject") {
    // Embedded in the shell with its "No project" (whole-workspace) scope. The
    // app is project-scoped, so there's nothing to show until a project is picked
    // — and the shell's banner switcher is that picker.
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="emai-backdrop absolute inset-0 -z-10" aria-hidden />
        <Symbol className="h-10 w-10 opacity-60" />
        <p className="max-w-sm text-lg font-medium">{t.noProjectSelected}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{t.noProjectHint}</p>
      </div>
    );
  }
  if (state.phase === "anonymous") {
    // Root gets the full marketing landing; deep-linked routes (e.g. /board) hit
    // while logged out get the focused full-screen login.
    return pathname === "/" ? (
      <Landing onLoggedIn={() => void check()} />
    ) : (
      <LoginCard onLoggedIn={() => void check()} />
    );
  }
  if (state.phase === "noaccess") {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="emai-backdrop absolute inset-0 -z-10" aria-hidden />
        <Symbol className="h-10 w-10 opacity-60" />
        <p className="max-w-lg text-muted-foreground">{t.notMember(state.webId)}</p>
        <p className="text-sm text-muted-foreground">{t.accessManaged}</p>
        <Button variant="outline" onClick={() => logout()}>
          {t.signOut}
        </Button>
      </div>
    );
  }

  const { hub } = state;
  const canEdit = hub.role === "Owner" || hub.role === "Member";
  return (
    <HubContext.Provider value={hub}>
      <div className="emai-backdrop fixed inset-0 -z-10" aria-hidden />
      <div
        className="emai-aurora pointer-events-none fixed inset-x-0 top-0 -z-10 h-[40vh]"
        aria-hidden
      />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
        <StandaloneOnly>
          <header className="sticky top-0 z-40 -mx-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2">
                <Link href="/" className="group flex items-center gap-3">
                  <Logo label={profile.appName} />
                </Link>
                {myProjects.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="hidden items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
                        aria-label={t.switchProject}
                      >
                        {hub.project.title}
                        <ChevronsUpDown className="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuLabel>{t.switchProject}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {myProjects.map((p) => {
                        const active = p.projectId === hub.project.id;
                        const host = p.host || projectHost(p.projectId);
                        return (
                          <DropdownMenuItem key={p.projectId} asChild disabled={active}>
                            <a
                              href={
                                active ? undefined : `${window.location.protocol}//${host}/?sso=1`
                              }
                            >
                              {p.title}
                              {active && (
                                <span className="ml-auto text-xs text-muted-foreground">
                                  {t.current}
                                </span>
                              )}
                            </a>
                          </DropdownMenuItem>
                        );
                      })}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a
                          href={`${window.location.protocol}//${window.location.host.replace(/^[^.]+\./, "")}/`}
                        >
                          {t.allProjects}
                        </a>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <CommandMenu canEdit={canEdit} members={hub.project.members} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 transition-colors hover:bg-accent"
                      aria-label={t.account}
                    >
                      <Avatar className="size-7">
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                          {initialsOf(hub.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden text-sm text-foreground sm:inline">
                        {hub.displayName}
                      </span>
                      <Badge
                        variant={ROLE_BADGE_VARIANT[hub.role]}
                        className="hidden md:inline-flex"
                      >
                        {ROLE_LABEL[hub.role]}
                      </Badge>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel className="space-y-0.5">
                      <div>{hub.displayName}</div>
                      <div className="truncate font-mono text-xs font-normal text-muted-foreground">
                        {hub.webId}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/team/${hub.username}`}>
                        <CircleUser /> {t.myProfile}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>{ROLE_LABEL[hub.role]}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => logout()}>
                      <LogOut /> {t.signOut}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <nav className="group/nav -mb-px flex gap-1 overflow-x-auto">
              {TABS.map((t, i) => {
                const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
                const Icon = t.icon;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`flex items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm whitespace-nowrap transition-colors ${
                      active
                        ? "border-primary font-medium text-primary [text-shadow:0_0_14px_color-mix(in_oklab,var(--primary)_45%,transparent)]"
                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                    {t.label}
                    <kbd
                      className="hidden rounded border border-border/60 px-1 font-mono text-[10px] leading-4 text-muted-foreground/0 transition-colors group-hover/nav:text-muted-foreground lg:inline"
                      aria-hidden
                    >
                      {i + 1}
                    </kbd>
                  </Link>
                );
              })}
            </nav>
            <div className="emai-headerline absolute inset-x-0 bottom-0 h-px" aria-hidden />
          </header>
        </StandaloneOnly>
        <main className="flex-1 py-6">{children}</main>
        <StandaloneOnly>
          <footer className="flex items-center justify-between border-t border-border/60 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              {hub.project.title}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("emai:shortcuts"))}
                className="rounded border border-border/60 px-1.5 font-mono transition-colors hover:border-primary/40 hover:text-foreground"
                aria-label={t.showShortcuts}
                title={t.keyboardShortcuts}
              >
                ?
              </button>
            </span>
            <span>
              {t.storedInPod} · {hub.project.startDate} – {hub.project.endDate}
            </span>
          </footer>
        </StandaloneOnly>
      </div>
      <KeyboardShortcuts tabs={TABS} canEdit={canEdit} username={hub.username} />
    </HubContext.Provider>
  );
}
