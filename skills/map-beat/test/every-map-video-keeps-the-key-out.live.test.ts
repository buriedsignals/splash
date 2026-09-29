/**
 * THE MAPTILER KEY IS IN NO FILE A MAP VIDEO'S MEASUREMENT OR RENDER WROTE — FOR EVERY MAP VIDEO IN `proof/`.
 *
 * The key reaches MapTiler only through the local proxy (`scripts/maptiler-proxy.mjs`), which caches
 * responses keyless in `DEFAULT_CACHE_DIR`. This scans that shared cache once, then every map video
 * beat's `renders/` and `measured.json`, byte for byte, for the key. A map video beat is a
 * `proof/video-*` folder carrying `measure.mjs`, the file that reaches the live map — discovered,
 * not listed, so a new catalogue beat is held to it the day it is measured.
 *
 * A story beat is not scanned here: it may live in an installed root outside any checkout, so the
 * map video scaffold writes it its own `no-key.live.test.ts`.
 *
 * Needs the worktree's .env (`set -a && . ./.env`). A key-less run fails loudly, never skips.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { mapTilerKeyIn } from "#shared/map-beat/glyphs.mjs";
import { DEFAULT_CACHE_DIR } from "../scripts/maptiler-proxy.mjs";
import { beatsUnder } from "../../../tests/support/proof.ts";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const PROOF = join(ROOT, "proof");
const key = mapTilerKeyIn(process.env);

// Kept local, not tests/support/tree.ts: it follows symlinks (statSync) and skips nothing.
const files = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).flatMap((f) =>
        statSync(join(dir, f)).isDirectory()
          ? files(join(dir, f))
          : [join(dir, f)],
      )
    : [];

/** The files among `paths` whose bytes contain the key, named relative to the checkout. */
function carryingTheKey(paths: string[]): string[] {
  if (!key)
    throw new Error(
      "no MapTiler key in the environment: run with the worktree's .env loaded",
    );
  const needle = Buffer.from(key);
  return paths
    .filter((f) => readFileSync(f).includes(needle))
    .map((f) => relative(ROOT, f));
}

const MAP_VIDEOS = beatsUnder(PROOF)
  .filter((d) => d.startsWith("video-") && existsSync(join(PROOF, d, "measure.mjs")))
  .sort();

describe("the MapTiler key", () => {
  it("should be in no response the proxy cached", () => {
    expect(carryingTheKey(files(DEFAULT_CACHE_DIR))).toEqual([]);
  });

  it("should have map video beats to look for it in", () => {
    expect(MAP_VIDEOS.length).toBeGreaterThan(0);
  });

  for (const beat of MAP_VIDEOS) {
    it(`should be in no render, props file or measurement of proof/${beat}`, () => {
      const renders = files(join(PROOF, beat, "renders"));
      const measured = join(PROOF, beat, "measured.json");
      expect([renders.length > 0, existsSync(measured)]).toEqual([true, true]);
      expect(carryingTheKey([...renders, measured])).toEqual([]);
    });
  }
});
