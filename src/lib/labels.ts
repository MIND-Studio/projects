// Shared labels for tracker states, priorities and roles. English by default
// (the open-source profile); German when `profile.locale === "de"` (the EmAI
// hub). These feed the board columns, status dropdowns, overview, timeline and
// team across the app, so locale-switching here is the single lever that keeps
// every tracker surface consistent.

import { profile } from "./profile";
import type { IssueState, Role } from "./solid/turtle";

const STATE_LABELS: Record<"en" | "de", Record<IssueState, string>> = {
  en: {
    backlog: "Backlog",
    todo: "To-do",
    "in-progress": "In progress",
    review: "Review",
    done: "Done",
    cancelled: "Cancelled",
  },
  de: {
    backlog: "Backlog",
    todo: "To-do",
    "in-progress": "In Arbeit",
    review: "Review",
    done: "Fertig",
    cancelled: "Verworfen",
  },
};

const PRIORITY_LABELS: Record<"en" | "de", Record<string, string>> = {
  en: { high: "High", normal: "Normal", low: "Low" },
  de: { high: "Hoch", normal: "Normal", low: "Niedrig" },
};

const ROLE_LABELS: Record<"en" | "de", Record<Role, string>> = {
  en: { Owner: "Owner", Member: "Active partner", Guest: "Informed partner" },
  de: { Owner: "Owner", Member: "Aktiver Partner", Guest: "Informierter Partner" },
};

export const STATE_LABEL: Record<IssueState, string> = STATE_LABELS[profile.locale];
export const PRIORITY_LABEL: Record<string, string> = PRIORITY_LABELS[profile.locale];
export const ROLE_LABEL: Record<Role, string> = ROLE_LABELS[profile.locale];
