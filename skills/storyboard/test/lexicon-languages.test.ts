/**
 * AN UNDECLARED LANGUAGE MUST NOT RAISE CONFIDENCE — round six, findings C1 and AD1.
 *
 * Round five taught this file to NAME a script none of its four declared languages is written in
 * (`scriptsNotRead`). Polish is written in Latin script, so that net returns `[]` for it and the
 * checker answers a confident "I read this and there was nothing to check". Measured by the
 * controller on one table, one sentence, and only the denominator column's NAME changing language:
 *
 *     denominator "ludność"     -> supported
 *     denominator "population"  -> unverifiable   (round four's raw-count downgrade)
 *
 * So the gap did not withhold a prompt, it RAISED the verdict: `supported` is the one word that
 * closes G1, and it was reached because a word could not be read. A check that cannot classify a
 * numeric column may not be more sure of itself than one that can.
 *
 * The mechanism these tests drive is the same policy one level finer than script. The four
 * declared languages are written with a KNOWN REPERTOIRE OF LETTERS — ASCII plus French's own
 * diacritics, Greek, Arabic — and a letter outside it is a letter none of the four is written
 * with, whatever script it belongs to. `lettersNotRead` names those letters, `scriptsNotRead`
 * still names the scripts, and between them the denominator check knows when it is NOT in a
 * position to answer. Where neither net can see the gap — an undeclared language written in plain
 * ASCII, `bevolking` — the limit is STATED in the detail a journalist reads, because the honest
 * answer to "is there a denominator here" is sometimes "I read four languages and this is not one
 * of the words they gave me".
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { groundTakeaway, lettersNotRead, scriptsNotRead } from "../scripts/ground-claim.mjs";
import { resolveGrounding, groundingScalar } from "../scripts/propose.mjs";

const STORIES = `${import.meta.dir}/../../../stories`;

/** The controller's own reproduction: one table, one sentence, one column name in two languages. */
function bedsTable(denominatorName: string) {
  const rows = [
    ["region", "hospital_beds", denominatorName],
    ["Mazowieckie", "21400", "5510000"],
    ["Śląskie", "17800", "4400000"],
    ["Wielkopolskie", "12900", "3490000"],
  ];
  return {
    profile: {
      columns: [
        { name: "region", type: "text", min: null, max: null, sum: null },
        { name: "hospital_beds", type: "number", min: 12900, max: 21400, sum: 52100 },
        { name: denominatorName, type: "number", min: 3490000, max: 5510000, sum: 13400000 },
      ],
    },
    csv: rows.map((r) => r.join(",")).join("\n"),
  };
}

const CLAIM = "Mazowieckie has more hospital beds than any other region.";

describe("the denominator check knows the limit of its own lexicon", () => {
  // THE ACCEPTANCE CASE, verbatim from the raw findings file.
  it("does not close G1 on supported because the denominator is named in a fifth language", () => {
    const { profile, csv } = bedsTable("ludność");
    expect(groundingScalar(resolveGrounding(CLAIM, profile, { csv }))).toBe("unverifiable");
  });

  it("answers the two languages the same way, which is the whole defect", () => {
    const polish = resolveGrounding(CLAIM, bedsTable("ludność").profile, { csv: bedsTable("ludność").csv });
    const english = resolveGrounding(CLAIM, bedsTable("population").profile, {
      csv: bedsTable("population").csv,
    });
    expect(polish.verdict).toBe(english.verdict);
  });

  it("names the column it could not read and the letter that told it so", () => {
    const { profile, csv } = bedsTable("ludność");
    const detail = resolveGrounding(CLAIM, profile, { csv }).detail;
    expect(detail).toContain("ludność");
    expect(detail).toContain("ś");
  });

  // A READABLE name really is answered — the fix must not turn every second numeric column into a
  // refusal, which would be the same silence wearing the opposite coat.
  it("still confirms a superlative when the sibling column is a word it read and rejected", () => {
    const profile = {
      columns: [
        { name: "city", type: "text", min: null, max: null, sum: null },
        { name: "trips", type: "number", min: 180, max: 416, sum: 596 },
        { name: "network_km", type: "number", min: 40, max: 91, sum: 131 },
      ],
      rows: [
        { city: "Porto", trips: 416, network_km: 40 },
        { city: "Lisboa", trips: 180, network_km: 91 },
      ],
    };
    const resolved = resolveGrounding("Porto has the most trips of the two cities.", profile);
    expect(resolved.verdict).toBe("supported");
  });

  // ROUND SIX, task LANG — THE ASCII HALF OF THE HOLE, AND IT IS CLOSED BY DATA RATHER THAN BY A
  // STATED LIMIT. `bevolking` is Dutch for population and is plain ASCII: no script net and no
  // letter net can ever see it, and until the vendored label table landed this sentence came back
  // `supported` — the round-four raw-count downgrade switched OFF by a word nobody had taught the
  // list. It is now the SAME word as `population` as far as this check is concerned, which is the
  // only acceptable answer: a check may not be more sure of itself because it read less.
  function tripsTable(denominatorName: string) {
    return {
      columns: [
        { name: "gemeente", type: "text", min: null, max: null, sum: null },
        { name: "trips", type: "number", min: 180, max: 416, sum: 596 },
        { name: denominatorName, type: "number", min: 91000, max: 240000, sum: 331000 },
      ],
      rows: [
        { gemeente: "Amsterdam", trips: 416, [denominatorName]: 240000 },
        { gemeente: "Utrecht", trips: 180, [denominatorName]: 91000 },
      ],
    };
  }

  it("reads a Dutch denominator, so the raw-count downgrade fires on it too", () => {
    const resolved = resolveGrounding("Amsterdam has the most trips of the two.", tripsTable("bevolking"));
    expect(resolved.verdict).toBe("unverifiable");
    expect(resolved.detail).toContain("\"bevolking\" sits beside \"trips\"");
  });

  it("answers Dutch and English identically, which is the whole point of measuring the table", () => {
    const dutch = resolveGrounding("Amsterdam has the most trips of the two.", tripsTable("bevolking"));
    const english = resolveGrounding("Amsterdam has the most trips of the two.", tripsTable("population"));
    expect(dutch.verdict).toBe(english.verdict);
  });

  // …and where the table STILL misses — a language outside the 39 the vendored extract declares,
  // written in the declared repertoire — the limit is said out loud instead. Swahili `wakazi` is
  // that case, and there will always be one, which is why the stated limit is not retired.
  it("states the lexicon's limit on a supported raw count it could not classify", () => {
    const resolved = resolveGrounding("Amsterdam has the most trips of the two.", tripsTable("wakazi"));
    expect(resolved.verdict).toBe("supported");
    expect(resolved.detail).toContain("wakazi");
    expect(resolved.detail).toContain("English, French, Greek and Arabic");
  });
});

