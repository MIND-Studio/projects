// Per-project Kai worker credentials (multi-tenant). One hub process serves
// every project subdomain, but each project has its OWN worker WebID scoped to
// only its container (G2 isolation). The project is resolved from the trusted
// request `Host`, NEVER from user input, so a prompt can't cross projects.
//
// Credential sources, in order:
//   1. KAI_WORKERS — JSON map { "<projectId>": { "id": "...", "secret": "..." } }
//      (multi-tenant deployment; one secret mounted, holds every project's creds)
//   2. legacy KAI_CLIENT_ID / KAI_CLIENT_SECRET — the single-project deployment
//      (keeps the current env-based hub working until the chart switches to the map)
//
// NOTE (RCE blast radius, PRD §10): the map holds all workers' secrets in one
// process. Acceptable for the trusted multi-tenant hub; a high-sensitivity
// project should run its own dedicated deployment (legacy single-secret path).

import { WorkerClient } from "./solid-node";
import { ISSUER } from "../solid/config";

const cache = new Map<string, WorkerClient>();

function credsFor(projectId: string): { id: string; secret: string } {
  const raw = process.env.KAI_WORKERS;
  if (raw) {
    let map: Record<string, { id: string; secret: string }> | null = null;
    try {
      map = JSON.parse(raw) as Record<string, { id: string; secret: string }>;
    } catch {
      /* malformed map → fall through to the legacy single-secret path */
    }
    if (map) {
      // A WELL-FORMED map is authoritative: serve only its projects. If the
      // resolved project is absent, FAIL CLOSED — never borrow another
      // project's (e.g. the default's) worker, which would let an unknown or
      // misconfigured subdomain answer as someone else's Kai. (Only a malformed
      // map falls through to the single-secret legacy path below.)
      const c = map[projectId];
      if (c?.id && c?.secret) return { id: c.id, secret: c.secret };
      throw Object.assign(
        new Error(`No Kai worker in KAI_WORKERS for project "${projectId}"`),
        { status: 404 },
      );
    }
  }
  const id = process.env.KAI_CLIENT_ID;
  const secret = process.env.KAI_CLIENT_SECRET;
  if (id && secret) return { id, secret };
  throw Object.assign(
    new Error(`Kai worker credentials not configured for project "${projectId}"`),
    { status: 500 },
  );
}

/** The Kai worker for a project (cached per project for the process lifetime). */
export function workerFor(projectId: string): WorkerClient {
  let w = cache.get(projectId);
  if (!w) {
    w = new WorkerClient(ISSUER, credsFor(projectId));
    cache.set(projectId, w);
  }
  return w;
}
