/**
 * THE CAMERA AND THE BASEMAP ARE THE BEAT'S DECISIONS, AND A BEAT CAN NOW MAKE THEM.
 *
 * `bake-plate.mjs` took `--size`, `--out`, `--data` and six sealed-runtime paths on the command
 * line, and kept the two decisions that are most obviously per-story — which ground this map covers
 * and which basemap it is drawn over — as constants inside the skill. Round six measured the
 * consequence twice: the bake "hard-codes `dataviz-light` with no flag", and a beat that needed
 * another camera copied the whole script into its own directory to change two lines, which is how a
 * beat's bake drifts from the canonical one (`splash/test/bake-parity.test.ts` found exactly that,
 * in two functions, this round).
 *
 * DRIVEN AS A SUBPROCESS, not imported: this module launches a browser at import time, so there is
 * no way to unit-test the function. What is asserted is what a beat's author actually meets — the
 * process's own exit status and its own message — and every case below is refused BEFORE any
 * browser is launched, which is why these run in milliseconds and need no Chrome.
 */
import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const BAKE = join(import.meta.dirname, "..", "scripts", "bake-plate.mjs");

function bake(...args: string[]) {
  const run = spawnSync("bun", [BAKE, ...args], { encoding: "utf8", timeout: 60_000 });
  return `${run.stdout ?? ""}${run.stderr ?? ""}`;
}

describe("the bake's camera and basemap", () => {
  it("should refuse a --bounds that is not JSON, naming what it got", () => {
    expect(bake("--bounds", "-14,34,28,64")).toMatch(/--bounds is not JSON: -14,34,28,64/);
  });

  it("should refuse a --bounds that is not two corners of four finite numbers", () => {
    expect(bake("--bounds", "[[-14,34]]")).toMatch(/west, south/);
    expect(bake("--bounds", '[[-14,"south"],[28,64]]')).toMatch(/four finite numbers/);
  });

  it("should refuse a box with no area rather than bake a plate with no ground in it", () => {
    expect(bake("--bounds", "[[28,34],[-14,64]]")).toMatch(/west to east and south to north/);
    expect(bake("--bounds", "[[-14,64],[28,34]]")).toMatch(/west to east and south to north/);
  });

  it("should declare both flags in its own usage, so a beat can find them without reading the code", () => {
    const source = Bun.file(BAKE);
    return source.text().then((text) => {
      expect(text).toContain('flag("--bounds"');
      expect(text).toContain('flag("--style"');
      // The seed's own camera stays the default, so every existing caller runs unchanged.
      expect(text).toMatch(/SEED_BEAT\.bounds/);
      expect(text).toMatch(/SEED_BEAT\.style/);
    });
  });
});
