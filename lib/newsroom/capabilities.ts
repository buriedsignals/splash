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
  /**
   * A NON-secret field the capability's adapter refuses to run without (an S3 endpoint, a
   * bucket). Readiness reads it, so an enabled destination missing one reads `missing` instead
   * of `ready` — the gap that let a newsroom with its two S3 keys in .env be told everything
   * was fine and then be refused at the moment of delivery.
   *
   * Absent ⇒ optional. It is only meaningful on a non-secret field: a secret never reaches
   * `settings` at all (`stripSecretSettings`), its presence is judged through `env`.
   */
  required?: boolean;
};

/** What the journalist wants to be able to make. The engine is how, not what. */
export type WantId = "charts" | "maps" | "scrollys" | "photo-stories";

export type NewsroomCapability = {
  /** Registry key. Engine ids are producer names; delivery ids name the publisher. */
  id: string;
  /**
   * A standalone NAME that stands as the subject of a sentence on its own — NEVER an env var
   * name (issue #5's complaint). This is what readiness.ts, the setup page's blocker line, and
   * skills/splash's ENGINE_LABELS interpolate into prose: "${label} needs …", "${label}'s video
   * renderer …". A chattier caption belongs in `choice`, not here — reusing a checkbox caption
   * as this field is what broke those sentences the first time (fix round 1, Finding 1).
   */
  label: string;
  /**
   * The checkbox/radio row's OWN caption, read under its want heading ("Charts" → "With a
   * Datawrapper account"). Only `capabilityRow` renders it; every other reader wants `label`.
   * Absent ⇒ falls back to `label` — true of every delivery capability today, none of which
   * needs a caption distinct from its name.
   */
  choice?: string;
  kind: "engine" | "delivery";
  /** The want this engine serves; the setup page groups the tools under it. Delivery has none. */
  want?: WantId;
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
    choice: "With a Datawrapper account",
    kind: "engine",
    want: "charts",
    env: [["DATAWRAPPER_API_TOKEN"]],
    envHelp: { DATAWRAPPER_API_TOKEN: DW_HELP },
    settingsFields: [DW_FIELD],
    criticalDeps: null, // cloud producer: fetch only, no heavy local deps
    implemented: true,
  },
  "map-dw": {
    id: "map-dw",
    label: "Datawrapper maps",
    choice: "With a Datawrapper account",
    kind: "engine",
    want: "maps",
    env: [["DATAWRAPPER_API_TOKEN"]],
    envHelp: { DATAWRAPPER_API_TOKEN: DW_HELP },
    settingsFields: [DW_FIELD],
    criticalDeps: null,
    implemented: true,
  },
  "chart-native": {
    id: "chart-native",
    label: "The in-house chart engine",
    choice: "In-house, no account needed (includes video)",
    kind: "engine",
    want: "charts",
    env: [],
    envHelp: {},
    // remotion (its video render path) is a critical dep like react/vite: an incident showed
    // package resolution alone reporting "installed" while the headless-shell browser it needs
    // to actually render had downloaded incompletely (readiness.ts's browser probe, gated on
    // this list carrying "remotion").
    criticalDeps: {
      fromSkillDir: "chart-native",
      packages: ["react", "vite", "remotion"],
    },
    implemented: true,
  },
  "map-native": {
    id: "map-native",
    label: "The in-house map engine",
    choice: "In-house, needs a MapTiler key (includes video)",
    kind: "engine",
    want: "maps",
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
    label: "The scrolly engine",
    choice: "Scroll-driven stories",
    kind: "engine",
    want: "scrollys",
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
    label: "The photo-narrative engine",
    choice: "From the newsroom's own photographs",
    kind: "engine",
    want: "photo-stories",
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
  // The hand-over of a deliverable that is ALREADY published — a Datawrapper interactive chart or
  // map, live on Datawrapper's own CDN with no file the newsroom owns. It uploads nothing, so it
  // needs no key of its own and is ALWAYS ready: an embed the run cannot deliver would be a
  // visual that is offerable, choosable, producible and undeliverable, which is exactly the dead
  // end this capability closes.
  "embed-hosted": {
    id: "embed-hosted",
    label: "Hand over the published embed link (already live)",
    kind: "delivery",
    env: [],
    envHelp: {},
    criticalDeps: null,
    implemented: true,
  },
  // The universal fallback: it publishes to disk, so it needs no key and is therefore ALWAYS
  // ready. That is what makes "no host configured" a working path rather than a dead end.
  zip: {
    id: "zip",
    label: "Download a portable package (works everywhere)",
    kind: "delivery",
    env: [],
    envHelp: {},
    criticalDeps: null,
    implemented: true,
  },
  // We.Publish — the CMS of the FJM grant deliverable. Measured against a real instance stood
  // up locally (spec 2026-07-27-l3-wepublish-design.md §3); the adapter is
  // lib/delivery/adapters/wepublish.ts.
  "embed-cms": {
    id: "embed-cms",
    label: "Publish through the newsroom's CMS (We.Publish)",
    kind: "delivery",
    // Two single-member groups: both are required, the same shape embed-s3 uses.
    env: [["SPLASH_WEPUBLISH_EMAIL"], ["SPLASH_WEPUBLISH_PASSWORD"]],
    envHelp: {
      // W3: a `createToken` API token is REFUSED for createArticle — the editorial mutations
      // need a user session, so this is an account rather than a key. Which makes WHICH
      // account it is a real instruction, not a formality: a human editor's admin password in
      // a .env file is the wrong answer, and it is the answer someone reaches for by default.
      SPLASH_WEPUBLISH_EMAIL:
        "the address of a We.Publish user created FOR Splash (in the editor, under Users) — not a person's own account. It needs permission to create and publish articles",
      SPLASH_WEPUBLISH_PASSWORD:
        "that user's password. We.Publish has no scoped API token for editorial actions, so this is an account password — store it only in /splash/.env, and give the account nothing beyond article rights",
    },
    settingsFields: [
      {
        name: "SPLASH_WEPUBLISH_EMAIL",
        label: "We.Publish user for Splash (email)",
        secret: true,
      },
      {
        name: "SPLASH_WEPUBLISH_PASSWORD",
        label: "That user's password",
        secret: true,
      },
      {
        name: "endpoint",
        // W1: the path is /v1, not /graphql. Someone pasting the editor's address, or the
        // site's, gets a 404 with nothing in it pointing at the path — so the label carries it.
        label:
          "We.Publish GraphQL address — the full URL, ending in /v1 (for example https://cms.example.org/v1)",
        secret: false,
        required: true,
      },
      {
        name: "slugPrefix",
        label:
          'Slug prefix for the articles Splash creates (optional, defaults to "splash-")',
        secret: false,
      },
    ],
    criticalDeps: null,
    implemented: true,
  },
  "embed-s3": {
    id: "embed-s3",
    label: "Publish to the newsroom's own object storage",
    kind: "delivery",
    // Two single-member groups — S3 needs BOTH, not one of several, the same shape
    // embed-cloudflare uses for its three.
    env: [["SPLASH_S3_ACCESS_KEY_ID"], ["SPLASH_S3_SECRET_ACCESS_KEY"]],
    envHelp: {
      SPLASH_S3_ACCESS_KEY_ID:
        "the access key id for the newsroom's S3-compatible bucket, from its provider's console (AWS IAM, Cloudflare R2, or the self-hosted server's admin panel)",
      SPLASH_S3_SECRET_ACCESS_KEY:
        "the secret access key paired with the access key id above — issued once by the same provider, store it only in /splash/.env",
    },
    settingsFields: [
      {
        name: "SPLASH_S3_ACCESS_KEY_ID",
        label: "S3 access key ID",
        secret: true,
      },
      {
        name: "SPLASH_S3_SECRET_ACCESS_KEY",
        label: "S3 secret access key",
        secret: true,
      },
      {
        name: "endpoint",
        // Path-style is not a preference here: the adapter builds the upload path as
        // {endpoint}/{bucket}/{key}, so a virtual-host URL pasted in ("https://bucket.s3.
        // amazonaws.com") yields /bucket/bucket/key and an undiagnosable 404. F5 covers the
        // PUBLIC url, which is configured separately; this one has to be the plain host.
        label:
          "S3-compatible endpoint URL, path-style (the server's own host, not the bucket's hostname)",
        secret: false,
        required: true,
      },
      {
        name: "region",
        label: "Region",
        secret: false,
        required: true,
      },
      {
        name: "bucket",
        label: "Bucket name",
        secret: false,
        required: true,
      },
      {
        name: "prefix",
        label: "Object key prefix (optional)",
        secret: false,
      },
      {
        name: "publicBaseUrl",
        label: "Public URL the bucket serves from",
        secret: false,
        required: true,
      },
    ],
    criticalDeps: null,
    implemented: true,
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
