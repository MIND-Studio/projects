"use client";

import { createSolidClient } from "@mind-studio/core/solid";
import { profile } from "@/lib/profile";

/**
 * The one shared Solid foundation for Mind Projects — session, the single-flight
 * OIDC redirect handler, the shell capability bridge (broker), and a pod fs.
 * `auth.ts` re-exports thin shims over this so the rest of the app keeps its
 * existing import paths. Standalone it runs OIDC; framed in the Mind shell it
 * takes identity + brokered pod I/O over the bridge (no credential crosses).
 */
export const solid = createSolidClient({
  appName: "projects",
  clientName: profile.appName,
  defaultReturnPath: "/",
  defaultIssuer: profile.issuer,
});
