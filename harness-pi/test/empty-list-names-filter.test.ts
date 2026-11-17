// gx-pictogram-isotype video, Qwen3.5-9B (mvq42, 2026-11-17): beat.mjs filtered rows on `const YEAR = 2023` where
// data.json holds only 2024; the kit refused "units must be a non-empty array of { name, value }", which named
// neither the filter nor what data.json holds.
import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyListHint } from "../craft/_shared/guards.mjs";

const here = mkdtempSync(join(tmpdir(), "splash-emptylist-"));
writeFileSync(
  join(here, "data.json"),
  JSON.stringify({ columns: [{ name: "entity" }, { name: "year" }, { name: "share" }], rows: [["France", 2024, 95], ["Pologne", 2024, 31]] }),
);
writeFileSync(join(here, "beat.mjs"), 'const YEAR = 2023; // the story\'s year\nconst units = rows.filter((r) => r[1] === YEAR);\n');

describe("an empty list the beat's own filter emptied", () => {
  it("should name the constant whose value data.json does not hold", () => {
    expect(emptyListHint("units", here)).toContain("YEAR = 2023");
  });
  it("should name what the column holds instead", () => {
    expect(emptyListHint("units", here)).toContain("year holds only 2024");
  });
});

describe("the kit's refusal of an empty list, as the model reads it", () => {
  it("should carry the filter that emptied it", async () => {
    const { errorText } = await import("../craft/_shared/guards.mjs");
    const argv1 = process.argv[1];
    process.argv[1] = join(here, "render-beat.mjs");
    try {
      expect(errorText(new Error("beat.mjs: units must be a non-empty array of { name, value }, one per counted thing"))).toContain("YEAR = 2024");
    } finally {
      process.argv[1] = argv1;
    }
  });
});
