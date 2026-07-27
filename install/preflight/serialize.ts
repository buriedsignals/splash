// serialize.ts — turning what the journalist submitted into the two files that own it.
//
// The split is the decor's invariant, not a preference: every credential goes to .env, and
// newsroom.json holds what no provider reads (what is enabled, in which language, through which
// publisher, and when a provider last answered). Which of the two a field belongs to is DERIVED
// from the capability registry — `settingsFields` says what is secret, and the capability's own
// `env` groups say what a producer reads out of the environment. A name the registry never
// declared is written nowhere: the page's payload arrives over a socket and is not trusted to
// name arbitrary environment variables.
//
// .env is MERGED, never rewritten. The old configurator serialized the whole file from the form,
// so a field left blank silently erased a working key — unacceptable for a page that reopens on
// one section and is forbidden from redisplaying a secret.
import {
  NEWSROOM_CAPABILITIES,
  type CapabilitySettingField,
} from "../../lib/newsroom/capabilities.ts";
import { isSet } from "../../lib/newsroom/probe.ts";
import type {
  CapabilityState,
  NewsroomState,
} from "../../lib/newsroom/state.ts";
import type { VerifyOutcome } from "../../lib/newsroom/verify.ts";

export type PreflightSubmission = {
  runtime: string;
  uiLang: string;
  /** The deliverables' language — only used when the profile is being created. */
  contentLang?: string;
  /** The runtime's own API key. Blank = the subscription/OAuth login path. */
  anthropic?: string;
  /** Keyed by the registry's field names. A blank value means "leave what is there". */
  credentials: Record<string, string>;
  enabled: string[];
  publisher?: string;
  /** Live check verdicts gathered by the page, per capability id. */
  verified?: Record<string, VerifyOutcome>;
  newsroom?: NewsroomFacts;
};

export type NewsroomFacts = {
  name?: string;
  url?: string;
  color?: string;
  lang?: string;
};

/** Every field the registry declares, with the capability that declared it. */
function declaredFields(): Map<
  string,
  { field: CapabilitySettingField; envNames: string[]; capabilityIds: string[] }
> {
  const out = new Map<
    string,
    {
      field: CapabilitySettingField;
      envNames: string[];
      capabilityIds: string[];
    }
  >();
  for (const cap of Object.values(NEWSROOM_CAPABILITIES)) {
    if (!cap.implemented) continue;
    for (const field of cap.settingsFields ?? []) {
      const existing = out.get(field.name);
      if (existing) {
        existing.capabilityIds.push(cap.id);
        for (const n of cap.env.flat())
          if (!existing.envNames.includes(n)) existing.envNames.push(n);
        continue;
      }
      out.set(field.name, {
        field,
        envNames: cap.env.flat(),
        capabilityIds: [cap.id],
      });
    }
  }
  return out;
}

// The same two characters the configurator dropped, for the same reason: a double quote or a
// newline cannot legitimately appear in these credentials, and either would corrupt the file for
// one of the two launchers (POSIX `. ./.env`, or `for /f … set "%%a=%%~b"` on Windows).
function envValue(raw: string): string {
  return `"${raw.trim().replace(/[\r\n"]/g, "")}"`;
}

/**
 * The .env lines a submission changes. Blank values are absent by construction: "leave what is
 * there" is expressed by not mentioning the key, which is what makes `mergeEnvFile` safe.
 */
export function envUpdates(sub: PreflightSubmission): Record<string, string> {
  const updates: Record<string, string> = {};
  if (isSet(sub.anthropic)) updates.ANTHROPIC_API_KEY = sub.anthropic!;

  const declared = declaredFields();
  for (const [name, value] of Object.entries(sub.credentials)) {
    if (!isSet(value)) continue;
    const entry = declared.get(name);
    if (!entry) continue; // never write a name the registry does not declare
    if (!entry.field.secret && !entry.envNames.includes(name)) continue;
    updates[name] = value;
    // The MapTiler mirror: one key, two names (Vite reads one, Remotion the other). Writing
    // only what was typed would leave video rendering unconfigured on a machine that has a key.
    for (const alias of entry.envNames)
      if (alias !== name && mirrors(name, alias)) updates[alias] = value;
  }
  return updates;
}

/** Two env names are mirrors when a capability lists them in the SAME alternatives group. */
function mirrors(a: string, b: string): boolean {
  return Object.values(NEWSROOM_CAPABILITIES).some((cap) =>
    cap.env.some((group) => group.includes(a) && group.includes(b)),
  );
}

