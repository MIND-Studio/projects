"use client";

// F2 — horizontal project timeline, derived entirely from project.ttl +
// tracker + meetings (no separate timeline data). APs are lanes whose bars
// span their tasks; due dates and meetings are points; today is a glowing
// beam. Header compares elapsed runtime against actual completion.
// Clicking any item opens its detail sheet IN PLACE (?issue= / ?ap= / ?m=).

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
const LABEL_W = 176; // frozen lane-label column width in px (Tailwind w-44 = 11rem)

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
  const [view, setView] = useState<"quarter" | "month" | "week">("month");
  const [sort, setSort] = useState<"start" | "name" | "progress">("start");
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    loadTracker().then(setTracker).catch(() => setTracker(null));
  }, []);
  useEffect(() => {
    refresh();
    loadMeetings().then(setMeetings).catch(() => setMeetings(null));
  }, [refresh]);

  // re-center on "today" whenever the zoom changes or data first loads, so the
  // wider month/week views don't open stranded at the project start.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !tracker || !meetings) return;
    const a = new Date(`${hub.project.startDate}T00:00:00Z`).getTime();
    const b = new Date(`${hub.project.endDate}T23:59:59Z`).getTime();
    const frac = Math.min(1, Math.max(0, (Date.now() - a) / (b - a)));
    const id = requestAnimationFrame(() => {
      const trackPx = el.scrollWidth - LABEL_W;
      el.scrollLeft = Math.max(0, LABEL_W + frac * trackPx - el.clientWidth / 2);
    });
    return () => cancelAnimationFrame(id);
  }, [view, tracker, meetings, hub.project.startDate, hub.project.endDate]);

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

  // gridline ticks at the chosen granularity (quarter / month / week)
  const span = t1 - t0;
  const ticks: { label: string; pos: number }[] = [];
  if (view === "quarter") {
    for (let d = new Date(t0); d.getTime() <= t1; d.setUTCMonth(d.getUTCMonth() + 1)) {
      if (d.getUTCMonth() % 3 !== 0) continue;
      const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      if (first.getTime() < t0) continue;
      ticks.push({ label: `Q${Math.floor(d.getUTCMonth() / 3) + 1}`, pos: ((first.getTime() - t0) / span) * 100 });
    }
  } else if (view === "week") {
    const d = new Date(t0);
    while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1); // snap to first Monday
    for (; d.getTime() <= t1; d.setUTCDate(d.getUTCDate() + 7)) {
      ticks.push({
        label: d.toLocaleString(dateLocale, { day: "2-digit", month: "short", timeZone: "UTC" }),
        pos: ((d.getTime() - t0) / span) * 100,
      });
    }
  } else {
    for (let d = new Date(t0); d.getTime() <= t1; d.setUTCMonth(d.getUTCMonth() + 1)) {
      const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      if (first.getTime() < t0) continue;
      ticks.push({ label: first.toLocaleString(dateLocale, { month: "short", timeZone: "UTC" }), pos: ((first.getTime() - t0) / span) * 100 });
    }
  }

  // wider track at finer zooms forces horizontal scroll inside the pane
  const trackWidthPct = view === "quarter" ? 100 : view === "month" ? 180 : 520;
  const panBy = (dir: number) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const panToday = () => {
    const el = scrollRef.current;
    if (!el) return;
    const trackPx = el.scrollWidth - LABEL_W;
    el.scrollTo({ left: Math.max(0, LABEL_W + (todayX / 100) * trackPx - el.clientWidth / 2), behavior: "smooth" });
  };

  const ms = (d: string) => new Date(`${d}T12:00:00Z`).getTime();
  const lanes = tracker.epics.map((epic) => {
    const tasks = tracker.issues.filter((i) => i.epic === epic.id);
    // Explicit milestone dates win; otherwise fall back to the span of task dates.
    const taskDates = tasks
      .flatMap((i) => [i.created, i.due, i.modified])
      .filter((d): d is string => !!d)
      .map(ms)
      .filter((t) => t >= t0 - 30 * DAY && t <= t1 + 30 * DAY);
    const rawFrom = epic.startDate ? ms(epic.startDate) : null;
    const rawTo = epic.endDate ? ms(epic.endDate) : null;
    // A milestone is "started" once it has an explicit start date; until then it
    // shows as inactive/future (it gets stamped when its first task → in progress).
    const started = rawFrom !== null;
    const from = started ? Math.max(t0, rawFrom!) : null;
    const to = rawTo !== null ? Math.min(t1, rawTo) : started ? t1 : null;
    // future ghost span for unstarted milestones: from today (or its target end
    // back-window) to its deadline, or the rest of the project if undated.
    const ghostFrom = Math.max(t0, Math.min(t1, Math.max(Date.now(), t0)));
    const ghostTo = rawTo !== null ? Math.min(t1, rawTo) : t1;
    return { epic, tasks, from, to, started, ghostFrom, ghostTo, taskDates };
  });

  // lane ordering — default by start date (unstarted/future milestones last)
  const pctOf = (l: (typeof lanes)[number]) =>
    l.tasks.length ? l.tasks.filter((i) => i.state === "done").length / l.tasks.length : 0;
  const sortedLanes = [...lanes].sort((a, b) => {
    if (sort === "name") return a.epic.title.localeCompare(b.epic.title, dateLocale);
    if (sort === "progress") return pctOf(b) - pctOf(a) || a.epic.number - b.epic.number;
    // "start": earliest first, undated milestones sink to the bottom
    if (a.from === null && b.from === null) return a.epic.number - b.epic.number;
    if (a.from === null) return 1;
    if (b.from === null) return -1;
    return a.from - b.from || a.epic.number - b.epic.number;
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
        {/* plan vs. reality in one bar: the fill is work actually done; the
            vertical marker is where elapsed time says we should be. Fill behind
            the marker = behind schedule, ahead of it = ahead of schedule. */}
        <div className="w-full max-w-xs space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t.doneLabel}</span>
            <span className="font-mono text-primary">{Math.round(donePct)}%</span>
          </div>
          <div className="relative pt-4" title={`${t.doneLabel} ${Math.round(donePct)}% · ${t.runtime} ${Math.round(elapsedPct)}%`}>
            <Progress
              value={donePct}
              className="progress-glow h-2"
              aria-label={t.doneLabel}
            />
            {/* schedule line — today's expected progress from elapsed runtime */}
            <div
              className="absolute bottom-0 top-3 w-px bg-foreground/70"
              style={{ left: `${elapsedPct}%` }}
            >
              <span className="absolute -top-4 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                {t.runtime} {Math.round(elapsedPct)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3">
          {/* zoom granularity + horizontal navigation */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-md border border-border/60 p-0.5 text-xs">
              {([["quarter", t.zoomQuarter], ["month", t.zoomMonth], ["week", t.zoomWeek]] as const).map(
                ([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      view === v ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="sr-only sm:not-sr-only">{t.sortLabel}</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="rounded-md border border-border/60 bg-transparent px-2 py-1 font-medium text-foreground transition-colors hover:text-foreground focus:outline-none"
              >
                <option value="start">{t.sortByStart}</option>
                <option value="name">{t.sortByName}</option>
                <option value="progress">{t.sortByProgress}</option>
              </select>
            </label>
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => panBy(-1)}
                title={t.timelinePrev}
                aria-label={t.timelinePrev}
                className="rounded-md border border-border/60 p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={panToday}
                className="rounded-md border border-border/60 px-2.5 py-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t.timelineToday}
              </button>
              <button
                onClick={() => panBy(1)}
                title={t.timelineNext}
                aria-label={t.timelineNext}
                className="rounded-md border border-border/60 p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          {/* horizontally scrollable track — the label column stays frozen */}
          <div ref={scrollRef} className="overflow-x-auto pb-1">
            <div style={{ width: `${trackWidthPct}%`, minWidth: "100%" }} className="space-y-1">
              <div className="flex h-7">
                <div className="sticky left-0 z-20 w-44 shrink-0 bg-card" />
                <div className="relative flex-1">
                  {ticks.map((m) => (
                    <span
                      key={m.label + m.pos}
                      className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground"
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
              {ticks.map((m) => (
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

            {sortedLanes.map(({ epic, tasks, from, to, started, ghostFrom, ghostTo }, laneIdx) => {
              const laneDone = tasks.filter((i) => i.state === "done").length;
              const lanePct = tasks.length ? (laneDone / tasks.length) * 100 : 0;
              return (
                <div
                  key={epic.id}
                  className="animate-rise flex rounded-md border-b border-border/60 py-3 transition-colors hover:bg-foreground/[0.025]"
                  style={{ animationDelay: `${laneIdx * 70}ms` }}
                >
                  <button
                    onClick={() => replaceParam("ap", epic.id)}
                    className="group sticky left-0 z-20 flex w-44 shrink-0 cursor-pointer flex-col justify-center bg-card pr-3 text-left"
                    title={t.openTitle(epic.id)}
                  >
                    <p className="flex items-baseline gap-2 text-sm font-medium transition-colors group-hover:text-primary">
                      {epic.id}
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {laneDone}/{tasks.length}
                      </span>
                      {!started && (
                        <span className="rounded-full bg-foreground/10 px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                          {t.epicInactive}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-muted-foreground" title={epic.title}>
                      {epic.title.replace(/^AP\d+:\s*/, "")}
                    </p>
                  </button>
                  <div className="relative h-9 flex-1">
                    {started && from !== null && to !== null && to > from ? (
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
                    ) : !started ? (
                      // inactive / future milestone — a muted dashed ghost in the
                      // future, clearly not yet scheduled (item 6)
                      <div
                        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full border border-dashed border-border/70 bg-foreground/[0.03]"
                        style={{
                          left: `${((ghostFrom - t0) / (t1 - t0)) * 100}%`,
                          width: `${Math.max(2, ((ghostTo - ghostFrom) / (t1 - t0)) * 100)}%`,
                        }}
                        title={t.epicInactiveTitle}
                      />
                    ) : null}
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
              className="animate-rise flex rounded-md py-3 transition-colors hover:bg-foreground/[0.025]"
              style={{ animationDelay: `${lanes.length * 70}ms` }}
            >
              <div className="sticky left-0 z-20 flex w-44 shrink-0 flex-col justify-center bg-card pr-3">
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
            </div>
          </div>

          <div className="ml-44 flex flex-wrap gap-5 pt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> {t.legendDue}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-error" /> {t.legendOverdue}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ok" /> {t.legendDone}</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rotate-45 bg-warn" /> {t.legendMeeting}</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-px bg-primary" /> {t.legendToday}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full border border-dashed border-border/70 bg-foreground/[0.03]" /> {t.legendInactive}</span>
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
