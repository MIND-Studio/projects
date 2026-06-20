"use client";

// Meeting detail panel — full agenda (markdown), time range, location,
// organizer, comments, and calendar export (.ics download + Google link).
// Opened from /meetings (row click or ?m=MTG-XXX deep link / ⌘K).

import Link from "next/link";
import {
  Badge,
  Button,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@mind-studio/ui";
import { CalendarPlus, Clock, ExternalLink, MapPin, User } from "lucide-react";
import { Markdown } from "./Markdown";
import { CommentThread } from "./CommentThread";
import { useHub } from "./Shell";
import { downloadIcs, googleCalendarUrl } from "@/lib/ics";
import { usernameOf } from "@/lib/solid/auth";
import { t, dateLocale } from "@/lib/strings";
import type { Meeting } from "@/lib/solid/turtle";

const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });

export function MeetingSheet({
  meeting,
  open,
  onOpenChange,
}: {
  meeting: Meeting | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const hub = useHub();
  if (!meeting) return null;
  const past = meeting.start < new Date().toISOString().slice(0, 16);
  // organizer is a display string — link it when it names a project member
  const organizerMember = meeting.organizer
    ? hub.project.members.find(
        (m) => m.kind !== "Worker" && m.name && meeting.organizer!.includes(m.name),
      )
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pb-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono text-primary">{meeting.id}</span>
            <Badge variant={past ? "outline" : "secondary"}>
              {past ? t.past : t.upcoming}
            </Badge>
          </div>
          <SheetTitle className="font-display text-lg leading-snug">
            {meeting.title}
          </SheetTitle>
          <SheetDescription className="sr-only">{t.detailsOf(meeting.id)}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-4">
          <div className="space-y-2.5 text-sm">
            <p className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              {fmtDay(meeting.start)} · {fmtTime(meeting.start)}
              {meeting.end && <> – {fmtTime(meeting.end)}</>} {t.oclock}
            </p>
            {meeting.location && (
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> {meeting.location}
              </p>
            )}
            {meeting.organizer && (
              <p className="flex items-center gap-2">
                <User className="size-4 text-primary" />
                {organizerMember ? (
                  <Link
                    href={`/team/${usernameOf(organizerMember.agent)}`}
                    className="transition-colors hover:text-primary"
                    title={t.openProfile}
                  >
                    {meeting.organizer}
                  </Link>
                ) : (
                  meeting.organizer
                )}
              </p>
            )}
          </div>

          {meeting.description && (
            <>
              <Separator />
              <div>
                <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">
                  {t.agenda}
                </p>
                {/* strip a leading H1 — the sheet header already shows the title */}
                <Markdown className="text-sm">
                  {meeting.description.replace(/^#\s*.+\n+/, "")}
                </Markdown>
              </div>
            </>
          )}

          <Separator />

          <CommentThread target={meeting.id} />
        </div>

        <SheetFooter className="mt-auto flex-row border-t">
          <Button variant="outline" className="flex-1" onClick={() => downloadIcs(meeting)}>
            <CalendarPlus /> {t.downloadIcs}
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <a href={googleCalendarUrl(meeting)} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> {t.googleCalendar}
            </a>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
