// model.ts — everything the setup page shows, decided HERE and handed to the browser as data.
//
// Two properties this file exists to hold:
//
//  1. It is DERIVED FROM THE REGISTRY. Sections, fields, help text and secrecy all come from
//     lib/newsroom/capabilities.ts. Adding a capability is a registry entry, never an edit to a
//     form — which is what the hand-written configurator required (six fields hard-coded across
//     the HTML, the serializer and the verifier).
//  2. It NEVER carries a credential's value. The page must be able to say "already configured"
//     without ever putting a secret back on the wire, so the model holds a boolean and nothing
//     else. There is a test that serializes the whole model and greps for the values.
//
// Pure: the environment and dependency resolution are injected, exactly like `readiness`.
import {
  NEWSROOM_CAPABILITIES,
  type NewsroomCapability,
  type WantId,
} from "../../lib/newsroom/capabilities.ts";
import { resolveLanguage } from "../../lib/newsroom/language.ts";
import {
  capabilityReadiness,
  readinessBlockers,
  type CapabilityReadiness,
  type ReadinessStatus,
} from "../../lib/newsroom/readiness.ts";
import { isSet, type BrowserProbeResult } from "../../lib/newsroom/probe.ts";
import {
  DEFAULT_NEWSROOM_STATE,
  type NewsroomState,
} from "../../lib/newsroom/state.ts";
import { RUNTIMES, type RuntimeLogin } from "../configurator-core.ts";
import { hasRuntimeModuleForPlatform } from "../read-runtime.ts";

/**
 * The newsroom's own profile, as declared in NEWSROOM-PROFILE.md — read-only here (task-2's
 * scope stops at the data; a sibling task renders it). `profileExists` says a file is present;
 * this says what it declares, which is not the same thing — a profile can exist and name only
 * the newsroom.
 */
export type PreflightProfile = {
  name?: string;
  url?: string;
  /** Ordered; the first is the house colour. */
  palette?: string[];
  lang?: string;
  /** "light" | "dark" | "#rrggbb" */
  theme?: string;
};

/** Where a field's value belongs once submitted. Secrets are always `env`. */
export type FieldDestination = "env" | "settings";

export type PreflightField = {
  /** The env var name or settings key. Shown only as secondary "technical detail". */
  name: string;
  /** The journalist-facing label. */
  label: string;
  secret: boolean;
  /** Where to get it, with the link — straight from the capability's envHelp. */
  help: string;
  destination: FieldDestination;
  /** Every capability this one field serves; the page asks for it once. */
  capabilities: string[];
  /** True when a value is already in place. NEVER the value itself. */
  configured: boolean;
  /**
   * True when at least one capability this field serves is `kind: "engine"` — a production key,
   * asked outright rather than gated behind a tick. Derived from the registry (never a
   * hand-written list of names): a newsroom should not have to tick a box to be allowed to hand
   * over a token it already has. A field that serves ONLY delivery capabilities (Cloudflare, S3,
   * We.Publish) stays `false` — a newsroom that delivers a file has no S3 account to give, and
   * asking for one it will never have is the same fault mirrored.
   */
  upfront: boolean;
};

/**
 * What the newsroom will be able to PRODUCE — one row per engine, derived from what is
 * configured, never from a tick (Task 5, 2026-08-06: the checkbox that used to decide this is
 * gone). No "missing", no blame: an account with no key is a choice, not a defect, so an
 * unavailable engine names the key that would open it rather than reporting a failure.
 */
export type PreflightProducible = {
  id: string;
  /** The journalist's own words for it — `choice ?? label` from the registry. */
  label: string;
  /** True once this engine's own requirements are met (or it needs none). Never gated on a tick. */
  available: boolean;
  /** The field(s), in the page's own vocabulary, that would make it available. Absent when ready. */
  opensWith?: string;
};

