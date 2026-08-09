import { describe, it, expect } from "bun:test";
import {
  parseStoryboard,
  checkStoryboard,
  groundTakeaway,
  genreGap,
  capabilityGap,
} from "../scripts/storyboard.mjs";

const VALID = `---
takeaway: "Rainfall over Annemasse fell by a third in ten years."
subject: "Annemasse"
comparison: "the 1991-2020 average"
limits: "One station; says nothing about the wider basin."
placement: "after the fourth paragraph"
credit: "MeteoSwiss"
effectiveDate: "2026-05-31"
grounding: supported
reference: "The Pudding, redraft — mid-table deviation"
language: "fr"
channel: "article-web"
slots:
  - id: 1
    proves: "The fall is a trend, not one bad year."
    medium: "chart"
    genre: "static"
    size: "landscape"
    reachable: "yes"
    candidates: ["trajectory", "comparison"]
    chosen: "trajectory"
---

The prose the journalist reads.
`;

describe("parseStoryboard", () => {
  it("should split the front matter from the prose", () => {
    const { meta, prose } = parseStoryboard(VALID);
    expect(meta.takeaway).toBe(
      "Rainfall over Annemasse fell by a third in ten years.",
    );
    expect(meta.slots).toHaveLength(1);
    expect(prose).toContain("The prose the journalist reads.");
  });
});

