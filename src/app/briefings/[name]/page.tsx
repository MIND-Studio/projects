"use client";

// Briefing permalink — full-page view of one published briefing
// (/briefings/<file-name>), shareable inside the project.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Button, Card, CardContent, Skeleton } from "@mind-studio/ui";
import { ArrowLeft } from "lucide-react";
import { Shell, useHub } from "@/components/Shell";
import { Markdown } from "@/components/Markdown";
import { CommentThread } from "@/components/CommentThread";
import { loadBriefings, markBriefingRead, type Briefing } from "@/lib/solid/data";

function BriefingDetail() {
  const hub = useHub();
  const params = useParams<{ name: string }>();
  const name = decodeURIComponent(params.name);
  const [briefing, setBriefing] = useState<Briefing | null | undefined>(undefined);

  useEffect(() => {
    loadBriefings()
      .then((bs) => {
        const b = bs.find((x) => x.name === name) ?? null;
        setBriefing(b);
        if (b) markBriefingRead(hub.username, b.name);
      })
      .catch(() => setBriefing(null));
  }, [name, hub.username]);

  if (briefing === undefined) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground">
        <Link href="/briefings">
          <ArrowLeft /> Alle Briefings
        </Link>
      </Button>
      {briefing === null ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Dieses Briefing wurde nicht gefunden.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="animate-rise">
            <CardContent className="space-y-4 pt-2">
              {briefing.date && (
                <Badge variant="outline" className="text-muted-foreground">
                  {briefing.date}
                </Badge>
              )}
              <Markdown>{briefing.text}</Markdown>
            </CardContent>
          </Card>
          <Card className="animate-rise">
            <CardContent className="pt-2">
              <CommentThread target={`briefing:${briefing.name}`} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <BriefingDetail />
    </Shell>
  );
}
