"use client";

// Public landing page shown at "/" for anonymous visitors (Shell/RouterShell,
// anonymous phase). A futuristic, EmAI-branded scrolling page: HUD micro-labels,
// a light-shaft hero, the login card always visible on the right. Logged-in
// users never see this — Shell renders the dashboard for them.

import {
  CalendarDays,
  FileText,
  GanttChartSquare,
  MessageSquare,
  ShieldCheck,
  SquareKanban,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Symbol } from "@mind-studio/ui";
import { LoginPanel } from "./LoginCard";
import { currentBranding } from "@/lib/solid/config";
import { profile } from "@/lib/profile";
import { t } from "@/lib/strings";

// Mirrors Shell's nav (same icons) — what the hub gives you once you're in.
const FEATURES: { icon: LucideIcon; label: string; blurb: string }[] = [
  { icon: MessageSquare, label: "Chat", blurb: t.landingFeatChatBlurb(profile.assistantName) },
  { icon: SquareKanban, label: "Board", blurb: t.landingFeatBoardBlurb },
  { icon: GanttChartSquare, label: "Timeline", blurb: t.landingFeatTimelineBlurb },
  { icon: CalendarDays, label: t.cmdMeetings, blurb: t.landingFeatMeetingsBlurb },
  { icon: FileText, label: t.briefings, blurb: t.landingFeatBriefingsBlurb },
  { icon: Users, label: t.wsTeam, blurb: t.landingFeatTeamBlurb },
];

// Trust signals, mirrored from emai.dev's hero badges.
const SIGNALS = [t.landingSignalOss, t.landingSignalSovereign, t.landingSignalNoTracking];

export function Landing({ onLoggedIn }: { onLoggedIn?: () => void }) {
  // Host-resolved public branding (Landing renders only client-side, after the
  // anonymous phase, so window.location is always available — no SSR mismatch).
  const brand = currentBranding();
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="emai-backdrop fixed inset-0 -z-10" aria-hidden />
      <div
        className="emai-aurora pointer-events-none fixed inset-x-0 top-0 -z-10 h-[58vh]"
        aria-hidden
      />
      <div className="emai-beam pointer-events-none fixed inset-x-0 top-0 -z-10" aria-hidden />
      <Motes />

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
        {/* public header — no nav (anonymous) */}
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <Symbol className="h-8 w-8 rounded-lg" />
            <span className="font-display text-lg font-semibold tracking-tight">
              {profile.appName}
              {brand.title !== profile.appName && (
                <span className="font-normal text-muted-foreground"> · {brand.title}</span>
              )}
            </span>
          </div>
          <span className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
            {brand.title}
          </span>
        </header>

        {/* hero — split: intro left, login right (stacks on mobile) */}
        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-2 lg:py-20">
          <div className="stagger">
            {/* HUD status row — emai.dev signature */}
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="emai-status-dot size-1.5">
                  <span className="block size-1.5 rounded-full bg-[var(--color-warn)]" />
                </span>
                System · Online
              </span>
              <span className="text-primary/40">·</span>
              <span>{brand.kicker}</span>
            </div>

            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.0] tracking-tight sm:text-6xl">
              <span className="text-shimmer">{brand.title}</span>
            </h1>

            <p className="mt-4 font-mono text-xs uppercase tracking-[0.25em] text-primary/80">
              {t.landingHeroTagline(brand.title)}
            </p>

            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              {t.landingHeroLead}{" "}
              <span className="text-foreground/90">
                {t.landingHeroFeatures}
              </span>{" "}
              {t.landingHeroLeadTail}
            </p>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              {t.landingHeroAccount(profile.appName)}
            </p>

            {/* trust signals */}
            <div className="mt-7 flex flex-wrap gap-2">
              {SIGNALS.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground/70"
                >
                  <span className="size-1 rounded-full bg-primary" />
                  {s}
                </span>
              ))}
            </div>

            {/* partners */}
            <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {brand.partners.map((p, i) => (
                <span key={p} className="flex items-center gap-2">
                  {i > 0 && <span className="text-primary/50">×</span>}
                  <span className="font-medium text-foreground/80">{p}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="lg:pl-4">
            <LoginPanel onLoggedIn={onLoggedIn} />
          </div>
        </section>

        {/* what is the assistant */}
        <section className="border-t border-border/60 py-14">
          <Eyebrow index="01" label={t.landingOverview} />
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
            {t.landingMeet(profile.assistantName)}
          </h2>
          <div className="mt-4 grid gap-4 text-muted-foreground sm:grid-cols-2 sm:gap-10">
            <p>
              {t.landingMeetP1(profile.assistantName)}
            </p>
            <p className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <span>
                <span className="text-foreground/90">{t.landingAccountWord(profile.appName)}</span>{" "}
                {t.landingAccountP2}
              </span>
            </p>
          </div>
        </section>

        {/* features */}
        <section className="border-t border-border/60 py-14">
          <Eyebrow index="02" label={t.landingFunctions} />
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
            {t.landingAllInOne}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, label, blurb }, i) => (
              <div
                key={label}
                className="glow-hover relative rounded-xl border border-border/60 bg-card/40 p-5"
              >
                <span className="absolute right-4 top-4 font-mono text-xs text-muted-foreground/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 font-medium text-foreground">{label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{blurb}</p>
              </div>
            ))}
          </div>
        </section>

        {/* partners */}
        <section className="border-t border-border/60 py-14">
          <Eyebrow index="03" label={t.landingPartners} />
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
            {t.landingBuiltTogether}
          </h2>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            {brand.partners.map((p) => (
              <span
                key={p}
                className="rounded-lg border border-border/60 px-4 py-2 text-sm font-medium text-foreground/90"
              >
                {p}
              </span>
            ))}
          </div>
        </section>

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/60 py-5 text-xs text-muted-foreground">
          <span className="font-mono uppercase tracking-[0.15em]">{brand.title}</span>
          <span>{t.landingFooterTrust}</span>
        </footer>
      </div>
    </div>
  );
}

/** Mono section index + label, e.g. "01 / Funktionen". */
function Eyebrow({ index, label }: { index: string; label: string }) {
  return (
    <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-primary/80">
      <span>{index}</span>
      <span className="h-px w-6 bg-primary/30" />
      <span className="text-muted-foreground">{label}</span>
    </p>
  );
}

/** Faint drifting particles behind the hero — depth, not noise. */
function Motes() {
  const motes = [
    { v: "a", cls: "left-[12%] top-[22%] size-1" },
    { v: "b", cls: "right-[16%] top-[30%] size-[3px] teal" },
    { v: "c", cls: "left-[24%] top-[64%] size-[2px]" },
    { v: "a", cls: "right-[28%] top-[72%] size-1" },
    { v: "b", cls: "left-[46%] top-[14%] size-[2px]" },
    { v: "c", cls: "right-[40%] top-[52%] size-1 teal" },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      {motes.map((m, i) => (
        <span key={i} className={`emai-mote emai-float-${m.v} ${m.cls}`} />
      ))}
    </div>
  );
}
