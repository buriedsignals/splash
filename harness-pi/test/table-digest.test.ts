import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fsTools } from "../src/tools/fs.ts";

// Osaurus run 5 (2026-11-08): each read of a 3,900-row data.json put ~32,000 tokens in the context (about 200 s of
// prefill on either server); folded away a turn later, it was read four times — 860 s of a 1,277 s craft.
const columns = [{ name: "entity", type: "text" }, { name: "code", type: "text" }, { name: "year", type: "number" }, { name: "events", type: "number" }];
const countries = Array.from({ length: 300 }, (_, i) => `Country ${i}`);
const rows = [
  ...countries.flatMap((c, i) => [2012, 2013, 2014].map((y) => [c, `C${String(i).padStart(2, "0")}`.slice(0, 3).toUpperCase().replace(/\d/g, (d) => "ABCDEFGHIJ"[Number(d)]), y, i + y - 2012])),
  ...[2012, 2013, 2014].map((y) => ["World", "OWID_WRL", y, 1000 + y]),
  ...[2012, 2013, 2014].map((y) => ["Africa", "OWID_AFR", y, 500 + y]),
];
const root = realpathSync(mkdtempSync(join(tmpdir(), "splash-digest-")));
const storyDir = join(root, "stories", "demo");
mkdirSync(join(storyDir, "beats", "1"), { recursive: true });
writeFileSync(join(storyDir, "beats", "1", "data.json"), JSON.stringify({ columns, rows }));
writeFileSync(join(storyDir, "beats", "1", "small.json"), JSON.stringify({ columns, rows: rows.slice(0, 3) }));
const read = async (path: string) => {
  const { readFile } = fsTools({ root, storyDir });
  const out = (await readFile.execute("id", { path } as never, undefined as never, undefined as never, undefined as never)) as { content: { text: string }[] };
  return out.content[0].text;
};

describe("read_file on a large table", () => {
  it("should return a digest far shorter than the file", async () => {
    expect((await read("beats/1/data.json")).length).toBeLessThan(8_000);
  });

  it("should give the row count and the columns in order", async () => {
    expect(await read("beats/1/data.json")).toContain("906 rows; columns in order: entity (text), code (text), year (number), events (number)");
  });

  it("should list every value of a short column", async () => {
    expect(await read("beats/1/data.json")).toContain("year: 2012, 2013, 2014");
  });

  it("should give every row of the totals, since takeaways are mostly about them", async () => {
    expect(await read("beats/1/data.json")).toContain('["World","OWID_WRL",2014,3014]');
  });

  it("should leave a small table whole", async () => {
    expect(await read("beats/1/small.json")).toBe(JSON.stringify({ columns, rows: rows.slice(0, 3) }));
  });
});
