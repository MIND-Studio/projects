"use client";

// F2 — horizontal project timeline, derived entirely from project.ttl +
// tracker + meetings (no separate timeline data). APs are lanes whose bars
// span their tasks; due dates and meetings are points; today is a glowing
// beam. Header compares elapsed runtime against actual completion.
// Clicking any item opens its detail sheet IN PLACE (?issue= / ?ap= / ?m=).

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  Progress,
  Skeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@mind-studio/ui";
import { Shell, useHub } from "@/components/Shell";
import { IssueSheet } from "@/components/IssueSheet";
import { EpicSheet } from "@/components/EpicSheet";
import { MeetingSheet } from "@/components/MeetingSheet";
import { loadTracker, loadMeetings } from "@/lib/solid/data";
import { usernameOf } from "@/lib/solid/auth";
import { STATE_LABEL } from "@/lib/labels";
import { t, dateLocale } from "@/lib/strings";
import type { Tracker, Meeting, Issue } from "@/lib/solid/turtle";

const DAY = 86400000;

/* same-lane dots that land on (nearly) the same date get pushed onto one of
   three vertical slots so none of them hides another */
const SLOT_TOP = ["50%", "22%", "78%"];

function slotted(tasks: Issue[], x: (iso: string) => number) {
  const due = tasks
    .filter((i) => i.due)
    .sort((a, b) => a.due!.localeCompare(b.due!));
  let lastX = -10;
  let slot = 0;
  return due.map((i) => {
    const xi = x(i.due!);
    slot = xi - lastX < 2 ? (slot + 1) % SLOT_TOP.length : 0;
    lastX = xi;
    return { issue: i, xi, slot };
  });
}

