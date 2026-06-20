"use client";

// Übersicht — what a guest opens first: status, progress, next meeting,
// open work, work packages. Everything links into its detail view.

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@mind-studio/ui";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  CircleDot,
  ListTodo,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CountUp } from "@/components/CountUp";
import { Shell, useHub } from "@/components/Shell";
import { ROLE_LABEL, STATE_LABEL } from "@/lib/labels";
import { usernameOf } from "@/lib/solid/auth";
import { type Briefing, loadBriefings, loadMeetings, loadTracker } from "@/lib/solid/data";
import type { Meeting, Tracker } from "@/lib/solid/turtle";
import { dateLocale, t } from "@/lib/strings";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
  tone?: "ok" | "error";
  href: string;
}) {
  return (
    <Link href={href} aria-label={t.openAria(label)} className="group">
      <Card className="glow-hover h-full gap-2 py-4 transition-colors group-hover:border-primary/40">
        <CardContent className="flex items-center gap-3 px-4">
          <div
            className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
              tone === "ok"
                ? "bg-ok/10 text-ok"
                : tone === "error"
                  ? "bg-error/10 text-error"
                  : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="size-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            {value === null ? (
              <Skeleton className="h-7 w-10" />
            ) : (
              <p className="font-display text-2xl leading-none font-semibold">
                <CountUp value={value} />
              </p>
            )}
            <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
          </div>
          <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </CardContent>
      </Card>
    </Link>
  );
}

function Overview() {
  const hub = useHub();
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);

  useEffect(() => {
    loadTracker()
      .then(setTracker)
      .catch(() => setTracker(null));
    loadMeetings()
      .then(setMeetings)
      .catch(() => setMeetings(null));
    loadBriefings()
      .then((b) => setBriefing(b[0] ?? null))
      .catch(() => setBriefing(null));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const active = tracker?.issues.filter((i) => i.state !== "cancelled");
  const open = active?.filter((i) => ["todo", "in-progress", "review"].includes(i.state));
  const inProgress = active?.filter((i) => i.state === "in-progress");
  const done = active?.filter((i) => i.state === "done");
  const overdue = active?.filter((i) => i.due && i.state !== "done" && i.due < today);
  const progress = active && active.length > 0 ? ((done?.length ?? 0) / active.length) * 100 : 0;
  const now = new Date().toISOString();
  const next = meetings?.filter((m) => m.start >= now.slice(0, 16))[0] ?? null;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(`${hub.project.endDate}T00:00:00`).getTime() - Date.now()) / 86400000),
  );
  const humans = hub.project.members.filter((m) => m.kind !== "Worker");

  return (
    <div className="stagger space-y-6">
      <section className="pt-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-ok/15 text-ok" variant="secondary">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-1.5 rounded-full bg-ok" />
            </span>
            {hub.project.status}
          </Badge>
          <Badge variant="outline" className="text-muted-foreground">
            {hub.project.startDate} – {hub.project.endDate}
          </Badge>
          {overdue && overdue.length > 0 && (
            <Badge variant="outline" className="border-error/50 text-error">
              <TriangleAlert className="size-3" /> {t.overdueCount(overdue.length)}
            </Badge>
          )}
        </div>
        <h1 className="text-shimmer mt-3 font-display text-3xl font-semibold tracking-tight">
          {hub.project.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {hub.project.description}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex w-full max-w-sm items-center gap-3">
            <Progress
              value={progress}
              aria-label={t.projectProgress}
              className="progress-glow h-1.5"
            />
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {tracker ? `${Math.round(progress)}%` : "…"}
            </span>
          </div>
          <AvatarGroup>
            {humans.map((m) => (
              <Tooltip key={m.agent}>
                <TooltipTrigger asChild>
                  <Link
                    href={`/team/${usernameOf(m.agent)}`}
                    aria-label={t.profileOf(m.name ?? "?")}
                  >
                    <Avatar className="size-7 border-2 border-background transition-transform hover:z-10 hover:scale-110">
                      <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                        {initialsOf(m.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  {m.name}
                  {m.org ? ` · ${m.org}` : ""} · {ROLE_LABEL[m.role]}
                </TooltipContent>
              </Tooltip>
            ))}
          </AvatarGroup>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={ListTodo} label={t.openTasks} value={open?.length ?? null} href="/board" />
        <Stat
          icon={CircleDot}
          label={t.statInProgress}
          value={inProgress?.length ?? null}
          href="/board?state=in-progress"
        />
        <Stat
          icon={CircleCheck}
          label={t.statDone}
          value={done?.length ?? null}
          tone="ok"
          href="/board?state=done"
        />
        <Stat icon={CalendarDays} label={t.daysRemaining} value={daysLeft} href="/timeline" />
      </section>

      {tracker && tracker.epics.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t.cmdWorkPackages}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {tracker.epics.map((epic) => {
              const tasks = tracker.issues.filter(
                (i) => i.epic === epic.id && i.state !== "cancelled",
              );
              const doneCount = tasks.filter((i) => i.state === "done").length;
              const pct = tasks.length ? (doneCount / tasks.length) * 100 : 0;
              return (
                <Link key={epic.id} href={`/board?ap=${epic.id}`} className="group">
                  <Card className="glow-hover h-full gap-2 py-3">
                    <CardContent className="space-y-2 px-3">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-xs text-primary">{epic.id}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {doneCount}/{tasks.length}
                        </span>
                      </div>
                      <p className="truncate text-xs text-foreground/90" title={epic.title}>
                        {epic.title.replace(/^AP\d+:\s*/, "")}
                      </p>
                      <Progress value={pct} className="h-1" aria-label={t.progressOf(epic.id)} />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {t.openTasks}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!tracker ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-5/6" />
              </div>
            ) : (
              <>
                <ul className="space-y-1">
                  {open?.slice(0, 6).map((i) => (
                    <li key={i.id}>
                      <Link
                        href={`/board?issue=${i.id}`}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                      >
                        <span className="shrink-0 font-mono text-xs text-primary">{i.handle}</span>
                        <span className="truncate text-foreground/90">{i.title}</span>
                        <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                          {STATE_LABEL[i.state]}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/board"
                  className="mt-3 inline-flex items-center gap-1 px-2 text-sm text-primary hover:underline"
                >
                  {t.toBoard} <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {t.nextMeeting}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!meetings ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-5 w-2/5" />
              </div>
            ) : next ? (
              <>
                <Link href={`/meetings?m=${next.id}`} className="font-medium hover:text-primary">
                  {next.title}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(next.start).toLocaleString(dateLocale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  {t.oclock}
                </p>
                {next.location && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{next.location}</p>
                )}
                <Link
                  href="/meetings"
                  className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {t.allMeetings} <ArrowRight className="size-3.5" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t.noUpcomingMeeting}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {briefing && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {t.currentBriefing}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href={`/briefings/${encodeURIComponent(briefing.name)}`}
              className="font-medium hover:text-primary"
            >
              {briefing.text.match(/^#\s*(.+)$/m)?.[1] ?? briefing.name}
            </Link>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {briefing.text.match(/## Willkommen & Stand\n\n([^\n]+)/)?.[1] ?? ""}
            </p>
            <Link
              href="/briefings"
              className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t.allBriefings} <ArrowRight className="size-3.5" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Overview />
    </Shell>
  );
}
