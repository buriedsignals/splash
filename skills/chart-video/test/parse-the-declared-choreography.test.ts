/**
 * A VIDEO BEAT'S OWN DECLARATION, PARSED AND CHECKED — ON A REAL BEAT, UNMODIFIED.
 *
 * The fixture is `proof/video-bar-top-emitters-2024/`, read off disk exactly as it ships: its
 * `BRIEF.md` event table and the `BeatTiming` its own `timing-contract.ts` exports. Nothing is
 * written for the test, because a beat's shot ladder is authored per subject and only READ here
 * (R-D).
 *
 * THIS FILE HOLDS NO EXPECTED CHOREOGRAPHY, and the negative test below proves the checker is blind
 * to WHICH legal choreography a beat chose.
 *
 * TWO CORRECTIONS TO THE PLAN, both found against the real corpus.
 *   1. Column five is a SENTENCE in the beat's own language ("the five, 11,7 < 12,3"), not a list
 *      of datum ids. A value block holds no prose (R-C), so the cell's clauses are slugged into
 *      stable handles — `the-five`, `11-7-12-3` — rather than quoted or invented.
 *   2. The plan expected the checker to catch "a ladder with a gap". Gaps between shots are LEGAL
 *      and the corpus uses them (this beat cuts six frames between `establish` and `reference`);
 *      what `checkTiming` refuses, and what is refused here, is a shot that starts before the one
 *      before it has finished.
 *
 * MUTATIONS RUN (2026-09-17)
 *   - reordered `subject` and `reveal` in a copy of the fixture's declaration → RED on "should
 *     refuse a ladder that is not the six events in order". Restored → green.
 *   - made `checkChoreography` exempt `hold` from nothing, so the fixture's empty-gesture hold was
 *     reported → RED on "should report no violation for this beat's own ladder". Restored → green.
 *   - NEGATIVE: replaced the fixture's gestures with a different legal set → stayed GREEN, as it
 *     must; a red here would mean a beat is being compared to an expected choreography.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
// @ts-expect-error — the skill's scripts are ESM JavaScript, read from TypeScript tests.
import {
  parseChoreography,
  checkChoreography,
  parseAsserts,
  EVENT_ORDER,
  TIMER_PROHIBITION,
  HOLD_PROHIBITION,
} from "../scripts/choreography.mjs";
// @ts-expect-error — same.
import { parsePrecision, checkPrecision } from "../scripts/precision.mjs";
// @ts-expect-error — the trunk.
import {
  parseTypeSheet,
  choreographyFrame,
  requiredAssertions,
} from "../../../shared/editorial/frame.mjs";
import { EVENT_ORDER as CONTRACT_ORDER } from "../assets/timing.ts";
import { BAR_VIDEO_TIMING } from "../../../proof/video-bar-top-emitters-2024/timing-contract.ts";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");
const brief = readFileSync(
  join(TWIN, "proof/video-bar-top-emitters-2024/BRIEF.md"),
  "utf8",
);
const sheet = parseTypeSheet(
  readFileSync(
    join(TWIN, "skills/chart-video/references/types/bar-and-column.md"),
    "utf8",
  ),
);
const retained = {
  format: "video",
  type: "bar and column",
  size: "landscape",
  interaction: { kind: "motion" },
  claim: { shape: "maximum", grounding: "supported" },
};
const frame = choreographyFrame(retained, sheet);
const declared = parseChoreography(brief, { timing: BAR_VIDEO_TIMING });

describe("the six-row event table, read", () => {
  it("should keep the local event order and the timing contract's in step", () => {
    expect([...EVENT_ORDER]).toEqual([...CONTRACT_ORDER]);
  });

  it("should declare the time shape, six shots, at the contract's fps", () => {
    expect(declared.kind).toBe("time");
    expect(declared.fps).toBe(30);
    expect(declared.shots.map((s: { shot: string }) => s.shot)).toEqual([
      "establish",
      "reference",
      "reveal",
      "subject",
      "conclusion",
      "hold",
    ]);
  });

  it("should split a two-atom gesture and read the corpus's em dash as none", () => {
    expect(declared.shots[2].gesture).toEqual(["split", "rescale"]);
    expect(declared.shots[0].gesture).toEqual([]);
  });

  it("should take start and duration from the contract, not from the table", () => {
    expect(declared.shots[3].start).toBe(BAR_VIDEO_TIMING.subject.start);
    expect(declared.shots[3].duration).toBe(BAR_VIDEO_TIMING.subject.duration);
    expect(brief).not.toContain(String(BAR_VIDEO_TIMING.subject.start));
  });

  it("should read column five as datum ids, never as the sentence it is written in", () => {
    expect(declared.shots[3].asserts).toEqual(["the-five", "11-7-12-3"]);
    expect(parseAsserts("—")).toEqual([]);
    expect(JSON.stringify(declared)).not.toMatch(/viewer sees|11,7/);
  });

  it("should refuse to guess a timing contract it was not given", () => {
    expect(() => parseChoreography(brief, {})).toThrow(
      /needs the beat's own timing contract/,
    );
  });
});

describe("checkChoreography over the shot ladder", () => {
  it("should report no violation for this beat's own ladder", () => {
    expect(
      checkChoreography(declared, frame).filter(
        (v: { severity: string }) => v.severity === "violation",
      ),
    ).toEqual([]);
  });

  it("should refuse a ladder that is not the six events in order", () => {
    const swapped = {
      ...declared,
      shots: [
        declared.shots[0],
        declared.shots[1],
        declared.shots[3],
        declared.shots[2],
        declared.shots[4],
        declared.shots[5],
      ],
    };
    const hit = checkChoreography(swapped, frame).find(
      (v: { id: string; says: string }) =>
        v.id === "shot-ladder" && v.says.includes("a directed beat plays"),
    );
    expect(hit?.says).toContain("establish → reference → subject → reveal");
  });

  it("should refuse a shot that starts before the one before it has finished", () => {
    const overlapping = {
      ...declared,
      shots: declared.shots.map((s: { shot: string; start: number }) =>
        s.shot === "conclusion" ? { ...s, start: 100 } : s,
      ),
    };
    const hit = checkChoreography(overlapping, frame).find(
      (v: { id: string; says: string }) =>
        v.id === "shot-ladder" && v.says.includes("before"),
    );
    expect(hit.says).toContain("conclusion starts at 100");
  });

  it("should catch a middle event with no gesture — the plate on a timer", () => {
    const idle = {
      ...declared,
      shots: declared.shots.map((s: { shot: string }) =>
        s.shot === "reveal" ? { ...s, gesture: [] } : s,
      ),
    };
    expect(
      checkChoreography(idle, frame).map((v: { id: string }) => v.id),
    ).toContain(TIMER_PROHIBITION);
  });

  it("should catch a hold that smuggles in a gesture of its own", () => {
    const busy = {
      ...declared,
      shots: declared.shots.map((s: { shot: string }) =>
        s.shot === "hold" ? { ...s, gesture: ["zoom"] } : s,
      ),
    };
    expect(
      checkChoreography(busy, frame).map((v: { id: string }) => v.id),
    ).toContain(HOLD_PROHIBITION);
  });

  it("should stay green when the beat plays a different but legal ladder", () => {
    const other = {
      ...declared,
      shots: declared.shots.map((s: { shot: string }, i: number) => ({
        ...s,
        gesture:
          i === 0 || s.shot === "hold"
            ? []
            : [["trace"], ["filter", "zoom"], ["count"], ["pull back"]][i - 1],
      })),
    };
    expect(
      checkChoreography(other, frame).filter(
        (v: { severity: string }) => v.severity === "violation",
      ),
    ).toEqual([]);
  });
});

describe("precision, per shot", () => {
  const precision = parsePrecision(brief, {
    declared,
    rounding: { unit: "Gt", digits: 1 },
    values: { "11-7-12-3": { value: 11.7, unit: "Gt", digits: 1 } },
  });

  it("should carry the per-shot placement video owes, and name what only the hold asserts", () => {
    expect(precision.kind).toBe("time");
    expect(precision.perShot.subject).toEqual(["the-five", "11-7-12-3"]);
    expect(precision.onlyOnHold).toEqual(["hold-conclusion"]);
  });

  it("should differ in shape from scrolly's, which is the point of four checkers", () => {
    expect(Object.keys(precision).sort()).toEqual([
      "asserts",
      "kind",
      "onlyOnHold",
      "perShot",
      "rounding",
      "values",
    ]);
  });

  it("should catch a declared number that has drifted from the frozen data", () => {
    const drifted = checkPrecision(precision, { data: { "11-7-12-3": 12.4 } });
    expect(drifted.map((v: { id: string }) => v.id)).toEqual(["11-7-12-3"]);
  });

  it("should catch a requirement the chain asks for that no shot asserts", () => {
    const gaps = checkPrecision(precision, {
      required: requiredAssertions(retained, sheet),
      data: { "11-7-12-3": 11.7 },
    });
    expect(gaps.map((v: { id: string }) => v.id)).toContain("claim-datum");
  });
});
