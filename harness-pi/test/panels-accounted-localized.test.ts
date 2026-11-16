import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertPanelsAccounted } from "../craft/_shared/guards.mjs";

// gx-small-multiples web, Qwen3.5-9B (gx-small-multiples-web-seeded-osaurus-qwen-1794850066996): sixteen panels named
// in French from the page's own entity_fr column; the guard read only "entity" (English) and refused "panels draw 2 of
// the 16 entities" — France and Portugal, the two names both languages spell alike.
const dir = mkdtempSync(join(tmpdir(), "splash-panels-"));
writeFileSync(
  join(dir, "data.json"),
  JSON.stringify({
    columns: [{ name: "entity", type: "text" }, { name: "code", type: "text" }, { name: "entity_fr", type: "text" }],
    rows: [["Austria", "AUT", "Autriche"], ["France", "FRA", "France"], ["Germany", "DEU", "Allemagne"]],
  }),
);

describe("panels named in the page's language", () => {
  it("should accept every entity drawn under its localized name", () => {
    expect(() => assertPanelsAccounted(["Autriche", "France", "Allemagne"], dir, {})).not.toThrow();
  });
  it("should accept every entity drawn under its code", () => {
    expect(() => assertPanelsAccounted(["AUT", "FRA", "DEU"], dir, {})).not.toThrow();
  });
  it("should still refuse an entity drawn under no name of its own", () => {
    expect(() => assertPanelsAccounted(["Autriche", "France"], dir, {})).toThrow(/missing: Germany/);
  });
});
