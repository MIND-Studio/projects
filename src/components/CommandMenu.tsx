"use client";

// ⌘K command palette — navigate, jump to any task or meeting, start actions.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
  Kbd,
} from "@mind-studio/ui";
import {
  CalendarDays,
  CircleUser,
  FileText,
  GanttChartSquare,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Search,
  SquareKanban,
  Users,
} from "lucide-react";
import { loadTracker, loadMeetings } from "@/lib/solid/data";
import { dialogIsOpen, isTyping } from "./KeyboardShortcuts";
import { usernameOf } from "@/lib/solid/auth";
import type { Membership, Tracker, Meeting } from "@/lib/solid/turtle";
import { profile } from "@/lib/profile";
import { t, dateLocale } from "@/lib/strings";

// Nav labels mirror the Shell TABS (English literals). The assistant page only
// appears when the deployment enables it.
const PAGES = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  ...(profile.assistant
    ? [{ href: "/chat", label: profile.assistantName, icon: MessageSquare }]
    : []),
  { href: "/board", label: "Board", icon: SquareKanban },
  { href: "/timeline", label: "Timeline", icon: GanttChartSquare },
  { href: "/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/briefings", label: "Briefings", icon: FileText },
  { href: "/team", label: "Team", icon: Users },
];

export function CommandMenu({
  canEdit,
  members = [],
}: {
  canEdit: boolean;
  members?: Membership[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [meetings, setMeetings] = useState<Meeting[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      // "/" as a second opener — only when not typing and no dialog is open
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isTyping(e) || dialogIsOpen()) return;
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // lazy data load, once, when the palette first opens
  useEffect(() => {
    if (!open || tracker) return;
    loadTracker().then(setTracker).catch(() => {});
    loadMeetings().then(setMeetings).catch(() => {});
  }, [open, tracker]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-border/70 bg-card/60 py-1.5 pr-2 pl-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        aria-label={t.cmdOpen}
      >
        <Search className="size-3.5" />
        <span className="hidden lg:inline">{t.cmdSearch}</span>
        <Kbd className="hidden sm:inline-flex">⌘K</Kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t.cmdTitle} description={t.cmdDesc}>
        <CommandInput placeholder={t.cmdPlaceholder} />
        <CommandList>
          <CommandEmpty>{t.cmdEmpty}</CommandEmpty>
          <CommandGroup heading={t.cmdNav}>
            {PAGES.map((p) => (
              <CommandItem key={p.href} onSelect={() => go(p.href)}>
                <p.icon /> {p.label}
              </CommandItem>
            ))}
            {canEdit && (
              <CommandItem onSelect={() => go("/board?new=1")}>
                <Plus /> {t.cmdCreateTask}
                <CommandShortcut>Board</CommandShortcut>
              </CommandItem>
            )}
          </CommandGroup>
          {tracker && tracker.epics.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t.cmdWorkPackages}>
                {tracker.epics.map((e) => (
                  <CommandItem
                    key={e.id}
                    value={`${e.id} ${e.title}`}
                    onSelect={() => go(`/board?ap=${e.id}`)}
                  >
                    <GanttChartSquare />
                    <span className="truncate">{e.title.replace(/^AP\d+:\s*/, "")}</span>
                    <CommandShortcut>{e.id}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {members.filter((m) => m.kind !== "Worker").length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t.cmdPeople}>
                {members
                  .filter((m) => m.kind !== "Worker")
                  .map((m) => {
                    const username = usernameOf(m.agent);
                    return (
                      <CommandItem
                        key={m.agent}
                        value={`${username} ${m.name ?? ""} ${m.org ?? ""}`}
                        onSelect={() => go(`/team/${username}`)}
                      >
                        <CircleUser />
                        <span className="truncate">{m.name ?? username}</span>
                        {m.org && <CommandShortcut>{m.org}</CommandShortcut>}
                      </CommandItem>
                    );
                  })}
              </CommandGroup>
            </>
          )}
          {tracker && tracker.issues.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t.cmdTasks}>
                {tracker.issues.filter((i) => i.state !== "cancelled").map((i) => (
                  <CommandItem
                    key={i.id}
                    value={`${i.id} ${i.title}`}
                    onSelect={() => go(`/board?issue=${i.id}`)}
                  >
                    <SquareKanban />
                    <span className="truncate">{i.title}</span>
                    <CommandShortcut>{i.handle}</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {meetings && meetings.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading={t.cmdMeetings}>
                {meetings.map((m) => (
                  <CommandItem
                    key={m.id}
                    value={`${m.id} ${m.title}`}
                    onSelect={() => go(`/meetings?m=${m.id}`)}
                  >
                    <CalendarDays />
                    <span className="truncate">{m.title}</span>
                    <CommandShortcut>
                      {new Date(m.start).toLocaleDateString(dateLocale, {
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
