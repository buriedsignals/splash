// The context a session starts with must leave room for the work AND let compaction bring the
// session back under its own trigger: a floor that only fits once is a session that compacts in a
// loop. Required reads are counted in the floor because they are injected with the body — a
// reference read through a tool would be compacted away, and with it the doctrine.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Profile } from "./profiles.ts";

export const SLOT = { contextWindow: 98_304, reserveTokens: 8_192 } as const;

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
  const limit = SLOT.contextWindow - SLOT.reserveTokens;
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
