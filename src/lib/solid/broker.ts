"use client";

import { solid } from "./client";
import type { BrokerIdentity, BrokerTheme } from "@mind-studio/core/solid";

/**
 * Thin re-exports over the shared {@link solid} client's broker (see
 * `client.ts`). The Mind shell capability bridge — handshake, brokered fetch
 * tunnel, theme sync, ready signal — lives in `@mind-studio/core/solid`; these
 * shims keep the app's import paths short and stable.
 *
 * Standalone (the open-source default), none of this engages: `isBrokered()` is
 * false and pod I/O runs over the app's own OIDC session.
 */
export type { BrokerIdentity, BrokerTheme };

export function isBrokered(): boolean {
  return solid.broker.isBrokered();
}

export function brokeredIdentity(): BrokerIdentity | null {
  return solid.broker.brokeredIdentity();
}

/**
 * The shell's active project when embedded, or null. `null` means either
 * standalone (not brokered) OR the shell is in "no project" / whole-workspace
 * scope — callers distinguish with {@link isBrokered}. An embedded build follows
 * this instead of its own `profile.defaultProject` so it never disagrees with the
 * shell's project switcher.
 */
export function brokeredProject(): { id: string; name: string } | null {
  return solid.broker.brokeredIdentity()?.project ?? null;
}

export function currentBrokeredTheme(): BrokerTheme | null {
  return solid.broker.currentBrokeredTheme();
}

export function subscribeBrokeredTheme(fn: () => void): () => void {
  return solid.broker.subscribeBrokeredTheme(fn);
}

/** Fires when the shell switches project (re-bind, no reload) so the app can
 *  re-resolve its active project. No-op standalone. */
export function subscribeBrokeredIdentity(fn: () => void): () => void {
  return solid.broker.subscribeBrokeredIdentity(fn);
}

export const brokerFetch: typeof fetch = solid.broker.brokerFetch;

export function initBroker(): Promise<BrokerIdentity | null> {
  return solid.broker.initBroker();
}

export function signalReady(): void {
  solid.broker.signalReady();
}
