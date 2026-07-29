import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "..", "src");

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe("config.accent is gone from chart-native", () => {
  // `accent` never reached a render through a declared path: NativeSpec has no such field
  // (spec-to-config.ts:43-127) and specToNativeConfig has no injection point for it (:947-988).
  // Its only writer was mergeProfileDefaults, removed 2026-07-29. A dead read is how a field
  // that renders nothing keeps looking alive.
  it("should have no `config.accent` read left in src/", () => {
    const hits = walk(SRC).filter((f) =>
      /config\.accent\b/.test(readFileSync(f, "utf8")),
    );
    expect(hits).toEqual([]);
  });
});
