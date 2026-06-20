"use client";

// Issue detail panel — full description (markdown), all metadata, inline
// editing for members/owners. Opened from the board (card click or
// /board?issue=TASK-XXX deep link / ⌘K).

import {
  Badge,
  Button,
  Input,
  Label,
  NativeSelect,
  NativeSelectOption,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  Spinner,
  Textarea,
} from "@mind-studio/ui";
import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PRIORITY_LABEL, STATE_LABEL } from "@/lib/labels";
import { usernameOf } from "@/lib/solid/auth";
import { updateIssue } from "@/lib/solid/data";
import { type Epic, type Issue, type IssueState, STATES } from "@/lib/solid/turtle";
import { t } from "@/lib/strings";
import { CommentThread } from "./CommentThread";
import { Markdown } from "./Markdown";

const STATE_DOT: Record<IssueState, string> = {
  backlog: "bg-muted-foreground",
  todo: "bg-foreground/60",
  "in-progress": "bg-primary",
  review: "bg-warn",
  done: "bg-ok",
  cancelled: "bg-error",
};

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function IssueSheet({
  issue,
  epics,
  members,
  canEdit,
  open,
  onOpenChange,
  onSaved,
}: {
  issue: Issue | null;
  epics: Epic[];
  members: { webId: string; name: string }[];
  canEdit: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<{
    title: string;
    state: IssueState;
    epic: string;
    assignee: string;
    due: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    setEditing(false);
    setDraft(null);
  }, [issue?.id, open]);

  if (!issue) return null;

  const epic = epics.find((e) => e.id === issue.epic) ?? null;
  const assigneeName = issue.assignee
    ? (members.find((m) => m.webId === issue.assignee)?.name ?? usernameOf(issue.assignee))
    : issue.ownerName;
  const today = new Date().toISOString().slice(0, 10);
  const overdue = issue.due && issue.state !== "done" && issue.due < today;

  const startEdit = () => {
    setDraft({
      title: issue.title,
      state: issue.state,
      epic: issue.epic ?? "",
      assignee: issue.assignee ?? "",
      due: issue.due ?? "",
      description: issue.description,
    });
    setEditing(true);
  };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await updateIssue(issue.id, {
        title: draft.title.trim() || issue.title,
        state: draft.state,
        epic: draft.epic || null,
        assignee: draft.assignee || null,
        due: draft.due || null,
        description: draft.description,
      });
      toast.success(t.issueSaved(issue.id));
      setEditing(false);
      onSaved();
    } catch (e) {
      toast.error(
        (e as { status?: number }).status === 403 ? t.issueReadonly : t.issueSaveFailed(e),
      );
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    setBusy(true);
    try {
      await updateIssue(issue.id, { state: "cancelled" });
      toast(t.issueDiscarded(issue.id));
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(t.issueDiscardFailed(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pb-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-primary">{issue.handle}</span>
            <Badge variant="secondary" className="gap-1.5">
              <span className={`size-1.5 rounded-full ${STATE_DOT[issue.state]}`} />
              {STATE_LABEL[issue.state]}
            </Badge>
            {issue.priority && issue.priority !== "normal" && (
              <Badge variant="outline">{PRIORITY_LABEL[issue.priority] ?? issue.priority}</Badge>
            )}
            {overdue && (
              <Badge variant="outline" className="border-error/50 text-error">
                {t.overdue}
              </Badge>
            )}
          </div>
          {editing && draft ? (
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="mt-1 font-display text-base font-semibold"
              aria-label={t.titleLabel}
            />
          ) : (
            <SheetTitle className="font-display text-lg leading-snug">{issue.title}</SheetTitle>
          )}
          <SheetDescription className="sr-only">{t.detailsOf(issue.id)}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <Meta label={t.statusLabel}>
              {editing && draft ? (
                <div className="[&>div]:w-full">
                  <NativeSelect
                    size="sm"
                    className="w-full"
                    value={draft.state}
                    onChange={(e) => setDraft({ ...draft, state: e.target.value as IssueState })}
                    aria-label={t.statusLabel}
                  >
                    {STATES.map((s) => (
                      <NativeSelectOption key={s} value={s}>
                        {STATE_LABEL[s]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              ) : (
                STATE_LABEL[issue.state]
              )}
            </Meta>
            <Meta label={t.workPackage}>
              {editing && draft ? (
                <div className="[&>div]:w-full">
                  <NativeSelect
                    size="sm"
                    className="w-full"
                    value={draft.epic}
                    onChange={(e) => setDraft({ ...draft, epic: e.target.value })}
                    aria-label={t.workPackage}
                  >
                    <NativeSelectOption value="">—</NativeSelectOption>
                    {epics.map((e) => (
                      <NativeSelectOption key={e.id} value={e.id}>
                        {e.id}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              ) : epic ? (
                <Link
                  href={`/board?ap=${epic.id}`}
                  className="transition-colors hover:text-primary"
                  title={t.openTitle(epic.title)}
                >
                  {epic.id}
                  <span className="text-muted-foreground">
                    {" "}
                    · {epic.title.replace(/^AP\d+:\s*/, "")}
                  </span>
                </Link>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Meta>
            <Meta label={t.assignee}>
              {editing && draft ? (
                <div className="[&>div]:w-full">
                  <NativeSelect
                    size="sm"
                    className="w-full"
                    value={draft.assignee}
                    onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
                    aria-label={t.assignee}
                  >
                    <NativeSelectOption value="">—</NativeSelectOption>
                    {members.map((m) => (
                      <NativeSelectOption key={m.webId} value={m.webId}>
                        {m.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
              ) : issue.assignee ? (
                <Link
                  href={`/team/${usernameOf(issue.assignee)}`}
                  className="transition-colors hover:text-primary"
                  title={t.openProfile}
                >
                  {assigneeName}
                </Link>
              ) : (
                (assigneeName ?? <span className="text-muted-foreground">—</span>)
              )}
            </Meta>
            <Meta label={t.dueDate}>
              {editing && draft ? (
                <Input
                  type="date"
                  value={draft.due}
                  onChange={(e) => setDraft({ ...draft, due: e.target.value })}
                  className="h-8"
                  aria-label={t.dueDate}
                />
              ) : issue.due ? (
                <span className={overdue ? "font-medium text-error" : ""}>{issue.due}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </Meta>
          </div>

          <Separator />

          <div>
            <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
              {t.description}
            </p>
            {editing && draft ? (
              <>
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  rows={10}
                  className="font-mono text-xs leading-relaxed"
                  aria-label={t.description}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">{t.markdownSupported}</p>
              </>
            ) : issue.description ? (
              // strip a leading H1 — the sheet header already shows the title
              <Markdown className="text-sm">{issue.description.replace(/^#\s*.+\n+/, "")}</Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">{t.noDescription}</p>
            )}
          </div>

          <Separator />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" />
            {issue.created && <span>{t.created(issue.created)}</span>}
            {issue.modified && <span>{t.updated(issue.modified)}</span>}
          </div>

          <Separator />

          <CommentThread target={issue.id} />
        </div>

        {canEdit && (
          <SheetFooter className="mt-auto flex-row justify-between gap-2 border-t">
            {editing ? (
              <>
                <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                  {t.cancel}
                </Button>
                <Button onClick={save} disabled={busy}>
                  {busy && <Spinner data-icon="inline-start" />}
                  {t.save}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-error"
                  onClick={discard}
                  disabled={busy || issue.state === "cancelled"}
                >
                  <Trash2 /> {t.discard}
                </Button>
                <Button variant="outline" onClick={startEdit}>
                  <Pencil /> {t.edit}
                </Button>
              </>
            )}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
