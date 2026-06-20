"use client";

// Workspace overview — the company home. Company profile + cross-project KPIs +
// one rich card per project (progress, overdue, team, next meeting). Each card
// links into that project's hub (cross-origin, silent SSO).

import {
  Avatar, AvatarFallback, AvatarGroup, Badge, Card, CardContent, Progress,
  Tooltip, TooltipContent, TooltipTrigger,
} from "@mind-studio/ui";
import {
  ArrowRight, CalendarDays, FolderKanban, ListTodo, TriangleAlert, Users,
} from "lucide-react";
import { ROLE_LABEL } from "@/lib/labels";
import { initials, projectHref, type WsData } from "./types";
import { profile } from "@/lib/profile";
import { t, dateLocale } from "@/lib/strings";

function Kpi({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: "error";
}) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="flex items-center gap-3 px-4">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
            tone === "error" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl leading-none font-semibold">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function Overview({ data }: { data: WsData }) {
  const { projects, company } = data;
  const totalOpen = projects.reduce((n, p) => n + (p.openTasks ?? 0), 0);
  const totalOverdue = projects.reduce((n, p) => n + (p.overdueTasks ?? 0), 0);
  const people = new Set(
    projects.flatMap((p) => p.meta.members.filter((m) => m.kind !== "Worker").map((m) => m.agent)),
  );
  const now = new Date().toISOString().slice(0, 16);
  // Cross-project upcoming meetings (tagged with their project) once loaded.
  const nextMeetings = (data.meetings ?? [])
    .filter((m) => m.start >= now)
    .slice(0, 5);

  return (
    <div className="stagger space-y-6">
      <section className="pt-2">
        <p className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
          {company?.legalName ?? profile.appName} · {t.workspace}
        </p>
        <h1 className="text-shimmer mt-2 font-display text-3xl font-semibold tracking-tight">
          {company?.title ?? profile.appName}
        </h1>
        {company?.description && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {company.description}
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={FolderKanban} label={t.projects} value={projects.length} />
        <Kpi icon={ListTodo} label={t.openTasks} value={totalOpen} />
        <Kpi
          icon={TriangleAlert}
          label={t.overdueLabel}
          value={totalOverdue}
          tone={totalOverdue > 0 ? "error" : undefined}
        />
        <Kpi icon={Users} label={t.participants} value={people.size} />
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t.projects}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const total = p.totalTasks ?? 0;
            const done = p.doneTasks ?? 0;
            const pct = total > 0 ? (done / total) * 100 : 0;
            const humans = p.meta.members.filter((m) => m.kind !== "Worker");
            return (
              <a key={p.projectId} href={projectHref(p.projectId)} className="group">
                <Card className="glow-hover h-full transition-colors group-hover:border-primary/40">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-display font-semibold">{p.meta.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground capitalize">
                          {p.meta.status}
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>

                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-1.5" aria-label="Fortschritt" />
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {done}/{total}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <ListTodo className="size-3.5" />
                        {p.openTasks ?? "—"} {t.open}
                      </span>
                      {(p.overdueTasks ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-error">
                          <TriangleAlert className="size-3.5" />
                          {t.overdueCount(p.overdueTasks!)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="size-3.5" />
                        {p.nextMeeting
                          ? new Date(p.nextMeeting.start).toLocaleDateString(dateLocale, {
                              day: "numeric", month: "short",
                            })
                          : t.noMeeting}
                      </span>
                    </div>

                    <AvatarGroup>
                      {humans.map((m) => (
                        <Tooltip key={m.agent}>
                          <TooltipTrigger asChild>
                            <Avatar className="size-6 border-2 border-background">
                              <AvatarFallback className="bg-primary/15 text-[9px] font-semibold text-primary">
                                {initials(m.name ?? "?")}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            {m.name}{m.org ? ` · ${m.org}` : ""} · {ROLE_LABEL[m.role]}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      </section>

      {nextMeetings.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t.upcomingMeetings}
          </h2>
          <div className="space-y-1">
            {nextMeetings.slice(0, 5).map((m) => (
              <a
                key={m.id}
                href={projectHref(m.projectId)}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {new Date(m.start).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}
                </span>
                <span className="truncate text-foreground/90">{m.title}</span>
                <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                  {m.projectTitle}
                </Badge>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
