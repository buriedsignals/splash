import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aggregateNote, fsTools } from "../src/tools/fs.ts";

// Osaurus runs 1 and 4 (2026-11-08): data.json held 3,900 rows, the read was cut at Afghanistan, and the 12B stacked
// World and Africa on the countries twice; the render refused it and the run ran out of time rewriting the beat.
const table = (rows: unknown[][]) =>
  JSON.stringify({ columns: [{ name: "entity" }, { name: "code" }, { name: "year" }, { name: "events" }], rows });
const owid = table([
  ["Afghanistan", "AFG", 2012, 49],
  ["Albania", "ALB", 2012, 7],
  ["Algeria", "DZA", 2012, 60],
  ["Angola", "AGO", 2012, 90],
  ["Argentina", "ARG", 2012, 40],
  ["Australia", "AUS", 2012, 70],
  ["Kosovo", "OWID_KOS", 2012, 3],
  ["Africa", "OWID_AFR", 2012, 500],
  ["Europe (excl. Russia)", null, 2012, 80],
  ["World", "OWID_WRL", 2012, 1000],
]);

describe("aggregateNote", () => {
  it("should name every row that is a total of others before the model draws", () => {
    expect(aggregateNote(owid)).toContain('"Africa", "Europe (excl. Russia)", "World"');
  });

  it("should leave Kosovo among the countries", () => {
    expect(aggregateNote(owid)).not.toContain("Kosovo");
  });

  it("should say a stack takes the countries or one total, never both", () => {
    expect(aggregateNote(owid)).toContain("never both");
  });

  it("should say nothing for a table with no country codes", () => {
    expect(aggregateNote(JSON.stringify({ columns: [{ name: "year" }, { name: "v" }], rows: [[2012, 1]] }))).toBe("");
  });
});

describe("read_file on a country table", () => {
  it("should carry the note after a read cut short", async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), "splash-agg-")));
    const storyDir = join(root, "stories", "demo");
    mkdirSync(join(storyDir, "beats", "1"), { recursive: true });
    const many = Array.from({ length: 3000 }, (_, i) => ["Afghanistan", "AFG", 2012 + (i % 11), i]);
    writeFileSync(join(storyDir, "beats", "1", "data.json"), table([...many, ["World", "OWID_WRL", 2012, 1]]));
    const { readFile } = fsTools({ root, storyDir });
    const out = await readFile.execute("id", { path: "beats/1/data.json" } as never, undefined as never, undefined as never, undefined as never);
    expect(JSON.stringify(out)).toContain('totals of the country rows: \\"World\\"');
  });
});
