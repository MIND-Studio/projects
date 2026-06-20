// Subscribable calendar feed (webcal://…/api/calendar.ics) with every project
// meeting. Calendar apps can't do Solid-OIDC, so the route reads the pod as
// the Kai worker and serves plain ICS. Optionally gated by a static key
// (CALENDAR_FEED_TOKEN) — meeting titles/times only, same data every guest
// already sees in the hub.

import { NextRequest, NextResponse } from "next/server";
import { workerFor } from "@/lib/server/worker";
import { resolveProjectId, projectRoot } from "@/lib/solid/config";
import { parseContainer, parseMeeting } from "@/lib/solid/turtle";
import { calendarIcs } from "@/lib/ics";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = process.env.CALENDAR_FEED_TOKEN;
  if (token && req.nextUrl.searchParams.get("key") !== token)
    return NextResponse.json({ error: "ungültiger Feed-Key" }, { status: 403 });

  try {
    // Project (and thus worker + meetings container) from the trusted Host.
    const projectId = resolveProjectId(req.headers.get("host"));
    const MEETINGS = `${projectRoot(projectId)}meetings/`;
    const k = workerFor(projectId);
    const listing = await k.getText(MEETINGS);
    const urls = parseContainer(MEETINGS, listing).filter((u) => u.endsWith(".ttl"));
    const meetings = await Promise.all(
      urls.map(async (u) => parseMeeting(u, await k.getText(u))),
    );
    meetings.sort((a, b) => a.start.localeCompare(b.start));

    return new NextResponse(calendarIcs(meetings), {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": 'inline; filename="kai-emai.ics"',
        "cache-control": "no-cache",
      },
    });
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
