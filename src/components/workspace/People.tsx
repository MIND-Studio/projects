"use client";

// People & partner directory — everyone across all projects, grouped by the
// organisation they belong to (resolved against company/orgs.ttl). Per person:
// their projects + roles + open-task load. Links into each person's project profile.

import { Avatar, AvatarFallback, Badge, Card, CardContent, Skeleton } from "@mind-studio/ui";
import { ListTodo } from "lucide-react";
import { usernameOf } from "@/lib/solid/auth";
import { workspaceOrgs, ORG_KIND_LABEL, ORG_ROLE_LABEL } from "@/lib/orgs";
import { ROLE_LABEL } from "@/lib/labels";
import { initials, projectHref, type WsData } from "./types";

const KIND_TONE: Record<string, string> = {
  self: "bg-primary/15 text-primary",
  partner: "bg-ok/15 text-ok",
  research: "bg-secondary text-secondary-foreground",
  customer: "bg-accent text-accent-foreground",
};

export function People({ data }: { data: WsData }) {
  const { projects, registry, board } = data;

  // Open-task load per person (assignee WebID) across every project's board.
  const openByWebId = new Map<string, number>();
  if (board) {
    for (const p of board) {
      for (const i of p.issues) {
        if (i.assignee && ["todo", "in-progress", "review"].includes(i.state)) {
          openByWebId.set(i.assignee, (openByWebId.get(i.assignee) ?? 0) + 1);
        }
      }
    }
  }

  const orgs = workspaceOrgs(
    projects.map((p) => ({ projectId: p.projectId, title: p.meta.title, members: p.meta.members })),
    openByWebId,
    registry,
  );

  return (
    <div className="stagger space-y-6">
      <section className="pt-2">
        <p className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
          Workspace
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Team & Partner</h1>
      </section>

      {orgs.length === 0 ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        orgs.map((org) => (
          <section key={org.id}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold tracking-tight">{org.name}</h2>
              <Badge className={KIND_TONE[org.kind] ?? ""} variant="secondary">
                {ORG_KIND_LABEL[org.kind]}
              </Badge>
              <span className="text-xs text-muted-foreground">{ORG_ROLE_LABEL[org.role]}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {org.people.map((person) => {
                // Link to the person's profile in their first project's hub.
                const home = person.projects[0];
                const href = home
                  ? projectHref(home.projectId, `/team/${usernameOf(person.webId)}`)
                  : undefined;
                const Inner = (
                  <Card className="glow-hover h-full transition-colors group-hover:border-primary/40">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                          {initials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{person.name}</p>
                        <p className="mt-0.5 flex flex-wrap gap-1">
                          {person.projects.map((pr) => (
                            <Badge key={pr.projectId} variant="outline" className="text-[10px]">
                              {pr.title} · {ROLE_LABEL[pr.role]}
                            </Badge>
                          ))}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <ListTodo className="size-3.5" />
                        {person.openTasks}
                      </span>
                    </CardContent>
                  </Card>
                );
                return href ? (
                  <a key={person.webId} href={href} className="group">{Inner}</a>
                ) : (
                  <div key={person.webId}>{Inner}</div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
