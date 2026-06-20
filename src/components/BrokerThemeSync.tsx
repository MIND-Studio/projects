"use client";

import { useEffect } from "react";
import { useMindTheme } from "@mind-studio/ui";
import { currentBrokeredTheme, subscribeBrokeredTheme } from "@/lib/solid/broker";

/**
 * When Projects runs inside the Mind shell, the shell hands its color mode over
 * the capability bridge (`mind:welcome { theme }`). This applies that mode to
 * Projects' own ThemeProvider so the embedded body matches the shell, and tracks
 * live shell theme toggles (the shell re-broadcasts welcome on change).
 *
 * Standalone, nothing is ever brokered, so this is a no-op and Projects keeps the
 * profile's own theme (Mind system light/dark, or the EmAI brand). Renders
 * nothing.
 */
export function BrokerThemeSync() {
  const { setMode } = useMindTheme();

  useEffect(() => {
    const apply = () => {
      const t = currentBrokeredTheme();
      if (t) setMode(t);
    };
    apply(); // in case the welcome arrived before this mounted
    return subscribeBrokeredTheme(apply);
  }, [setMode]);

  return null;
}
