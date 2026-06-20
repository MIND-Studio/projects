"use client";

// F5 — weekly briefings. Members+guests see published briefings with unread
// badges; owners additionally see Kai's drafts and publish them (the WAC gate
// on briefings/drafts/ makes drafts invisible to everyone else).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
  Spinner,
} from "@mind-studio/ui";
import { toast } from "sonner";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Shell, useHub } from "@/components/Shell";
import { Markdown } from "@/components/Markdown";
import {
  loadBriefings, loadBriefingDrafts, publishBriefing,
  readBriefingState, markBriefingRead, type Briefing,
} from "@/lib/solid/data";
import { profile } from "@/lib/profile";
import { t } from "@/lib/strings";

function BriefingCard({
  b, unread, draft, onOpen, action,
}: {
  b: Briefing;
  unread: boolean;
  draft?: boolean;
  onOpen?: () => void;
  action?: { label: string; run: () => void; busy: boolean };
}) {
  const [open, setOpen] = useState(false);
  const title = b.text.match(/^#\s*(.+)$/m)?.[1] ?? b.name;
  // body without the H1 (the card header already shows it)
  const body = b.text.replace(/^#\s*.+\n+/, "");
  return (
    <Card className={draft ? "border-primary/40" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setOpen((v) => !v);
              if (!open) onOpen?.();
            }}
            className="flex min-w-0 items-center gap-2 text-left font-display text-base font-semibold hover:text-primary"
            aria-expanded={open}
          >
            {unread && (
              <span className="size-2 shrink-0 rounded-full bg-primary" title={t.unread} />
            )}
            <span className="truncate">{title}</span>
            <ChevronDown
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          <span className="flex shrink-0 items-center gap-2">
            {draft && <Badge variant="outline">{t.draft}</Badge>}
            {!draft && (
              <Link
                href={`/briefings/${encodeURIComponent(b.name)}`}
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label={t.openBriefingAsPage}
                title={t.openAsPage}
              >
                <ArrowUpRight className="size-4" />
              </Link>
            )}
            {action && (
              <Button size="sm" onClick={action.run} disabled={action.busy}>
                {action.busy && <Spinner data-icon="inline-start" />}
                {action.label}
              </Button>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent className="border-t pt-4">
          <Markdown>{body}</Markdown>
        </CardContent>
      )}
    </Card>
  );
}

function Briefings() {
  const hub = useHub();
  const isOwner = hub.role === "Owner";
  const [published, setPublished] = useState<Briefing[] | null>(null);
  const [drafts, setDrafts] = useState<Briefing[] | null>(null);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(() => {
    loadBriefings().then(setPublished).catch(() => setPublished([]));
    if (isOwner) loadBriefingDrafts().then(setDrafts).catch(() => setDrafts(null));
    setReadSet(readBriefingState(hub.username));
  }, [hub.username, isOwner]);
  useEffect(refresh, [refresh]);

  const publish = async (b: Briefing) => {
    setBusy(b.name);
    try {
      await publishBriefing(b);
      toast.success(t.briefingPublished);
    } catch (e) {
      toast.error(t.briefingPublishFailed(e));
    } finally {
      setBusy(null);
      refresh();
    }
  };

  const markRead = (name: string) => {
    markBriefingRead(hub.username, name);
    setReadSet(readBriefingState(hub.username));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {isOwner && drafts && drafts.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-sm font-semibold tracking-wide text-primary uppercase">
            {t.draftsPendingApproval(profile.appName)}
          </h2>
          <div className="stagger space-y-3">
            {drafts.map((b) => (
              <BriefingCard
                key={b.url}
                b={b}
                unread={false}
                draft
                action={{ label: t.publish, run: () => publish(b), busy: busy === b.name }}
              />
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t.briefings}
        </h2>
        {!published ? (
          <div className="stagger space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : published.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {t.noBriefingsYet(profile.assistantName)}
            </CardContent>
          </Card>
        ) : (
          <div className="stagger space-y-3">
            {published.map((b) => (
              <BriefingCard
                key={b.url}
                b={b}
                unread={!readSet.has(b.name)}
                onOpen={() => markRead(b.name)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Briefings />
    </Shell>
  );
}
