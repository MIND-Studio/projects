"use client";

// Cross-project board — every project's open work in state columns, each issue
// tagged with its project. Read-only here (editing lives in the project hub):
// clicking an issue deep-links into that project's board (cross-origin SSO).

import { Badge, Button, Card, CardContent, Skeleton } from "@mind-studio/ui";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { STATE_LABEL } from "@/lib/labels";
import type { IssueState } from "@/lib/solid/turtle";
import { projectHref, type WsData } from "./types";

// Open lanes only — the company board is about work in flight, not the archive.
const LANES: IssueState[] = ["todo", "in-progress", "review"];

export function Board({ data }: { data: WsData }) {
  const { board } = data;
  const [filter, setFilter] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  if (!board) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {LANES.map((s) => (
          <Skeleton key={s} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  const active = filter ? board.filter((p) => p.projectId === filter) : board;
  const tagged = active.flatMap((p) =>
    p.issues.map((i) => ({ ...i, projectId: p.projectId, projectTitle: p.title })),
  );

  return (
    <div className="stagger space-y-4">
      <section className="pt-2">
        <p className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
          Workspace
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Alle Aufgaben</h1>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === null ? "default" : "outline"}
          onClick={() => setFilter(null)}
        >
          Alle Projekte
        </Button>
        {board.map((p) => (
          <Button
            key={p.projectId}
            size="sm"
            variant={filter === p.projectId ? "default" : "outline"}
            onClick={() => setFilter(p.projectId)}
          >
            {p.title}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {LANES.map((state) => {
          const items = tagged
            .filter((i) => i.state === state)
            .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
          return (
            <div key={state} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                  {STATE_LABEL[state]}
                </h2>
                <span className="font-mono text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((i) => {
                  const overdue = i.due && i.due < today;
                  return (
                    <a
                      key={`${i.projectId}-${i.id}`}
                      href={projectHref(i.projectId, `/board?issue=${i.id}`)}
                      className="group block"
                    >
                      <Card className="glow-hover transition-colors group-hover:border-primary/40">
                        <CardContent className="space-y-2 p-3">
                          <p className="text-sm leading-snug text-foreground/90">{i.title}</p>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px]">
                              {i.projectTitle}
                            </Badge>
                            {i.due && (
                              <span
                                className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                                  overdue ? "text-error" : "text-muted-foreground"
                                }`}
                              >
                                {overdue && <TriangleAlert className="size-3" />}
                                {i.due}
                              </span>
                            )}
                            {i.ownerName && (
                              <span className="ml-auto truncate text-[10px] text-muted-foreground">
                                {i.ownerName}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  );
                })}
                {items.length === 0 && (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">—</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
