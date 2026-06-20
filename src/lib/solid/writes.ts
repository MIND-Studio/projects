"use client";

// The default `pod` issue-write backend: read state.ttl as the signed-in user,
// apply the same pure Turtle rewrites the git pipeline uses for its optimistic
// pod projection, and PUT it back. WAC on the project container is the only
// enforcement layer — exactly the fleet's "pod is the only store" rule. No
// server route, no git, no worker credential. The `git` backend (EmAI) instead
// POSTs to /api/issues; data.ts dispatches on profile.writes.

import { authedFetch } from "./auth";
import { paths } from "./config";
import {
  rewriteIssue, rewriteIssueState, appendIssue, emptyState,
  parseState, parseEpics, setEpicStartDate,
  type IssueState, type IssuePatch,
} from "./turtle";

async function loadState(): Promise<{ url: string; ttl: string }> {
  const url = paths.trackerState;
  const r = await authedFetch()(url, { headers: { accept: "text/turtle" } });
  if (r.ok) return { url, ttl: await r.text() };
  if (r.status === 404) return { url, ttl: emptyState() };
  throw Object.assign(new Error(`GET ${url} → ${r.status}`), { status: r.status });
}

async function putState(url: string, ttl: string): Promise<void> {
  const w = await authedFetch()(url, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: ttl,
  });
  if (!w.ok) throw Object.assign(new Error(`PUT ${url} → ${w.status}`), { status: w.status });
}

export async function podMoveIssue(issueId: string, state: IssueState): Promise<void> {
  const { url, ttl } = await loadState();
  await putState(url, rewriteIssueState(ttl, issueId, state));
  // First task of a milestone entering "in progress" stamps the milestone's
  // start date, so the timeline shows it activating the moment work begins.
  if (state === "in-progress") await maybeStartEpic(ttl, issueId);
}

/** If the moved issue belongs to a milestone that has no start date yet, set it
    to today in epics.ttl. Best-effort: silently skips if there's no epics doc or
    the milestone is already started/scheduled. */
async function maybeStartEpic(stateTtl: string, issueId: string): Promise<void> {
  const epicId = parseState(stateTtl).find((i) => i.id === issueId)?.epic;
  if (!epicId) return;
  const eUrl = paths.trackerEpics;
  const r = await authedFetch()(eUrl, { headers: { accept: "text/turtle" } });
  if (!r.ok) return;
  const ttl = await r.text();
  const epic = parseEpics(ttl).find((e) => e.id === epicId);
  if (!epic || epic.startDate) return; // already started/scheduled
  const today = new Date().toISOString().slice(0, 10);
  const next = setEpicStartDate(ttl, epicId, today);
  if (next !== ttl) await putState(eUrl, next);
}

export async function podUpdateIssue(issueId: string, patch: IssuePatch): Promise<void> {
  const { url, ttl } = await loadState();
  await putState(url, rewriteIssue(ttl, issueId, patch));
}

export async function podCreateIssue(input: {
  title: string;
  state: IssueState;
  epic: string | null;
  due: string | null;
  assignee: string | null;
  description?: string;
}): Promise<string> {
  const { url, ttl } = await loadState();
  // Pod backend has no git folder; mint a client-side id (rendered as MC-NNNN).
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `i${Date.now().toString(36)}`;
  const { ttl: next } = appendIssue(ttl, { ...input, id, gitPath: null });
  await putState(url, next);
  return id;
}
