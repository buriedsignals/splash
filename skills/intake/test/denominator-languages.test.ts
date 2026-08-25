/**
 * A DENOMINATOR THE PROFILER CANNOT NAME IS REPORTED, NOT ANSWERED IN SILENCE — round six, C2.
 *
 * `DENOMINATOR_NAME_TOKENS` reads four languages. `stress-ad-polish-hospital-beds` carries
 * `ludność` — population — one column from `łóżka_szpitalne`, and the profile reported nothing:
 * not "there is no denominator here", which would be false, but the same empty answer a table with
 * no denominator at all gets. The article itself raises the per-capita reading in its second
 * paragraph and the toolchain never put the question.
 *
 * Adding Polish would close this table and reopen the next one. What closes the SHAPE is the
 * profiler knowing when it is out of its own coverage: the four declared languages are written
 * with a known repertoire of letters and scripts, and a column name using anything outside it is a
 * name this profiler cannot read. It still never guesses that such a column IS a denominator —
 * identity, never shape, unchanged — it says which sibling columns it could not read, so the
 * journalist can see the question rather than inherit its silence.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { profileTable, lettersNotRead, LEXICON_LANGUAGES } from "../scripts/profile.mjs";
import { LEXICON_LANGUAGES as STORYBOARD_LANGUAGES } from "../../storyboard/scripts/ground-claim.mjs";
import { parseCsv } from "../scripts/csv.mjs";

const STORIES = `${import.meta.dir}/../../../stories`;

describe("a sibling column named in an undeclared language is reported", () => {
  const polish = [
    ["województwo", "łóżka_szpitalne", "ludność"],
    ["Mazowieckie", "21400", "5510000"],
    ["Śląskie", "17800", "4400000"],
  ];

  it("hangs no denominator on the count, because it still never guesses one", () => {
    const count = profileTable(polish).columns.find((c) => c.name === "łóżka_szpitalne")!;
    expect(count.denominator).toBeUndefined();
  });

  it("names the sibling column it could not read, and the letters that told it so", () => {
    const count = profileTable(polish).columns.find((c) => c.name === "łóżka_szpitalne")! as any;
    expect(count.denominatorUnread).toBeDefined();
    expect(count.denominatorUnread.columns).toContain("ludność");
    expect(count.denominatorUnread.charactersNotRead).toContain("ś");
    expect(count.denominatorUnread.reads).toContain("English, French, Greek and Arabic");
  });

  it("says nothing extra when every sibling name is one of the four it reads", () => {
    const english = [
      ["district", "incidents", "residents"],
      ["Centro", "412", "201000"],
      ["Sul", "233", "100000"],
    ];
    const count = profileTable(english).columns.find((c) => c.name === "incidents")! as any;
    expect(count.denominator!.column).toBe("residents");
    expect(count.denominatorUnread).toBeUndefined();
  });
});

// REAL MATERIAL — the story the finding was measured on, profiled from its own frozen CSV.
describe("the frozen Polish story", () => {
  it("reports the unread sibling on its own hospital-beds column", () => {
    const csv = readFileSync(`${STORIES}/stress-ad-polish-hospital-beds/source/data.csv`, "utf8");
    const fresh = profileTable(parseCsv(csv));
    const beds = fresh.columns.find((c) => c.name === "łóżka_szpitalne")! as any;
    expect(beds.denominator).toBeUndefined();
    expect(beds.denominatorUnread.columns).toContain("ludność");
  });
});

describe("the two skills declare the same languages", () => {
  it("keeps intake's lexicon declaration equal to storyboard's", () => {
    expect(LEXICON_LANGUAGES).toEqual(["English", "French", "Greek", "Arabic"]);
    expect(LEXICON_LANGUAGES).toEqual(STORYBOARD_LANGUAGES);
  });

  it("reads the letters those four are written with and no others", () => {
    expect(lettersNotRead("residents ménages πληθυσμός السكان")).toEqual([]);
    expect(lettersNotRead("ludność")).toEqual(["ś", "ć"]);
  });
});