/**
 * Apply updates to the text of a .env file: existing keys in place, unknown lines untouched,
 * new keys appended. Nothing is ever removed — this file is also where a newsroom hand-adds
 * things Splash has never heard of.
 */
export function mergeEnvFile(
  existing: string,
  updates: Record<string, string>,
): string {
  // A blank value is "leave what is there", at BOTH doors: `envUpdates` never emits one, and
  // this refuses one anyway. The failure being defended against — a blank field wiping a working
  // key — is silent, unrecoverable and only noticed at the next production run.
  const remaining = new Map(
    Object.entries(updates).filter(([, v]) => isSet(v)),
  );
  const lines = existing.split("\n");
  const merged = lines.map((line) => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=/);
    if (!m) return line;
    const name = m[1]!;
    if (!remaining.has(name)) return line;
    const value = remaining.get(name)!;
    remaining.delete(name);
    return `${name}=${envValue(value)}`;
  });
  while (merged.length && merged[merged.length - 1]!.trim() === "")
    merged.pop();
  for (const [name, value] of remaining)
    merged.push(`${name}=${envValue(value)}`);
  return merged.join("\n") + "\n";
}

/**
 * The non-secret settings each capability keeps in newsroom.json (an S3 endpoint, a bucket).
 * A blank submission keeps what the newsroom already had: the page does not redisplay these
 * either, so a blank field means "unchanged", never "erase".
 */
export function settingsUpdates(
  sub: PreflightSubmission,
  previous: NewsroomState,
): Record<string, Record<string, string>> {
  const declared = declaredFields();
  const out: Record<string, Record<string, string>> = {};
  for (const [id, state] of Object.entries(previous.capabilities))
    if (state.settings && Object.keys(state.settings).length)
      out[id] = { ...state.settings };

  for (const [name, value] of Object.entries(sub.credentials)) {
    const entry = declared.get(name);
    if (!entry || entry.field.secret || entry.envNames.includes(name)) continue;
    if (!isSet(value)) continue;
    for (const id of entry.capabilityIds)
      out[id] = { ...(out[id] ?? {}), [name]: value.trim() };
  }
  return out;
}

/**
 * The state a submission produces. Every registry capability gets an explicit `enabled`, so
 * unticking one is recorded rather than forgotten, and a live verdict is stamped only when this
 * submission actually obtained one — an absent `lastVerified` truthfully reads "never checked".
 */
export function submittedState(
  sub: PreflightSubmission,
  previous: NewsroomState,
  at: string = new Date().toISOString(),
): NewsroomState {
  const settings = settingsUpdates(sub, previous);
  const capabilities: Record<string, CapabilityState> = {};
  for (const id of Object.keys(NEWSROOM_CAPABILITIES)) {
    const verdict = sub.verified?.[id];
    const lastVerified = verdict
      ? { at, result: verdict }
      : previous.capabilities[id]?.lastVerified;
    capabilities[id] = {
      enabled: sub.enabled.includes(id),
      ...(settings[id] && Object.keys(settings[id]!).length
        ? { settings: settings[id]! }
        : {}),
      ...(lastVerified ? { lastVerified } : {}),
    };
  }
  return {
    ...previous,
    schemaVersion: 1,
    runtime: sub.runtime || previous.runtime,
    uiLang: sub.uiLang || previous.uiLang,
    capabilities,
    ...(sub.publisher ? { publisher: sub.publisher } : {}),
  };
}

/**
 * NEWSROOM-PROFILE.md, created ONCE from the shape of the shipped template. It is never
 * round-tripped: after creation the file belongs to the newsroom, comments and all (spec
 * 2026-07-24 decision 6), so this only has to produce something the parser reads and a human
 * can keep editing.
 */
export function profileMarkdown(facts: NewsroomFacts): string {
  const lines = ["---"];
  if (isSet(facts.color)) {
    lines.push("palette:");
    lines.push(`  - "${facts.color!.trim()}"   # your house colour`);
  }
  if (isSet(facts.name)) {
    lines.push("source:");
    lines.push(`  name: "${facts.name!.trim()}"`);
    if (isSet(facts.url)) lines.push(`  url: "${facts.url!.trim()}"`);
  }
  lines.push(`lang: "${(facts.lang || "en").trim()}"`);
  lines.push("---");
  lines.push("");
  lines.push("# Newsroom profile");
  lines.push("");
  lines.push(
    "Splash reuses this house style on every visual. Edit it whenever you like — this file is",
  );
  lines.push(
    "yours; Splash only created it. See NEWSROOM-PROFILE.example.md for every supported field.",
  );
  lines.push("");
  return lines.join("\n");
}