describe("checkStoryboard", () => {
  it("should pass a complete storyboard", () => {
    expect(checkStoryboard(parseStoryboard(VALID).meta)).toEqual([]);
  });

  it("should refuse an empty takeaway", () => {
    const meta = { ...parseStoryboard(VALID).meta, takeaway: "" };
    expect(checkStoryboard(meta)).toContain("takeaway is missing");
  });

  it("should name every missing hand-of-the-journalist field", () => {
    const errors = checkStoryboard({ takeaway: "x", slots: [] });
    expect(errors).toContain("subject is missing");
    expect(errors).toContain("comparison is missing");
    expect(errors).toContain("limits is missing");
    expect(errors).toContain("credit is missing");
  });

  it("should refuse a storyboard with no slot", () => {
    const meta = { ...parseStoryboard(VALID).meta, slots: [] };
    expect(checkStoryboard(meta)).toContain(
      "no slot: nothing would be produced",
    );
  });

  it("should refuse a slot whose chosen treatment is not among its candidates", () => {
    const meta = parseStoryboard(VALID).meta;
    meta.slots[0].chosen = "map";
    expect(checkStoryboard(meta)).toContain(
      'slot 1: chosen "map" is not among its candidates',
    );
  });

  it("should refuse a slot that has candidates but nothing chosen", () => {
    const meta = parseStoryboard(VALID).meta;
    delete meta.slots[0].chosen;
    expect(checkStoryboard(meta)).toContain(
      "slot 1: nothing chosen — gate 2 is not closed",
    );
  });

  it("should treat a comma inside a quoted candidate as part of that candidate, not a separator", () => {
    // A naive `.split(",")` on the inline array's inner text would tear `"a, b"` into two
    // candidates ("a" and "b"), then spuriously refuse a `chosen` value quoted verbatim from the
    // source array as "not among its candidates" — a legitimate storyboard gate-blocked by a
    // parsing bug, not an editorial problem.
    const text = VALID.replace(
      '    candidates: ["trajectory", "comparison"]\n    chosen: "trajectory"',
      '    candidates: ["a, b", "c"]\n    chosen: "a, b"',
    );
    const { meta } = parseStoryboard(text);
    expect(meta.slots[0].candidates).toEqual(["a, b", "c"]);
    expect(checkStoryboard(meta)).toEqual([]);
  });

  it("should refuse a slot with a chosen treatment but no candidates ever listed", () => {
    // Distinct from "nothing chosen" (no chosen value at all) and from "not among its candidates"
    // (a candidates list exists but doesn't include the chosen value) — this is the third,
    // previously-unverified branch: chosen IS set, but candidates is absent or empty, so there was
    // nothing to verify the choice against. Treated as malformed, not legitimate (see the comment
    // in checkStoryboard): a real choice can only be confirmed from a list that was actually shown.
    const missingField = parseStoryboard(VALID).meta;
    delete missingField.slots[0].candidates;
    expect(checkStoryboard(missingField)).toContain(
      'slot 1: chosen "trajectory" but no candidates were listed',
    );

    const emptyArray = parseStoryboard(VALID).meta;
    emptyArray.slots[0].candidates = [];
    expect(checkStoryboard(emptyArray)).toContain(
      'slot 1: chosen "trajectory" but no candidates were listed',
    );
  });

  // The three sub-gates of Gate 2, each recorded as it closed. The gate reads the record; it does
  // NOT re-run genreGap or capabilityGap, because where.mjs's own gate structurally cannot, and
  // two gates running different checks is the divergence this contract exists to make impossible.
  for (const field of ["medium", "genre", "size"]) {
    it(`should refuse a slot that never recorded its ${field}`, () => {
      const meta = parseStoryboard(VALID).meta;
      delete meta.slots[0][field];
      expect(checkStoryboard(meta).join(" ")).toContain(
        `slot 1: ${field} is missing`,
      );
    });
  }

  it("should refuse a slot whose medium and genre were never confirmed reachable", () => {
    const meta = parseStoryboard(VALID).meta;
    meta.slots[0].reachable = "no";
    expect(checkStoryboard(meta).join(" ")).toContain(
      "never confirmed reachable",
    );
  });

  it("should refuse a storyboard whose takeaway was never grounded at G1", () => {
    const meta = parseStoryboard(VALID).meta;
    delete meta.grounding;
    expect(checkStoryboard(meta).join(" ")).toContain("grounding is missing");
  });

  // `contradicted` is not a closing value. A refuted takeaway is corrected, or the journalist
  // records an override AND says why — which is what the run improvised, correctly, by hand.
  it("should refuse a grounding verdict of contradicted, and accept an override that carries a reason", () => {
    const refuted = parseStoryboard(VALID).meta;
    refuted.grounding = "contradicted";
    expect(checkStoryboard(refuted).join(" ")).toContain(
      "is not a resolved verdict",
    );

    const overridden = parseStoryboard(VALID).meta;
    overridden.grounding =
      'overridden — "34 is the sum of glace_fondue_mt (14 + 11 + 9)"';
    expect(checkStoryboard(overridden)).toEqual([]);

    const reasonless = parseStoryboard(VALID).meta;
    reasonless.grounding = "overridden —";
    expect(checkStoryboard(reasonless).join(" ")).toContain(
      "is not a resolved verdict",
    );
  });

  it("should refuse a storyboard whose reference loop never closed into a field, and accept a recorded rejection", () => {
    const missing = parseStoryboard(VALID).meta;
    delete missing.reference;
    expect(checkStoryboard(missing).join(" ")).toContain(
      "reference is missing",
    );

    const rejected = parseStoryboard(VALID).meta;
    rejected.reference = "none — both rejected";
    expect(checkStoryboard(rejected)).toEqual([]);
  });

  it("should not consider a bare YAML null or tilde takeaway confirmed, agreeing with whereIs", () => {
    // where.mjs's isMissingScalar (twin/skills/splash-twin/scripts/where.mjs) refuses the
    // raw tokens "null" and "~" as a confirmed takeaway. parseStoryboard must resolve the same
    // two YAML null sentinels to a real missing value, or the two gates would disagree about
    // whether G1 has closed.
    const nullText = VALID.replace(
      'takeaway: "Rainfall over Annemasse fell by a third in ten years."',
      "takeaway: null",
    );
    const tildeText = VALID.replace(
      'takeaway: "Rainfall over Annemasse fell by a third in ten years."',
      "takeaway: ~",
    );
    expect(checkStoryboard(parseStoryboard(nullText).meta)).toContain(
      "takeaway is missing",
    );
    expect(checkStoryboard(parseStoryboard(tildeText).meta)).toContain(
      "takeaway is missing",
    );
  });

  // The gate takes ONE argument, and that is the point rather than an omission. The three
  // expensive semantic checks it used to re-derive are still this skill's own work — they are just
  // run by the PHASE that owns each (grounding at G1, genre and capability at G2b), which records
  // the verdict. A second argument here would be a rule where.mjs's gate could not see.
  it("should take one argument, and still export the checks the phases run", () => {
    expect(checkStoryboard.length).toBe(1);
    expect(typeof groundTakeaway).toBe("function");
    expect(typeof genreGap).toBe("function");
    expect(typeof capabilityGap).toBe("function");
  });
});
