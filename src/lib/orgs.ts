// Organisations are derived data — strings on memberships (ws:org) and on
// AP leads (ekai:lead). This module gives them stable slugs/URLs and a
// tolerant matcher ("East Side Fab" ⇄ "East Side Fab e.V.").

import type { Membership, OrgInfo, OrgKind, Role } from "./solid/turtle";

export function orgSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Strip legal suffixes + noise so lead/org strings compare loosely. */
function core(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(gmbh|e\.?\s?v\.?|ag|kg|se|automotive)\b/g, "")
    .replace(/[^a-zäöüß0-9]+/g, " ")
    .trim();
}

export function orgMatches(a: string, b: string): boolean {
  const ca = core(a);
  const cb = core(b);
  if (!ca || !cb) return false;
  return ca === cb || ca.includes(cb) || cb.includes(ca);
}

export type Org = {
  name: string;
  slug: string;
  members: Membership[];
  /** best (highest) role in the project: Owner > Member > Guest */
  role: Role;
};

const ROLE_RANK: Record<Role, number> = { Owner: 0, Member: 1, Guest: 2 };

/** Group human memberships into organisations, owners first. */
export function orgsOf(members: Membership[]): Org[] {
  const map = new Map<string, Org>();
  for (const m of members) {
    if (m.kind === "Worker" || !m.org) continue;
    const slug = orgSlug(m.org);
    const o = map.get(slug);
    if (o) {
      o.members.push(m);
      if (ROLE_RANK[m.role] < ROLE_RANK[o.role]) o.role = m.role;
    } else {
      map.set(slug, { name: m.org, slug, members: [m], role: m.role });
    }
  }
  return [...map.values()].sort(
    (a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role] || a.name.localeCompare(b.name),
  );
}

export const ORG_ROLE_LABEL: Record<Role, string> = {
  Owner: "Konsortialführung",
  Member: "Aktiver Partner",
  Guest: "Informierter Partner",
};

export const ORG_KIND_LABEL: Record<OrgKind, string> = {
  self: "EmAI",
  partner: "Partner",
  research: "Forschung",
  customer: "Kunde",
};

// ----------------------------------------------------- workspace directory (apex)
// Resolve a free-text ws:org string to a canonical registry entry (alias-exact,
// then tolerant). Falls back to a derived slug entry so the directory still works
// before company/orgs.ttl exists.

function resolveOrg(
  name: string,
  registry: OrgInfo[],
): { id: string; title: string; kind: OrgKind } {
  const lc = name.trim().toLowerCase();
  const hit =
    registry.find((o) => o.aliases.some((a) => a.toLowerCase() === lc)) ??
    registry.find((o) => o.title.toLowerCase() === lc) ??
    registry.find((o) => o.aliases.some((a) => orgMatches(a, name)) || orgMatches(o.title, name));
  return hit
    ? { id: hit.id, title: hit.title, kind: hit.kind }
    : { id: orgSlug(name), title: name, kind: "partner" };
}

export type WsPerson = {
  webId: string;
  name: string;
  org: string;
  projects: { projectId: string; title: string; role: Role }[];
  openTasks: number;
};

export type WsOrg = {
  id: string;
  name: string;
  kind: OrgKind;
  role: Role; // best (highest) role across the org's people
  people: WsPerson[];
};

const KIND_RANK: Record<OrgKind, number> = { self: 0, partner: 1, research: 2, customer: 3 };

/** Aggregate human memberships across all projects into an org → people directory.
    `openByWebId` carries each person's open-task count (assignee union over boards). */
export function workspaceOrgs(
  projects: { projectId: string; title: string; members: Membership[] }[],
  openByWebId: Map<string, number>,
  registry: OrgInfo[],
): WsOrg[] {
  const orgs = new Map<string, WsOrg>();
  const people = new Map<string, WsPerson>(); // webId → person

  for (const p of projects) {
    for (const m of p.members) {
      if (m.kind === "Worker" || !m.org) continue;
      const resolved = resolveOrg(m.org, registry);
      let person = people.get(m.agent);
      if (!person) {
        person = {
          webId: m.agent,
          name: m.name ?? m.agent.replace(/^.*?\/([^/]+)\/profile\/card#me$/, "$1"),
          org: resolved.title,
          projects: [],
          openTasks: openByWebId.get(m.agent) ?? 0,
        };
        people.set(m.agent, person);
        const org =
          orgs.get(resolved.id) ??
          (orgs.set(resolved.id, {
            id: resolved.id,
            name: resolved.title,
            kind: resolved.kind,
            role: m.role,
            people: [],
          }),
          orgs.get(resolved.id)!);
        org.people.push(person);
        if (ROLE_RANK[m.role] < ROLE_RANK[org.role]) org.role = m.role;
      }
      if (!person.projects.some((x) => x.projectId === p.projectId)) {
        person.projects.push({ projectId: p.projectId, title: p.title, role: m.role });
      }
    }
  }

  return [...orgs.values()]
    .map((o) => ({
      ...o,
      people: o.people.sort(
        (a, b) => ROLE_RANK[bestRole(a)] - ROLE_RANK[bestRole(b)] || a.name.localeCompare(b.name),
      ),
    }))
    .sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.name.localeCompare(b.name));
}

function bestRole(p: WsPerson): Role {
  return p.projects.reduce<Role>(
    (best, x) => (ROLE_RANK[x.role] < ROLE_RANK[best] ? x.role : best),
    "Guest",
  );
}
