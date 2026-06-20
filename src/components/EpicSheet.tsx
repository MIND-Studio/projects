"use client";

// Arbeitspaket (epic) detail panel — description, lead, progress, and the
// full task list of the AP. Opened from the overview AP cards, the timeline
// lane labels, the board epic badges or /board?ap=APx deep link / ⌘K.

import {
  Badge,
  Button,
  Progress,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@mind-studio/ui";
import Link from "next/link";
import { Plus, TriangleAlert, Users } from "lucide-react";
import { Markdown } from "./Markdown";
import { CommentThread } from "./CommentThread";
import { useHub } from "./Shell";
import { orgsOf, orgMatches } from "@/lib/orgs";
import type { Epic, Issue, IssueState } from "@/lib/solid/turtle";
import { STATE_LABEL } from "@/lib/labels";
import { t } from "@/lib/strings";

const STATE_DOT: Record<IssueState, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-foreground/60",
  "in-progress": "bg-primary",
  review: "bg-warn",
  done: "bg-ok",
  cancelled: "bg-error",
};

/* board lane order, done last so open work reads first */
const STATE_ORDER: IssueState[] = ["in-progress", "review", "todo", "backlog", "done"];

const EPIC_STATUS_LABEL: Record<string, string> = {
  active: t.epicStatusActive,
  planned: t.epicStatusPlanned,
  done: t.epicStatusDone,
};

export function EpicSheet({
  epic,
  issues,
  canEdit,
  open,
  onOpenChange,
  onOpenIssue,
  onCreateTask,
}: {
  epic: Epic | null;
  issues: Issue[];
  canEdit: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpenIssue: (id: string) => void;
  onCreateTask: (epicId: string) => void;
}) {
  const hub = useHub();
  if (!epic) return null;

  // ekai:lead is a display string — link the orgs in it to their profiles
  const leadOrgs = epic.lead
    ? orgsOf(hub.project.members).filter((o) =>
        epic.lead!.split(/[+&,/]| und /).some((part) => orgMatches(part, o.name)),
      )
    : [];

  const today = new Date().toISOString().slice(0, 10);
  const tasks = issues
    .filter((i) => i.epic === epic.id && i.state !== "cancelled")
    .sort(
      (a, b) =>
        STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) ||
        (a.due ?? "9999").localeCompare(b.due ?? "9999"),
    );
  const done = tasks.filter((i) => i.state === "done").length;
  const overdue = tasks.filter((i) => i.due && i.state !== "done" && i.due < today);
  const pct = tasks.length ? (done / tasks.length) * 100 : 0;
  const dues = tasks.map((i) => i.due).filter((d): d is string => !!d).sort();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pb-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-primary">{epic.id}</span>
            <Badge variant={epic.status === "active" ? "secondary" : "outline"}>
              {epic.status === "active" && (
                <span className="size-1.5 animate-pulse rounded-full bg-ok motion-reduce:animate-none" />
              )}
              {EPIC_STATUS_LABEL[epic.status] ?? epic.status}
            </Badge>
            {overdue.length > 0 && (
              <Badge variant="outline" className="border-error/50 text-error">
                <TriangleAlert className="size-3" /> {t.overdueCount(overdue.length)}
              </Badge>
            )}
          </div>
          <SheetTitle className="font-display text-lg leading-snug">
            {epic.title.replace(/^AP\d+:\s*/, "")}
          </SheetTitle>
          <SheetDescription className="sr-only">{t.detailsOf(epic.id)}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4">
          {epic.lead && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4 text-primary" />
              {leadOrgs.length > 0 ? (
                leadOrgs.map((o, idx) => (
                  <span key={o.slug}>
                    {idx > 0 && <span className="mr-2">·</span>}
                    <Link
                      href={`/orgs/${o.slug}`}
                      className="transition-colors hover:text-primary"
                      title={t.openTitle(o.name)}
                    >
                      {o.name}
                    </Link>
                  </span>
                ))
              ) : (
                epic.lead
              )}
            </p>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {t.tasksDoneOf(done, tasks.length)}
              </span>
              <span className="font-mono">
                {Math.round(pct)}%
                {dues.length > 0 && (
                  <span className="ml-3">
                    {dues[0]} – {dues[dues.length - 1]}
                  </span>
                )}
              </span>
            </div>
            <Progress value={pct} className="progress-glow h-1.5" aria-label={t.apProgress} />
          </div>

          {epic.description && (
            <>
              <Separator />
              <Markdown className="text-sm">{epic.description}</Markdown>
            </>
          )}

          <Separator />
          <div>
            <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
              {t.tasks}
            </p>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.noTasksInAp}
              </p>
            ) : (
              <ul className="stagger space-y-0.5">
                {tasks.map((i) => {
                  const late = i.due && i.state !== "done" && i.due < today;
                  return (
                    <li key={i.id}>
                      <button
                        onClick={() => onOpenIssue(i.id)}
                        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
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
                          {i.title.replace(/^AP\d+:\s*/, "")}
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
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Separator />

          <CommentThread target={epic.id} />
        </div>

        {canEdit && (
          <SheetFooter className="mt-auto border-t">
            <Button variant="outline" onClick={() => onCreateTask(epic.id)}>
              <Plus /> {t.createTaskIn(epic.id)}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
