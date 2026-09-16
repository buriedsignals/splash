/**
 * A SCROLLY BEAT'S OWN DECLARATION, PARSED AND CHECKED — ON A REAL BEAT, UNMODIFIED.
 *
 * The fixture is `proof/scrolly-bar-top-emitters-2024/`, read off disk exactly as it ships: its
 * `BRIEF.md` card table and the per-card states its own `render-directions-scrolly.mjs` declares.
 * Nothing is written for the test, because the whole point of this link is that a beat's
 * choreography is authored per subject and only READ here (R-D).
 *
 * THIS FILE HOLDS NO EXPECTED CHOREOGRAPHY. It asserts the parse of the beat's own table, and it
 * asserts that the checker is blind to WHICH legal choreography a beat chose. The one test that
 * looks like an expected value — `cards[1]` — is the beat's own row 2 read back, not a value this
 * chain could have produced.
 *
 * THE VOCABULARY IS OPEN, AND THE CORPUS PROVES IT. This beat plays `highlight` and `stack`, which
 * `bar-and-column.md`'s `## Scroll gestures` does not list. That is reported as a NOTE — the sheet
 * owes the entry — never as a violation. The plan's sketch expected `checkChoreography` to return
 * `[]` here; on the real corpus it returns notes, which is R-D visible in the data.
 *
 * MUTATIONS RUN (2026-09-17)
 *   - made `checkChoreography` compare `declared.cards` to the worked example's parse and report a
 *     violation on difference → RED on "should report no violation for a choreography nothing like
 *     the worked example's". Restored → green. That mutation is the clone factory, caught.
 *   - removed the card-index exclusion from `changesPerCard`, so the note counter counts as a
 *     change on every card → RED on "should read row 2 as its gesture and the state keys it moves".
 *     Restored → green. Left in, `no-replay-static-plate` could never fire on anything.
 *   - made `parseChoreography` return the table's prose columns → RED on "should drop the prose
 *     columns on the floor". Restored → green.
 *   - made `checkPrecision` skip the value comparison → RED on "should catch a declared number that
 *     has drifted from the frozen data". Restored → green.
 *   - read the gesture column from position 2 again rather than by its header → "should find
 *     the gesture column by its own header" red (2026-09-17). Restored → green.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
// @ts-expect-error — the skill's scripts are ESM JavaScript, read from TypeScript tests.
import {
  parseChoreography,
  checkChoreography,
  declaredStatesFrom,
  SLIDESHOW_PROHIBITION,
} from "../scripts/choreography.mjs";
// @ts-expect-error — same.
import { parsePrecision, checkPrecision } from "../scripts/precision.mjs";
// @ts-expect-error — same, for the trunk.
import {
  parseTypeSheet,
  choreographyFrame,
  requiredAssertions,
} from "../../../shared/editorial/frame.mjs";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");
const BEAT = join(TWIN, "proof", "scrolly-bar-top-emitters-2024");

const brief = readFileSync(join(BEAT, "BRIEF.md"), "utf8");
const states = declaredStatesFrom(
  readFileSync(join(BEAT, "render-directions-scrolly.mjs"), "utf8"),
);
const sheet = parseTypeSheet(
  readFileSync(
    join(TWIN, "skills/scrolly/references/types/bar-and-column.md"),
    "utf8",
  ),
);
const retained = {
  format: "scrolly",
  type: "bar and column",
  size: null,
  interaction: { kind: "scroll" },
  claim: { shape: "maximum", grounding: "supported" },
};
const frame = choreographyFrame(retained, sheet);
const declared = parseChoreography(brief, { states });

describe("parseChoreography reads the beat's own card table", () => {
  it("should read the beat's per-card states off its own drive declaration", () => {
    expect(states).toHaveLength(6);
    expect(states[0]).toEqual({
      spread: 0,
      rest: 0,
      rank: 0,
      subject: 0,
      stack: 0,
      note: 0,
    });
  });

  it("should declare the scroll shape with one entry per card", () => {
    expect(declared.kind).toBe("scroll");
    expect(declared.cards).toHaveLength(6);
    expect(declared.cards.map((c: { card: number }) => c.card)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("should read row 2 as its gesture and the state keys it moves", () => {
    expect(declared.cards[1]).toEqual({
      card: 2,
      gesture: ["regroup"],
      changes: ["rest", "spread"],
    });
  });

  it("should read a single-atom gesture from a later card", () => {
    expect(declared.cards[4].gesture).toEqual(["stack"]);
  });

  it("should drop the prose columns on the floor", () => {
    expect(Object.keys(declared.cards[0]).sort()).toEqual([
      "card",
      "changes",
      "gesture",
    ]);
    expect(JSON.stringify(declared)).not.toMatch(/reader sees|card says|215/);
  });

  it("should refuse a section that declares no table rather than invent one", () => {
    expect(() =>
      parseChoreography("# Beat\n\n## The choreography\n\nProse only.\n", {
        states,
      }),
    ).toThrow(/declares no choreography/);
  });
});

describe("checkChoreography asks the frame's three questions and no fourth", () => {
  it("should report no violation for a choreography nothing like the worked example's", () => {
    expect(
      checkChoreography(declared, frame).filter(
        (v: { severity: string }) => v.severity === "violation",
      ),
    ).toEqual([]);
  });

  it("should catch a card that changes nothing — the slideshow prohibition, by id", () => {
    const frozen = {
      ...declared,
      cards: declared.cards.map((c: object) => ({ ...c, changes: [] })),
    };
    expect(
      checkChoreography(frozen, frame).map((v: { id: string }) => v.id),
    ).toContain(SLIDESHOW_PROHIBITION);
  });

  it("should cite the prohibition in the sheet's own words", () => {
    const frozen = {
      ...declared,
      cards: declared.cards.map((c: object) => ({ ...c, changes: [] })),
    };
    const hit = checkChoreography(frozen, frame).find(
      (v: { id: string }) => v.id === SLIDESHOW_PROHIBITION,
    );
    expect(hit.says).toContain("slideshow");
    expect(hit.severity).toBe("violation");
  });

  it("should report a gesture outside the vocabulary as a note, never as a failure", () => {
    const odd = {
      ...declared,
      cards: [
        ...declared.cards,
        { card: 7, gesture: ["kaleidoscope"], changes: ["x"] },
      ],
    };
    const added = checkChoreography(odd, frame).filter((v: { says: string }) =>
      v.says.includes("kaleidoscope"),
    );
    expect(added.map((v: { severity: string }) => v.severity)).toEqual([
      "note",
    ]);
  });

  it("should stay green when the beat plays a different but legal choreography", () => {
    const other = {
      kind: "scroll",
      cards: [
        { card: 1, gesture: [], changes: [] },
        { card: 2, gesture: ["zoom"], changes: ["camera"] },
        { card: 3, gesture: ["filter", "count"], changes: ["kept", "counter"] },
      ],
    };
    expect(
      checkChoreography(other, frame).filter(
        (v: { severity: string }) => v.severity === "violation",
      ),
    ).toEqual([]);
  });
});

describe("parsePrecision reads the beat's own rules, and checkPrecision does two things", () => {
  const precision = parsePrecision(brief, {
    rounding: { unit: "Gt", digits: 1 },
    values: { "china-2024": { value: 12.3, unit: "Gt", digits: 1 } },
    perCard: { 4: ["china-2024"] },
  });

  it("should read one rule id per declared bullet, and no prose", () => {
    expect(precision.asserts).toEqual([
      "bars-in-rows-at-every-width",
      "laid-out-in-the-reader-pixels",
      "every-sentence-is-asserted",
    ]);
  });

  it("should carry the per-card placement scrolly owes and no clock", () => {
    expect(precision.perCard).toEqual({ 4: ["china-2024"] });
    expect(JSON.stringify(precision)).not.toMatch(/duration|fps|start/);
  });

  it("should pass when every declared value still matches the frozen data", () => {
    expect(checkPrecision(precision, { data: { "china-2024": 12.3 } })).toEqual(
      [],
    );
  });

  it("should catch a declared number that has drifted from the frozen data", () => {
    const drifted = checkPrecision(precision, { data: { "china-2024": 11.9 } });
    expect(drifted.map((v: { id: string }) => v.id)).toEqual(["china-2024"]);
    expect(drifted[0].says).toContain("11.9");
  });

  it("should catch a requirement the chain asks for that no bullet covers", () => {
    const required = requiredAssertions(retained, sheet);
    const gaps = checkPrecision(precision, { required, data: {} });
    expect(gaps.length).toBeGreaterThan(0);
    expect(gaps.map((v: { id: string }) => v.id)).toContain("claim-datum");
  });

  it("should count a requirement as covered when the beat states it in its own words", () => {
    const covered = checkPrecision(precision, {
      required: [{ id: "Every sentence is asserted", because: "type-sheet" }],
      data: { "china-2024": 12.3 },
    });
    expect(covered).toEqual([]);
  });

  // A map scrolly's table carries an extra column, so every column after the first is one to the
  // right — the same defect the video half of this reader had. The header is what is read.
  it("should find the gesture column by its own header, whatever its position", () => {
    const wide = [
      "## The choreography",
      "",
      "| card | stage | what the card says | gesture | what the reader sees move |",
      "| --- | --- | --- | --- | --- |",
      "| 1 | overview | the ground | — | the frame |",
      "| 2 | close | the cut | **regroup + pull back** | the rows |",
      "",
    ].join("\n");
    const parsed = parseChoreography(wide, { states: [{ a: 0 }, { a: 1 }] });
    expect(parsed.cards[1].gesture).toEqual(["regroup", "pull back"]);
  });
});
