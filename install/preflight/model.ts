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
};

export type PreflightCapability = {
  id: string;
  label: string;
  kind: NewsroomCapability["kind"];
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
    login: (RuntimeLogin & { configured: boolean }) | null;
  }[];
  runtime: string;
  language: { ui: string; content: string };
  /** True when NEWSROOM-PROFILE.md exists: the page then refuses to rewrite it. */
  profileExists: boolean;
  /**
   * The CURRENTLY SELECTED runtime's own sign-in — the same value as
   * `runtimes.find(r => r.id === runtime)?.login`, kept for callers that already have the
   * runtime pinned and want its login without filtering the array.
   */
  login: (RuntimeLogin & { configured: boolean }) | null;
  fields: PreflightField[];
  engines: PreflightCapability[];
  delivery: PreflightCapability[];
  publisher: string | null;
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
  focus?: string;
  resolveDep?: (pkg: string, fromDir: string) => boolean;
  skillsRoot?: string;
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
    kind: cap.kind,
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
  const capabilities = described.map(({ cap, readiness, ifEnabled }) =>
    describeCapability(cap, readiness, ifEnabled, state, env),
  );
  const count = (status: ReadinessStatus) =>
    capabilities.filter((c) => c.status === status).length;

  const runtimes = Object.entries(RUNTIMES).map(([id, rt]) => ({
    id,
    label: rt.label,
    verified: rt.verified,
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
    login: runtimes.find((r) => r.id === state.runtime)?.login ?? null,
    fields: collectFields(state, env),
    engines: capabilities.filter((c) => c.kind === "engine"),
    delivery: capabilities.filter((c) => c.kind === "delivery"),
    publisher: state.publisher ?? null,
    blockers: readinessBlockers(described.map((d) => d.readiness)),
    summary: {
      ready: count("ready"),
      missing: count("missing"),
      degraded: count("unverified"),
    },
    ...(input.focus ? { focus: input.focus } : {}),
  };
}
