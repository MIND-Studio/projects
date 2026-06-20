// Kai — the project worker behind /api/chat (PRD F1).
//
// Kai authenticates with its own WebID (client credentials) and holds a
// member-level WAC grant on the project container ONLY (G4): everything it
// can read or write lives under /projects/<id>/.
//
// Identity of the human speaker is structural, not claimed: the browser writes
// the user message into chat/<username>/ AS THE USER (WAC lets only that user
// write there), then asks Kai to answer the conversation. Kai derives the
// speaker — and their role — from the folder it was pointed at.

import { ISSUER, projectRoot } from "../solid/config";
import {
  type IssueState,
  type ProjectMeta,
  parseContainer,
  parseMeeting,
  parseProject,
  parseTracker,
  type Role,
  STATES,
} from "../solid/turtle";
import { type Actor, applyIssueAction } from "./commitback";
import { workerFor } from "./worker";

const LLM_MODEL = process.env.KAI_LLM_MODEL; // optional override; node enforces allowlist

export type ChatMessage = { author: "user" | "kai"; text: string; at: string };

// ---------------------------------------------------------------- grounding

async function grounding(projectId: string): Promise<{ project: ProjectMeta; context: string }> {
  const PROJECT = projectRoot(projectId);
  const k = workerFor(projectId);
  const project = parseProject(await k.getText(`${PROJECT}project.ttl`));
  const [vocab, state, epics] = await Promise.all([
    k.getText(`${PROJECT}tracker/tracker.ttl`).catch(() => ""),
    k.getText(`${PROJECT}tracker/state.ttl`).catch(() => ""),
    k.getText(`${PROJECT}tracker/epics.ttl`).catch(() => ""),
  ]);
  const tracker = parseTracker({ vocab, state, epics });

  const names = new Map(project.members.map((m) => [m.agent, m.name ?? m.agent]));
  const issueLine = (i: (typeof tracker.issues)[number]) =>
    `- ${i.id} [${i.state}]${i.epic ? ` (${i.epic})` : ""} ${i.title}` +
    `${i.assignee ? ` — ${names.get(i.assignee) ?? "?"}` : i.ownerName ? ` — ${i.ownerName}` : ""}` +
    `${i.due ? `, fällig ${i.due}` : ""}`;

  const open = tracker.issues.filter((i) => !["done", "cancelled"].includes(i.state));
  const done = tracker.issues.filter((i) => i.state === "done");

  // meetings
  const listing = await k.getText(`${PROJECT}meetings/`);
  const urls = parseContainer(`${PROJECT}meetings/`, listing).filter((u) => u.endsWith(".ttl"));
  const meetings = await Promise.all(urls.map(async (u) => parseMeeting(u, await k.getText(u))));
  meetings.sort((a, b) => a.start.localeCompare(b.start));
  const meetingLine = (m: (typeof meetings)[number]) =>
    `- ${m.id}: ${m.title} — ${m.start}${m.location ? `, ${m.location}` : ""} [${m.status}]`;

  // knowledge
  const kListing = await k.getText(`${PROJECT}knowledge/`);
  const kUrls = parseContainer(`${PROJECT}knowledge/`, kListing).filter((u) => u.endsWith(".md"));
  const knowledge = (await Promise.all(kUrls.map(async (u) => await k.getText(u)))).join(
    "\n\n---\n\n",
  );

  const today = new Date().toISOString().slice(0, 10);
  const context = [
    `Heute ist ${today}.`,
    `\n## Projekt\n${project.title} (${project.startDate} bis ${project.endDate}, Status ${project.status})`,
    `\n## Offene Aufgaben (Tracker, live)\n${open.map(issueLine).join("\n") || "keine"}`,
    `\n## Erledigte Aufgaben\n${done.map(issueLine).join("\n") || "keine"}`,
    `\n## Termine\n${meetings.map(meetingLine).join("\n") || "keine"}`,
    `\n## Projektwissen\n${knowledge}`,
  ].join("\n");

  return { project, context };
}

// ---------------------------------------------------------------- the LLM

