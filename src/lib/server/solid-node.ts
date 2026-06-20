// Server-side Solid client for the Kai worker (client_credentials + DPoP).
// Mirror of workspace/lib/solid.mjs, trimmed to what the API routes need.

import {
  createHash,
  generateKeyPairSync,
  type KeyObject,
  sign as nodeSign,
  randomBytes,
} from "node:crypto";

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const sha256 = (s: string) => createHash("sha256").update(s).digest();

type Disc = { token_endpoint: string };

export class WorkerClient {
  private base: string;
  private jwk: { crv: string; kty: string; x: string; y: string };
  private privateKey: KeyObject;
  private disc: Disc | null = null;
  accessToken: string | null = null;
  webId: string | null = null;
  private expiresAt = 0;

  constructor(
    base: string,
    private creds: { id: string; secret: string },
  ) {
    this.base = base.replace(/\/$/, "");
    const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    this.privateKey = privateKey;
    const jwkFull = publicKey.export({ format: "jwk" }) as Record<string, string>;
    this.jwk = { crv: jwkFull.crv, kty: jwkFull.kty, x: jwkFull.x, y: jwkFull.y };
  }

  private dpop(htm: string, htu: string, ath?: string): string {
    const header = { typ: "dpop+jwt", alg: "ES256", jwk: this.jwk };
    const payload: Record<string, unknown> = {
      jti: randomBytes(16).toString("hex"),
      htm,
      htu,
      iat: Math.floor(Date.now() / 1000),
    };
    if (ath) payload.ath = b64url(sha256(ath));
    const si = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
    const sig = nodeSign("sha256", Buffer.from(si), {
      key: this.privateKey,
      dsaEncoding: "ieee-p1363",
    });
    return `${si}.${b64url(sig)}`;
  }

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.expiresAt - 30_000) return;
    if (!this.disc) {
      const r = await fetch(`${this.base}/.well-known/openid-configuration`);
      if (!r.ok) throw new Error(`oidc discovery → ${r.status}`);
      this.disc = (await r.json()) as Disc;
    }
    const basic = Buffer.from(`${this.creds.id}:${this.creds.secret}`).toString("base64");
    const r = await fetch(this.disc.token_endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${basic}`,
        dpop: this.dpop("POST", this.disc.token_endpoint),
      },
      body: new URLSearchParams({ grant_type: "client_credentials", scope: "webid" }),
    });
    const tok = (await r.json()) as { access_token?: string; expires_in?: number };
    if (!tok.access_token)
      throw new Error(`client_credentials exchange failed: ${JSON.stringify(tok)}`);
    this.accessToken = tok.access_token;
    this.expiresAt = Date.now() + (tok.expires_in ?? 600) * 1000;
    this.webId = (
      JSON.parse(Buffer.from(tok.access_token.split(".")[1], "base64url").toString()) as {
        webid: string;
      }
    ).webid;
  }

  async fetch(
    method: string,
    url: string,
    init: { headers?: Record<string, string>; body?: string } = {},
  ) {
    await this.ensureToken();
    return fetch(url, {
      method,
      body: init.body,
      headers: {
        authorization: `DPoP ${this.accessToken}`,
        dpop: this.dpop(method, url, this.accessToken!),
        ...init.headers,
      },
    });
  }

  async getText(url: string): Promise<string> {
    const r = await this.fetch("GET", url, { headers: { accept: "text/turtle" } });
    if (!r.ok) throw Object.assign(new Error(`GET ${url} → ${r.status}`), { status: r.status });
    return r.text();
  }

  async put(url: string, body: string, contentType: string): Promise<void> {
    const r = await this.fetch("PUT", url, { headers: { "content-type": contentType }, body });
    if (!r.ok && r.status !== 205)
      throw Object.assign(new Error(`PUT ${url} → ${r.status}`), { status: r.status });
  }
}
