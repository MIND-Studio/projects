// Provider-agnostic git commit-back (docs/PRD-git-issues.md, Phase 2).
//
// A Board/Kai action is committed to the issues monorepo as ONE commit, authored
// as the signed-in user, via an EPHEMERAL shallow clone. The hub stays stateless
// and works with ANY git remote — GitHub, GitLab, Gitea, self-hosted, SSH — with
// NO provider-specific API. The credential lives in the remote URL; the server
// holds it, the browser never sees it.
//
//   ISSUES_GIT_URL     git remote with embedded credential, e.g.
//                        https://x-access-token:<token>@github.com/org/kai-issues.git
//                        https://oauth2:<token>@gitlab.com/org/kai-issues.git
//                        git@host:org/kai-issues.git        (SSH, key mounted)
//   ISSUES_GIT_BRANCH  default "main"
//   ISSUES_GIT_BOT_NAME / ISSUES_GIT_BOT_EMAIL  committer identity (author = the user)
//
// Requires the `git` binary in the image (hub/Dockerfile installs it).

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export type CommitFile = { path: string; content: string };
export type CommitAuthor = { name: string; email: string };

/** Is commit-back to git configured? When false (local dev / no remote) the
    caller does an optimistic pod-only write so the Board still works. */
export const gitConfigured = (): boolean => !!process.env.ISSUES_GIT_URL;

function cfg() {
  const url = process.env.ISSUES_GIT_URL;
  if (!url)
    throw Object.assign(new Error("commit-back not configured (ISSUES_GIT_URL)"), { status: 503 });
  return {
    url,
    branch: process.env.ISSUES_GIT_BRANCH || "main",
    bot: {
      name: process.env.ISSUES_GIT_BOT_NAME || "Kai bot",
      email: process.env.ISSUES_GIT_BOT_EMAIL || "kai@emai.dev",
    },
  };
}

/** A shallow checkout handed to the build callback: read existing files
    (repo-root-relative paths), stage new/changed ones. */
export interface RepoTx {
  read(path: string): string | null;
  stage(files: CommitFile[]): void;
}

const git = (args: string[], cwd: string) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/**
 * Ephemeral shallow clone → run `build` (reads + stages files) → ONE commit
 * authored as `author`, committer = bot → push (one rebase-retry on a rejected,
 * non-fast-forward push, since append-only event files rarely truly conflict).
 * Returns the commit sha, or null if `build` staged nothing. The temp checkout
 * is always removed.
 */
export async function commitToRepo(
  message: string,
  author: CommitAuthor,
  build: (tx: RepoTx) => void | Promise<void>,
): Promise<string | null> {
  const { url, branch, bot } = cfg();
  const dir = mkdtempSync(join(tmpdir(), "kai-issues-"));
  try {
    git(["clone", "--depth", "1", "--branch", branch, "--single-branch", url, dir], tmpdir());
    const staged: string[] = [];
    const tx: RepoTx = {
      read: (p) => {
        const f = join(dir, p);
        return existsSync(f) ? readFileSync(f, "utf8") : null;
      },
      stage: (files) => {
        for (const f of files) {
          const abs = join(dir, f.path);
          mkdirSync(dirname(abs), { recursive: true });
          writeFileSync(abs, f.content);
          staged.push(f.path);
        }
      },
    };
    await build(tx);
    if (!staged.length) return null;

    git(["add", "--", ...staged], dir);
    git(
      [
        "-c",
        `user.name=${bot.name}`,
        "-c",
        `user.email=${bot.email}`,
        "commit",
        "--author",
        `${author.name} <${author.email}>`,
        "-m",
        message,
      ],
      dir,
    );
    try {
      git(["push", "origin", `HEAD:${branch}`], dir);
    } catch {
      // Non-fast-forward (a concurrent push landed first): rebase our single
      // commit onto the new tip and retry once. Event files are append-only and
      // path-unique, so this almost always rebases cleanly.
      git(["fetch", "--depth", "50", "origin", branch], dir);
      git(["rebase", `origin/${branch}`], dir);
      git(["push", "origin", `HEAD:${branch}`], dir);
    }
    return git(["rev-parse", "HEAD"], dir).trim();
  } catch (e) {
    throw Object.assign(e instanceof Error ? e : new Error(String(e)), {
      status: (e as { status?: number }).status ?? 502,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
