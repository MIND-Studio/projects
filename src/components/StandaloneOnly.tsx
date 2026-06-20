"use client";

import { useEffect, useState } from "react";
import { initBroker, isBrokered } from "@/lib/solid/broker";

/**
 * Renders its children only when Projects runs **standalone**. Inside the Mind
 * shell (brokered mode) it renders nothing — the shell already provides the
 * outer chrome (app title, navigation, launcher, theme), so the app's own
 * masthead/footer would be duplicate chrome inside the shell's app body.
 *
 * Detection is the broker handshake: if a Mind shell answers, hide. Any flash of
 * the masthead during the handshake window is covered by the shell's loading
 * overlay (it clears on `mind:ready`, which Projects fires only after the app is
 * interactive — see Shell's signalReady()).
 */
export function StandaloneOnly({ children }: { children: React.ReactNode }) {
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    if (isBrokered()) {
      setEmbedded(true);
      return;
    }
    let alive = true;
    initBroker().then((id) => {
      if (alive && id) setEmbedded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (embedded) return null;
  return <>{children}</>;
}
