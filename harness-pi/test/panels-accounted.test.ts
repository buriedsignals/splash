import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertPanelsAccounted } from "../craft/_shared/guards.mjs";

// gx-small-multiples on Osaurus (2026-11-12): to clear the plate's hairline refusal the 12B kept only the
// countries above 50 TWh — 11 of 16, the story's subject (Denmark) among the dropped — under a title that
// says all sixteen progressed, and nothing on the plate said five were missing.

const root = mkdtempSync(join(tmpdir(), "panels-accounted-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const here = join(root, "beats", "1");
mkdirSync(here, { recursive: true });
const all = ["Austria", "Belgium", "Denmark", "France"];
writeFileSync(
  join(here, "data.json"),
  JSON.stringify({
    columns: [{ name: "entity", type: "text" }, { name: "year", type: "number" }, { name: "v", type: "number" }],
    rows: all.flatMap((e) => [[e, 2000, 1], [e, 2024, 2]]),
  }),
);

describe("panels drawn from the data's entities", () => {
  it("should refuse a beat that drops entities without saying so, naming them", () => {
    expect(() => assertPanelsAccounted(["Austria", "France"], here, {})).toThrow(/Belgium, Denmark/);
  });
  it("should accept the dropped entities when foldNote says how many of how many", () => {
    expect(() => assertPanelsAccounted(["Austria", "France"], here, { foldNote: (a: number, b: number) => `${a} of ${b}` })).not.toThrow();
  });
  it("should accept every entity drawn", () => {
    expect(() => assertPanelsAccounted(all, here, {})).not.toThrow();
  });
});
