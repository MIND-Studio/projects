import type { NextConfig } from "next";

// Comma/space-separated list of origins allowed to frame this app (the Mind
// shell). Defaults cover the prod shell + local shell dev. We never send
// X-Frame-Options: DENY (that would block framing outright).
const FRAME_ANCESTORS =
  process.env.NEXT_PUBLIC_FRAME_ANCESTORS ??
  "https://shell.mindpods.org http://localhost:3100";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@mind-studio/core", "@mind-studio/ui"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `frame-ancestors 'self' ${FRAME_ANCESTORS};`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
