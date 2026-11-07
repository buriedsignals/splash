// The context a session starts with must leave room for the work AND let compaction bring the
// session back under its own trigger: a floor that only fits once is a session that compacts in a
// loop. Required reads are counted in the floor because they are injected with the body — a
// reference read through a tool would be compacted away, and with it the doctrine.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Profile } from "./profiles.ts";

/** The launch window Tom's Engine plans for the local tier (REMI §9: assume 65,536). */
export const SLOT = { contextWindow: 65_536 } as const;

export type Tier = "12b" | "26b" | "31b";

/**
 * Spotlight's per-tier fold floor and kept tail (harness/pi/src/config.ts LOCAL_TIER_FOLD): bigger models hold
 * discipline deeper, so they fold later and keep more.
 */
export const TIER_FOLD: Record<Tier, { at: number; keep: number }> = {
  "12b": { at: 20_480, keep: 4_000 },
  "26b": { at: 24_576, keep: 6_000 },
  "31b": { at: 28_672, keep: 7_000 },
};

/** The 12b tier's fold floor and kept tail; `turn` is the room a session with a large floor keeps for one turn. */
export const FOLD = { ...TIER_FOLD["12b"], turn: 6_000 } as const;

/** Output cap per request: a quarter of the window, never below 8192 (Spotlight's maxOutputTokens). */
export function maxOutputTokens(contextWindow: number): number {
  return Math.max(8_192, Math.floor(contextWindow / 4));
}

/** One full 30,000-character read at the most token-hungry tokenizer Spotlight measured (~2.3 characters a token). */
const READ_TURN_TOKENS = Math.ceil(30_000 / 2.3);
const FOLD_MARGIN = 4_096;

/**
 * Where a session folds. Spotlight's rule: past the fold point there must still be room for one turn — the output
 * cap, a full read and a margin — because Pi folds only after a turn ends; the tier's floor applies on small windows.
 * Splash adds its own floor: a session whose system prompt is large must fold above what it needs to fold back under
 * (floor, kept tail, summary, one turn), or it compacts in a loop. When that exceeds Spotlight's room, the profile
 * overflows and describeOverflow names it.
 */
export function foldAt(floorTokens: number, tier: Tier = "12b", contextWindow: number = SLOT.contextWindow): number {
  const spotlight = Math.max(
    TIER_FOLD[tier].at,
    contextWindow - maxOutputTokens(contextWindow) - READ_TURN_TOKENS - FOLD_MARGIN,
  );
  const own = floorTokens + TIER_FOLD[tier].keep + SUMMARY_ALLOWANCE_TOKENS + FOLD.turn;
  return Math.min(contextWindow - maxOutputTokens(contextWindow), Math.max(spotlight, own));
}

/** Preamble plus tool schemas, until U5/U6 measure the real ones. */
export const HARNESS_OVERHEAD_TOKENS = 3_000;
/** Upper bound for one 1280 px image through the Gemma 4 projector. */
export const IMAGE_TOKENS = 1_120;
export const SUMMARY_ALLOWANCE_TOKENS = 2_000;
export const WORK_MARGIN_TOKENS = { craft: 20_000, other: 12_000 } as const;
export const CRAFT_IMAGES = 2;

/** Conservative bytes-per-token estimate; the live test replaces it with the server's tokenizer. */
export function estimateTokens(text: string): number {
  return Math.ceil(Buffer.byteLength(text, "utf8") / 3.2);
}

export interface Measurement {
  owner: string;
  floor: number;
  work: number;
  afterCompaction: number;
  limit: number;
  fitsWork: boolean;
  fitsCompaction: boolean;
}

export function measureProfile(
  profile: Profile,
  checkout: string,
  count: (text: string) => number = estimateTokens,
): Measurement {
  const files = [profile.body, ...profile.requiredReads];
  let floor = HARNESS_OVERHEAD_TOKENS;
  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(join(checkout, file), "utf8");
    } catch {
      throw new Error(`${profile.owner}: instruction file ${file} is missing`);
    }
    floor += count(text);
  }
  const limit = SLOT.contextWindow - maxOutputTokens(SLOT.contextWindow);
  const work =
    floor +
    (profile.craft
      ? WORK_MARGIN_TOKENS.craft + CRAFT_IMAGES * IMAGE_TOKENS
      : WORK_MARGIN_TOKENS.other);
  const afterCompaction =
    floor + profile.keepRecentTokens + SUMMARY_ALLOWANCE_TOKENS;
  return {
    owner: profile.owner,
    floor,
    work,
    afterCompaction,
    limit,
    fitsWork: work <= limit,
    fitsCompaction: afterCompaction < limit,
  };
}

export function describeOverflow(m: Measurement): string | null {
  if (!m.fitsWork)
    return `${m.owner}: floor ${m.floor} + working margin = ${m.work} tokens exceeds ${m.limit}`;
  if (!m.fitsCompaction)
    return `${m.owner}: floor ${m.floor} + kept ${m.afterCompaction - m.floor} = ${m.afterCompaction} tokens cannot compact under ${m.limit}`;
  return null;
}
