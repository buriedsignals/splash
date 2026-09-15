// Every catalogue chart and map type has its own scrolly sheet under `references/types/`, and every
// worked-example path that sheet names on disk actually exists. A sheet promising `proof/scrolly-*`
// evidence nobody rendered is the same defect `matrix.mjs`'s own header warns about one layer up.
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  VISUAL_CATALOG_PATH,
  readVisualCatalog,
} from "../../../scripts/visual-catalog.mjs";

const SPLASH_ROOT = join(import.meta.dirname, "..", "..", "..");
const TYPES_DIR = join(import.meta.dirname, "..", "references", "types");

function catalogTypes() {
  const catalog = readVisualCatalog();
  return catalog.treatments
    .filter(
      (t: { id: string }) =>
        t.id.startsWith("chart.") || t.id.startsWith("map."),
    )
    .map((t: { id: string }) => t.id.slice(t.id.indexOf(".") + 1));
}

describe("scrolly — every catalogue type has a sheet, every worked example exists", () => {
  it("should hold exactly the catalogue's chart and map types, no more, no fewer", () => {
    const types = catalogTypes();
    expect(types.length).toBe(40);
    const sheets = readdirSync(TYPES_DIR)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.slice(0, -".md".length))
      .sort();
    expect(sheets).toEqual([...types].sort());
  });

  it("should give every catalogue type a sheet under 40 lines", () => {
    for (const type of catalogTypes()) {
      const file = join(TYPES_DIR, `${type}.md`);
      expect(existsSync(file)).toBe(true);
      const lines = readFileSync(file, "utf8")
        .split("\n")
        .filter(Boolean).length;
      expect(lines).toBeLessThanOrEqual(40);
    }
  });

  it("should point every sheet's worked-example path at something that exists on disk", () => {
    for (const type of catalogTypes()) {
      const file = join(TYPES_DIR, `${type}.md`);
      const text = readFileSync(file, "utf8");
      const paths = [
        ...text.matchAll(/`(proof\/scrolly-[a-z0-9-]+)\/[^`]*`/g),
      ].map((m) => m[1]);
      expect(paths.length).toBeGreaterThan(0);
      for (const p of paths) {
        expect(existsSync(join(SPLASH_ROOT, p))).toBe(true);
      }
    }
  });

  it("should name a chart or map gesture repertoire the beat's own doctrine defines", () => {
    const repertoire = readFileSync(
      join(
        import.meta.dirname,
        "..",
        "references",
        "directed-type-choreography.md",
      ),
      "utf8",
    );
    for (const type of catalogTypes()) {
      const text = readFileSync(join(TYPES_DIR, `${type}.md`), "utf8");
      expect(text).toContain("## Scroll gestures");
      expect(text).toContain("## A choreography must NOT");
      expect(text).toContain("## Precision to assert");
    }
    expect(repertoire).toContain("## The repertoire");
  });
});
