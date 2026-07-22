import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Every place that renders <MapFrame> or <MapFilterBar>, or calls legendTheme(), must forward the
// newsroom house hue so map furniture tints in lockstep with chart furniture (S3). This guard fails
// loud when a new render-site forgets the hue — the fan-out completeness lock.
const SRC = join(import.meta.dir, "..");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith(".tsx") || e.name.endsWith(".ts") ? [p] : [];
  });
}

describe("map furniture house-hue parity", () => {
  const files = walk(SRC).filter(
    (f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"),
  );

  it("every <MapFrame> render-site forwards houseHue", () => {
    const missing: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      // for each JSX <MapFrame ...> opening tag, require a houseHue= prop before its close
      const tags = src.split("<MapFrame").slice(1);
      for (const seg of tags) {
        const open = seg.slice(
          0,
          seg.indexOf("/>") >= 0 ? seg.indexOf("/>") : seg.indexOf(">"),
        );
        if (!/houseHue=/.test(open)) missing.push(f);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every <MapFilterBar> render-site forwards houseHue", () => {
    const missing: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const tags = src.split("<MapFilterBar").slice(1);
      for (const seg of tags) {
        const open = seg.slice(
          0,
          seg.indexOf("/>") >= 0 ? seg.indexOf("/>") : seg.indexOf(">"),
        );
        if (!/houseHue=/.test(open)) missing.push(f);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every legendTheme() call passes a third argument", () => {
    const missing: string[] = [];
    for (const f of files) {
      if (f.endsWith("legend-theme.ts")) continue; // the definition
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/legendTheme\(([^)]*)\)/g)) {
        const args = m[1].split(",");
        if (args.length < 3) missing.push(`${f}: legendTheme(${m[1]})`);
      }
    }
    expect(missing).toEqual([]);
  });
});
