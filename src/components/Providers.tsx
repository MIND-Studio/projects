"use client";

import { ThemeProvider, Toaster } from "@mind-studio/ui";
import { useEffect, type ReactNode } from "react";
import { emai } from "@/lib/theme/emai";
import { profile } from "@/lib/profile";
import { BrokerThemeSync } from "@/components/BrokerThemeSync";

/* One delegated pointer listener feeds the cursor-tracking spotlight on every
   .glow-hover card (--mx/--my are read by the ::after gradient in globals.css). */
function useCardSpotlight() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest?.(".glow-hover");
      if (!(el instanceof HTMLElement)) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);
}

/* Theme follows the profile's brand. The open-source default uses the built-in
   Mind theme with system light/dark; the EmAI brand is dark-only orange (its
   spec authors only dark surfaces), opted in via NEXT_PUBLIC_BRAND=emai. */
const isEmai = profile.brand === "emai";

export function Providers({ children }: { children: ReactNode }) {
  useCardSpotlight();
  return (
    <ThemeProvider
      theme={isEmai ? emai : undefined}
      forcedTheme={isEmai ? "dark" : undefined}
      enableSystem={!isEmai}
    >
      {/* Embedded in the shell, follow the shell's color mode over the bridge;
          standalone this is a no-op and the profile theme above wins. */}
      <BrokerThemeSync />
      {children}
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}
