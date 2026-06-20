"use client";

// Person profile — /team/<username>. Identity from project.ttl, workload
// derived live from the tracker, organised meetings from /meetings/.

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
  Skeleton,
} from "@mind-studio/ui";
import {
  ArrowLeft, Building2, CalendarDays, CircleCheck, CircleDot, TriangleAlert,
} from "lucide-react";
import { Shell, useHub } from "@/components/Shell";
import { loadTracker, loadMeetings } from "@/lib/solid/data";
import { usernameOf } from "@/lib/solid/auth";
import { orgSlug } from "@/lib/orgs";
import { ROLE_LABEL, STATE_LABEL } from "@/lib/labels";
import { t, dateLocale } from "@/lib/strings";
import type { Issue, IssueState, Meeting, Role, Tracker } from "@/lib/solid/turtle";

const STATE_DOT: Record<IssueState, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-foreground/60",
  "in-progress": "bg-primary",
  review: "bg-warn",
  done: "bg-ok",
  cancelled: "bg-error",
};

const STATE_ORDER: IssueState[] = ["in-progress", "review", "todo", "backlog", "done"];

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

function MiniStat({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
  tone?: "ok" | "error";
}) {
  return (
    <Card className="gap-2 py-3">
      <CardContent className="flex items-center gap-2.5 px-3.5">
        <Icon
          className={`size-4 shrink-0 ${
            tone === "ok" ? "text-ok" : tone === "error" ? "text-error" : "text-primary"
          }`}
        />
        <div className="min-w-0">
          {value === null ? (
            <Skeleton className="h-5 w-8" />
          ) : (
            <p className="font-display text-lg leading-none font-semibold">{value}</p>
          )}
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({ i, today }: { i: Issue; today: string }) {
  const late = i.due && i.state !== "done" && i.due < today;
  return (
    <li>
      <Link
        href={`/board?issue=${i.id}`}
        className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
      >
        <span
          className={`size-2 shrink-0 rounded-full ${STATE_DOT[i.state]}`}
          title={STATE_LABEL[i.state]}
        />
        <span className="shrink-0 font-mono text-xs text-primary">{i.handle}</span>
        <span
          className={`truncate ${
            i.state === "done"
              ? "text-muted-foreground line-through decoration-border"
              : "text-foreground/90"
          }`}
        >
          {i.title}
        </span>
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
}

function PersonProfile() {
  const hub = useHub();
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username);
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);

  useEffect(() => {
    loadTracker().then(setTracker).catch(() => setTracker(null));
    loadMeetings().then(setMeetings).catch(() => setMeetings(null));
  }, []);

  const member = hub.project.members.find(
    (m) => m.kind !== "Worker" && usernameOf(m.agent) === username,
  );

  if (!member) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
          <Link href="/team">
            <ArrowLeft /> {t.teamAndPartner}
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t.noMemberWithUsername}{" "}
            <span className="font-mono">{username}</span>.
          </CardContent>
        </Card>
      </div>
    );
  }

  const name = member.name ?? username;
  const today = new Date().toISOString().slice(0, 10);
  const assigned = tracker?.issues.filter(
    (i) => i.assignee === member.agent && i.state !== "cancelled",
  );
  const open = assigned?.filter((i) => !["done"].includes(i.state));
  const done = assigned?.filter((i) => i.state === "done");
  const overdue = open?.filter((i) => i.due && i.due < today);
  const sorted = assigned
    ?.slice()
    .sort(
      (a, b) =>
        STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) ||
        (a.due ?? "9999").localeCompare(b.due ?? "9999"),
    );
  const organized = meetings?.filter(
    (m) => m.organizer && member.name && m.organizer.includes(member.name),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/team">
          <ArrowLeft /> Team &amp; Partner
        </Link>
      </Button>

      <section className="animate-rise flex items-start gap-4">
        <Avatar className="size-16 border border-border/70">
          <AvatarFallback className="bg-primary/15 font-display text-xl font-semibold text-primary">
            {initialsOf(name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{name}</h1>
            <Badge variant={ROLE_BADGE_VARIANT[member.role]}>{ROLE_LABEL[member.role]}</Badge>
            {member.agent === hub.webId && (
              <Badge variant="outline" className="text-muted-foreground">
                {t.you}
              </Badge>
            )}
          </div>
          {member.org && (
            <Link
              href={`/orgs/${orgSlug(member.org)}`}
              className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <Building2 className="size-3.5" /> {member.org}
            </Link>
          )}
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground" title={member.agent}>
            {member.agent}
          </p>
        </div>
      </section>

      <section className="stagger grid grid-cols-3 gap-3">
        <MiniStat icon={CircleDot} label={t.openLabel} value={open?.length ?? null} />
        <MiniStat icon={CircleCheck} label={t.doneLabel} value={done?.length ?? null} tone="ok" />
        <MiniStat
          icon={TriangleAlert}
          label={t.overdueLabel}
          value={overdue?.length ?? null}
          tone={overdue && overdue.length > 0 ? "error" : undefined}
        />
      </section>

      <Card className="animate-rise">
        <CardHeader>
          <CardTitle className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t.tasks}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!sorted ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.noTasksAssigned}
            </p>
          ) : (
            <ul className="stagger space-y-0.5">
              {sorted.map((i) => (
                <TaskRow key={i.id} i={i} today={today} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {organized && organized.length > 0 && (
        <Card className="animate-rise">
          <CardHeader>
            <CardTitle className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {t.organizedMeetings}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-0.5">
              {organized.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/meetings?m=${m.id}`}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                  >
                    <CalendarDays className="size-3.5 shrink-0 text-primary" />
                    <span className="truncate text-foreground/90">{m.title}</span>
                    <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
                      {new Date(m.start).toLocaleDateString(dateLocale, {
                        day: "2-digit", month: "2-digit", year: "numeric",
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <PersonProfile />
    </Shell>
  );
}