function Timeline() {
  const hub = useHub();
  const router = useRouter();
  const params = useSearchParams();
  const canEdit = hub.role === "Owner" || hub.role === "Member";
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);

  const refresh = useCallback(() => {
    loadTracker().then(setTracker).catch(() => setTracker(null));
  }, []);
  useEffect(() => {
    refresh();
    loadMeetings().then(setMeetings).catch(() => setMeetings(null));
  }, [refresh]);

  // in-place detail sheets — items open here, not on another page
  const replaceParam = (key: "issue" | "ap" | "m", id: string | null) =>
    router.replace(id ? `/timeline?${key}=${id}` : "/timeline", { scroll: false });
  const selectedIssue = tracker?.issues.find((i) => i.id === params.get("issue")) ?? null;
  const selectedEpic = tracker?.epics.find((e) => e.id === params.get("ap")) ?? null;
  const selectedMeeting = meetings?.find((m) => m.id === params.get("m")) ?? null;
  const humanMembers = hub.project.members
    .filter((m) => m.kind !== "Worker")
    .map((m) => ({ webId: m.agent, name: m.name ?? usernameOf(m.agent) }));

  if (!tracker || !meetings) return <Skeleton className="h-96 w-full" />;

  const t0 = new Date(`${hub.project.startDate}T00:00:00Z`).getTime();
  const t1 = new Date(`${hub.project.endDate}T23:59:59Z`).getTime();
  const x = (iso: string) => {
    const t = new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso).getTime();
    return Math.min(100, Math.max(0, ((t - t0) / (t1 - t0)) * 100));
  };
  const today = new Date().toISOString().slice(0, 10);
  const todayInRange = today >= hub.project.startDate && today <= hub.project.endDate;
  const todayX = x(today);

  // schedule vs. reality
  const elapsedPct = Math.min(100, Math.max(0, ((Date.now() - t0) / (t1 - t0)) * 100));
  const active = tracker.issues.filter((i) => i.state !== "cancelled");
  const doneCount = active.filter((i) => i.state === "done").length;
  const donePct = active.length ? (doneCount / active.length) * 100 : 0;
  const weeksLeft = Math.max(0, Math.ceil((t1 - Date.now()) / (7 * DAY)));

  // month gridlines
  const months: { label: string; pos: number }[] = [];
  for (let d = new Date(t0); d.getTime() <= t1; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    if (first.getTime() < t0) continue;
    months.push({
      label: first.toLocaleString(dateLocale, { month: "short", timeZone: "UTC" }),
      pos: ((first.getTime() - t0) / (t1 - t0)) * 100,
    });
  }

  const lanes = tracker.epics.map((epic) => {
    const tasks = tracker.issues.filter((i) => i.epic === epic.id);
    const dates = tasks
      .flatMap((i) => [i.created, i.due, i.modified])
      .filter((d): d is string => !!d)
      .map((d) => new Date(`${d}T12:00:00Z`).getTime())
      .filter((t) => t >= t0 - 30 * DAY && t <= t1 + 30 * DAY);
    const from = dates.length ? Math.max(t0, Math.min(...dates)) : null;
    const to = dates.length ? Math.min(t1, Math.max(...dates)) : null;
    return { epic, tasks, from, to };
  });

  const dotClass = (i: Issue) =>
    i.state === "done"
      ? "bg-ok shadow-[0_0_8px_rgba(74,222,128,0.5)]"
      : i.due && i.due < today
        ? "bg-error emai-pulse-error"
        : "bg-primary shadow-[0_0_8px_rgba(255,103,0,0.4)]";

  return (
    <div className="animate-rise space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <h1 className="font-display text-lg font-semibold tracking-tight">Timeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hub.project.startDate} – {hub.project.endDate} · {t.weeksLeft(weeksLeft)}
          </p>
        </div>
        {/* plan vs. reality at a glance */}
        <div className="w-full max-w-xs space-y-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-muted-foreground">{t.runtime}</span>
            <Progress
              value={elapsedPct}
              className="h-1 [&>*]:bg-foreground/40"
              aria-label={t.runtime}
            />
            <span className="w-9 shrink-0 text-right font-mono text-muted-foreground">
              {Math.round(elapsedPct)}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-muted-foreground">{t.doneLabel}</span>
            <Progress
              value={donePct}
              className="progress-glow h-1"
              aria-label={t.doneLabel}
            />
            <span className="w-9 shrink-0 text-right font-mono text-primary">
              {Math.round(donePct)}%
            </span>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-1">
          <div className="relative ml-44 h-7">
            {months.map((m) => (
              <span
                key={m.label + m.pos}
                className="absolute bottom-0 -translate-x-1/2 text-xs text-muted-foreground"
                style={{ left: `${m.pos}%` }}
              >
                {m.label}
              </span>
            ))}
            {todayInRange && (
              <span
                className="absolute top-0 -translate-x-1/2 rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground shadow-[0_0_12px_rgba(255,103,0,0.6)]"
                style={{ left: `${todayX}%` }}
              >
                {t.today}
              </span>
            )}
          </div>

          <div className="relative">
            {/* past shading, gridlines + today beam spanning all lanes */}
            <div className="pointer-events-none absolute inset-0 ml-44">
              {todayInRange && (
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent to-primary/[0.05]"
                  style={{ width: `${todayX}%` }}
                />
              )}
              {months.map((m) => (
                <div
                  key={m.pos}
                  className="absolute inset-y-0 w-px bg-border/60"
                  style={{ left: `${m.pos}%` }}
                />
              ))}
              {todayInRange && (
                <div
                  className="emai-glow-pulse absolute inset-y-0 w-px bg-primary"
                  style={{ left: `${todayX}%` }}
                  title={t.todayTitle(today)}
                />
              )}
            </div>

            {lanes.map(({ epic, tasks, from, to }, laneIdx) => {
              const laneDone = tasks.filter((i) => i.state === "done").length;
              const lanePct = tasks.length ? (laneDone / tasks.length) * 100 : 0;
              return (
                <div
                  key={epic.id}
                  className="animate-rise flex items-center rounded-md border-b border-border/60 py-3 transition-colors hover:bg-foreground/[0.025]"
                  style={{ animationDelay: `${laneIdx * 70}ms` }}
                >
                  <button
                    onClick={() => replaceParam("ap", epic.id)}
                    className="group w-44 shrink-0 cursor-pointer pr-3 text-left"
                    title={t.openTitle(epic.id)}
                  >
                    <p className="flex items-baseline gap-2 text-sm font-medium transition-colors group-hover:text-primary">
                      {epic.id}
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {laneDone}/{tasks.length}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground" title={epic.title}>
                      {epic.title.replace(/^AP\d+:\s*/, "")}
                    </p>
                  </button>
                  <div className="relative h-9 flex-1">
                    {from !== null && to !== null && to > from && (
                      <div
                        className="emai-grow absolute top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-primary/15"
                        style={{
                          left: `${((from - t0) / (t1 - t0)) * 100}%`,
                          width: `${((to - from) / (t1 - t0)) * 100}%`,
                          animationDelay: `${laneIdx * 70}ms`,
                        }}
                      >
                        {/* completed share of this AP, filled from the left */}
                        <div
                          className="h-full rounded-full bg-primary/50"
                          style={{ width: `${lanePct}%` }}
                        />
                      </div>
                    )}
                    {slotted(tasks, x).map(({ issue: i, xi, slot }) => (
                      <Tooltip key={i.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => replaceParam("issue", i.id)}
                            className={`emai-pop absolute block h-3 w-3 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full ring-2 ring-background transition-transform hover:scale-150 ${dotClass(i)}`}
                            style={{
                              left: `${xi}%`,
                              top: SLOT_TOP[slot],
                              animationDelay: `${0.2 + xi * 0.006}s`,
                            }}
                            aria-label={`${i.id}: ${i.title}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <span className="font-mono">{i.handle}</span> {i.title}
                          <br />
                          {t.dueOn(i.due ?? "", STATE_LABEL[i.state])}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* meetings lane */}
            <div
              className="animate-rise flex items-center rounded-md py-3 transition-colors hover:bg-foreground/[0.025]"
              style={{ animationDelay: `${lanes.length * 70}ms` }}
            >
              <div className="w-44 shrink-0 pr-3">
                <p className="text-sm font-medium">{t.cmdMeetings}</p>
              </div>
              <div className="relative h-9 flex-1">
                {meetings
                  .filter((m) => m.start.slice(0, 10) >= hub.project.startDate)
                  .map((m) => {
                    const past = m.start.slice(0, 10) < today;
                    return (
                      <Tooltip key={m.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => replaceParam("m", m.id)}
                            className={`emai-pop absolute top-1/2 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 cursor-pointer bg-warn transition-transform hover:scale-150 ${
                              past ? "opacity-50" : "shadow-[0_0_8px_rgba(45,212,191,0.5)]"
                            }`}
                            style={{
                              left: `${x(m.start)}%`,
                              animationDelay: `${0.2 + x(m.start) * 0.006}s`,
                            }}
                            aria-label={m.title}
                          />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          {m.title}
                          <br />
                          {new Date(m.start).toLocaleString(dateLocale, {
                            day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                          })}{" "}
                          {t.oclock}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="ml-44 flex flex-wrap gap-5 pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> {t.legendDue}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-error" /> {t.legendOverdue}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ok" /> {t.legendDone}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-warn" /> {t.legendMeeting}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-px bg-primary" /> {t.legendToday}</span>
          </div>
        </CardContent>
      </Card>

      <IssueSheet
        issue={selectedIssue}
        epics={tracker.epics}
        members={humanMembers}
        canEdit={canEdit}
        open={!!selectedIssue}
        onOpenChange={(o) => !o && replaceParam("issue", null)}
        onSaved={refresh}
      />
      <EpicSheet
        epic={selectedEpic}
        issues={tracker.issues}
        canEdit={canEdit}
        open={!!selectedEpic}
        onOpenChange={(o) => !o && replaceParam("ap", null)}
        onOpenIssue={(id) => replaceParam("issue", id)}
        onCreateTask={(id) => router.push(`/board?new=1&epic=${id}`)}
      />
      <MeetingSheet
        meeting={selectedMeeting}
        open={!!selectedMeeting}
        onOpenChange={(o) => !o && replaceParam("m", null)}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Suspense>
        <Timeline />
      </Suspense>
    </Shell>
  );
}
