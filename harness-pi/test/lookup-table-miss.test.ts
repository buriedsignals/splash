import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { errorText } from "../craft/_shared/guards.mjs";

// gx-small-multiples web, Qwen3.5-9B (gx-small-multiples-web-seeded-osaurus-qwen-1794847325635): the kit's example
// keys its names table by "Code"; Qwen keyed NAMES by code but read the "entity" column, and the refusal was only
// "undefined is not an object (evaluating 'NAMES[code].name')", twice, with no line and no key.
const data = {
  columns: [{ name: "entity", type: "string" }, { name: "code", type: "string" }, { name: "year", type: "number" }, { name: "entity_fr", type: "string" }],
  rows: [["Austria", "AUT", 2020, "Autriche"], ["Belgium", "BEL", 2020, "Belgique"], ["Czechia", "CZE", 2020, "Tchéquie"]],
};
async function loadError(column: number, keys: string[]) {
  const dir = mkdtempSync(join(tmpdir(), "splash-lookup-"));
  writeFileSync(join(dir, "data.json"), JSON.stringify(data));
  const table = keys.map((k) => `  ${k}: { name: "${k}" },`).join("\n");
  writeFileSync(join(dir, "beat.mjs"), `import { readFileSync } from "node:fs";\nconst t = JSON.parse(readFileSync(new URL("./data.json", import.meta.url), "utf8"));\nconst NAMES = {\n${table}\n};\nconst codes = t.rows.map((r) => r[${column}]);\nexport default { panels: codes.map((code) => ({ name: NAMES[code].name })) };\n`);
  try {
    await import(join(dir, "beat.mjs"));
  } catch (e) {
    return errorText(e);
  }
  throw new Error("beat.mjs loaded");
}

describe("a lookup in a table beat.mjs writes out that finds no entry", () => {
  it("should name the beat.mjs line of the lookup", async () => {
    expect(await loadError(0, ["AUT", "BEL", "CZE"])).toContain("beat.mjs line 9");
  });
  it("should name the column whose values the table is keyed by when the lookup reads another column", async () => {
    expect(await loadError(0, ["AUT", "BEL", "CZE"])).toMatch(/keyed by the values of column "code"[\s\S]*value that works/);
  });
  it("should name the values of the key column the table leaves out", async () => {
    expect(await loadError(1, ["AUT", "BEL"])).toMatch(/no entry for "CZE"/);
  });
  it("should point at a localized name column when data.json carries one", async () => {
    expect(await loadError(0, ["AUT", "BEL", "CZE"])).toContain('"entity_fr"');
  });
});
