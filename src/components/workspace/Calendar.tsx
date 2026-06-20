"use client";

// Company calendar — every project's meetings on one timeline, split into
// upcoming and past. Each row deep-links into that project's meeting detail.

import { Badge, Card, CardContent, Skeleton } from "@mind-studio/ui";
import { CalendarDays, MapPin } from "lucide-react";
import type { WorkspaceMeeting } from "@/lib/solid/data";
import { projectHref, type WsData } from "./types";

function Row({ m }: { m: WorkspaceMeeting }) {
  return (
    <a href={projectHref(m.projectId, `/meetings?m=${m.id}`)} className="group block">
      <Card className="glow-hover transition-colors group-hover:border-primary/40">
        <CardContent className="flex items-center gap-4 p-3">
          <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-primary/10 py-1.5 text-primary">
            <span className="font-display text-lg leading-none font-semibold">
              {new Date(m.start).getDate()}
            </span>
            <span className="text-[10px] uppercase">
              {new Date(m.start).toLocaleDateString("de-DE", { month: "short" })}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground/90">{m.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" />
                {new Date(m.start).toLocaleString("de-DE", {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                Uhr
              </span>
              {m.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" />
                  {m.location}
                </span>
              )}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {m.projectTitle}
          </Badge>
        </CardContent>
      </Card>
    </a>
  );
}

export function Calendar({ data }: { data: WsData }) {
  const { meetings } = data;
  const now = new Date().toISOString().slice(0, 16);

  return (
    <div className="stagger space-y-5">
      <section className="pt-2">
        <p className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
          Workspace
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Kalender</h1>
      </section>

      {!meetings ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : meetings.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Noch keine Termine in den Projekten.
        </p>
      ) : (
        (() => {
          const upcoming = meetings.filter((m) => m.start >= now);
          const past = meetings.filter((m) => m.start < now).reverse();
          return (
            <>
              <section className="space-y-2">
                <h2 className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  Anstehend ({upcoming.length})
                </h2>
                {upcoming.length ? (
                  upcoming.map((m) => <Row key={`${m.projectId}-${m.id}`} m={m} />)
                ) : (
                  <p className="text-sm text-muted-foreground">Keine anstehenden Termine.</p>
                )}
              </section>
              {past.length > 0 && (
                <section className="space-y-2 opacity-70">
                  <h2 className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    Vergangen
                  </h2>
                  {past.slice(0, 10).map((m) => (
                    <Row key={`${m.projectId}-${m.id}`} m={m} />
                  ))}
                </section>
              )}
            </>
          );
        })()
      )}
    </div>
  );
}