export type PreflightCapability = {
  id: string;
  /** A standalone name — the subject of readiness prose. NEVER the checkbox caption; see `choice`. */
  label: string;
  /** The radio row's own caption — only a delivery destination reaches this type now (engines
   *  render from `producible` instead). Absent ⇒ the row falls back to `label`. */
  choice?: string;
  kind: NewsroomCapability["kind"];
  /** The want this engine serves — copied from the registry. Delivery capabilities have none. */
  want?: WantId;
  enabled: boolean;
  /** false = declared, not built yet. Unavailable is not a failure. */
  available: boolean;
  /** Names of the fields nested under this capability. */
  fields: string[];
  status: ReadinessStatus;
  /**
   * The status this capability WOULD have if it were enabled. The page lets a journalist tick a
   * capability the saved state has off, and must answer that tick immediately ("Missing — needs a
   * MapTiler key") — computed here, so the browser never re-implements readiness to say it.
   */
  statusIfEnabled: ReadinessStatus;
  /**
   * Why it is not ready — the saved state's reason, or, when the saved state simply has it
   * switched off, the reason it would give once ticked. The page needs the second one the
   * instant a box is ticked; the summary of BLOCKERS is unaffected, since a capability that is
   * off is not a blocker whatever this string says.
   */
  reason: string;
  /**
   * The names of the fields this capability still needs — the page's way of saying what is
   * missing in its own vocabulary ("Needs: MapTiler key"), instead of repeating readiness's env
   * var names, which is exactly the complaint issue #5 makes. Empty when nothing is missing, and
   * empty for a missing DEPENDENCY, which no field can supply (the reason covers that).
   */
  missingFields: string[];
  help: string[];
};

export type PreflightModel = {
  /**
   * Every runtime's OWN sign-in, `configured` included — not only the currently selected one's.
   * The page lets a journalist switch runtimes before saving, and a runtime configured in an
   * earlier session must not be reported as missing just because it is not the one the page
   * opened with (that was Finding 1: the flag used to go stale on switch).
   */
  runtimes: {
    id: string;
    label: string;
    verified: boolean;
    /**
     * true only when `verified` AND this platform ships a module for it
     * (`hasRuntimeModuleForPlatform`). What the radio actually gates on — see the type's own
     * `verified` for the (separate) proof-or-decision judgement.
     */
    selectable: boolean;
    login: (RuntimeLogin & { configured: boolean }) | null;
  }[];
  runtime: string;
  language: { ui: string; content: string };
  /**
   * True when NEWSROOM-PROFILE.md exists. The page renders it as editable fields either way — a
   * submission rewrites only the fields it knows and preserves everything else in the file
   * (`lib/newsroom/profile-write.ts`'s `updateProfileMarkdown`). This flag only changes the
   * notice shown above the form, never whether the form can be edited.
   */
  profileExists: boolean;
  /** What that file declares — null when the install has no profile on disk. */
  profile: PreflightProfile | null;
  /**
   * The CURRENTLY SELECTED runtime's own sign-in — the same value as
   * `runtimes.find(r => r.id === runtime)?.login`, kept for callers that already have the
   * runtime pinned and want its login without filtering the array.
   */
  login: (RuntimeLogin & { configured: boolean }) | null;
  fields: PreflightField[];
  /** What the newsroom will be able to produce — see `PreflightProducible`. Replaces the old
   *  ticked `engines` list (Task 5, 2026-08-06): there is no tick left to render. */
  producible: PreflightProducible[];
  delivery: PreflightCapability[];
  publisher: string | null;
  /**
   * What still stands in the way of a PUBLISHING CHOICE — never an engine (an unconfigured
   * engine is not a blocker, it is a row in `producible`). A destination is a blocker only once
   * the newsroom has chosen it; one nobody chose is `disabled`, not missing.
   */
  blockers: CapabilityReadiness[];
  summary: { ready: number; missing: number; degraded: number };
  /** The section to open on — `?section=<id>`, issue #5's "reopen at the relevant section". */
  focus?: string;
};

export type PreflightModelInput = {
  state?: NewsroomState;
  env?: Record<string, string | undefined>;
  /** Does NEWSROOM-PROFILE.md exist? Its content language is then the newsroom's to edit. */
  profileExists?: boolean;
  /** The deliverables' language declared by that profile, when there is one. */
  profileLang?: string;
  /** What NEWSROOM-PROFILE.md declares, already parsed — null or absent when there is none. */
  profile?: PreflightProfile | null;
  focus?: string;
  resolveDep?: (pkg: string, fromDir: string) => boolean;
  skillsRoot?: string;
  /** The machine serving the page — defaults to `process.platform`. Injectable for tests. */
  platform?: NodeJS.Platform;
  /** Injectable for tests, exactly like resolveDep — see lib/newsroom/readiness.ts's own opt. */
  probeBrowser?: (fromDir: string) => BrowserProbeResult;
};

