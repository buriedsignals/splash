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
import { readHeader } from "../../intake/scripts/header.mjs";

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

  // ASKED THROUGH `readHeader`, WHICH IS THE READER INTAKE ITSELF NOW USES — 2026-08-23.
  //
  // This used to read `rows[0]` and refuse any header row narrower than two fields or carrying a
  // blank cell. Round eight froze two publishers' real files and both were red under it, for
  // reasons that were NOT "this file is not a table":
  //
  //   Destatis  21 named columns followed by 16 the workbook's used range overshot into — no
  //             header, and no value in any of the 327 rows.
  //   SLF       three banner lines above the header, so `rows[0]` was the institute's name.
  //
  // The complaint was right — intake profiled the first as 37 columns, sixteen of them named `""`,
  // and the second as ONE column over 1,409 rows — but it was a complaint about INTAKE, not about
  // the bytes. `readHeader` (`intake/scripts/header.mjs`) is the fix: it finds the header under a
  // banner, drops an unnamed column no row carries a value in, names an unnamed column that DOES
  // carry values by its position, and REPORTS every one of those on the profile. So this asks the
  // question through it, and what remains red is a file no reading can make into a table.
  //
  // This is NOT the guard being narrowed. It still refuses a header with fewer than two columns, a
  // table with no row under its header, and a file `readHeader` can find no header in at all —
  // mutation-checked below with `stress-h-site-photographs`'s own JSON-in-a-.csv, the defect that
  // earned this whole file, which is still red under the new reading.
  it("should find no .csv that does not parse as a table with a header and a row", () => {
    const offenders: string[] = [];
    for (const path of sources.filter((p) => p.endsWith(".csv"))) {
      const reading = readHeader(parseCsv(readFileSync(join(ROOT, path), "utf8").trim()));
      if (reading.headerAt === null || reading.names.length < 2 || reading.body.length < 1)
        offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });

  // AND THE RECORD SAYS SO. A reading that changed what the columns are called, or that skipped a
  // publisher's banner, is a reading a later phase has to be able to see — `profile.json` is the
  // only thing every phase after intake reasons from, and both round-eight files reached delivery
  // with a profile that denied their own bytes in silence. Where the reading has something to say,
  // the frozen record has to carry it, word for word.
  it("should find every frozen profile carrying what reading its own header cost", () => {
    const offenders: string[] = [];
    for (const path of sources.filter((p) => p.endsWith("/data.csv"))) {
      const reading = readHeader(parseCsv(readFileSync(join(ROOT, path), "utf8").trim()));
      if (reading.says === null) continue;
      const record = path.replace(/data\.csv$/, "profile.json");
      if (!existsSync(join(ROOT, record))) {
        offenders.push(`${record}: absent, and its source's header reading says "${reading.says}"`);
        continue;
      }
      const profile = JSON.parse(readFileSync(join(ROOT, record), "utf8"));
      if (profile.header?.says !== reading.says)
        offenders.push(`${record}: says ${JSON.stringify(profile.header?.says ?? null)}, reading says ${JSON.stringify(reading.says)}`);
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
