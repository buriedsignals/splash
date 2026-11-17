import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertPanelsAccounted } from "../craft/_shared/guards.mjs";

// gx-treemap web (Qwen3.5-9B, mvq120): the beat typed its own list of "European" countries and drew 40 of the 46
// in data.json, so the whole printed 459 GW where the storyboard's comparison is 469 GW, and nothing said so.

const root = mkdtempSync(join(tmpdir(), "parts-accounted-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const here = join(root, "beats", "1");
mkdirSync(here, { recursive: true });
writeFileSync(
  join(here, "data.json"),
  JSON.stringify({ columns: [{ name: "country", type: "text" }, { name: "mw", type: "number" }], rows: [["France", 9], ["Spain", 4], ["Georgia", 2], ["Iraq", 1]] }),
);

describe("parts drawn from the data's rows", () => {
  it("should refuse a whole that leaves rows out unsaid, naming the parts and the limits fix", () => {
    expect(() => assertPanelsAccounted(["France", "Spain"], here, {}, "parts")).toThrow(/parts draw 2 of the 4[\s\S]*Georgia, Iraq[\s\S]*limits/);
  });
  it("should accept the left-out rows when limits says how many of how many", () => {
    expect(() => assertPanelsAccounted(["France", "Spain"], here, { limits: ["2 of the 4 countries"] }, "parts")).not.toThrow();
  });
});
