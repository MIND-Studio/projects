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
