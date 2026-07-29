import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const KB = join(import.meta.dir, "..", "..", "knowledge", "references");

function mdFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...mdFiles(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

describe("the KB does not contradict the code on baseColor", () => {
  // SCOPE, said plainly: this is a LITERAL-PHRASE lock, not a general "no technical claims in
  // the KB" test — no test can decide whether a sentence of prose is technical. It locks the
  // one claim that was measured contradicting the code on three independent sites:
  //   skills/chart-native/src/spec-to-config.ts:392-395 threads spec.baseColor "so the
  //   sequential ramp is DERIVED from it (heatmapRamp)";
  //   skills/chart-native/src/core/tokens.ts:260 (heatmapRamp);
  //   skills/chart-native/src/heatmap-geometry.ts:106;
  //   and the produce guard reads the same derived ramp
  //   (skills/chart-native/src/core/produce-conformance.ts:906).
  // Decision (spec §7①): the CODE is authoritative, and a purely technical KB claim is REMOVED
  // rather than kept in sync.
  it("should not tell anyone that baseColor is ignored", () => {
    const files = mdFiles(KB);
    expect(files.length).toBeGreaterThan(0); // the walk actually found KB files to check
    const offenders = files.filter((f) =>
      /baseColor[^\n]{0,40}\bignored\b/i.test(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
