// Commit-back (docs/PRD-git-issues.md, Phase 2). A Board/Kai action becomes an
// append-only event (and, on create, an issue.md) committed to the kai-issues git
// repo AS THE SIGNED-IN USER, then an OPTIMISTIC in-place rewrite of the pod's
// state.ttl so the Board reflects it before the next forward sync. Git is the
// source of truth; the sync regenerates state.ttl authoritatively and self-heals
// any optimistic drift (e.g. the provisional mc:number on create).
//
// Shared by the /api/issues route (human actions) and kai.ts (agent actions).

import { randomBytes } from "node:crypto";
import { projectRoot } from "../solid/config";
import { workerFor } from "./worker";
import { commitToRepo, gitConfigured, type CommitAuthor, type CommitFile } from "./git";
import {
  parseState, rewriteIssue, rewriteIssueState, appendIssue,
  type IssueState, type IssuePatch,
} from "../solid/turtle";

export type Actor = { webId: string; username: string; name: string; actorKind?: "human" | "agent" };

export type IssueAction =
  | { action: "move"; issue: string; to: IssueState; comment?: string }
  | {
      action: "create";
      title: string;
      state?: IssueState;
      epic?: string | null;
      due?: string | null;
      assignee?: string | null;
      description?: string;
    }
  | { action: "edit"; issue: string; patch: IssuePatch };

const ISSUES_BASE = (projectId: string) => `${projectId}/.mind/issues`;

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "issue";

/** YYYY-MM-DD-HHMM (sortable event-file prefix). */
function stamp(d = new Date()): { ymd: string; hhmm: string; iso: string } {
  const iso = d.toISOString();
  return { ymd: iso.slice(0, 10), hhmm: iso.slice(11, 13) + iso.slice(14, 16), iso };
}

// Minimal YAML frontmatter (issue.md / event.md are flat scalar maps + a body).
function parseFrontmatter(text: string): { fm: Record<string, string>; body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: text };
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return { fm, body: m[2] };
}

const yamlVal = (v: string) =>
  /^[\w@:./+-]+$/.test(v) && !/^\d{4}-\d{2}-\d{2}/.test(v) ? v : JSON.stringify(v);

function buildDoc(fm: Record<string, string | null | undefined>, body = ""): string {
  let out = "---\n";
  for (const [k, v] of Object.entries(fm)) if (v != null && v !== "") out += `${k}: ${yamlVal(String(v))}\n`;
  out += "---\n";
  if (body.trim()) out += "\n" + body.trim() + "\n";
  return out;
}

const stateKind = (to: IssueState) => (to === "done" || to === "cancelled" ? "close" : "state");

// Commit to git when configured; otherwise (local dev / no remote) skip and let
// the optimistic pod write stand alone. `build` stages the files (and may read
// existing ones) inside a single ephemeral clone. Returns whether a commit
// actually landed (false when unconfigured or nothing was staged).
const GIT_SKIPPED = " — Git nicht konfiguriert, nur Pod";
async function commit(
  message: string,
  author: CommitAuthor,
  build: Parameters<typeof commitToRepo>[2],
): Promise<boolean> {
  if (!gitConfigured()) return false;
  return (await commitToRepo(message, author, build)) !== null;
}

/** The pod's state.ttl for a project, read as the project worker. */
async function loadState(projectId: string) {
  const url = `${projectRoot(projectId)}tracker/state.ttl`;
  const k = workerFor(projectId);
  return { url, k, issues: parseState(await k.getText(url)) };
}

