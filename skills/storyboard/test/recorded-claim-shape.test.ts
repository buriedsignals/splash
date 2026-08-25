/**
 * THE CLAIM'S SHAPE IS RECORDED, NOT GUESSED — round six, task LANG, half two.
 *
 * Half one gave three WORD lexicons a measured multilingual table. This half cannot be closed that
 * way, and the reason is worth stating exactly: superlatives and comparatives are GRAMMAR.
 * `أكثر من غيرها`, `the most`, `le plus`, `najwięcej`, `το περισσότερο` — morphology and word
 * order, in five languages, none of which a label table gives. Every pattern in
 * `extractComparisons` is a regex written by hand against one language at a time, and
 * `stress-ad-polish-hospital-beds` produced NO CLAIM AT ALL for its own Polish superlative.
 *
 * So G1 asks the journalist one more question about the takeaway they just confirmed — maximum,
 * minimum, comparison between two named things, total, or none of those, and about which column —
 * and the answer is recorded rather than parsed. Language-independent by construction, because a
 * human is reading their own sentence.
 *
 * THREE RULES, and each has its own describe block below:
 *
 *   1. THE GUESS STAYS AS THE DEFAULT. Nothing recorded, nothing changed.
 *   2. THE RECORDED SHAPE WINS.
 *   3. THE DISAGREEMENT IS REPORTED. A parser silently overruled is a parser nobody can audit, and
 *      every one of those hand-written patterns is a defect waiting to be found. Where the recorded
 *      shape and the parsed shape differ, the parsed claim is REMOVED from `claims` — it may not
 *      decide anything — and moved whole into `coverage.disagreements`, where `resolveGrounding`
 *      prints it in the string the journalist reads.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { groundTakeaway, resolveRecordedClaim, RECORDED_CLAIM_SHAPES } from "../scripts/ground-claim.mjs";
import { resolveGrounding, groundingScalar } from "../scripts/propose.mjs";
import { checkStoryboard, recordedClaimOf } from "../scripts/storyboard.mjs";

const STORIES = `${import.meta.dir}/../../../stories`;

function frozen(slug: string) {
  const front = readFileSync(`${STORIES}/${slug}/STORYBOARD.md`, "utf8");
  return {
    takeaway: /^takeaway:\s*"([\s\S]*?)"\s*$/m.exec(front)![1],
    profile: JSON.parse(readFileSync(`${STORIES}/${slug}/source/profile.json`, "utf8")),
    csv: readFileSync(`${STORIES}/${slug}/source/data.csv`, "utf8"),
  };
}

describe("a journalist who answers nothing gets exactly today's behaviour", () => {
  it("returns the same claims and the same coverage with no recorded answer", () => {
    const { takeaway, profile, csv } = frozen("stress-t-europe-recycling");
    const before = groundTakeaway(takeaway, profile, { csv });
    const after = groundTakeaway(takeaway, profile, { csv, recorded: undefined });
    expect(after.claims.map((c: any) => `${c.verdict}: ${c.claim}`)).toEqual(
      before.claims.map((c: any) => `${c.verdict}: ${c.claim}`),
    );
    expect(after.coverage.disagreements).toBeUndefined();
    expect(after.coverage.recorded).toBeUndefined();
  });

  it("leaves the two frozen verdicts where they were", () => {
    for (const slug of ["stress-ad-polish-hospital-beds", "stress-x-tunisian-water"]) {
      const { takeaway, profile, csv } = frozen(slug);
      expect(`${slug}: ${groundingScalar(resolveGrounding(takeaway, profile, { csv }))}`).toBe(
        `${slug}: unverifiable`,
      );
    }
  });
});

// THE ACCEPTANCE, on the two frozen stories the task names, in the two languages no pattern here
// was written for until somebody wrote one by hand.
describe("a recorded shape makes a claim in an unread language checkable", () => {
  it("decides stress-ad's Polish superlative once the journalist has answered", () => {
    const { takeaway, profile, csv } = frozen("stress-ad-polish-hospital-beds");
    const resolved = resolveGrounding(takeaway, profile, {
      csv,
      recorded: { shape: "maximum", column: "łóżka_szpitalne", entity: "Mazowieckie" },
    });
    expect(groundingScalar(resolved)).toBe("supported");
    expect(resolved.detail).toContain('"Mazowieckie"\'s own value in "łóżka_szpitalne" (21400) is the column\'s maximum (21400)');
  });

  it("refuses stress-ad's per-capita half by name, because no column carries it", () => {
    const { takeaway, profile, csv } = frozen("stress-ad-polish-hospital-beds");
    const resolved = resolveGrounding(takeaway, profile, {
      csv,
      recorded: { shape: "minimum", column: "beds_per_10k", entity: "Mazowieckie" },
    });
    expect(groundingScalar(resolved)).toBe("unverifiable");
    expect(resolved.detail).toContain('no column named "beds_per_10k"');
  });

  // stress-x IS decidable now — and the answer is a named refusal, which is the honest one: the
  // profiler REFUSED to type its consumption column, because one cell is written in Eastern Arabic
  // numerals. The recorded answer does not paper over that; it names it, in the same words the
  // parser's own refusal uses.
  it("reads stress-x's Arabic superlative and refuses it for the reason the profiler gave", () => {
    const { takeaway, profile, csv } = frozen("stress-x-tunisian-water");
    const resolved = resolveGrounding(takeaway, profile, {
      csv,
      recorded: { shape: "maximum", column: "استهلاك_المياه_م3", entity: "تونس" },
    });
    expect(groundingScalar(resolved)).toBe("unverifiable");
    expect(resolved.detail).toContain("٨٩٠٠٠٠٠٠");
    expect(resolved.detail).toContain('the journalist recorded this sentence\'s shape as "maximum"');
  });

  it("decides it against the one column the profiler DID type", () => {
    const { takeaway, profile, csv } = frozen("stress-x-tunisian-water");
    const resolved = resolveGrounding(takeaway, profile, {
      csv,
      recorded: { shape: "maximum", column: "السكان", entity: "تونس" },
    });
    expect(groundingScalar(resolved)).toBe("supported");
  });
});

// THE PART THAT MATTERS MOST, on real material: a takeaway whose shape the parser reads
// DIFFERENTLY from the journalist. `stress-u-rhone-glacier` says "the lowest since 1990", which is
// a MINIMUM; the patterns read it as a SINCE comparison and confirm it. Both happen to be true
// here, which is exactly why the disagreement has to be printed rather than resolved in silence —
// the next one will not be.
describe("where the recorded shape and the parsed shape disagree", () => {
  const recorded = { shape: "minimum", column: "area_km2", entity: "2025" };

  it("takes the parsed reading out of the claims it can decide with", () => {
    const { takeaway, profile, csv } = frozen("stress-u-rhone-glacier");
    const guessed = groundTakeaway(takeaway, profile, { csv });
    const answered = groundTakeaway(takeaway, profile, { csv, recorded });
    expect(guessed.claims.some((c: any) => c.shape === "comparison")).toBe(true);
    expect(answered.claims.some((c: any) => c.shape === "comparison")).toBe(false);
  });

  it("reports it whole, with the shape the parser thought it had found", () => {
    const { takeaway, profile, csv } = frozen("stress-u-rhone-glacier");
    const { coverage } = groundTakeaway(takeaway, profile, { csv, recorded });
    expect(coverage.disagreements).toHaveLength(1);
    expect(coverage.disagreements[0].parsedShape).toBe("comparison");
    expect(coverage.disagreements[0].recordedShape).toBe("minimum");
    expect(coverage.disagreements[0].claim).toBe("2025 is the lowest since 1990");
    expect(coverage.disagreements[0].verdict).toBe("supported");
  });

  it("prints it where the journalist reads it, named as a defect in the patterns", () => {
    const { takeaway, profile, csv } = frozen("stress-u-rhone-glacier");
    const resolved = resolveGrounding(takeaway, profile, { csv, recorded });
    expect(resolved.detail).toContain("the recorded shape DECIDES it");
    expect(resolved.detail).toContain("was read as a comparison");
    expect(resolved.detail).toContain("a defect in those patterns, not in the takeaway");
  });

  it("says so when the two agree, rather than saying nothing", () => {
    const { takeaway, profile, csv } = frozen("stress-t-europe-recycling");
    const resolved = resolveGrounding(takeaway, profile, {
      csv,
      recorded: { shape: "maximum", column: "recycling_rate", entity: "Germany" },
    });
    expect(resolved.detail).toContain("read nothing that disagreed with it");
  });

  // "None of those" is an answer, and it is the one that catches a parser inventing a claim.
  it('treats "none" as a recorded answer that supersedes every shape the parser found', () => {
    const { takeaway, profile, csv } = frozen("stress-t-europe-recycling");
    const { claims, coverage } = groundTakeaway(takeaway, profile, { csv, recorded: { shape: "none" } });
    expect(claims.some((c: any) => c.shape === "maximum" || c.shape === "minimum")).toBe(false);
    expect(coverage.disagreements.map((d: any) => d.parsedShape).sort()).toEqual(["maximum", "minimum"]);
  });
});

describe("the recorded answer refuses by name rather than in silence", () => {
  const profile = {
    columns: [
      { name: "region", type: "text", min: null, max: null, sum: null },
      { name: "beds", type: "number", min: 7900, max: 21400, sum: 52100 },
    ],
    rows: [
      { region: "Mazowieckie", beds: 21400 },
      { region: "Śląskie", beds: 17800 },
      { region: "Łódzkie", beds: 12900 },
    ],
  };

  it("names the shapes it offers when handed one it does not know", () => {
    const claim = resolveRecordedClaim({ shape: "biggest", column: "beds", entity: "Mazowieckie" }, profile, "x");
    expect(claim.verdict).toBe("unverifiable");
    for (const shape of RECORDED_CLAIM_SHAPES) expect(claim.detail).toContain(shape);
  });

  it("will not guess which way a comparison runs", () => {
    const claim = resolveRecordedClaim(
      { shape: "comparison", column: "beds", entity: "Mazowieckie", versus: "Śląskie" },
      profile,
      "x",
    );
    expect(claim.verdict).toBe("unverifiable");
    expect(claim.detail).toContain('needs its direction recorded too');
  });

  it("decides a comparison once the direction is recorded, both ways", () => {
    const base = { shape: "comparison", column: "beds", entity: "Mazowieckie", versus: "Śląskie" };
    expect(resolveRecordedClaim({ ...base, direction: "greater" }, profile, "x").verdict).toBe("supported");
    expect(resolveRecordedClaim({ ...base, direction: "less" }, profile, "x").verdict).toBe("contradicted");
  });

  it("refuses an entity that matches no row, and one that matches several", () => {
    expect(
      resolveRecordedClaim({ shape: "maximum", column: "beds", entity: "Pomorskie" }, profile, "x").detail,
    ).toContain('"Pomorskie" matches no row');
    const twice = { ...profile, rows: [...profile.rows, { region: "Mazowieckie", beds: 1 }] };
    expect(
      resolveRecordedClaim({ shape: "maximum", column: "beds", entity: "Mazowieckie" }, twice, "x").detail,
    ).toContain("matches 2 rows");
  });

  it("returns null for \"none\", because saying there is no claim is not a claim", () => {
    expect(resolveRecordedClaim({ shape: "none" }, profile, "x")).toBeNull();
  });
});

describe("gate 2 refuses a half-recorded answer", () => {
  const meta = {
    takeaway: "t",
    subject: "s",
    comparison: "c",
    limits: "l",
    placement: "p",
    credit: "cr",
    effectiveDate: "2026-08-22",
    grounding: "supported",
    reference: "r",
    language: "pl",
    slots: [
      {
        id: 1,
        proves: "x",
        medium: "chart",
        format: "static",
        size: "landscape",
        reachable: "yes",
        candidates: ["Bar and column"],
        chosen: "Bar and column",
        producer: "custom",
      },
    ],
  };

  it("closes with no recorded claim at all, which is the default", () => {
    expect(checkStoryboard(meta)).toEqual([]);
    expect(recordedClaimOf(meta)).toBeNull();
  });

  it("closes on a complete one, and hands it over in the shape groundTakeaway takes", () => {
    const answered = { ...meta, claimShape: "maximum", claimColumn: "beds", claimEntity: "Mazowieckie" };
    expect(checkStoryboard(answered)).toEqual([]);
    expect(recordedClaimOf(answered)).toEqual({
      shape: "maximum",
      column: "beds",
      entity: "Mazowieckie",
      versus: null,
      direction: null,
    });
  });

  it("refuses a shape with no column, and a comparison with only one side", () => {
    expect(checkStoryboard({ ...meta, claimShape: "maximum", claimEntity: "Mazowieckie" })[0]).toContain(
      "without claimColumn",
    );
    expect(
      checkStoryboard({ ...meta, claimShape: "comparison", claimColumn: "beds", claimEntity: "Mazowieckie" }),
    ).toEqual([
      'claimShape "comparison" was recorded without claimVersus — a comparison between two named things needs the second one',
      'claimDirection null is not "greater" or "less" — which of the two the takeaway puts ahead is the journalist\'s sentence, not a guess this toolchain makes',
    ]);
  });

  it("refuses a shape it does not offer, and a leftover field beside \"none\"", () => {
    expect(checkStoryboard({ ...meta, claimShape: "biggest", claimColumn: "beds" })[0]).toContain(
      "is not one of the shapes G1 offers",
    );
    expect(checkStoryboard({ ...meta, claimShape: "none", claimColumn: "beds" })[0]).toContain(
      "records no claim, so claimColumn should be left out",
    );
  });

  it("reads the answer back out of the front matter, which is the later caller", () => {
    const { takeaway, profile, csv } = frozen("stress-ad-polish-hospital-beds");
    const storyboard = { claimShape: "maximum", claimColumn: "łóżka_szpitalne", claimEntity: "Mazowieckie" };
    expect(groundingScalar(resolveGrounding(takeaway, profile, { csv, storyboard }))).toBe("supported");
  });
});
