"use client";

// The Workspace hub — the apex (kai.emai.dev) owner phase. A workspace-scoped
// shell (its own tab bar) that aggregates ALL projects: overview, cross-project
// board, company calendar, people/partner directory, briefings inbox. Rendered
// by RouterShell only for workspace owners (loadAllProjects succeeded → C2 grant).
//
// The apex bypasses the project routes entirely (Shell returns RouterShell for
// every path), so navigation is route-aware HERE: <Link> changes the URL,
// RouterShell re-mounts us, and we pick the view from usePathname().

import { Avatar, AvatarFallback, Button, Symbol } from "@mind-studio/ui";
import { CalendarDays, FileText, LayoutDashboard, LogOut, SquareKanban, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { profile } from "@/lib/profile";
import { logout } from "@/lib/solid/auth";
import { HUB_BRANDING } from "@/lib/solid/config";
import {
  loadCompany,
  loadOrgRegistry,
  loadWorkspaceBoard,
  loadWorkspaceBriefings,
  loadWorkspaceMeetings,
  type ProjectBoard,
  type ProjectBriefings,
  type ProjectSummary,
  type WorkspaceMeeting,
} from "@/lib/solid/data";
import type { Company, OrgInfo } from "@/lib/solid/turtle";
import { t } from "@/lib/strings";
import { Board } from "./workspace/Board";
import { Briefings } from "./workspace/Briefings";
import { Calendar } from "./workspace/Calendar";
import { Overview } from "./workspace/Overview";
import { People } from "./workspace/People";
import { initials, type WsData } from "./workspace/types";

// Hrefs reuse EXISTING project route paths so Next has a page to render — on the
// apex every route renders RouterShell→WorkspaceShell, and the path selects the
// workspace view below. (A path with no Next route, e.g. /calendar, would 404
// before Shell ever mounts.)
const TABS = [
  { href: "/", label: t.wsOverview, icon: LayoutDashboard },
  { href: "/board", label: t.wsBoard, icon: SquareKanban },
  { href: "/meetings", label: t.wsCalendar, icon: CalendarDays },
  { href: "/team", label: t.wsTeam, icon: Users },
  { href: "/briefings", label: t.wsBriefings, icon: FileText },
];

export function WorkspaceShell({
  projects,
  displayName,
}: {
  projects: ProjectSummary[];
  displayName: string;
}) {
  const pathname = usePathname();
  const [company, setCompany] = useState<Company | null>(null);
  const [registry, setRegistry] = useState<OrgInfo[]>([]);
  const [board, setBoard] = useState<ProjectBoard[] | null>(null);
  const [meetings, setMeetings] = useState<WorkspaceMeeting[] | null>(null);
  const [briefings, setBriefings] = useState<ProjectBriefings[] | null>(null);

  const refs = useMemo(
    () => projects.map((p) => ({ projectId: p.projectId, title: p.meta.title })),
    [projects],
  );

  const refreshBriefings = useCallback(() => {
    loadWorkspaceBriefings(refs)
      .then(setBriefings)
      .catch(() => setBriefings([]));
  }, [refs]);

  useEffect(() => {
    loadCompany()
      .then(setCompany)
      .catch(() => setCompany(null));
    loadOrgRegistry()
      .then(setRegistry)
      .catch(() => setRegistry([]));
    loadWorkspaceBoard(refs)
      .then(setBoard)
      .catch(() => setBoard([]));
    loadWorkspaceMeetings(refs)
      .then(setMeetings)
      .catch(() => setMeetings([]));
    refreshBriefings();
  }, [refs, refreshBriefings]);

  const data: WsData = {
    projects,
    company,
    registry,
    board,
    meetings,
    briefings,
    refreshBriefings,
  };

  const view = (() => {
    switch (pathname) {
      case "/board":
        return <Board data={data} />;
      case "/meetings":
        return <Calendar data={data} />;
      case "/team":
        return <People data={data} />;
      case "/briefings":
        return <Briefings data={data} />;
      default:
        return <Overview data={data} />;
    }
  })();

  return (
    <div>
      <div className="emai-backdrop fixed inset-0 -z-10" aria-hidden />
      <div
        className="emai-aurora pointer-events-none fixed inset-x-0 top-0 -z-10 h-[40vh]"
        aria-hidden
      />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
        <header className="sticky top-0 z-40 -mx-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md sm:-mx-6 sm:px-6">
          <div className="flex items-center justify-between gap-3 py-3">
            <Link href="/" className="group flex items-center gap-3">
              <Symbol className="h-8 w-8 rounded-lg transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105" />
              <span className="font-display text-lg font-semibold tracking-tight">
                {profile.appName}
                <span className="hidden font-normal text-muted-foreground sm:inline">
                  {" "}
                  · {HUB_BRANDING.title}
                </span>
              </span>
            </Link>
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
          </div>

          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap transition-colors ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 py-6">{view}</main>
      </div>
    </div>
  );
}