/** Apply one issue action: commit to git as the actor, then optimistic pod write. */
export async function applyIssueAction(
  projectId: string,
  actor: Actor,
  a: IssueAction,
): Promise<{ id: string; message: string }> {
  const base = ISSUES_BASE(projectId);
  const author = { name: actor.name || actor.username, email: `${actor.username}@kai.emai.dev` };
  const actorKind = actor.actorKind ?? "human";
  const { ymd, hhmm, iso } = stamp();

  if (a.action === "move") {
    const { url, k, issues } = await loadState(projectId);
    const issue = issues.find((i) => i.id === a.issue);
    if (!issue) throw Object.assign(new Error(`issue ${a.issue} not found`), { status: 404 });
    if (!issue.gitPath) throw Object.assign(new Error(`${a.issue} has no ekai:gitPath`), { status: 409 });
    const kind = stateKind(a.to);
    const ev = buildDoc(
      { id: `${a.issue}-${ymd}-${hhmm}`, kind, actor: actor.webId, actorKind, at: iso, from: issue.state, to: a.to },
      a.comment ?? "",
    );
    const committed = await commit(`${kind}: ${issue.handle} → ${a.to}`, author, (tx) =>
      tx.stage([
        { path: `${base}/${issue.gitPath}/events/${ymd}-${hhmm}-${actor.username}-${kind}.md`, content: ev },
      ]),
    );
    await k.put(url, rewriteIssueState(await k.getText(url), a.issue, a.to), "text/turtle");
    return { id: a.issue, message: `${issue.handle} → ${a.to}${committed ? "" : GIT_SKIPPED}` };
  }

  if (a.action === "create") {
    const { url, k, issues } = await loadState(projectId);
    const next = Math.max(0, ...issues.map((i) => i.number)) + 1; // provisional; sync assigns canonical
    const id = `TASK-${String(next).padStart(3, "0")}`;
    const state = a.state ?? "todo";
    const folder = `00_general_issues/${Math.floor(Date.now() / 1000)}_${randomBytes(2).toString("hex")}`;
    const issueMd = buildDoc(
      {
        id, slug: slugify(a.title), type: "general", title: a.title,
        author: actor.webId, created: ymd, epic: a.epic ?? undefined,
        due: a.due ?? undefined,
      },
      a.description ?? "",
    );
    const openEv = buildDoc(
      { id: `${id}-open`, kind: "open", actor: actor.webId, actorKind, at: iso, to: state },
      "Angelegt über den Hub.",
    );
    const files: CommitFile[] = [
      { path: `${base}/${folder}/issue.md`, content: issueMd },
      { path: `${base}/${folder}/events/${ymd}-${hhmm}-${actor.username}-open.md`, content: openEv },
    ];
    if (a.assignee) {
      files.push({
        path: `${base}/${folder}/events/${ymd}-${hhmm}-${actor.username}-claim.md`,
        content: buildDoc({ id: `${id}-claim`, kind: "claim", actor: a.assignee, actorKind: "human", at: iso }, ""),
      });
    }
    const committed = await commit(`open: ${id} — ${a.title}`, author, (tx) => tx.stage(files));
    const { ttl } = appendIssue(await k.getText(url), {
      id, title: a.title, state, epic: a.epic ?? null, due: a.due ?? null, assignee: a.assignee ?? null, gitPath: folder, description: a.description,
    });
    await k.put(url, ttl, "text/turtle");
    return { id, message: `${id} angelegt${committed ? "" : GIT_SKIPPED}` };
  }

  // edit: scalar fields → PATCH issue.md frontmatter/body; state → state event;
  // assignee → claim/release event. All in one commit, then optimistic rewrite.
  const { url, k, issues } = await loadState(projectId);
  const issue = issues.find((i) => i.id === a.issue);
  if (!issue) throw Object.assign(new Error(`issue ${a.issue} not found`), { status: 404 });
  if (!issue.gitPath) throw Object.assign(new Error(`${a.issue} has no ekai:gitPath`), { status: 409 });
  const dir = `${base}/${issue.gitPath}`;
  const p = a.patch;

  // All file building happens inside the ephemeral clone: the issue.md amend
  // reads the current file; state/assignee changes append events. The optimistic
  // state.ttl rewrite below carries every field to the pod regardless of git.
  const committed = await commit(`edit: ${issue.handle}`, author, (tx) => {
    const files: CommitFile[] = [];
    // issue.md edit (immutable id/created/author preserved; mutable facts amended).
    if (["title", "due", "epic", "description"].some((k2) => k2 in p)) {
      const cur = tx.read(`${dir}/issue.md`);
      if (!cur) throw Object.assign(new Error(`${a.issue}/issue.md missing in git`), { status: 409 });
      const { fm, body } = parseFrontmatter(cur);
      if (p.title != null) fm.title = p.title;
      if ("due" in p) p.due ? (fm.due = p.due) : delete fm.due;
      if ("epic" in p) p.epic ? (fm.epic = p.epic) : delete fm.epic;
      files.push({ path: `${dir}/issue.md`, content: buildDoc(fm, p.description ?? body) });
    }
    if (p.state) {
      const kind = stateKind(p.state);
      files.push({
        path: `${dir}/events/${ymd}-${hhmm}-${actor.username}-${kind}.md`,
        content: buildDoc({ id: `${a.issue}-${ymd}-${hhmm}`, kind, actor: actor.webId, actorKind, at: iso, from: issue.state, to: p.state }, ""),
      });
    }
    if ("assignee" in p) {
      const assigning = !!p.assignee;
      files.push({
        path: `${dir}/events/${ymd}-${hhmm}-${actor.username}-${assigning ? "claim" : "release"}.md`,
        content: buildDoc({ id: `${a.issue}-${ymd}-${hhmm}-a`, kind: assigning ? "claim" : "release", actor: assigning ? p.assignee! : actor.webId, actorKind, at: iso }, ""),
      });
    }
    tx.stage(files);
  });
  await k.put(url, rewriteIssue(await k.getText(url), a.issue, p), "text/turtle");
  return { id: a.issue, message: `${issue.handle} gespeichert${committed ? "" : GIT_SKIPPED}` };
}