/**
 * Every name that satisfies the same requirement as `field` — the MapTiler mirror is one key
 * under two names, and an install that has either is configured. Derived from the capability's
 * own env groups, so the rule cannot drift from what readiness judges.
 */
function aliasesOf(
  field: string,
  capabilities: NewsroomCapability[],
): string[] {
  const names = new Set<string>([field]);
  for (const cap of capabilities)
    for (const group of cap.env)
      if (group.includes(field)) for (const n of group) names.add(n);
  return [...names];
}

/** The chosen runtime's own sign-in, with whether it is already set in .env — or null when the
 * runtime needs none. */
function loginOf(
  runtime: string,
  env: Record<string, string | undefined>,
): (RuntimeLogin & { configured: boolean }) | null {
  const login = RUNTIMES[runtime]?.login;
  return login ? { ...login, configured: isSet(env[login.name]) } : null;
}

function collectFields(
  state: NewsroomState,
  env: Record<string, string | undefined>,
): PreflightField[] {
  const byName = new Map<string, PreflightField>();
  const owners = new Map<string, NewsroomCapability[]>();

  for (const cap of Object.values(NEWSROOM_CAPABILITIES)) {
    // A capability nobody can use yet has nothing to ask for: collecting its fields would put
    // inputs on the page that lead nowhere.
    if (!cap.implemented) continue;
    for (const f of cap.settingsFields ?? []) {
      const envNames = cap.env.flat();
      const existing = byName.get(f.name);
      if (existing) {
        existing.capabilities.push(cap.id);
        owners.get(f.name)!.push(cap);
        continue;
      }
      byName.set(f.name, {
        name: f.name,
        label: f.label,
        secret: f.secret,
        help: cap.envHelp[f.name] ?? "",
        // A field the capability declares in its env groups is read from the environment by the
        // producer itself (deploy-embed reads CLOUDFLARE_ACCOUNT_ID) — .env is its one home. A
        // field that appears nowhere in those groups (an S3 endpoint, a bucket) is read by the
        // adapter out of newsroom.json's settings. The registry decides; nothing is hard-coded.
        destination: f.secret || envNames.includes(f.name) ? "env" : "settings",
        capabilities: [cap.id],
        configured: false,
        upfront: false,
      });
      owners.set(f.name, [cap]);
    }
  }

  for (const field of byName.values()) {
    field.configured =
      field.destination === "env"
        ? aliasesOf(field.name, owners.get(field.name)!).some((n) =>
            isSet(env[n]),
          )
        : field.capabilities.some((id) =>
            isSet(state.capabilities[id]?.settings?.[field.name]),
          );
    field.upfront = owners
      .get(field.name)!
      .some((cap) => cap.kind === "engine");
  }
  return [...byName.values()];
}

/**
 * The declared fields still to fill — what to ask for, by name.
 *
 * Two homes, one list: a credential whose env group is unsatisfied, and a REQUIRED non-secret
 * setting (an S3 endpoint, a bucket) absent from the saved state. Readiness refuses on both, and
 * a blocker the page cannot name falls back to readiness's own sentence — which speaks in
 * newsroom.json keys, the vocabulary this list exists to keep off the summary.
 */
function missingFieldsOf(
  cap: NewsroomCapability,
  state: NewsroomState,
  env: Record<string, string | undefined>,
): string[] {
  const unsatisfied = cap.env.filter(
    (group) => !group.some((name) => isSet(env[name])),
  );
  const settings = state.capabilities[cap.id]?.settings ?? {};
  return (cap.settingsFields ?? [])
    .filter(
      (f) =>
        unsatisfied.some((group) => group.includes(f.name)) ||
        (f.required && !f.secret && !isSet(settings[f.name])),
    )
    .map((f) => f.name);
}

/**
 * What this ENGINE lets the newsroom produce — Task 5's replacement for the ticked
 * `PreflightCapability` row. `available` comes straight from `readiness` (never a tick: an
 * engine has none any more), and a live check that could not REACH the provider still counts as
 * available — "unverified" is not "invalid" (readiness.ts's own rule), and a key that may well
 * work is not something to withhold from a constat that carries no blame either way.
 */
