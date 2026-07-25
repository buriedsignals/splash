// state.ts — the newsroom scope of state: the decor that persists BETWEEN articles, as
// opposed to lib/loop's per-article run manifest. It lives next to .env at the install root.
//
// What is NOT here, deliberately: credentials. Secrets and the provider identifiers that sit
// beside them (CLOUDFLARE_ACCOUNT_ID, SPLASH_EMBED_PROJECT — read from the environment by
// deploy-embed.mjs) stay in .env, which keeps every field to exactly one home. The schema is
// therefore strict: an unknown key in the file is dropped on read, so a credential written
// here by mistake cannot survive a round trip.
import { z } from "zod";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { NEWSROOM_CAPABILITIES } from "./capabilities";
import { isSet } from "./probe";

export const NEWSROOM_STATE_FILE = "newsroom.json";

const CapabilityStateSchema = z.object({
  /** What the newsroom WANTS. A disabled capability is never reported as a failure. */
  enabled: z.boolean(),
  /**
   * NON-secret provider identifiers this capability's own settingsFields ask for (an S3
   * endpoint, a bucket name, a project id) — never a credential: that lives in .env. The map is
   * plain strings, so the type system cannot express "must not be a secret"; `stripSecretSettings`
   * enforces it instead, on both doors (read and write), against the capability's OWN declared
   * `secret: true` fields. Optional, so a state file written before this field existed still
   * reads (spec 2026-07-24 §3.2).
   */
  settings: z.record(z.string(), z.string()).optional(),
  /** The last live provider check, when one has run (the setup page performs it). */
  lastVerified: z
    .object({
      at: z.string(),
      result: z.enum(["ok", "rejected", "unreachable"]),
    })
    .optional(),
});

const NewsroomStateSchema = z.object({
  schemaVersion: z.literal(1),
  /** The agentic runtime chosen at install (absorbed from .splash-runtime). */
  runtime: z.string(),
  /** INTERFACE language (BCP-47). The deliverables' language lives in NEWSROOM-PROFILE.md. */
  uiLang: z.string(),
  // The strip runs INSIDE the schema, not in readNewsroomState: parsing is the only way into
  // this shape, so a secret hand-written into the file cannot be seen by any reader — including
  // one that parses the schema itself rather than going through readNewsroomState.
  capabilities: z
    .record(z.string(), CapabilityStateSchema)
    .transform(stripSecretSettings),
  /** The delivery capability id the newsroom publishes through, when it has chosen one. */
  publisher: z.string().optional(),
  /**
   * The three transverse delivery preferences. Everything else a publisher needs is declared
   * BY that publisher through settingsFields — no generic field without a reader
   * (spec 2026-07-25 §3.6). Optional, so a state file written before they existed still reads.
   */
  delivery: z
    .object({
      snippetTemplate: z.string().optional(),
      maxWidth: z.number().optional(),
      height: z.union([z.number(), z.literal("responsive")]).optional(),
    })
    .optional(),
});

export type CapabilityState = z.infer<typeof CapabilityStateSchema>;
export type NewsroomState = z.infer<typeof NewsroomStateSchema>;

export const DEFAULT_NEWSROOM_STATE: NewsroomState = {
  schemaVersion: 1,
  runtime: "claude",
  uiLang: "en",
  capabilities: {},
};

/**
 * A capability an install can already exercise was, in effect, already chosen: someone
 * supplied its key. Enabling exactly those — and nothing else — is the ENABLEMENT DEFAULT of
 * the whole decor (spec §4.5): it is what stops a working install from being asked to
 * configure itself again, and what stops a fresh clone with a hand-written `.env` from
 * reporting every capability disabled with an empty reason.
 *
 * One home, two callers: `loadDecor` when no `newsroom.json` exists, and the legacy
 * migration, which only adds `runtime` and the green stamps on top of this.
 */
export function defaultCapabilities(
  env: Record<string, string | undefined>,
): Record<string, CapabilityState> {
  const capabilities: Record<string, CapabilityState> = {};
  for (const [id, cap] of Object.entries(NEWSROOM_CAPABILITIES))
    capabilities[id] = {
      // A capability that is only DECLARED (its adapter is not built) can never be enabled by
      // the presence of a key, however many are set.
      enabled:
        cap.implemented &&
        cap.env.every((group) => group.some((name) => isSet(env[name]))),
    };
  return capabilities;
}

/**
 * Drop, from every capability's `settings`, any key that capability's OWN `settingsFields`
 * declares `secret: true`.
 *
 * `settingsFields` is one flat list per capability, mixing SPLASH_S3_SECRET_ACCESS_KEY with
 * endpoint/bucket/region, and `settings` is keyed by those same names — so whoever fills the bag
 * reads a list that puts the credentials in the same column as the endpoint. The Préflight
 * invariant "no .env value lands in newsroom.json" therefore cannot be left to the writer's
 * discipline (today there is no writer at all: the file is hand-edited).
 *
 * Applied on BOTH doors — inside the schema, so no reader of the file can see a secret whatever
 * path it took, and in `writeNewsroomState`, so an in-memory state carrying one cannot reach the
 * disk. Scoped per capability rather than by name pattern: a key is secret only where its own
 * capability says so.
 */
function stripSecretSettings(
  capabilities: Record<string, CapabilityState>,
): Record<string, CapabilityState> {
  const cleaned: Record<string, CapabilityState> = {};
  for (const [id, state] of Object.entries(capabilities)) {
    const secretNames = (NEWSROOM_CAPABILITIES[id]?.settingsFields ?? [])
      .filter((f) => f.secret)
      .map((f) => f.name);
    if (!state.settings || secretNames.length === 0) {
      cleaned[id] = state;
      continue;
    }
    const settings = Object.fromEntries(
      Object.entries(state.settings).filter(
        ([name]) => !secretNames.includes(name),
      ),
    );
    cleaned[id] = { ...state, settings };
  }
  return cleaned;
}

export function newsroomStatePath(dir: string): string {
  return join(dir, NEWSROOM_STATE_FILE);
}

/**
 * Read the decor. NEVER throws: an absent, unreadable or unrecognised file yields the
 * default state, because a broken decor must not stop a run from starting — the setup page
 * is how it gets fixed.
 */
export function readNewsroomState(dir: string): NewsroomState {
  const path = newsroomStatePath(dir);
  if (!existsSync(path)) return DEFAULT_NEWSROOM_STATE;
  try {
    const parsed = NewsroomStateSchema.safeParse(
      JSON.parse(readFileSync(path, "utf8")),
    );
    return parsed.success ? parsed.data : DEFAULT_NEWSROOM_STATE;
  } catch {
    return DEFAULT_NEWSROOM_STATE;
  }
}

export function writeNewsroomState(dir: string, state: NewsroomState): void {
  mkdirSync(dir, { recursive: true });
  const path = newsroomStatePath(dir);
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  // The write door: a secret held in memory (a caller that read one from .env and merged it in)
  // never reaches the file, so the invariant does not depend on every writer remembering it.
  const safe: NewsroomState = {
    ...state,
    capabilities: stripSecretSettings(state.capabilities),
  };
  writeFileSync(tmp, JSON.stringify(safe, null, 2) + "\n");
  renameSync(tmp, path); // atomic replace on the same filesystem
}
