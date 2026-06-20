// Server-side verification of the signed-in user for commit-back (Phase 2).
//
// Board writes now go through a server route (only the server holds the GitHub
// PAT), so the structural "wrote-as-the-user via WAC" proof the chat path relies
// on isn't available. Instead the browser forwards its Solid-OIDC access token
// (authedFetch attaches it); we verify that JWT against the issuer's JWKS and
// take its `webid` claim as the actor. This is the locked actor-trust model.
//
// NOTE: we validate the token's signature/issuer/expiry but not its DPoP cnf
// binding — acceptable for this internal, same-origin hub; tighten to full DPoP
// proof verification if the threat model grows.

import { createPublicKey, type JsonWebKey, verify as nodeVerify } from "node:crypto";
import { ISSUER } from "../solid/config";

const err = (status: number, msg: string) => Object.assign(new Error(msg), { status });
const b64urlJson = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString());
const trim = (s: string) => s.replace(/\/$/, "");

let jwksCache: { at: number; keys: Array<JsonWebKey & { kid?: string }> } | null = null;

async function jwks(): Promise<Array<JsonWebKey & { kid?: string }>> {
  if (jwksCache && Date.now() - jwksCache.at < 3_600_000) return jwksCache.keys;
  const disc = await (await fetch(`${trim(ISSUER)}/.well-known/openid-configuration`)).json();
  const j = await (await fetch(disc.jwks_uri)).json();
  jwksCache = { at: Date.now(), keys: j.keys };
  return j.keys;
}

const usernameOf = (webId: string) =>
  webId.match(/\/([^/]+)\/profile\/card#me$/)?.[1] ??
  webId.match(/^https?:\/\/[^/]+\/([^/]+)\//)?.[1] ??
  webId;

export type VerifiedUser = { webId: string; username: string };

/** Verify the forwarded access token and return the signed-in user's WebID. */
export async function verifyUser(authHeader: string | null): Promise<VerifiedUser> {
  const token = authHeader?.replace(/^(DPoP|Bearer)\s+/i, "").trim();
  if (!token) throw err(401, "nicht angemeldet");
  const [h, p, sig] = token.split(".");
  if (!h || !p || !sig) throw err(401, "ungültiges Token");

  const header = b64urlJson(h) as { alg: string; kid?: string };
  const payload = b64urlJson(p) as { iss?: string; exp?: number; webid?: string; webId?: string };
  if (!payload.iss || trim(payload.iss) !== trim(ISSUER)) throw err(401, "falscher Issuer");
  if (payload.exp && Date.now() / 1000 > payload.exp) throw err(401, "Token abgelaufen");
  const webId = payload.webid ?? payload.webId;
  if (!webId) throw err(401, "kein webid-Claim");

  const keys = await jwks();
  const jwk = (header.kid ? keys.find((k) => k.kid === header.kid) : keys[0]) ?? keys[0];
  if (!jwk) throw err(401, "kein Signaturschlüssel");
  const key = createPublicKey({ key: jwk, format: "jwk" });
  const data = Buffer.from(`${h}.${p}`);
  const signature = Buffer.from(sig, "base64url");
  const ok = header.alg.startsWith("ES")
    ? nodeVerify("sha256", data, { key, dsaEncoding: "ieee-p1363" }, signature)
    : nodeVerify("RSA-SHA256", data, key, signature);
  if (!ok) throw err(401, "Signatur ungültig");

  return { webId, username: usernameOf(webId) };
}
