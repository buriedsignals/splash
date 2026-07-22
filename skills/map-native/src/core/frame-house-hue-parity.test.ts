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

// The opening tag's own bracket: the first '>' at brace-depth 0 after the tag name
// (JSX prop values like {a ?? b?.[0]} contain no depth-0 '>'), so the window never
// bleeds into a nested <MapFilterBar/> or child element.
function openingTag(afterTagName: string): string {
  let depth = 0;
  for (let i = 0; i < afterTagName.length; i++) {
    const c = afterTagName[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return afterTagName.slice(0, i + 1);
  }
  return afterTagName; // unterminated — treat whole remainder as the tag (will fail the houseHue check loudly)
}

// The real map render-sites pass <MapFilterBar/> to <MapFrame> as a render-prop value
// (`belowTitle={...<MapFilterBar houseHue=.../>}`), not as JSX children — so it's still
// textually inside MapFrame's own depth-0-bounded opening-tag span above. Strip any such
// self-closing nested element's own text before checking for houseHue=, so MapFilterBar's
// prop can never stand in for MapFrame's own (and vice-versa for MapFilterBar's own check,
// a no-op there since it has no nested self-closing elements of its own).
function stripNestedTags(tagText: string): string {
  return tagText.replace(/<[A-Za-z][^<>]*\/>/g, "");
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
        const open = stripNestedTags(openingTag(seg));
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
        const open = stripNestedTags(openingTag(seg));
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
