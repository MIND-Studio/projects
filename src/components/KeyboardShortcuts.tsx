"use client";

// Global keyboard layer — the whole hub is navigable without a mouse:
// 1–7 jump between tabs, n = neue Aufgabe, m = mein Profil, ? = this help.
// Keys stay inert while typing or while a dialog/sheet is open (Escape
// closes those first); ⌘K and / live in CommandMenu.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Kbd,
} from "@mind-studio/ui";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { t } from "@/lib/strings";

export function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return (
    !!t &&
    (t.tagName === "INPUT" ||
      t.tagName === "TEXTAREA" ||
      t.tagName === "SELECT" ||
      t.isContentEditable)
  );
}

export function dialogIsOpen(): boolean {
  return !!document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  );
}

export function KeyboardShortcuts({
  tabs,
  canEdit,
  username,
}: {
  tabs: { href: string; label: string }[];
  canEdit: boolean;
  username: string;
}) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e) || dialogIsOpen()) return;
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      const tabIndex = Number(e.key) - 1;
      if (e.key >= "1" && e.key <= "9" && tabs[tabIndex]) {
        e.preventDefault();
        router.push(tabs[tabIndex].href);
        return;
      }
      if (e.key === "n" && canEdit) {
        e.preventDefault();
        router.push("/board?new=1");
        return;
      }
      if (e.key === "m") {
        e.preventDefault();
        router.push(`/team/${username}`);
      }
    };
    document.addEventListener("keydown", onKey);
    const onHelp = () => setHelpOpen(true);
    window.addEventListener("emai:shortcuts", onHelp);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("emai:shortcuts", onHelp);
    };
  }, [router, tabs, canEdit, username]);

  const rows: [string, string][] = [
    ...tabs.map((t, i): [string, string] => [String(i + 1), t.label]),
    ["⌘K", t.searchAndCommands],
    ["/", t.searchAndCommands],
    ...(canEdit ? [["N", t.newTaskShortcut] as [string, string]] : []),
    ["M", t.myProfile],
    ["⌘↵", t.sendMessageComment],
    ["Esc", t.closeDialog],
    ["?", t.thisOverview],
  ];

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">{t.keyboardShortcuts}</DialogTitle>
          <DialogDescription>{t.shortcutsHint}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
          {rows.map(([key, label], i) => (
            <div key={`${key}-${i}`} className="contents">
              <dt>
                <Kbd>{key}</Kbd>
              </dt>
              <dd className="text-muted-foreground">{label}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
