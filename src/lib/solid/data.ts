"use client";

// Data accessors — every read/write goes to the pod AS THE SIGNED-IN USER.
// WAC on the project container is the only enforcement layer (PRD §6).

import { authedFetch } from "./auth";
import { paths, projectRoot, workspacePaths } from "./config";
import { profile } from "@/lib/profile";
import { podMoveIssue, podUpdateIssue, podCreateIssue } from "./writes";
import {
  parseProject, parseTracker, parseState, parseMeeting, parseContainer, parseMemberIndex,
  parseCompany, parseOrgRegistry,
  type ProjectMeta, type Tracker, type Meeting, type IssueState, type IssuePatch,
  type Role, type ProjectRef, type Issue, type Epic, type Company, type OrgInfo,
} from "./turtle";

async function getText(url: string): Promise<string> {
  const r = await authedFetch()(url, { headers: { accept: "text/turtle" } });
  if (!r.ok) throw Object.assign(new Error(`GET ${url} → ${r.status}`), { status: r.status });
  return r.text();
}

export async function loadProject(): Promise<ProjectMeta> {
  return parseProject(await getText(paths.projectTtl));
}

export function roleOf(project: ProjectMeta, webId: string | undefined): Role | null {
  if (!webId) return null;
  return project.members.find((m) => m.agent === webId)?.role ?? null;
}

// --------------------------------------------------- apex router (F4b/F4d)
// Workspace-level reads for the apex: which projects a user belongs to, and —
// for workspace owners only (WAC-gated) — every project for the company view.

const OPEN_STATES = ["todo", "in-progress", "review"];

/** The signed-in user's projects (member index). 403/404 → none. */
export async function loadMemberIndex(username: string): Promise<ProjectRef[]> {
  try {
    return parseMemberIndex(await getText(workspacePaths.memberIndex(username)));
  } catch (e) {
    if ([403, 404].includes((e as { status?: number }).status ?? 0)) return [];
    throw e;
  }
}

export type ProjectSummary = {
  projectId: string;
  meta: ProjectMeta;
  openTasks: number | null;
  doneTasks: number | null;
  totalTasks: number | null; // excludes cancelled
  overdueTasks: number | null;
  nextMeeting: Meeting | null;
};

/** Project meta + task aggregates + next meeting, read as the signed-in user
    (owners have rwc on every project via the C2 grant). Missing parts → null. */
export async function loadProjectSummary(projectId: string): Promise<ProjectSummary> {
  const root = projectRoot(projectId);
  const meta = parseProject(await getText(`${root}project.ttl`));
  let openTasks: number | null = null;
  let doneTasks: number | null = null;
  let totalTasks: number | null = null;
  let overdueTasks: number | null = null;
  let nextMeeting: Meeting | null = null;
  try {
    const issues = parseState(await getText(`${root}tracker/state.ttl`));
    const today = new Date().toISOString().slice(0, 10);
    openTasks = issues.filter((i) => OPEN_STATES.includes(i.state)).length;
    doneTasks = issues.filter((i) => i.state === "done").length;
    totalTasks = issues.filter((i) => i.state !== "cancelled").length;
    overdueTasks = issues.filter(
      (i) => OPEN_STATES.includes(i.state) && i.due && i.due < today,
    ).length;
  } catch { /* no tracker yet */ }
  try {
    const folder = `${root}meetings/`;
    const urls = parseContainer(folder, await getText(folder)).filter((u) => u.endsWith(".ttl"));
    const ms = await Promise.all(urls.map(async (u) => parseMeeting(u, await getText(u))));
    const now = new Date().toISOString().slice(0, 16);
    nextMeeting = ms.filter((m) => m.start >= now).sort((a, b) => a.start.localeCompare(b.start))[0] ?? null;
  } catch { /* no meetings */ }
  return { projectId, meta, openTasks, doneTasks, totalTasks, overdueTasks, nextMeeting };
}

/** Every project under /emai/projects/ — the owner company view. Enumerating the
    container requires workspace-owner WAC, so a non-owner throws (403) → the
    caller treats that as "not an owner". */
export async function loadAllProjects(): Promise<ProjectSummary[]> {
  const listing = await getText(workspacePaths.projects);
  const ids = parseContainer(workspacePaths.projects, listing)
    .filter((u) => u.endsWith("/"))
    .map((u) => u.replace(/\/$/, "").split("/").pop()!)
    .filter(Boolean);
  const summaries = await Promise.all(ids.map((id) => loadProjectSummary(id).catch(() => null)));
  return summaries.filter((s): s is ProjectSummary => s !== null);
}

// --------------------------------------------------- Workspace hub (company view)
// Owners-only aggregation across all projects, read as the signed-in owner (C2
// grants rwc everywhere). All reads degrade gracefully: a missing/forbidden part
// becomes empty/null rather than throwing, so the hub renders what it can.

