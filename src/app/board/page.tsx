"use client";

// F3 — Kanban board over tracker.ttl. Members move cards (whole-doc PUT as
// the user; WAC enforces), guests see a read-only board. Card click opens
// the issue detail sheet (deep link: /board?issue=TASK-XXX, also via ⌘K);
// the AP badge on a card opens the Arbeitspaket sheet (/board?ap=APx).

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
  Skeleton,
  Textarea,
} from "@mind-studio/ui";
import { Eye, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EpicSheet } from "@/components/EpicSheet";
import { IssueSheet } from "@/components/IssueSheet";
import { Shell, useHub } from "@/components/Shell";
import { STATE_LABEL } from "@/lib/labels";
import { usernameOf } from "@/lib/solid/auth";
import { createIssue, loadTracker, moveIssue } from "@/lib/solid/data";
import { type Issue, type IssueState, STATES, type Tracker } from "@/lib/solid/turtle";
import { t } from "@/lib/strings";

// Column order; labels come from STATE_LABEL so they follow the active locale.
const LANE_STATES: IssueState[] = ["backlog", "todo", "in-progress", "review", "done"];
const LANES = LANE_STATES.map((state) => ({ state, label: STATE_LABEL[state] }));

function IssueCard({
  issue,
  canEdit,
  onMove,
  onOpen,
  onOpenEpic,
  members,
}: {
  issue: Issue;
  canEdit: boolean;
  onMove: (id: string, s: IssueState) => void;
  onOpen: (id: string) => void;
  onOpenEpic: (id: string) => void;
  members: Map<string, string>;
}) {
  const overdue =
    issue.due && issue.state !== "done" && issue.due < new Date().toISOString().slice(0, 10);
  const assignee = issue.assignee
    ? (members.get(issue.assignee) ?? usernameOf(issue.assignee))
    : (issue.ownerName ?? "");
  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => e.dataTransfer.setData("text/issue-id", issue.id)}
      onClick={() => onOpen(issue.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(issue.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${issue.id}: ${issue.title}`}
      className={`glow-hover group cursor-pointer rounded-lg border bg-card p-3 shadow-xs ${
        canEdit ? "active:cursor-grabbing" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs text-primary">{issue.handle}</span>
        {issue.epic && (
          <Badge
            variant="secondary"
            className="cursor-pointer px-1.5 text-[10px] transition-colors hover:bg-primary/15 hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              onOpenEpic(issue.epic!);
            }}
            title={t.openTitle(issue.epic)}
          >
            {issue.epic}
          </Badge>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-snug">{issue.title}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate">{assignee}</span>
        {issue.due && <span className={overdue ? "font-medium text-error" : ""}>{issue.due}</span>}
      </div>
      {canEdit && (
        <div className="mt-2 [&>div]:w-full" onClick={(e) => e.stopPropagation()}>
          <NativeSelect
            size="sm"
            value={issue.state}
            onChange={(e) => onMove(issue.id, e.target.value as IssueState)}
            className="w-full text-xs"
            aria-label={t.statusOf(issue.id)}
          >
            {STATES.filter((s) => s !== "cancelled").map((s) => (
              <NativeSelectOption key={s} value={s}>
                {STATE_LABEL[s]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}
    </div>
  );
}

function NewIssueDialog({
  epics,
  members,
  onCreated,
  open,
  onOpenChange,
  initialEpic,
}: {
  epics: string[];
  members: { webId: string; name: string }[];
  onCreated: (id: string) => void;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialEpic?: string;
}) {
  const [title, setTitle] = useState("");
  const [epic, setEpic] = useState("");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  // preset the AP when the dialog is opened from an epic sheet
  useEffect(() => {
    if (open && initialEpic) setEpic(initialEpic);
  }, [open, initialEpic]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const id = await createIssue({
        title: title.trim(),
        state: "todo",
        epic: epic || null,
        due: due || null,
        assignee: assignee || null,
        description: description.trim(),
      });
      onOpenChange(false);
      setTitle("");
      setEpic("");
      setDue("");
      setAssignee("");
      setDescription("");
      onCreated(id);
    } catch (err) {
      toast.error(t.createFailed(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{t.newTask}</DialogTitle>
          <DialogDescription className="sr-only">{t.newTaskDialogDesc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="issue-title">{t.titleLabel}</Label>
            <Input
              id="issue-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.whatToDo}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2 [&>div]:w-full">
              <Label htmlFor="issue-epic">{t.workPackage}</Label>
              <NativeSelect
                id="issue-epic"
                value={epic}
                className="w-full"
                onChange={(e) => setEpic(e.target.value)}
              >
                <NativeSelectOption value="">—</NativeSelectOption>
                {epics.map((id) => (
                  <NativeSelectOption key={id} value={id}>
                    {id}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2 [&>div]:w-full">
              <Label htmlFor="issue-assignee">{t.assignee}</Label>
              <NativeSelect
                id="issue-assignee"
                value={assignee}
                className="w-full"
                onChange={(e) => setAssignee(e.target.value)}
              >
                <NativeSelectOption value="">—</NativeSelectOption>
                {members.map((m) => (
                  <NativeSelectOption key={m.webId} value={m.webId}>
                    {m.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-due">{t.dueDate}</Label>
            <Input
              id="issue-due"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issue-desc">{t.descOptionalMarkdown}</Label>
            <Textarea
              id="issue-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder={t.descPlaceholder}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" disabled={busy || !title.trim()}>
              {t.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Board() {
  const hub = useHub();
  const router = useRouter();
  const params = useSearchParams();
  const canEdit = hub.role === "Owner" || hub.role === "Member";
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [dragLane, setDragLane] = useState<IssueState | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogEpic, setDialogEpic] = useState<string | undefined>(undefined);

  const selectedId = params.get("issue");
  const selected = tracker?.issues.find((i) => i.id === selectedId) ?? null;
  const epicId = params.get("ap");
  const selectedEpic = tracker?.epics.find((e) => e.id === epicId) ?? null;

  const members = new Map(hub.project.members.map((m) => [m.agent, m.name ?? usernameOf(m.agent)]));
  const humanMembers = hub.project.members
    .filter((m) => m.kind !== "Worker")
    .map((m) => ({ webId: m.agent, name: m.name ?? m.agent }));

  const refresh = useCallback(() => {
    loadTracker()
      .then(setTracker)
      .catch((e) => toast.error(t.boardLoadFailed(e)));
  }, []);
  useEffect(refresh, [refresh]);

  // deep links: ?new=1 opens the create dialog (e.g. from ⌘K), optionally
  // with a preset AP (?new=1&epic=APx, e.g. from the timeline's AP sheet)
  useEffect(() => {
    if (params.get("new") === "1" && canEdit) {
      setDialogEpic(params.get("epic") ?? undefined);
      setDialogOpen(true);
      router.replace("/board", { scroll: false });
    }
  }, [params, canEdit, router]);

  // ?state=<lane> (dashboard stat cards) highlights that lane
  const highlight = params.get("state");

  const openIssue = (id: string | null) =>
    router.replace(id ? `/board?issue=${id}` : "/board", { scroll: false });
  const openEpic = (id: string | null) =>
    router.replace(id ? `/board?ap=${id}` : "/board", { scroll: false });

  const onMove = async (id: string, state: IssueState) => {
    // optimistic
    setTracker((t) =>
      t ? { ...t, issues: t.issues.map((i) => (i.id === id ? { ...i, state } : i)) } : t,
    );
    try {
      await moveIssue(id, state);
      toast.success(t.movedTo(id, STATE_LABEL[state]));
    } catch (e) {
      toast.error(
        (e as { status?: number }).status === 403 ? t.issueReadonly : t.issueSaveFailed(e),
      );
    }
    refresh();
  };

  if (!tracker) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {LANES.map((l) => (
          <Skeleton key={l.state} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  const active = tracker.issues.filter((i) => i.state !== "cancelled");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-lg font-semibold tracking-tight">Board</h1>
          <span className="text-xs text-muted-foreground">
            {t.doneOfTotal(active.filter((i) => i.state === "done").length, active.length)}
          </span>
        </div>
        {canEdit ? (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus /> {t.newTask}
          </Button>
        ) : (
          <Badge variant="outline" className="gap-1.5 text-muted-foreground">
            <Eye className="size-3" /> {t.readonlyAccess}
          </Badge>
        )}
      </div>
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-5">
        {LANES.map((lane) => {
          const issues = active.filter((i) => i.state === lane.state);
          return (
            <div
              key={lane.state}
              onDragOver={(e) => {
                if (canEdit) {
                  e.preventDefault();
                  setDragLane(lane.state);
                }
              }}
              onDragLeave={() => setDragLane((l) => (l === lane.state ? null : l))}
              onDrop={(e) => {
                setDragLane(null);
                const id = e.dataTransfer.getData("text/issue-id");
                if (id && canEdit) onMove(id, lane.state);
              }}
              className={`rounded-xl border p-3 transition-colors ${
                dragLane === lane.state || highlight === lane.state
                  ? "border-primary/60 bg-primary/5"
                  : "border-border/60 bg-card/40"
              }`}
            >
              <h2 className="mb-3 flex items-center justify-between font-display text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {lane.label}
                <Badge variant="secondary" className="px-1.5 text-[10px]">
                  {issues.length}
                </Badge>
              </h2>
              <div className="space-y-2">
                {issues.map((i) => (
                  <IssueCard
                    key={i.id}
                    issue={i}
                    canEdit={canEdit}
                    onMove={onMove}
                    onOpen={openIssue}
                    onOpenEpic={openEpic}
                    members={members}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <IssueSheet
        issue={selected}
        epics={tracker.epics}
        members={humanMembers}
        canEdit={canEdit}
        open={!!selected}
        onOpenChange={(o) => !o && openIssue(null)}
        onSaved={refresh}
      />
      <EpicSheet
        epic={selectedEpic}
        issues={tracker.issues}
        canEdit={canEdit}
        open={!!selectedEpic}
        onOpenChange={(o) => !o && openEpic(null)}
        onOpenIssue={openIssue}
        onCreateTask={(id) => {
          openEpic(null);
          setDialogEpic(id);
          setDialogOpen(true);
        }}
      />
      {canEdit && (
        <NewIssueDialog
          epics={tracker.epics.map((e) => e.id)}
          members={humanMembers}
          initialEpic={dialogEpic}
          onCreated={(id) => {
            toast.success(t.createdToast(id));
            refresh();
          }}
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setDialogEpic(undefined);
          }}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Suspense>
        <Board />
      </Suspense>
    </Shell>
  );
}
