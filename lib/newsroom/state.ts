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
   * endpoint, a bucket name, a project id — never a credential: that lives in .env, and this
   * is a plain string map, so nothing here can be schema-typed as "must not be a secret" — the
   * boundary is held by the WRITER, never by this field. Optional, so a state file written
   * before this field existed still reads (spec 2026-07-24 §3.2).
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
  capabilities: z.record(z.string(), CapabilityStateSchema),
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
  writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n");
  renameSync(tmp, path); // atomic replace on the same filesystem
}