function producibleOf(
  cap: NewsroomCapability,
  readiness: CapabilityReadiness,
  state: NewsroomState,
  env: Record<string, string | undefined>,
  fields: PreflightField[],
): PreflightProducible {
  const available =
    readiness.status === "ready" || readiness.status === "unverified";
  const opensWith = missingFieldsOf(cap, state, env)
    .map((n) => fields.find((f) => f.name === n)?.label)
    .filter((l): l is string => Boolean(l));
  return {
    id: cap.id,
    label: cap.choice ?? cap.label,
    available,
    ...(opensWith.length ? { opensWith: opensWith.join(", ") } : {}),
  };
}

// Exported: it is the seam the "declared but not built" rendering is tested against.
// lib/newsroom/capabilities.ts's own invariant (capabilities.test.ts's "every capability the
// page offers is actually built") means the shipped registry can no longer hold an unbuilt
// exemplar for this module's tests to reach through NEWSROOM_CAPABILITIES — this function lets
// a test feed a local NewsroomCapability stub through the REAL shaping logic instead.
export function describeCapability(
  cap: NewsroomCapability,
  readiness: CapabilityReadiness,
  ifEnabled: CapabilityReadiness,
  state: NewsroomState,
  env: Record<string, string | undefined>,
): PreflightCapability {
  return {
    id: cap.id,
    label: cap.label,
    choice: cap.choice,
    kind: cap.kind,
    want: cap.want,
    enabled: state.capabilities[cap.id]?.enabled === true,
    available: cap.implemented,
    fields: (cap.settingsFields ?? []).map((f) => f.name),
    status: readiness.status,
    statusIfEnabled: ifEnabled.status,
    reason: readiness.reason || ifEnabled.reason,
    missingFields: cap.implemented ? missingFieldsOf(cap, state, env) : [],
    help: readiness.help,
  };
}

export function preflightModel(
  input: PreflightModelInput = {},
): PreflightModel {
  const state = input.state ?? { ...DEFAULT_NEWSROOM_STATE, capabilities: {} };
  const env = input.env ?? {};
  const opts = {
    env,
    ...(input.resolveDep ? { resolveDep: input.resolveDep } : {}),
    ...(input.skillsRoot ? { skillsRoot: input.skillsRoot } : {}),
    ...(input.probeBrowser ? { probeBrowser: input.probeBrowser } : {}),
  };

  // The same state with everything switched on, so each capability can also be asked what it
  // would report if the journalist ticked it. One function answers both questions.
  const allOn: NewsroomState = {
    ...state,
    capabilities: Object.fromEntries(
      Object.keys(NEWSROOM_CAPABILITIES).map((id) => [
        id,
        { ...(state.capabilities[id] ?? {}), enabled: true },
      ]),
    ),
  };
  const described = Object.values(NEWSROOM_CAPABILITIES).map((cap) => ({
    cap,
    readiness: capabilityReadiness(cap, state, opts),
    ifEnabled: capabilityReadiness(cap, allOn, opts),
  }));
  const count = (status: ReadinessStatus) =>
    described.filter((d) => d.readiness.status === status).length;
  const fields = collectFields(state, env);

  const platform = input.platform ?? process.platform;
  const runtimes = Object.entries(RUNTIMES).map(([id, rt]) => ({
    id,
    label: rt.label,
    verified: rt.verified,
    selectable: rt.verified && hasRuntimeModuleForPlatform(id, platform),
    login: loginOf(id, env),
  }));

  return {
    runtimes,
    runtime: state.runtime,
    language: resolveLanguage({
      uiLang: state.uiLang,
      ...(input.profileLang ? { profileLang: input.profileLang } : {}),
    }),
    profileExists: input.profileExists === true,
    profile: input.profile ?? null,
    login: runtimes.find((r) => r.id === state.runtime)?.login ?? null,
    fields,
    producible: described
      .filter((d) => d.cap.kind === "engine")
      .map((d) => producibleOf(d.cap, d.readiness, state, env, fields)),
    delivery: described
      .filter((d) => d.cap.kind === "delivery")
      .map((d) =>
        describeCapability(d.cap, d.readiness, d.ifEnabled, state, env),
      ),
    publisher: state.publisher ?? null,
    blockers: readinessBlockers(
      described
        .filter((d) => d.cap.kind === "delivery")
        .map((d) => d.readiness),
    ),
    summary: {
      ready: count("ready"),
      missing: count("missing"),
      degraded: count("unverified"),
    },
    ...(input.focus ? { focus: input.focus } : {}),
  };
}
