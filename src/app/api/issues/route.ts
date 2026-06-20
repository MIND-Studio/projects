import { type NextRequest, NextResponse } from "next/server";
import { applyIssueAction, type IssueAction } from "@/lib/server/commitback";
import { verifyUser } from "@/lib/server/userauth";
import { workerFor } from "@/lib/server/worker";
import { projectRoot, resolveProjectId } from "@/lib/solid/config";
import { parseProject } from "@/lib/solid/turtle";

export const runtime = "nodejs";

// Board/Kai issue writes (Phase 2, docs/PRD-git-issues.md). The project is
// resolved from the trusted Host (never the body), the actor from the forwarded
// Solid-OIDC token, and authorization from the live project.ttl role — Guests are
// refused here regardless of what the client sends. The action is committed to
// the kai-issues git repo as that user; the pod is optimistically updated.
export async function POST(req: NextRequest) {
  try {
    const projectId = resolveProjectId(req.headers.get("host"));
    const user = await verifyUser(req.headers.get("authorization"));

    // Role gate: the actor must be a member of THIS project, and not a Guest.
    const project = parseProject(
      await workerFor(projectId).getText(`${projectRoot(projectId)}project.ttl`),
    );
    const member = project.members.find((m) => m.agent === user.webId);
    if (!member) return NextResponse.json({ error: "kein Projektmitglied" }, { status: 403 });
    if (member.role === "Guest")
      return NextResponse.json(
        { error: "lesender Zugang — Änderungen laufen über das EmAI-Team" },
        { status: 403 },
      );

    const body = (await req.json()) as IssueAction;
    if (!body || !("action" in body))
      return NextResponse.json({ error: "action fehlt" }, { status: 400 });

    const result = await applyIssueAction(
      projectId,
      {
        webId: user.webId,
        username: user.username,
        name: member.name ?? user.username,
        actorKind: "human",
      },
      body,
    );
    return NextResponse.json(result);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
