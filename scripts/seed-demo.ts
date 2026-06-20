/**
 * Seed a demo project into a persona's pod so the Projects UI isn't empty on
 * first login: `{pod}/projects/workspace/` with project.ttl (the signed-in user
 * as Owner), a tracker (state.ttl with a few issues), one meeting and one
 * briefing. Mirrors the default deployment profile (own-pod workspace, single
 * project id "workspace", pod write backend).
 *
 * Usage:
 *   docker compose up -d        # shared CSS on :3011
 *   npm run seed:demo           # seeds alice by default
 *
 * Idempotent — re-running overwrites the seed files.
 */
import { Session } from "@inrupt/solid-client-authn-node";

const POD_BASE = process.env.POD_BASE_URL ?? "http://localhost:3011/";
const EMAIL = process.env.SEED_EMAIL ?? "alice@mind.local";
const PASSWORD = process.env.SEED_PASSWORD ?? "dev-only-do-not-use-in-prod";
const POD_NAME = process.env.SEED_POD ?? "alice";
const PROJECT = process.env.SEED_PROJECT ?? "workspace";

const ROOT = `${POD_BASE}${POD_NAME}/`;
const WEBID = `${ROOT}profile/card#me`;
const PROJECT_ROOT = `${ROOT}projects/${PROJECT}/`;

async function mintCredentials() {
  const indexRes = await fetch(`${POD_BASE}.account/`);
  if (!indexRes.ok) throw new Error(`CSS account index ${indexRes.status} — is CSS running?`);
  const { controls } = (await indexRes.json()) as {
    controls: { password: { login: string } };
  };
  const loginRes = await fetch(controls.password.login, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  const { authorization } = (await loginRes.json()) as { authorization: string };
  const accountRes = await fetch(`${POD_BASE}.account/`, {
    headers: { Authorization: `CSS-Account-Token ${authorization}` },
  });
  const account = (await accountRes.json()) as {
    controls: { account: { clientCredentials: string } };
  };
  const credRes = await fetch(account.controls.account.clientCredentials, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `CSS-Account-Token ${authorization}`,
    },
    body: JSON.stringify({ name: "mind-projects-seed", webId: WEBID }),
  });
  if (!credRes.ok) throw new Error(`Credentials failed: ${credRes.status} ${await credRes.text()}`);
  return (await credRes.json()) as { id: string; secret: string };
}

async function put(session: Session, url: string, body: string, contentType: string) {
  const res = await session.fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body,
  });
  if (!res.ok && res.status !== 205)
    throw new Error(`PUT ${url} → ${res.status} ${await res.text()}`);
  console.log(`  ✓ ${url.replace(POD_BASE, "/")}`);
}

const PROJECT_TTL = `@prefix dct: <http://purl.org/dc/terms/> .
@prefix ws: <https://mind.dev/ns/workspace#> .

<#project> a ws:Project ;
    dct:identifier "${PROJECT}" ;
    dct:title "My Workspace" ;
    dct:description "A demo project — tasks, timeline, meetings and briefings, all in your pod." ;
    ws:status "active" ;
    ws:startDate "2026-01-01" ;
    ws:endDate "2026-12-31" .

<#m-owner> a ws:Membership ;
    ws:agent <${WEBID}> ;
    ws:role ws:Owner ;
    ws:name "Alice" .
`;

