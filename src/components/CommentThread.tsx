"use client";

// Threaded comments under any project object (issue, AP, meeting, briefing).
// Top-level comments + one reply level; writes go to the pod as the signed-in
// user, guests see the thread read-only.

import { Avatar, AvatarFallback, Button, Spinner, Textarea } from "@mind-studio/ui";
import { CornerDownRight, MessageSquare, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { usernameOf } from "@/lib/solid/auth";
import { addComment, type Comment, deleteComment, loadComments } from "@/lib/solid/comments";
import { dateLocale, t } from "@/lib/strings";
import { Markdown } from "./Markdown";
import { useHub } from "./Shell";

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function relTime(iso: string): string {
  const dt = Date.now() - new Date(iso).getTime();
  if (dt < 60_000) return t.rightNow;
  if (dt < 3_600_000) return t.minutesAgo(Math.floor(dt / 60_000));
  if (dt < 86_400_000) return t.hoursAgo(Math.floor(dt / 3_600_000));
  return new Date(iso).toLocaleDateString(dateLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function Composer({
  placeholder,
  busy,
  onSubmit,
  autoFocus,
  onCancel,
}: {
  placeholder: string;
  busy: boolean;
  onSubmit: (text: string) => Promise<void>;
  autoFocus?: boolean;
  onCancel?: () => void;
}) {
  const [text, setText] = useState("");
  const submit = async () => {
    if (!text.trim()) return;
    await onSubmit(text);
    setText("");
  };
  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            void submit();
          }
        }}
        rows={2}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
        className="text-sm"
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            {t.cancel}
          </Button>
        )}
        <Button size="sm" onClick={() => void submit()} disabled={busy || !text.trim()}>
          {busy && <Spinner data-icon="inline-start" />}
          {t.comment}
        </Button>
      </div>
    </div>
  );
}

function CommentItem({
  c,
  replies,
  canComment,
  canDelete,
  busy,
  onReply,
  onDelete,
}: {
  c: Comment;
  replies: Comment[];
  canComment: boolean;
  canDelete: (c: Comment) => boolean;
  busy: boolean;
  onReply: (parent: Comment, text: string) => Promise<void>;
  onDelete: (c: Comment) => Promise<void>;
}) {
  const [replying, setReplying] = useState(false);
  const username = usernameOf(c.author);
  return (
    <div className="space-y-2">
      <div className="group flex gap-2.5">
        <Link href={`/team/${username}`} className="shrink-0" title={c.authorName}>
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
              {initialsOf(c.authorName)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-2 text-xs">
            <Link
              href={`/team/${username}`}
              className="font-medium text-foreground transition-colors hover:text-primary"
            >
              {c.authorName}
            </Link>
            <span className="text-muted-foreground" title={c.created}>
              {relTime(c.created)}
            </span>
            {canDelete(c) && (
              <button
                onClick={() => void onDelete(c)}
                disabled={busy}
                className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                aria-label={t.deleteComment}
                title={t.deleteComment}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </p>
          <Markdown className="mt-0.5 text-sm [&_p]:my-1">{c.text}</Markdown>
          {canComment && !replying && (
            <button
              onClick={() => setReplying(true)}
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <CornerDownRight className="size-3" /> {t.reply}
            </button>
          )}
        </div>
      </div>

      {(replies.length > 0 || replying) && (
        <div className="ml-3.5 space-y-3 border-l border-border/70 pl-5">
          {replies.map((r) => (
            <div key={r.id} className="group flex gap-2.5">
              <Link
                href={`/team/${usernameOf(r.author)}`}
                className="shrink-0"
                title={r.authorName}
              >
                <Avatar className="size-6">
                  <AvatarFallback className="bg-primary/15 text-[9px] font-semibold text-primary">
                    {initialsOf(r.authorName)}
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-2 text-xs">
                  <Link
                    href={`/team/${usernameOf(r.author)}`}
                    className="font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {r.authorName}
                  </Link>
                  <span className="text-muted-foreground" title={r.created}>
                    {relTime(r.created)}
                  </span>
                  {canDelete(r) && (
                    <button
                      onClick={() => void onDelete(r)}
                      disabled={busy}
                      className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                      aria-label={t.deleteReply}
                      title={t.deleteReply}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </p>
                <Markdown className="mt-0.5 text-sm [&_p]:my-1">{r.text}</Markdown>
              </div>
            </div>
          ))}
          {replying && (
            <Composer
              placeholder={t.replyTo(c.authorName)}
              busy={busy}
              autoFocus
              onCancel={() => setReplying(false)}
              onSubmit={async (text) => {
                await onReply(c, text);
                setReplying(false);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function CommentThread({ target }: { target: string }) {
  const hub = useHub();
  const canComment = hub.role === "Owner" || hub.role === "Member";
  const [all, setAll] = useState<Comment[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    loadComments()
      .then(setAll)
      .catch(() => setAll([]));
  }, []);
  // refetch when the thread is pointed at another object (sheet stays mounted)
  useEffect(refresh, [refresh, target]);

  const comments = (all ?? []).filter((c) => c.target === target);
  const tops = comments.filter((c) => !c.replyTo);
  const repliesOf = (id: string) => comments.filter((c) => c.replyTo === id);
  // a comment is deletable by its author and by owners
  const canDelete = (c: Comment) => c.author === hub.webId || hub.role === "Owner";

  const post = async (text: string, replyTo: string | null) => {
    setBusy(true);
    try {
      const created = await addComment({
        target,
        text,
        replyTo,
        author: hub.webId,
        authorName: hub.displayName,
      });
      // local append — the container listing lags right after the PUT, so a
      // refetch here would lose the new comment until the next mount
      setAll((prev) => [...(prev ?? []), created]);
    } catch (e) {
      toast.error((e as { status?: number }).status === 403 ? t.issueReadonly : t.commentFailed(e));
      throw e;
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: Comment) => {
    setBusy(true);
    try {
      await deleteComment(c);
      // local removal (incl. replies of a removed top-level comment)
      setAll((prev) => (prev ? prev.filter((x) => x.id !== c.id && x.replyTo !== c.id) : prev));
    } catch (e) {
      toast.error(t.commentDeleteFailed(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs tracking-wide text-muted-foreground uppercase">
        <MessageSquare className="size-3.5" />
        {t.comments}
        {all !== null && comments.length > 0 ? ` (${comments.length})` : ""}
      </p>
      {all === null ? (
        <p className="text-sm text-muted-foreground">{t.loadingComments}</p>
      ) : (
        <div className="space-y-4">
          {tops.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {canComment ? t.noCommentsYetCanComment : t.noCommentsYet}
            </p>
          )}
          {tops.map((c) => (
            <CommentItem
              key={c.id}
              c={c}
              replies={repliesOf(c.id)}
              canComment={canComment}
              canDelete={canDelete}
              busy={busy}
              onReply={(parent, text) => post(text, parent.id)}
              onDelete={remove}
            />
          ))}
          {canComment && (
            <Composer
              placeholder={t.writeComment}
              busy={busy}
              onSubmit={(text) => post(text, null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
