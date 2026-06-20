import { NextRequest, NextResponse } from "next/server";
import { answerConversation } from "@/lib/server/kai";
import { resolveProjectId } from "@/lib/solid/config";
import { profile } from "@/lib/profile";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // The AI assistant is an opt-in module; without it this endpoint is dark.
  if (!profile.assistant)
    return NextResponse.json({ error: "assistant disabled" }, { status: 404 });
  try {
    // Project is resolved from the trusted Host, not the request body — Kai
    // answers as THAT project's worker and only within its chat scope.
    const projectId = resolveProjectId(req.headers.get("host"));
    const { conversation } = (await req.json()) as { conversation?: string };
    if (!conversation)
      return NextResponse.json({ error: "conversation fehlt" }, { status: 400 });
    const { reply } = await answerConversation(conversation, projectId);
    return NextResponse.json({ reply });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
