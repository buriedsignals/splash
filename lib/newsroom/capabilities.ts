// capabilities.ts — the newsroom DECOR's declarative model: what each capability requires,
// in newsroom language. Hoisted out of skills/splash/src/preflight.ts, which now derives its
// ENGINE_REQUIREMENTS from here: the same dependency-arrow inversion lib/core/vocabulary.ts
// performed for formats and channels, for the same reason — lib/ must not depend on the
// legacy orchestrator's vocabulary.
//
// A capability is what a newsroom can TURN ON. Which of them a given newsroom has enabled is
// STATE (lib/newsroom/state.ts); whether an enabled one is usable right now is READINESS
// (lib/newsroom/readiness.ts). This file only declares requirements.

/** One field the setup page must ask for. `secret: true` ⇒ it belongs in .env, never elsewhere. */
export type CapabilitySettingField = {
  name: string;
  label: string;
  secret: boolean;
};

export type NewsroomCapability = {
  /** Registry key. Engine ids are producer names; delivery ids name the publisher. */
  id: string;
  /** Newsroom-facing label. NEVER an env var name — that is issue #5's complaint. */
  label: string;
  kind: "engine" | "delivery";
  /** Each inner array is an ALTERNATIVES group: at least one member must be set. */
  env: string[][];
  /** Per-var: where the journalist gets it. */
  envHelp: Record<string, string>;
  /** What the setup page asks for, and which of it is secret. */
  settingsFields?: CapabilitySettingField[];
  criticalDeps: { fromSkillDir: string; packages: string[] } | null;
  /** false = declared here, filled in by its own sub-project (Livraison, #4). */
  implemented: boolean;
};

const DW_HELP =
  "create a token at https://app.datawrapper.de/account/api-tokens (free account works)";
const MT_HELP = "create a free key at https://cloud.maptiler.com/account/keys/";

const DW_FIELD: CapabilitySettingField = {
  name: "DATAWRAPPER_API_TOKEN",
  label: "Datawrapper API token",
  secret: true,
};
const MT_FIELD: CapabilitySettingField = {
  name: "VITE_MAPTILER_KEY",
  label: "MapTiler key",
  secret: true,
};

export const NEWSROOM_CAPABILITIES: Record<string, NewsroomCapability> = {
  "dw-chart": {
    id: "dw-chart",
    label: "Datawrapper charts",
    kind: "engine",
    env: [["DATAWRAPPER_API_TOKEN"]],
    envHelp: { DATAWRAPPER_API_TOKEN: DW_HELP },
    settingsFields: [DW_FIELD],
    criticalDeps: null, // cloud producer: fetch only, no heavy local deps
    implemented: true,
  },
  "map-dw": {
    id: "map-dw",
    label: "Datawrapper maps",
    kind: "engine",
    env: [["DATAWRAPPER_API_TOKEN"]],
    envHelp: { DATAWRAPPER_API_TOKEN: DW_HELP },
    settingsFields: [DW_FIELD],
    criticalDeps: null,
    implemented: true,
  },
  "chart-native": {
    id: "chart-native",
    label: "Charts built in-house (no account needed)",
    kind: "engine",
    env: [],
    envHelp: {},
    criticalDeps: { fromSkillDir: "chart-native", packages: ["react", "vite"] },
    implemented: true,
  },
  "map-native": {
    id: "map-native",
    label: "Maps built in-house (interactive and video)",
    kind: "engine",
    env: [["VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"]],
    envHelp: { VITE_MAPTILER_KEY: MT_HELP, REMOTION_MAPTILER_KEY: MT_HELP },
    settingsFields: [MT_FIELD],
    criticalDeps: {
      fromSkillDir: "map-native",
      // @maptiler/sdk (a DIRECT map-native dependency), never maplibre-gl: the latter only
      // resolves via hoisting through the SDK's dep graph — a phantom check that would go
      // permanently red on a healthy install if the SDK ever re-arranged its deps (review F4).
      packages: ["react", "remotion", "@maptiler/sdk"],
    },
    implemented: true,
  },
  scrolly: {
    id: "scrolly",
    label: "Scrollytelling stories",
    kind: "engine",
    env: [["VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"]],
    envHelp: { VITE_MAPTILER_KEY: MT_HELP, REMOTION_MAPTILER_KEY: MT_HELP },
    settingsFields: [MT_FIELD],
    criticalDeps: { fromSkillDir: "scrolly", packages: ["react", "vite"] },
    implemented: true,
  },
  // image-native (C5): prep + build are local — no API key of its own (the scrolly host
  // build's MapTiler need is the scrolly entry's concern). sharp is the critical native
  // dep (the exact "binary missing after a bare clone" crash class C2 exists for).
  "image-native": {
    id: "image-native",
    label: "Photo narratives",
    kind: "engine",
    env: [],
    envHelp: {},
    criticalDeps: { fromSkillDir: "image-native", packages: ["sharp"] },
    implemented: true,
  },
  "embed-cloudflare": {
    id: "embed-cloudflare",
    label: "Publish an embeddable link (Cloudflare Pages)",
    kind: "delivery",
    env: [
      ["CLOUDFLARE_API_TOKEN"],
      ["CLOUDFLARE_ACCOUNT_ID"],
      ["SPLASH_EMBED_PROJECT"],
    ],
    envHelp: {
      CLOUDFLARE_API_TOKEN:
        'create an account API token with the "Cloudflare Pages: Edit" permission at https://dash.cloudflare.com (Manage Account → API Tokens → Create Token)',
      CLOUDFLARE_ACCOUNT_ID:
        "copy it from the Workers & Pages page at https://dash.cloudflare.com (Account details → Account ID)",
      SPLASH_EMBED_PROJECT:
        'choose a Cloudflare Pages project name that identifies the newsroom (e.g. "heidi-news-splash") — it becomes the public URL <visual>.<project>.pages.dev, so it must not be generic',
    },
    settingsFields: [
      {
        name: "CLOUDFLARE_API_TOKEN",
        label: "Cloudflare API token",
        secret: true,
      },
      {
        name: "CLOUDFLARE_ACCOUNT_ID",
        label: "Cloudflare account ID",
        secret: false,
      },
      {
        name: "SPLASH_EMBED_PROJECT",
        label: "Project name (becomes the public link)",
        secret: false,
      },
    ],
    criticalDeps: null,
    implemented: true,
  },
  // Declared, not built — the publisher adapters the Livraison sub-project (#4) fills in.
  // Readiness never reports an unimplemented capability as ready (readiness.ts).
  "embed-cms": {
    id: "embed-cms",
    label: "Publish through the newsroom's CMS",
    kind: "delivery",
    env: [],
    envHelp: {},
    criticalDeps: null,
    implemented: false,
  },
  "embed-s3": {
    id: "embed-s3",
    label: "Publish to the newsroom's own object storage",
    kind: "delivery",
    env: [],
    envHelp: {},
    criticalDeps: null,
    implemented: false,
  },
  "embed-fly": {
    id: "embed-fly",
    label: "Publish to Fly.io",
    kind: "delivery",
    env: [],
    envHelp: {},
    criticalDeps: null,
    implemented: false,
  },
};

export function engineCapabilities(): NewsroomCapability[] {
  return Object.values(NEWSROOM_CAPABILITIES).filter(
    (c) => c.kind === "engine",
  );
}

export function deliveryCapabilities(): NewsroomCapability[] {
  return Object.values(NEWSROOM_CAPABILITIES).filter(
    (c) => c.kind === "delivery",
  );
}
