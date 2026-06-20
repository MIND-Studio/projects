// Shared types/helpers for the Workspace hub (apex owner phase). Kept separate
// from WorkspaceShell so the view components and the shell don't import-cycle.

import { projectHost } from "@/lib/solid/config";
import type {
  ProjectBoard,
  ProjectBriefings,
  ProjectSummary,
  WorkspaceMeeting,
} from "@/lib/solid/data";
import type { Company, OrgInfo } from "@/lib/solid/turtle";

/** Cross-origin link into a project hub (optionally deep-linked, e.g.
    `/board?issue=X`), carrying ?sso=1 for silent re-auth. */
export function projectHref(projectId: string, path = "/"): string {
  const proto = typeof window !== "undefined" ? window.location.protocol : "https:";
  const sep = path.includes("?") ? "&" : "?";
  return `${proto}//${projectHost(projectId)}${path}${sep}sso=1`;
}

/** Everything the Workspace views render. Heavy aggregates load lazily in the
    shell; a `null` means "still loading", `[]` means "loaded, empty". */
export type WsData = {
  projects: ProjectSummary[];
  company: Company | null;
  registry: OrgInfo[];
  board: ProjectBoard[] | null;
  meetings: WorkspaceMeeting[] | null;
  briefings: ProjectBriefings[] | null;
  /** Re-fetch the briefings aggregate (after an owner publishes a draft). */
  refreshBriefings: () => void;
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
