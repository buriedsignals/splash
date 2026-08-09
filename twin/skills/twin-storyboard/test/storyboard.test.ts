import { describe, it, expect } from "bun:test";
import { parseStoryboard, checkStoryboard } from "../scripts/storyboard.mjs";

const VALID = `---
takeaway: "Rainfall over Annemasse fell by a third in ten years."
subject: "Annemasse"
comparison: "the 1991-2020 average"
limits: "One station; says nothing about the wider basin."
placement: "after the fourth paragraph"
credit: "MeteoSwiss"
effectiveDate: "2026-05-31"
language: "fr"
channel: "article-web"
slots:
  - id: 1
    proves: "The fall is a trend, not one bad year."
    medium: "chart"
    genre: "static"
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

  it("should accept a chosen slot in a genre the toolchain can both produce and deliver", () => {
    for (const genre of ["static", "web", "video"]) {
      const meta = parseStoryboard(VALID).meta;
      meta.slots[0].genre = genre;
      expect(checkStoryboard(meta)).toEqual([]);
    }
  });

  // The whole point of this fix: a chosen candidate that is otherwise perfectly well-formed
  // (a real choice drawn from its own listed candidates) still must not close the gate if its
  // genre cannot be delivered — this is the wall a journalist asking "for the web" used to hit
  // three phases later, at twin-deliver, instead of here.
  it("should refuse a chosen slot whose genre this toolchain does not know how to produce or deliver", () => {
    const meta = parseStoryboard(VALID).meta;
    meta.slots[0].genre = "print";
    const errors = checkStoryboard(meta);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("slot 1");
    expect(errors[0]).toContain('"print"');
  });

  it("should not report a genre gap for a slot that is already refused for having no chosen value", () => {
    // A slot with nothing chosen has nothing to check a genre gap against yet — the "nothing
    // chosen" error is the only one that should fire, not a second, confusing genre complaint.
    const meta = parseStoryboard(VALID).meta;
    meta.slots[0].genre = "print";
    delete meta.slots[0].chosen;
    const errors = checkStoryboard(meta);
    expect(errors).toEqual(["slot 1: nothing chosen — gate 2 is not closed"]);
  });

  it("should not consider a bare YAML null or tilde takeaway confirmed, agreeing with whereIs", () => {
    // where.mjs's hasConfirmedTakeaway (twin/skills/splash-twin/scripts/where.mjs) refuses the
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

  it("should surface a takeaway claim the frozen data contradicts as a gate error", () => {
    const meta = {
      ...parseStoryboard(VALID).meta,
      takeaway: "Rainfall was lower in 2024 than in any year since 1993",
    };
    const profile = {
      columns: [
        { name: "year", type: "number", min: 1993, max: 2024 },
        { name: "rainfall", type: "number", min: 604, max: 912 },
      ],
      rows: [
        { year: 1993, rainfall: 604 },
        { year: 2024, rainfall: 912 },
      ],
    };
    const errors = checkStoryboard(meta, profile);
    expect(
      errors.some((e) => e.includes("contradicted by the frozen data")),
    ).toBe(true);
  });

  it("should not turn an unverifiable claim into a gate error", () => {
    const meta = {
      ...parseStoryboard(VALID).meta,
      takeaway: "Rainfall was lower in 2024 than in any year since 1993",
    };
    const profile = {
      columns: [
        { name: "year", type: "number", min: 1993, max: 2024 },
        { name: "rainfall", type: "number", min: 604, max: 912 },
      ],
      rows: [], // no row-level data — the comparison can only come back unverifiable
    };
    expect(checkStoryboard(meta, profile)).toEqual([]);
  });
});