async function complete(projectId: string, system: string, prompt: string): Promise<string> {
  // DEV ONLY: deterministic stand-in so the action/refusal paths are testable
  // without a real model (the node's echo broker can't emit <action> blocks).
  if (process.env.KAI_DEV_FAKE_LLM === "1") {
    const m = prompt.match(/!move (\S+) (\S+)/);
    if (m) return `Mache ich.\n<action>{"type":"move","task":"${m[1]}","state":"${m[2]}"}</action>`;
    return `[dev-fake] system ${system.length} Zeichen, Frage: ${prompt.split("\n").pop()}`;
  }
  const k = workerFor(projectId);
  const LLM_SCRIPT = `${projectRoot(projectId)}scripts/llm.js`;
  const body: Record<string, unknown> = { prompt, system, max_tokens: 1024 };
  if (LLM_MODEL) body.model = LLM_MODEL;
  // the broker maps every upstream failure (incl. provider 429s) to
  // "unavailable" — those are usually transient, so retry once before failing
  let r!: Response,
    text = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    r = await k.fetch(
      "POST",
      `${ISSUER.replace(/\/$/, "")}/.scripts/run?script=${encodeURIComponent(LLM_SCRIPT)}`,
      {
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    text = await r.text();
    if (r.ok) return text;
    const transient = r.status >= 500 || (r.status === 422 && text.includes("unavailable"));
    if (!transient || attempt > 0) break;
    await new Promise((res) => setTimeout(res, 2000));
  }
  throw Object.assign(new Error(`Pod.llm → ${r.status}: ${text.slice(0, 200)}`), {
    status: r.status,
  });
}

// ---------------------------------------------------------------- actions

type Action =
  | { type: "move"; task: string; state: IssueState }
  | { type: "create"; title: string; epic?: string | null; due?: string | null };

function extractActions(reply: string): { clean: string; actions: Action[] } {
  const actions: Action[] = [];
  const clean = reply
    .replace(/<action>([\s\S]*?)<\/action>/g, (_, json: string) => {
      try {
        const a = JSON.parse(json.trim()) as Action;
        if (a.type === "move" && STATES.includes(a.state)) actions.push(a);
        if (a.type === "create" && a.title) actions.push(a);
      } catch {
        /* malformed action — drop silently, text remains */
      }
      return "";
    })
    .trim();
  return { clean, actions };
}

// Kai-initiated changes go through the SAME commit-back path as human Board
// actions — appended to git authored as the human who asked (actorKind: agent
// records that Kai executed it), then optimistically reflected in state.ttl.
async function applyActions(projectId: string, actor: Actor, actions: Action[]): Promise<string[]> {
  const results: string[] = [];
  for (const a of actions) {
    try {
      const r =
        a.type === "move"
          ? await applyIssueAction(projectId, actor, { action: "move", issue: a.task, to: a.state })
          : await applyIssueAction(projectId, actor, {
              action: "create",
              title: a.title,
              epic: a.epic ?? null,
              due: a.due ?? null,
              state: "todo",
            });
      results.push(`✓ ${r.message}`);
    } catch (e) {
      results.push(`✗ Aktion fehlgeschlagen (${a.type}): ${(e as Error).message}`);
    }
  }
  return results;
}

// ---------------------------------------------------------------- chat

const ROLE_RULES: Record<Role, string> = {
  Owner: "Der Nutzer ist Owner (EmAI). Du darfst auf Bitte Aufgaben anlegen und verschieben.",
  Member:
    "Der Nutzer ist aktives Projektmitglied. Du darfst auf Bitte Aufgaben anlegen und verschieben.",
  Guest:
    "Der Nutzer ist informierter Partner mit LESENDEM Zugang. Du beantwortest Fragen, " +
    "führst aber NIEMALS Änderungen aus — auch nicht auf Bitte. Erkläre stattdessen " +
    "freundlich, dass Änderungen über das EmAI-Team laufen. Gib keine <action>-Blöcke aus.",
};

const ACTION_PROTOCOL = `
Wenn (und nur wenn) der Nutzer eine Änderung wünscht und sie erlaubt ist, häng an deine
Antwort einen Aktionsblock an, exakt in dieser Form (JSON, eine Aktion pro Block):
<action>{"type":"move","task":"TASK-019","state":"review"}</action>
<action>{"type":"create","title":"…","epic":"AP2","due":"2026-07-01"}</action>
Gültige Status: backlog, todo, in-progress, review, done. Erfinde keine Task-IDs.`;

export async function answerConversation(
  conversationUrl: string,
  projectId: string,
): Promise<{ reply: string }> {
  // Isolation boundary: the project is resolved from the trusted request Host
  // (passed as projectId), and the conversation MUST be inside THAT project's
  // chat/ scope. A client on project B cannot make Kai touch project A — the
  // worker is project B's and this guard rejects a foreign conversation URL.
  const PROJECT = projectRoot(projectId);
  if (!conversationUrl.startsWith(`${PROJECT}chat/`) || conversationUrl.includes(".."))
    throw Object.assign(new Error("conversation outside project scope"), { status: 400 });
  const username = conversationUrl.slice(`${PROJECT}chat/`.length).replace(/\/.*$/, "");
  const folder = `${PROJECT}chat/${username}/`;

  const k = workerFor(projectId);
  const { project, context } = await grounding(projectId);

  const member = project.members.find((m) => m.agent.includes(`/${username}/`));
  if (!member)
    throw Object.assign(new Error(`${username} ist kein Projektmitglied`), { status: 403 });
  const role = member.role;

  // conversation history (messages are <ts>-<author>.md, lexicographic = chronological)
  const listing = await k.getText(folder);
  const msgUrls = parseContainer(folder, listing)
    .filter((u) => u.endsWith(".md"))
    .sort();
  const history: ChatMessage[] = await Promise.all(
    msgUrls.slice(-20).map(async (u) => {
      const name = u.split("/").pop()!;
      const author = name.includes("-kai.md") ? ("kai" as const) : ("user" as const);
      return { author, text: await k.getText(u), at: name.split("-")[0] };
    }),
  );
  const last = history[history.length - 1];
  if (!last || last.author !== "user")
    throw Object.assign(new Error("keine neue Nutzernachricht"), { status: 409 });

  const soul = await k.getText(`${PROJECT}knowledge/kai-soul.md`).catch(() => "");
  const system = [
    soul,
    `\n${ROLE_RULES[role]}`,
    role === "Guest" ? "" : ACTION_PROTOCOL,
    `\nDer Nutzer heißt ${member.name ?? username} (${member.org ?? "?"}).`,
    `\n# Projektdaten (live aus dem Pod)\n${context}`,
  ].join("\n");

  const transcript = history
    .map((m) => `${m.author === "kai" ? "Kai" : (member.name ?? username)}: ${m.text}`)
    .join("\n\n");

  const raw = await complete(projectId, system, transcript);
  const { clean, actions } = extractActions(raw);

  // structural guard: guests' actions are never executed, whatever the model says
  const actor: Actor = {
    webId: member.agent,
    username,
    name: member.name ?? username,
    actorKind: "agent",
  };
  const results = role === "Guest" ? [] : await applyActions(projectId, actor, actions);
  const reply = [clean, ...results].filter(Boolean).join("\n\n");

  await k.put(`${folder}${Date.now()}-kai.md`, reply, "text/markdown");
  return { reply };
}
