"use client";

// Threaded comments on anything — issues, APs, meetings, briefings. One
// ekai:Comment document per comment in ${PROJECT}comments/; the target is a
// stable id string ("TASK-012", "AP2", "MTG-003", "briefing:<file>"). Writes
// happen AS THE USER (WAC: members rw via the project default, guests read).

import { authedFetch, usernameOf } from "./auth";
import { paths } from "./config";
import { parseContainer } from "./turtle";

export type Comment = {
  url: string;
  id: string; // file stem, also used as replyTo reference
  target: string;
  author: string; // WebID
  authorName: string;
  created: string; // ISO dateTime
  replyTo: string | null;
  text: string;
};

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
const unesc = (s: string) => s.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");

function render(c: Omit<Comment, "url" | "id">, id: string): string {
  const lines = [
    `@prefix dct: <http://purl.org/dc/terms/> .`,
    `@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .`,
    `@prefix ekai: <https://mind.dev/ns/projects#> .`,
    ``,
    `<#it> a ekai:Comment ;`,
    `    dct:identifier "${esc(id)}" ;`,
    `    ekai:target "${esc(c.target)}" ;`,
    `    ekai:author <${c.author}> ;`,
    `    ekai:authorName "${esc(c.authorName)}" ;`,
    `    dct:created "${c.created}"^^xsd:dateTime ;`,
  ];
  if (c.replyTo) lines.push(`    ekai:replyTo "${esc(c.replyTo)}" ;`);
  lines.push(`    ekai:text """${c.text.replace(/"""/g, '\\"\\"\\"')}""" .`);
  return lines.join("\n") + "\n";
}

function parse(url: string, ttl: string): Comment | null {
  if (!/a ekai:Comment\b/.test(ttl)) return null;
  const target = ttl.match(/ekai:target "((?:[^"\\]|\\.)*)"/)?.[1];
  const author = ttl.match(/ekai:author <([^>]+)>/)?.[1];
  if (!target || !author) return null;
  return {
    url,
    id: url
      .split("/")
      .pop()!
      .replace(/\.ttl$/, ""),
    target: unesc(target),
    author,
    authorName: unesc(ttl.match(/ekai:authorName "((?:[^"\\]|\\.)*)"/)?.[1] ?? usernameOf(author)),
    created: ttl.match(/dct:created "([^"]+)"/)?.[1] ?? "",
    replyTo: ttl.match(/ekai:replyTo "((?:[^"\\]|\\.)*)"/)?.[1] ?? null,
    text: ttl.match(/ekai:text """([\s\S]*?)"""/)?.[1]?.trim() ?? "",
  };
}

async function getText(url: string): Promise<string> {
  const r = await authedFetch()(url, { headers: { accept: "text/turtle" } });
  if (!r.ok) throw Object.assign(new Error(`GET ${url} → ${r.status}`), { status: r.status });
  return r.text();
}

/** All comments in the project, oldest first. 404 (container not yet created) → []. */
export async function loadComments(): Promise<Comment[]> {
  let listing: string;
  try {
    listing = await getText(paths.comments);
  } catch (e) {
    if ((e as { status?: number }).status === 404) return [];
    throw e;
  }
  const urls = parseContainer(paths.comments, listing).filter((u) => u.endsWith(".ttl"));
  const comments = (await Promise.all(urls.map(async (u) => parse(u, await getText(u))))).filter(
    (c): c is Comment => !!c,
  );
  comments.sort((a, b) => a.created.localeCompare(b.created));
  return comments;
}

export async function addComment(input: {
  target: string;
  text: string;
  replyTo?: string | null;
  author: string;
  authorName: string;
}): Promise<Comment> {
  const id = `c-${Date.now()}-${usernameOf(input.author)}`;
  const comment: Omit<Comment, "url" | "id"> = {
    target: input.target,
    author: input.author,
    authorName: input.authorName,
    created: new Date().toISOString(),
    replyTo: input.replyTo ?? null,
    text: input.text.trim(),
  };
  const url = `${paths.comments}${id}.ttl`;
  const r = await authedFetch()(url, {
    method: "PUT",
    headers: { "content-type": "text/turtle" },
    body: render(comment, id),
  });
  if (!r.ok) throw Object.assign(new Error(`PUT comment → ${r.status}`), { status: r.status });
  return { ...comment, url, id };
}

export async function deleteComment(c: Comment): Promise<void> {
  const r = await authedFetch()(c.url, { method: "DELETE" });
  if (!r.ok) throw Object.assign(new Error(`DELETE comment → ${r.status}`), { status: r.status });
}
