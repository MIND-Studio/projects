import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import { Providers } from "@/components/Providers";
import { profile } from "@/lib/profile";
import { brandingFor, HUB_BRANDING, isRouterHost, resolveProjectId } from "@/lib/solid/config";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display-var" });
const sans = Geist({ subsets: ["latin"], variable: "--font-sans-var" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono-var" });

// Host-resolved per-project metadata: the document title/description reflect the
// project of the subdomain being served (one image, many projects in subdomain
// mode; the single default project otherwise).
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get("host");
  const brand = isRouterHost(host) ? HUB_BRANDING : brandingFor(resolveProjectId(host));
  return {
    title: `${profile.appName} — ${brand.title}`,
    description: brand.descriptor,
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang={profile.locale}
      className={`dark ${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
