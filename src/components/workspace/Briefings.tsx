"use client";

// Briefings inbox — per project: the latest published briefing + any pending
// drafts awaiting owner approval, company-wide. Publishing here uses the same
// owner action as the project hub (copy draft → briefings/, delete draft).

import { useState } from "react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@mind-studio/ui";
import { Check, FileText, Inbox } from "lucide-react";
import { publishBriefing, type Briefing } from "@/lib/solid/data";
import { projectHref, type WsData } from "./types";
import { t } from "@/lib/strings";

function title(b: Briefing): string {
  return b.text.match(/^#\s*(.+)$/m)?.[1] ?? b.name;
}

export function Briefings({ data }: { data: WsData }) {
  const { briefings, refreshBriefings } = data;
  const [publishing, setPublishing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Optimistic overlay: the pod's container listing lags a beat after publish,
  // so reflect the move locally (drop the draft, promote it to latest) while the
  // background refetch reconciles. Keyed by projectId.
  const [published, setPublished] = useState<Record<string, Briefing>>({});
  const [droppedDrafts, setDroppedDrafts] = useState<Set<string>>(new Set());

  async function publish(projectId: string, b: Briefing) {
    setPublishing(b.url);
    setError(null);
    try {
      await publishBriefing(b);
      setDroppedDrafts((s) => new Set(s).add(b.url));
      setPublished((p) => ({ ...p, [projectId]: b }));
      refreshBriefings();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPublishing(null);
    }
  }

  // Apply the optimistic overlay onto the loaded data.
  const projects = (briefings ?? []).map((p) => ({
    ...p,
    drafts: p.drafts.filter((d) => !droppedDrafts.has(d.url)),
    latest: published[p.projectId] ?? p.latest,
  }));
  const pendingTotal = projects.reduce((n, p) => n + p.drafts.length, 0);

  return (
    <div className="stagger space-y-6">
      <section className="pt-2">
        <p className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
          {t.workspace}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">{t.briefings}</h1>
        {briefings && (
          <p className="mt-2 text-sm text-muted-foreground">
            {pendingTotal > 0
              ? t.draftsToApprove(pendingTotal)
              : t.noOpenDrafts}
          </p>
        )}
      </section>

      {error && <p className="text-sm text-error">{error}</p>}

      {!briefings ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {projects.map((p) => (
            <Card key={p.projectId}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <a
                    href={projectHref(p.projectId, "/briefings")}
                    className="font-display text-base font-semibold hover:text-primary"
                  >
                    {p.title}
                  </a>
                  {p.drafts.length > 0 && (
                    <Badge variant="secondary" className="bg-primary/15 text-primary">
                      <Inbox className="size-3" /> {p.drafts.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.drafts.length > 0 && (
                  <div className="space-y-2">
                    {p.drafts.map((d) => (
                      <div
                        key={d.url}
                        className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2"
                      >
                        <FileText className="size-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{title(d)}</p>
                          {d.date && (
                            <p className="font-mono text-[10px] text-muted-foreground">{d.date}</p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          disabled={publishing === d.url}
                          onClick={() => publish(p.projectId, d)}
                        >
                          <Check className="size-3.5" />
                          {publishing === d.url ? "…" : t.approve}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">{t.lastPublished}</p>
                  {p.latest ? (
                    <a
                      href={projectHref(p.projectId, "/briefings")}
                      className="font-medium hover:text-primary"
                    >
                      {title(p.latest)}
                      {p.latest.date && (
                        <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                          {p.latest.date}
                        </span>
                      )}
                    </a>
                  ) : (
                    <p className="text-muted-foreground">{t.noneYet}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
