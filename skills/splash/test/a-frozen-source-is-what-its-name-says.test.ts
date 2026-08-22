// A FROZEN SOURCE IS WHAT ITS NAME SAYS IT IS.
//
// `stories/stress-h-site-photographs/source/data.csv` was a JSON document. It had been one since
// intake froze it, through five rounds of stress testing and a delivered beat, and nothing in this
// tree ever noticed — the story's own renderer read it with `JSON.parse` and was right to, because
// that is what the bytes were. Round five recorded it as "unfixable in place", and the real finding
// underneath it was recorded correctly: **nothing checks a frozen source's format.**
//
// This is that check. It is deliberately a sweep over every frozen source rather than a fix to one
// of them: a single renamed file closes a defect, a sweep closes the class. It reads the bytes and
// asks whether they are what the extension claims, which is the only question that matters here —
// a downstream profiler handed a `.csv` full of JSON produces a one-column table whose header is
// `{` and whose every later phase is wrong about the data underneath it.

import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../../intake/scripts/csv.mjs";

const ROOT = join(import.meta.dir, "../../..");
const STORIES = join(ROOT, "stories");

/** Every `source/` file in every story, as a path relative to the repository root. */
function frozenSources(): string[] {
  if (!existsSync(STORIES)) return [];
  const found: string[] = [];
  for (const story of readdirSync(STORIES)) {
    const dir = join(STORIES, story, "source");
    if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
    for (const name of readdirSync(dir)) found.push(join("stories", story, "source", name));
  }
  return found.sort();
}

/** The first character that is not whitespace or a byte-order mark. */
function firstMeaningful(text: string): string {
  return text.replace(/^﻿/, "").trimStart().charAt(0);
}

describe("every frozen source is the format its own extension claims", () => {
  const sources = frozenSources();

  it("should find frozen sources at all — a sweep over nothing is green for the wrong reason", () => {
    expect(sources.length).toBeGreaterThan(30);
  });

  it("should find no .csv holding a JSON document", () => {
    const offenders = sources
      .filter((path) => path.endsWith(".csv"))
      .filter((path) => ["{", "["].includes(firstMeaningful(readFileSync(join(ROOT, path), "utf8"))));
    expect(offenders).toEqual([]);
  });

  it("should find no .csv that does not parse as a table with a header and a row", () => {
    const offenders: string[] = [];
    for (const path of sources.filter((p) => p.endsWith(".csv"))) {
      const rows = parseCsv(readFileSync(join(ROOT, path), "utf8").trim());
      // A real table has a header and at least one row under it, and the header names every column
      // once. A JSON document read as CSV fails the second: `{` is one column, and so is every
      // line under it, but the header carries a brace rather than a name.
      if (rows.length < 2 || rows[0].length < 2 || rows[0].some((name) => name.trim() === ""))
        offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });

  it("should find no .json that does not parse as JSON", () => {
    const offenders: string[] = [];
    for (const path of sources.filter((p) => p.endsWith(".json"))) {
      try {
        JSON.parse(readFileSync(join(ROOT, path), "utf8"));
      } catch {
        offenders.push(path);
      }
    }
    expect(offenders).toEqual([]);
  });
});
