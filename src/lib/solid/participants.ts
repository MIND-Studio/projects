"use client";

// Participant management (owner-only by WAC) — add/remove members and change
// roles by rewriting project.ttl, then recompile the role→WAC ACLs exactly
// like workspace/compile-acl.mjs does (rules from MODEL.md). The owner's own
// session has acl:Control on the project container, so the .acl writes are
// authorized structurally; non-owners simply get 403s.

import { authedFetch, usernameOf } from "./auth";
import { ISSUER, paths, projectRoot } from "./config";
import { type Membership, type ProjectMeta, parseProject, type Role } from "./turtle";

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

async function getText(url: string): Promise<string> {
  const r = await authedFetch()(url, { headers: { accept: "text/turtle" } });
  if (!r.ok) throw Object.assign(new Error(`GET ${url} → ${r.status}`), { status: r.status });
  return r.text();
}

async function put(url: string, body: string): Promise<void> {
  const r = await authedFetch()(url, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body,
  });
  if (!r.ok && r.status !== 205)
    throw Object.assign(new Error(`PUT ${url} → ${r.status}`), { status: r.status });
}

/** WebID for a username on this issuer (the deployment's account model). */
export function webIdFor(username: string): string {
  return `${ISSUER.replace(/\/$/, "")}/${username}/profile/card#me`;
}

// ------------------------------------------------------- project.ttl rewrite

