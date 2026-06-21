import { parseTheme, type Theme, toDataUrl } from "@mind-studio/ui";

/*
 * EmAI brand theme — Caltrans Orange (#FF6700) on neutral dark (#141414).
 * Source of truth: deployments/kai.emai.dev/branding/emai.css and
 * emai/headquarter/assets/brand/. The hub runs dark-only (forcedTheme="dark"),
 * but light values are authored so the theme stays AA-valid in both modes
 * (checked by scripts/check-theme.mjs via validateThemeContrast).
 */

const ORANGE = "#ff6700";
const ORANGE_DEEP = "#b34700"; // light-mode primary — AA on near-white
const INK = "#141414";

const symbolSvg = (bg: string, fg: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${bg}"/><path d="M10 7h4v8.2L21 7h5l-8.4 9.4L26.4 25h-5.2L14 17.8V25h-4z" fill="${fg}"/></svg>`;

const logoSvg = (ink: string, muted: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 32"><rect width="32" height="32" rx="7" fill="${ORANGE}"/><path d="M10 7h4v8.2L21 7h5l-8.4 9.4L26.4 25h-5.2L14 17.8V25h-4z" fill="${INK}"/><text x="40" y="22.5" font-family="ui-sans-serif,system-ui" font-size="17" font-weight="700" fill="${ink}">Kai</text><text x="71" y="22.5" font-family="ui-sans-serif,system-ui" font-size="13" fill="${muted}">· EmAI</text></svg>`;

export const emai: Theme = parseTheme(
  {
    name: "emai",
    label: "EmAI",
    // Warm-stone text ramp over pure-neutral dark surfaces (brand spec).
    grayscale: {
      "50": "#fafaf9",
      "100": "#f5f5f4",
      "200": "#e7e5e4",
      "300": "#d6d3d1",
      "400": "#a8a29e",
      "500": "#78716c",
      "600": "#57534e",
      "700": "#3d3d3d",
      "800": "#292929",
      "900": "#1f1f1f",
      "950": "#141414",
    },
    light: {
      primary: ORANGE_DEEP,
      "primary-foreground": "#fafaf9",
      ring: ORANGE_DEEP,
      "chart-1": ORANGE_DEEP,
      "sidebar-primary": ORANGE_DEEP,
      "sidebar-ring": ORANGE_DEEP,
    },
    dark: {
      primary: ORANGE,
      "primary-foreground": INK,
      ring: ORANGE,
      "chart-1": ORANGE,
      "sidebar-primary": ORANGE,
      "sidebar-ring": ORANGE,
    },
    radius: "0.5rem",
    font: {
      sans: "var(--font-sans-var), ui-sans-serif, system-ui, sans-serif",
      // ui 0.7.0 maps h1–h3 → --mind-font-serif; keep the fleet Fraunces stack.
      serif:
        'var(--font-fraunces), "Fraunces", ui-serif, Georgia, Cambria, "Times New Roman", serif',
      mono: "var(--font-mono-var), ui-monospace, SFMono-Regular, monospace",
    },
    logo: {
      light: toDataUrl(logoSvg("#141414", "#78716c")),
      dark: toDataUrl(logoSvg("#fafaf9", "#a8a29e")),
    },
    symbol: {
      light: toDataUrl(symbolSvg(ORANGE, INK)),
      dark: toDataUrl(symbolSvg(ORANGE, INK)),
    },
    pattern: { kind: "grid", opacity: 0.04 },
  },
  { source: "emai-hub/src/lib/theme/emai" },
);
