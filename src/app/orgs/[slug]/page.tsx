"use client";

// Company profile — /orgs/<slug>. Organisations are derived from project.ttl
// memberships; the page aggregates their people, the APs they lead, and the
// workload of their members, all live from the tracker.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Skeleton,
} from "@mind-studio/ui";
import { ArrowLeft, Building2, ChevronRight, GanttChartSquare } from "lucide-react";
import { Shell, useHub } from "@/components/Shell";
import { loadTracker } from "@/lib/solid/data";
import { usernameOf } from "@/lib/solid/auth";
import { orgsOf, orgMatches, ORG_ROLE_LABEL } from "@/lib/orgs";
import { ROLE_LABEL, STATE_LABEL } from "@/lib/labels";
import type { IssueState, Tracker } from "@/lib/solid/turtle";

const STATE_DOT: Record<IssueState, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-foreground/60",
  "in-progress": "bg-primary",
  review: "bg-warn",
  done: "bg-ok",
  cancelled: "bg-error",
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

function OrgProfile() {
  const hub = useHub();
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug);
  const [tracker, setTracker] = useState<Tracker | null>(null);

  useEffect(() => {
    loadTracker().then(setTracker).catch(() => setTracker(null));
  }, []);

  const org = orgsOf(hub.project.members).find((o) => o.slug === slug) ?? null;

  if (!org) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link href="/team">
            <ArrowLeft /> Team &amp; Partner
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Keine Organisation <span className="font-mono">{slug}</span> im Projekt.
          </CardContent>
        </Card>
      </div>
    );
  }

  const agents = new Set(org.members.map((m) => m.agent));
  const today = new Date().toISOString().slice(0, 10);
  const ledEpics = tracker?.epics.filter(
    (e) => e.lead && e.lead.split(/[+&,/]| und /).some((part) => orgMatches(part, org.name)),
  );
  const orgIssues = tracker?.issues.filter(
    (i) => i.assignee && agents.has(i.assignee) && i.state !== "cancelled",
  );
  const openIssues = orgIssues
    ?.filter((i) => i.state !== "done")
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const doneCount = orgIssues?.filter((i) => i.state === "done").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/team">
          <ArrowLeft /> Team &amp; Partner
        </Link>
      </Button>

      <section className="animate-rise flex items-start gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-primary/10 text-primary">
          <Building2 className="size-7" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{org.name}</h1>
            <Badge variant={org.role === "Guest" ? "outline" : "secondary"}>
              {ORG_ROLE_LABEL[org.role]}
            </Badge>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {org.members.length} {org.members.length === 1 ? "Person" : "Personen"} im Projekt
            {orgIssues && orgIssues.length > 0 && (
              <> · {doneCount}/{orgIssues.length} Aufgaben erledigt</>
            )}
          </p>
        </div>
      </section>

      <Card className="animate-rise">
        <CardHeader>
          <CardTitle className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Personen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0.5">
          {org.members.map((m) => {
            const username = usernameOf(m.agent);
            const name = m.name ?? username;
            return (
              <Link
                key={m.agent}
                href={`/team/${username}`}
                className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
              >
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">
                    {initialsOf(name)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{name}</span>
                    <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                  </span>
                  <span className="block truncate font-mono text-xs text-muted-foreground">
                    {username}
                  </span>
                </span>
                <Badge
                  variant={m.role === "Guest" ? "outline" : "secondary"}
                  className="shrink-0"
                >
                  {ROLE_LABEL[m.role]}
                </Badge>
              </Link>
            );
          })}
        </CardContent>
      </Card>

      {ledEpics && ledEpics.length > 0 && (
        <Card className="animate-rise">
          <CardHeader>
            <CardTitle className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Geleitete Arbeitspakete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {ledEpics.map((e) => {
              const tasks = tracker!.issues.filter(
                (i) => i.epic === e.id && i.state !== "cancelled",
              );
              const done = tasks.filter((i) => i.state === "done").length;
              const pct = tasks.length ? (done / tasks.length) * 100 : 0;
              return (
                <Link
                  key={e.id}
                  href={`/board?ap=${e.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
                >
                  <GanttChartSquare className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2 text-sm">
                      <span className="font-mono text-xs text-primary">{e.id}</span>
                      <span className="truncate font-medium">
                        {e.title.replace(/^AP\d+:\s*/, "")}
                      </span>
                    </span>
                    <Progress
                      value={pct}
                      className="mt-1.5 h-1"
                      aria-label={`${e.id} Fortschritt`}
                    />
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {done}/{tasks.length}
                  </span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="animate-rise">
        <CardHeader>
          <CardTitle className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Offene Aufgaben
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!openIssues ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : openIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine offenen Aufgaben bei {org.name}.
            </p>
          ) : (
            <ul className="stagger space-y-0.5">
              {openIssues.map((i) => {
                const late = i.due && i.due < today;
                return (
                  <li key={i.id}>
                    <Link
                      href={`/board?issue=${i.id}`}
                      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                    >
                      <span
                        className={`size-2 shrink-0 rounded-full ${STATE_DOT[i.state]}`}
                        title={STATE_LABEL[i.state]}
                      />
                      <span className="shrink-0 font-mono text-xs text-primary">{i.handle}</span>
                      <span className="truncate text-foreground/90">{i.title}</span>
                      {i.due && (
                        <span
                          className={`ml-auto shrink-0 font-mono text-xs ${
                            late ? "font-medium text-error" : "text-muted-foreground"
                          }`}
                        >
                          {i.due}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <OrgProfile />
    </Shell>
  );
}