/** Append `ws:membership <#m-user>` to the <#it> block + the membership block. */
function addMembershipBlock(
  ttl: string,
  m: {
    username: string;
    webId: string;
    name: string;
    org: string;
    role: Role;
  },
): string {
  const id = `m-${slug(m.username)}`;
  if (ttl.includes(`<#${id}>`)) throw new Error(`${m.username} ist bereits Mitglied`);
  // the <#it> block ends with the last membership ref + " ." — extend the list
  const refRe = /(ws:membership <#m-[\w-]+>)(\s*\.)/;
  if (!refRe.test(ttl)) throw new Error("project.ttl: Membership-Liste nicht gefunden");
  let out = ttl.replace(refRe, `$1 ;\n    ws:membership <#${id}>$2`);
  out = out.trimEnd() + "\n\n";
  out += `<#${id}> a ws:Membership ;\n`;
  out += `    ws:agent <${m.webId}> ;\n`;
  out += `    ws:role ws:${m.role} ;\n`;
  out += `    ws:name "${esc(m.name)}" ;\n`;
  out += `    ws:org "${esc(m.org)}" .\n`;
  return out;
}

/** Drop a membership: the ws:membership ref in <#it> and the <#m-…> block. */
function removeMembershipBlock(ttl: string, webId: string): string {
  // find the block id owning this agent
  const block = ttl
    .split(/\n(?=<#)/)
    .find((b) => /a ws:Membership\b/.test(b) && b.includes(`<${webId}>`));
  if (!block) throw new Error("Mitgliedschaft nicht gefunden");
  const id = block.match(/^<#([\w-]+)>/)?.[1];
  if (!id) throw new Error("Membership-Block nicht lesbar");

  // 1. remove the ref from the <#it> list, fixing `;`/`.` punctuation
  let out = ttl;
  if (new RegExp(`ws:membership <#${id}>\\s*\\.`).test(out)) {
    // it's the last entry — the previous line's `;` must become `.`
    out = out.replace(new RegExp(`\\s*;\\s*\\n\\s*ws:membership <#${id}>(\\s*\\.)`), "$1");
  } else {
    out = out.replace(new RegExp(`\\n\\s*ws:membership <#${id}>\\s*;`), "");
  }
  // 2. remove the block itself
  out = out
    .split(/\n(?=<#)/)
    .filter((b) => !b.startsWith(`<#${id}>`))
    .join("\n");
  return out;
}

function changeRoleBlock(ttl: string, webId: string, role: Role): string {
  const blocks = ttl.split(/\n(?=<#)/);
  const idx = blocks.findIndex((b) => /a ws:Membership\b/.test(b) && b.includes(`<${webId}>`));
  if (idx === -1) throw new Error("Mitgliedschaft nicht gefunden");
  blocks[idx] = blocks[idx].replace(/ws:role ws:\w+/, `ws:role ws:${role}`);
  return blocks.join("\n");
}

// ------------------------------------------------------------- ACL compile

function renderAcl(resourceUrl: string, entries: { agent: string; modes: string }[]): string {
  const MODES: Record<string, string> = { r: "acl:Read", w: "acl:Write", c: "acl:Control" };
  let out = `@prefix acl: <http://www.w3.org/ns/auth/acl#> .\n\n`;
  entries.forEach((e, n) => {
    out += `<#auth${n}> a acl:Authorization ;\n`;
    out += `    acl:agent <${e.agent}> ;\n`;
    out += `    acl:accessTo <${resourceUrl}> ;\n`;
    out += `    acl:default <${resourceUrl}> ;\n`;
    out += `    acl:mode ${[...e.modes].map((m) => MODES[m]).join(", ")} .\n\n`;
  });
  return out;
}

function dedupe(entries: { agent: string; modes: string }[]) {
  const best = new Map<string, { agent: string; modes: string }>();
  for (const e of entries) {
    const prev = best.get(e.agent);
    if (!prev || e.modes.length > prev.modes.length) best.set(e.agent, e);
  }
  return [...best.values()];
}

/**
 * Recompile the project's ACLs from its memberships (mirror of
 * compile-acl.mjs rules 2–4; the workspace-root ACL doesn't depend on
 * project membership and stays untouched).
 */
export async function recompileAcls(project: ProjectMeta): Promise<string[]> {
  const warnings: string[] = [];
  const PROJECT = projectRoot(); // active project (resolved from the host)
  // the pod account owns everything — keep it in every ACL (lockout guard)
  const podOwner = `${PROJECT.replace(/projects\/.*$/, "")}profile/card#me`;
  const owners = project.members.filter((m) => m.role === "Owner").map((m) => m.agent);
  const members = project.members.filter((m) => m.role === "Member").map((m) => m.agent);
  const guests = project.members.filter((m) => m.role === "Guest").map((m) => m.agent);
  const workers = project.members.filter((m) => m.kind === "Worker").map((m) => m.agent);

  // project container: owners rwc, members rw, guests r
  await put(
    `${PROJECT}.acl`,
    renderAcl(
      PROJECT,
      dedupe([
        { agent: podOwner, modes: "rwc" },
        ...owners.map((a) => ({ agent: a, modes: "rwc" })),
        ...members.map((a) => ({ agent: a, modes: "rw" })),
        ...guests.map((a) => ({ agent: a, modes: "r" })),
      ]),
    ),
  );

  // briefings/drafts: owners + workers only
  await put(
    `${paths.briefingDrafts}.acl`,
    renderAcl(
      paths.briefingDrafts,
      dedupe([
        { agent: podOwner, modes: "rwc" },
        ...owners.map((a) => ({ agent: a, modes: "rwc" })),
        ...workers.map((a) => ({ agent: a, modes: "rw" })),
      ]),
    ),
  );

  // chat/<user>/: that user + owners + workers
  for (const m of project.members.filter((x) => x.kind !== "Worker")) {
    const username = usernameOf(m.agent);
    const url = paths.chat(username);
    try {
      await put(
        `${url}.acl`,
        renderAcl(
          url,
          dedupe([
            { agent: podOwner, modes: "rwc" },
            ...owners.map((a) => ({ agent: a, modes: "rwc" })),
            { agent: m.agent, modes: "rw" },
            ...workers.map((a) => ({ agent: a, modes: "rw" })),
          ]),
        ),
      );
    } catch {
      warnings.push(`chat/${username}/ — ACL folgt mit der ersten Nachricht`);
    }
  }
  return warnings;
}

// --------------------------------------------------------------- public API

export type ParticipantInput = {
  username: string;
  name: string;
  org: string;
  role: Role;
};

export async function addParticipant(input: ParticipantInput): Promise<ProjectMeta> {
  const ttl = await getText(paths.projectTtl);
  const updated = addMembershipBlock(ttl, {
    ...input,
    username: input.username.trim().toLowerCase(),
    webId: webIdFor(input.username.trim().toLowerCase()),
  });
  await put(paths.projectTtl, updated);
  const project = parseProject(updated);
  await recompileAcls(project);
  return project;
}

export async function removeParticipant(webId: string): Promise<ProjectMeta> {
  const ttl = await getText(paths.projectTtl);
  const updated = removeMembershipBlock(ttl, webId);
  await put(paths.projectTtl, updated);
  const project = parseProject(updated);
  await recompileAcls(project);
  return project;
}

export async function changeParticipantRole(webId: string, role: Role): Promise<ProjectMeta> {
  const ttl = await getText(paths.projectTtl);
  const updated = changeRoleBlock(ttl, webId, role);
  await put(paths.projectTtl, updated);
  const project = parseProject(updated);
  await recompileAcls(project);
  return project;
}

/** Guard rails the UI enforces before calling the API. */
export function removalBlocker(
  project: ProjectMeta,
  m: Membership,
  selfWebId: string,
): string | null {
  if (m.kind === "Worker") return "Kai ist der Projekt-Assistent und kann nicht entfernt werden.";
  if (m.agent === selfWebId) return "Du kannst dich nicht selbst entfernen.";
  const owners = project.members.filter((x) => x.role === "Owner");
  if (m.role === "Owner" && owners.length <= 1)
    return "Der letzte Owner kann nicht entfernt werden.";
  return null;
}