type ProjectRefLite = { projectId: string; title: string };

/** The owners-only company surface (company/company.ttl). 403/404 → null. */
export async function loadCompany(): Promise<Company | null> {
  try {
    return parseCompany(await getText(workspacePaths.company));
  } catch (e) {
    if ([403, 404].includes((e as { status?: number }).status ?? 0)) return null;
    throw e;
  }
}

/** The partner-org registry (company/orgs.ttl). Missing → []. */
export async function loadOrgRegistry(): Promise<OrgInfo[]> {
  try {
    return parseOrgRegistry(await getText(workspacePaths.companyOrgs));
  } catch (e) {
    if ([403, 404].includes((e as { status?: number }).status ?? 0)) return [];
    throw e;
  }
}

export type ProjectBoard = {
  projectId: string;
  title: string;
  issues: Issue[];
  epics: Epic[];
};

/** Every project's tracker, grouped by project — the cross-project board. */
export async function loadWorkspaceBoard(projects: ProjectRefLite[]): Promise<ProjectBoard[]> {
  return Promise.all(
    projects.map(async ({ projectId, title }) => {
      const root = projectRoot(projectId);
      const [vocab, state, epics] = await Promise.all([
        getText(`${root}tracker/tracker.ttl`).catch(() => ""),
        getText(`${root}tracker/state.ttl`).catch(() => ""),
        getText(`${root}tracker/epics.ttl`).catch(() => ""),
      ]);
      const tracker = parseTracker({ vocab, state, epics });
      return { projectId, title, issues: tracker.issues, epics: tracker.epics };
    }),
  );
}

export type WorkspaceMeeting = Meeting & { projectId: string; projectTitle: string };

/** Every project's meetings merged onto one timeline (sorted by start). */
export async function loadWorkspaceMeetings(projects: ProjectRefLite[]): Promise<WorkspaceMeeting[]> {
  const perProject = await Promise.all(
    projects.map(async ({ projectId, title }) => {
      const folder = `${projectRoot(projectId)}meetings/`;
      try {
        const urls = parseContainer(folder, await getText(folder)).filter((u) => u.endsWith(".ttl"));
        return await Promise.all(
          urls.map(async (u) => ({
            ...parseMeeting(u, await getText(u)),
            projectId,
            projectTitle: title,
          })),
        );
      } catch {
        return [];
      }
    }),
  );
  return perProject.flat().sort((a, b) => a.start.localeCompare(b.start));
}

export type ProjectBriefings = {
  projectId: string;
  title: string;
  latest: Briefing | null;
  drafts: Briefing[];
};

/** Latest published briefing + pending drafts per project (the approval inbox). */
export async function loadWorkspaceBriefings(projects: ProjectRefLite[]): Promise<ProjectBriefings[]> {
  return Promise.all(
    projects.map(async ({ projectId, title }) => {
      const root = projectRoot(projectId);
      const published = await loadBriefingFolder(`${root}briefings/`).catch(() => []);
      const drafts = await loadBriefingFolder(`${root}briefings/drafts/`).catch(() => []);
      return { projectId, title, latest: published[0] ?? null, drafts };
    }),
  );
}

export async function loadTracker(): Promise<Tracker> {
  // The tracker is three co-located native docs; missing parts (e.g. a fresh
  // project with no issues yet) read as empty rather than throwing.
  const [vocab, state, epics] = await Promise.all([
    getText(paths.trackerVocab).catch(() => ""),
    getText(paths.trackerState).catch(() => ""),
    getText(paths.trackerEpics).catch(() => ""),
  ]);
  return parseTracker({ vocab, state, epics });
}

// Writes go through the server route /api/issues (Phase 2): it appends an event
// to the kai-issues git repo AS THE SIGNED-IN USER (only the server holds the
// GitHub PAT) and optimistically rewrites state.ttl so the Board updates before
// the next forward sync. The signed-in user's access token is forwarded so the
// route can establish the actor; the next sync from git is authoritative.
async function postIssueAction<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const r = await authedFetch()("/api/issues", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await r.json().catch(() => ({}))) as { error?: string } & T;
  if (!r.ok) throw Object.assign(new Error(data.error ?? `issues → ${r.status}`), { status: r.status });
  return data;
}

export async function moveIssue(issueId: string, state: IssueState): Promise<void> {
  if (profile.writes === "pod") return podMoveIssue(issueId, state);
  await postIssueAction({ action: "move", issue: issueId, to: state });
}

export async function updateIssue(issueId: string, patch: IssuePatch): Promise<void> {
  if (profile.writes === "pod") return podUpdateIssue(issueId, patch);
  await postIssueAction({ action: "edit", issue: issueId, patch });
}