describe("lettersNotRead is the script net one level finer", () => {
  it("reads every letter the four declared languages are written with", () => {
    expect(lettersNotRead("population households residents")).toEqual([]);
    expect(lettersNotRead("ménages, élèves, forêt, Noël, cœur, ça")).toEqual([]);
    expect(lettersNotRead("πληθυσμός")).toEqual([]);
    expect(lettersNotRead("السكان")).toEqual([]);
  });

  it("names a Latin letter none of the four is written with", () => {
    expect(lettersNotRead("ludność")).toEqual(["ś", "ć"]);
    expect(lettersNotRead("łóżka_szpitalne")).toEqual(["ł", "ó", "ż"]);
  });

  it("leaves a script scriptsNotRead already names to scriptsNotRead", () => {
    expect(lettersNotRead("Москва")).toEqual([]);
    expect(scriptsNotRead("Москва")).toEqual(["Cyrillic"]);
  });
});

describe("the claim vocabulary states the same limit on the frozen Polish story", () => {
  function stressAd() {
    const profile = JSON.parse(
      readFileSync(`${STORIES}/stress-ad-polish-hospital-beds/source/profile.json`, "utf8"),
    );
    const csv = readFileSync(`${STORIES}/stress-ad-polish-hospital-beds/source/data.csv`, "utf8");
    const storyboard = readFileSync(`${STORIES}/stress-ad-polish-hospital-beds/STORYBOARD.md`, "utf8");
    const takeaway = /takeaway: "([^"]+)"/.exec(storyboard)![1];
    return { profile, csv, takeaway };
  }

  // Before this, `coverage.unreadable` was `[]` for this takeaway and the checker reported a clean
  // "no claim here" on a sentence carrying a superlative (`najwięcej`) it never saw.
  it("no longer answers the Polish takeaway with a confident empty coverage", () => {
    const { profile, csv, takeaway } = stressAd();
    const { coverage } = groundTakeaway(takeaway, profile, { csv });
    expect(coverage.unreadableLetters.length).toBeGreaterThan(0);
    expect(coverage.unreadableLetters).toContain("ę");
  });

  it("says it out loud in the detail the journalist reads at G1", () => {
    const { profile, csv, takeaway } = stressAd();
    const detail = resolveGrounding(takeaway, profile, { csv }).detail;
    expect(detail).toContain("English, French, Greek and Arabic");
    expect(detail).toContain("ę");
  });
});

describe("isShareColumn's refusal names the letters it could not read", () => {
  it("reports a Polish share column as unread rather than absent", () => {
    const claim = groundTakeaway("Together these make up the whole of national supply.", {
      columns: [
        { name: "województwo", type: "text", min: null, max: null, sum: null },
        { name: "udział", type: "number", min: 10, max: 60, sum: 100 },
      ],
    }).claims[0];
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain("udział");
    expect(claim.detail).toContain("ł");
  });
});