const STATE_TTL = `@prefix : <#> .
@prefix wf: <https://mind.dev/ns/workflow#> .
@prefix mc: <https://mind.dev/ns/tracker#> .
@prefix mindp: <https://mind.dev/ns/projects#> .
@prefix dc: <http://purl.org/dc/elements/1.1/> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<#this> a mc:Tracker .

<#TASK-001>
    wf:tracker :this ;
    mc:number 1 ;
    dc:title "Welcome to your project board" ;
    mc:epic <epics.ttl#discovery> ;
    a :Todo , :General ;
    dct:created "2026-06-01"^^xsd:date ;
    wf:description """Drag cards between columns to change their state. Everything is stored in your own pod.""" .

<#TASK-002>
    wf:tracker :this ;
    mc:number 2 ;
    dc:title "Plan the first milestone" ;
    mc:epic <epics.ttl#discovery> ;
    a :InProgress , :General ;
    dct:created "2026-06-02"^^xsd:date ;
    mindp:due "2026-07-01"^^xsd:date ;
    wf:description """Outline scope and a rough timeline.""" .

<#TASK-003>
    wf:tracker :this ;
    mc:number 3 ;
    dc:title "Invite a collaborator" ;
    mc:epic <epics.ttl#discovery> ;
    a :Done , :General ;
    dct:created "2026-06-03"^^xsd:date ;
    wf:description """Share the project container via WAC to work together.""" .

<#TASK-004>
    wf:tracker :this ;
    mc:number 4 ;
    dc:title "Prepare release notes" ;
    mc:epic <epics.ttl#launch> ;
    a :Todo , :General ;
    dct:created "2026-06-10"^^xsd:date ;
    wf:description """Draft the notes for the first launch.""" .

<#TASK-005>
    wf:tracker :this ;
    mc:number 5 ;
    dc:title "Security audit sign-off" ;
    mc:epic <epics.ttl#audit> ;
    a :Done , :General ;
    dct:created "2026-06-05"^^xsd:date ;
    wf:description """External review of the data-sovereignty model.""" .
`;

const EPICS_TTL = `@prefix dct: <http://purl.org/dc/terms/> .
@prefix mc: <https://mind.dev/ns/tracker#> .
@prefix mindp: <https://mind.dev/ns/projects#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<#discovery> a mc:Epic ;
    mc:number 1 ;
    dct:title "Discovery" ;
    mc:status "active" ;
    mindp:startDate "2026-02-01"^^xsd:date ;
    mindp:endDate "2026-05-15"^^xsd:date ;
    dct:description """Research, scoping and a rough plan.""" .

<#launch> a mc:Epic ;
    mc:number 2 ;
    dct:title "Launch" ;
    mc:status "planned" ;
    dct:description """Ship the first release — not started yet.""" .

<#audit> a mc:Epic ;
    mc:number 3 ;
    dct:title "Audit" ;
    mc:status "active" ;
    mindp:startDate "2026-09-01"^^xsd:date ;
    mindp:endDate "2026-11-30"^^xsd:date ;
    dct:description """Independent security and compliance review.""" .
`;

const TRACKER_TTL = `@prefix dct: <http://purl.org/dc/terms/> .
@prefix mc: <https://mind.dev/ns/tracker#> .

<#tracker> a mc:Tracker ;
    dct:title "Tasks" .
`;

const MEETING_TTL = `@prefix dct: <http://purl.org/dc/terms/> .
@prefix schema: <http://schema.org/> .

<#meeting> a schema:Event ;
    dct:identifier "kickoff" ;
    schema:name "Project kickoff" ;
    schema:startDate "2026-07-05T10:00" ;
    schema:endDate "2026-07-05T11:00" ;
    schema:eventStatus "scheduled" ;
    schema:description """First sync — goals, scope, who does what.""" .
`;

const BRIEFING_MD = `# Project briefing — June 2026

Welcome! This is a sample briefing. Briefings are plain Markdown stored in your
pod under \`briefings/\`. Owners can publish drafts from \`briefings/drafts/\`.
`;

async function main() {
  console.log(`Seeding ${PROJECT_ROOT} …`);
  const { id, secret } = await mintCredentials();
  const session = new Session();
  const tokenUrl = `${POD_BASE}.oidc/token`;
  await session.login({ clientId: id, clientSecret: secret, oidcIssuer: POD_BASE, tokenUrl });
  if (!session.info.isLoggedIn) throw new Error("client-credentials login failed");

  await put(session, `${PROJECT_ROOT}project.ttl`, PROJECT_TTL, "text/turtle");
  await put(session, `${PROJECT_ROOT}tracker/tracker.ttl`, TRACKER_TTL, "text/turtle");
  await put(session, `${PROJECT_ROOT}tracker/epics.ttl`, EPICS_TTL, "text/turtle");
  await put(session, `${PROJECT_ROOT}tracker/state.ttl`, STATE_TTL, "text/turtle");
  await put(session, `${PROJECT_ROOT}meetings/kickoff.ttl`, MEETING_TTL, "text/turtle");
  await put(session, `${PROJECT_ROOT}briefings/2026-06-briefing.md`, BRIEFING_MD, "text/markdown");

  console.log("Done. Sign in as the seeded persona to see the project.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