export async function createIssue(input: {
  title: string;
  state: IssueState;
  epic: string | null;
  due: string | null;
  assignee: string | null;
  description?: string;
}): Promise<string> {
  if (profile.writes === "pod") return podCreateIssue(input);
  const { id } = await postIssueAction<{ id: string }>({ action: "create", ...input });
  return id;
}

export async function loadMeetings(): Promise<Meeting[]> {
  const listing = await getText(paths.meetings);
  const urls = parseContainer(paths.meetings, listing).filter((u) => u.endsWith(".ttl"));
  const meetings = await Promise.all(
    urls.map(async (u) => parseMeeting(u, await getText(u))),
  );
  meetings.sort((a, b) => a.start.localeCompare(b.start));
  return meetings;
}

// ----------------------------------------------------------------- chat (F1)

export type ChatMsg = { author: "user" | "kai"; text: string; at: number };

export async function loadChat(username: string): Promise<ChatMsg[]> {
  const folder = paths.chat(username);
  let listing: string;
  try {
    listing = await getText(folder);
  } catch (e) {
    if ((e as { status?: number }).status === 404) return [];
    throw e;
  }
  const urls = parseContainer(folder, listing).filter((u) => u.endsWith(".md")).sort();
  return Promise.all(
    urls.map(async (u) => {
      const name = u.split("/").pop()!;
      return {
        author: name.includes("-kai.md") ? ("kai" as const) : ("user" as const),
        text: await getText(u),
        at: parseInt(name.split("-")[0], 10) || 0,
      };
    }),
  );
}

/**
 * Send a message: write it into the user's chat folder AS THE USER (WAC is the
 * identity proof), then ask Kai (server-side) to answer the conversation.
 */
export async function sendChat(username: string, text: string): Promise<string> {
  const folder = paths.chat(username);
  const url = `${folder}${Date.now()}-user.md`;
  const w = await authedFetch()(url, {
    method: "PUT",
    headers: { "content-type": "text/markdown" },
    body: text,
  });
  if (!w.ok) throw Object.assign(new Error(`PUT message → ${w.status}`), { status: w.status });

  const r = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ conversation: folder }),
  });
  const data = (await r.json()) as { reply?: string; error?: string };
  if (!r.ok) throw new Error(data.error ?? `Kai → ${r.status}`);
  return data.reply ?? "";
}

// ------------------------------------------------------------- briefings (F5)

export type Briefing = { url: string; name: string; date: string; text: string };

async function loadBriefingFolder(folder: string): Promise<Briefing[]> {
  const listing = await getText(folder);
  const urls = parseContainer(folder, listing).filter((u) => u.endsWith(".md"));
  const briefings = await Promise.all(
    urls.map(async (u) => {
      const name = u.split("/").pop()!;
      return {
        url: u,
        name,
        date: name.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? "",
        text: await getText(u),
      };
    }),
  );
  briefings.sort((a, b) => b.date.localeCompare(a.date));
  return briefings;
}

export function loadBriefings(): Promise<Briefing[]> {
  return loadBriefingFolder(paths.briefings);
}

/** Drafts — owner-gated by WAC; everyone else gets null. */
export async function loadBriefingDrafts(): Promise<Briefing[] | null> {
  try {
    return await loadBriefingFolder(paths.briefingDrafts);
  } catch (e) {
    if ([403, 404].includes((e as { status?: number }).status ?? 0)) return null;
    throw e;
  }
}

/** Publish = copy the draft into briefings/ and delete it from drafts/ (owner). */
export async function publishBriefing(draft: Briefing): Promise<void> {
  const target = `${paths.briefings}${draft.name}`;
  const w = await authedFetch()(target, {
    method: "PUT",
    headers: { "content-type": "text/markdown" },
    body: draft.text,
  });
  if (!w.ok) throw Object.assign(new Error(`PUT ${target} → ${w.status}`), { status: w.status });
  await authedFetch()(draft.url, { method: "DELETE" });
}

// Unread state — client-side per user+browser (v1; see MODEL.md).
const readKey = (username: string) => `kai-briefings-read:${username}`;

export function readBriefingState(username: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(readKey(username)) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

export function markBriefingRead(username: string, name: string): void {
  const s = readBriefingState(username);
  s.add(name);
  localStorage.setItem(readKey(username), JSON.stringify([...s]));
}

export async function loadKnowledge(): Promise<{ url: string; name: string; text: string }[]> {
  const listing = await getText(paths.knowledge);
  const urls = parseContainer(paths.knowledge, listing).filter((u) => u.endsWith(".md"));
  return Promise.all(
    urls.map(async (u) => ({
      url: u,
      name: u.split("/").pop()!,
      text: await getText(u),
    })),
  );
}
