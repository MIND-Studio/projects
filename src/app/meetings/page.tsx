"use client";

// F4 — upcoming + past meetings from /meetings/ (one schema:Event per
// resource). Row click opens the detail sheet (deep link: /meetings?m=MTG-XXX,
// also via ⌘K); .ics export per meeting.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Skeleton,
} from "@mind-studio/ui";
import { toast } from "sonner";
import { CalendarPlus, ChevronRight, Copy, MapPin, Rss } from "lucide-react";
import { Shell } from "@/components/Shell";
import { MeetingSheet } from "@/components/MeetingSheet";
import { downloadIcs } from "@/lib/ics";
import { loadMeetings } from "@/lib/solid/data";
import { t, dateLocale } from "@/lib/strings";
import type { Meeting } from "@/lib/solid/turtle";

function Row({ m, past, onOpen }: { m: Meeting; past?: boolean; onOpen: (id: string) => void }) {
  const d = new Date(m.start);
  return (
    <Card
      className={`glow-hover cursor-pointer py-4 ${past ? "opacity-60 hover:opacity-100" : ""}`}
      onClick={() => onOpen(m.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(m.id);
        }
      }}
      aria-label={t.openTitle(m.title)}
    >
      <CardContent className="flex gap-4 px-4">
        <div
          className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border ${
            past ? "bg-muted" : "bg-primary/10 text-primary"
          }`}
          aria-hidden
        >
          <span className="font-display text-xl leading-none font-semibold">
            {d.getDate()}
          </span>
          <span className="mt-0.5 text-[10px] tracking-wide uppercase">
            {d.toLocaleString(dateLocale, { month: "short" })}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex min-w-0 items-center gap-1.5 font-medium">
              <span className="truncate">{m.title}</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </p>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{m.id}</span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {d.toLocaleString(dateLocale, {
              weekday: "short", hour: "2-digit", minute: "2-digit",
            })}{" "}
            {t.oclock}
            {m.location && (
              <span className="ml-2 inline-flex items-center gap-1">
                <MapPin className="size-3" /> {m.location}
              </span>
            )}
          </p>
        </div>
        {!past && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 self-center text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              downloadIcs(m);
            }}
            aria-label={t.addToCalendar}
            title={`${t.addToCalendar} (.ics)`}
          >
            <CalendarPlus className="size-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function SubscribeDialog({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  // webcal:// is the subscribe-protocol alias for the https feed URL
  const feedPath = "/api/calendar.ics";
  const httpUrl =
    typeof window === "undefined" ? feedPath : `${window.location.origin}${feedPath}`;
  const webcalUrl = httpUrl.replace(/^https?:\/\//, "webcal://");

  const copy = async () => {
    await navigator.clipboard.writeText(httpUrl);
    toast.success(t.feedUrlCopied);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{t.subscribeCalendar}</DialogTitle>
          <DialogDescription>
            {t.subscribeDesc}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              {t.appleOutlook}
            </p>
            <Button variant="outline" className="w-full" asChild>
              <a href={webcalUrl}>
                <Rss /> {t.subscribeViaWebcal}
              </a>
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">
              {t.googleAndOthers}
            </p>
            <div className="flex gap-2">
              <Input readOnly value={httpUrl} className="font-mono text-xs" aria-label={t.feedUrl} />
              <Button variant="outline" size="icon" onClick={copy} aria-label={t.copyFeedUrl}>
                <Copy />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.googleHowto}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Meetings() {
  const router = useRouter();
  const params = useSearchParams();
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  useEffect(() => {
    loadMeetings().then(setMeetings).catch(() => setMeetings([]));
  }, []);

  const selectedId = params.get("m");
  const selected = meetings?.find((m) => m.id === selectedId) ?? null;
  const openMeeting = (id: string | null) =>
    router.replace(id ? `/meetings?m=${id}` : "/meetings", { scroll: false });

  if (!meetings) {
    return (
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const cutoff = new Date().toISOString().slice(0, 16);
  const upcoming = meetings.filter((m) => m.start >= cutoff);
  const past = meetings.filter((m) => m.start < cutoff).reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-lg font-semibold tracking-tight">{t.meetingsTitle}</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSubscribeOpen(true)}
        >
          <Rss /> {t.subscribeCalendar}
        </Button>
      </div>
      <div className="grid gap-8 md:grid-cols-2">
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t.upcomingHeading}
        </h2>
        <div className="stagger space-y-3">
          {upcoming.length === 0 && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                {t.noUpcomingMeetings}
              </CardContent>
            </Card>
          )}
          {upcoming.map((m) => <Row key={m.id} m={m} onOpen={openMeeting} />)}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-display text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          {t.pastHeading}
        </h2>
        <div className="stagger space-y-3">
          {past.map((m) => <Row key={m.id} m={m} past onOpen={openMeeting} />)}
        </div>
      </section>

      <MeetingSheet
        meeting={selected}
        open={!!selected}
        onOpenChange={(o) => !o && openMeeting(null)}
      />
      </div>
      <SubscribeDialog open={subscribeOpen} onOpenChange={setSubscribeOpen} />
    </div>
  );
}

export default function Page() {
  return (
    <Shell>
      <Suspense>
        <Meetings />
      </Suspense>
    </Shell>
  );
}
