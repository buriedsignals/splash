import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveSeed, sheetOf } from "../eval/seed-matrix.ts";

const STORYBOARD = `---\ntakeaway: "Lisboa alone carries 214 of the 394 million trips."\nlimits: "One year only."\ncredit: "Source: CP."\nlanguage: en\nslots:\n  - id: 1\n    medium: chart\n    format: static\n    size: landscape\n    chosen: "Bar and column"\n---\n`;

describe("seed-matrix", () => {
  const seed = () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-seed-"));
    mkdirSync(join(dir, "beats", "1"), { recursive: true });
    writeFileSync(join(dir, "STORYBOARD.md"), STORYBOARD);
    writeFileSync(join(dir, "beats", "1", "data.json"), JSON.stringify({ schemaVersion: 1, slot: { id: "1", format: "static" }, columns: [], rows: [] }));
    return dir;
  };

  it("should tell a derived seed its format in the storyboard and the data, without a static size", () => {
    const from = seed();
    const to = `${from}-web`;
    deriveSeed(from, to, "web");
    const text = readFileSync(join(to, "STORYBOARD.md"), "utf8");
    expect([/format: web/.test(text), /size:/.test(text), JSON.parse(readFileSync(join(to, "beats", "1", "data.json"), "utf8")).slot.format]).toEqual([true, false, "web"]);
  });

  it("should answer the sheet from the storyboard, with the format as publication", () => {
    expect(sheetOf(STORYBOARD, "scrolly")).toMatchObject({ takeaway: "Lisboa alone carries 214 of the 394 million trips.", publication: "Scrollytelling." });
  });
});
