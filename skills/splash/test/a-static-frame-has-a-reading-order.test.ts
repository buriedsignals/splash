/**
 * THE SHAPE A STATIC'S READING ORDER IS WRITTEN IN, AND THE CHECKER THAT READS IT BACK — WITH NO
 * CORPUS BEHIND THEM, ON PURPOSE.
 *
 * Spec §1.3: 0 of the 40 static beats declares a reading order. Under R-D nothing in this chain may
 * invent one, so this task built the shape and the checker so a declaration CAN be made and
 * checked, and wrote none. The fixture below is a HAND-WRITTEN BRIEF, not a proof beat, and that is
 * the honest statement of where the corpus stands: 40 static declarations are a worklist for a
 * person, not an input to a generator.
 *
 * WHY STATIC IS THE ONE WITH NO CLOCK. The other three exports are choreographed in time or in
 * response to a reader; a static is choreographed in SPACE (§1.2). A declaration carrying a
 * `start`, a `duration`, an `fps` or a frame index has been written against the video's shape by
 * mistake, and both the parser and the checker refuse it by name rather than carry a field nothing
 * reads.
 *
 * THE STATIONS ARE THE HOUSE VOCABULARY, ALREADY WRITTEN TWICE. The video's `EVENT_ORDER` without
 * its `hold`, and the same five in `chart-web/assets/entrance.ts` as `ENTRANCE_ORDER`. The first
 * test below pins `STATION_ORDER` to that copy, so the three cannot drift apart silently.
 *
 * MUTATIONS RUN (2026-09-17)
 *   - made `checkChoreography` accept any `kind` → RED on "should refuse a declaration that says
 *     the frame is choreographed in time". Restored → green.
 *   - dropped the time-field refusal from the parser → RED on "should refuse a station table that
 *     carries a clock". Restored → green.
 *   - let `parseChoreography` accept a role the composition does not contain → RED on "should
 *     refuse an entry naming a role the composition does not draw". Restored → green.
 *   - dropped the two-station floor → RED on "should refuse fewer than two stations". Restored →
 *     green.
 *   - NEGATIVE: rewrote the fixture's reading order into a different legal one → stayed GREEN.
 */
import { describe, it, expect } from "bun:test";
// @ts-expect-error — the skill's scripts are ESM JavaScript, read from TypeScript tests.
import {
  parseChoreography,
  checkChoreography,
  STATION_ORDER,
  NOT_IN_TIME,
} from "../../chart-beat/scripts/choreography.mjs";
// @ts-expect-error — same.
import {
  parsePrecision,
  checkPrecision,
} from "../../chart-beat/scripts/precision.mjs";
// @ts-expect-error — the trunk.
import {
  parseTypeSheet,
  choreographyFrame,
} from "../../../shared/editorial/frame.mjs";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { ENTRANCE_ORDER } from "../../chart-web/assets/entrance.ts";

const TWIN = resolve(import.meta.dirname, "..", "..", "..");

/** Roles a composition of ten columns with a rule and a note actually contains. */
const composition = {
  marks: ["columns", "subject-column"],
  annotations: ["reference-rule", "subject-note", "unit"],
};

const FIXTURE = `---
format: static
type: bar and column
---

# Beat — a hand-written fixture, because no static beat declares one yet

## The choreography

**The eye enters at** \`columns\`. **The claim lands at** \`subject\`.

| station | what the eye reads | carries | subordinate to |
| --- | --- | --- | --- |
| \`establish\` | ten columns, largest first | \`columns\` | — |
| \`reference\` | the rule the claim is measured against | \`reference-rule\` | \`columns\` |
| \`subject\` | the one column the claim is about | \`subject-column\` | \`columns\` |
| \`conclusion\` | the sentence the frame ends on | \`subject-note\` | \`subject-column\` |

## Precision

- **Every column prints its value**, outside the fill, on the ground.
- **One value scale from zero**, because length is the encoding.
`;

const sheet = parseTypeSheet(
  readFileSync(
    join(TWIN, "skills/chart-beat/references/types/bar-and-column.md"),
    "utf8",
  ),
);
const retained = {
  format: "static",
  type: "bar and column",
  size: "landscape",
  interaction: { kind: "none" },
  claim: { shape: "maximum", grounding: "supported" },
};
const frame = choreographyFrame(retained, sheet);
const declared = parseChoreography(FIXTURE, composition);

describe("the stations of one frame", () => {
  it("should be the house vocabulary the web entrance already carries", () => {
    expect([...STATION_ORDER]).toEqual([...ENTRANCE_ORDER]);
  });

  it("should parse to the frame shape, with an entry and a landing", () => {
    expect(declared.kind).toBe("frame");
    expect(declared.entry).toBe("columns");
    expect(declared.claimLands).toBe("subject");
    expect(
      declared.stations.map((s: { station: string }) => s.station),
    ).toEqual(["establish", "reference", "subject", "conclusion"]);
  });

  it("should read what each station carries and what it is read beneath", () => {
    expect(declared.stations[0]).toEqual({
      station: "establish",
      carries: "columns",
      subordinateTo: null,
    });
    expect(declared.stations[3].subordinateTo).toBe("subject-column");
  });

  it("should hold no clock anywhere", () => {
    expect(JSON.stringify(declared)).not.toMatch(
      /duration|start|fps|frame\b.*\d/,
    );
  });
});

describe("the four refusals", () => {
  it("should refuse a section that says the frame has none, by name", () => {
    expect(() =>
      parseChoreography(
        "## The choreography\n\nNone — this is a still.\n",
        composition,
      ),
    ).toThrow(/never "none"/);
  });

  it("should refuse a declaration that says the frame is choreographed in time", () => {
    const hit = checkChoreography({ kind: "none" }, frame)[0];
    expect(hit.id).toBe("not-in-time");
    expect(hit.says).toBe(NOT_IN_TIME);
  });

  it("should refuse a station table that carries a clock", () => {
    const timed = FIXTURE.replace(
      "| station | what the eye reads | carries | subordinate to |",
      "| station | duration | carries | subordinate to |",
    );
    expect(() => parseChoreography(timed, composition)).toThrow(/not in time/);
  });

  it("should refuse fewer than two stations — an order of one is no order", () => {
    const one = FIXTURE.split("\n")
      .filter(
        (line) =>
          !/^\| `(reference|subject|conclusion)`/.test(line) ||
          line.startsWith("| `subject`"),
      )
      .join("\n")
      .replace(/\| `subject`.*\n/, "");
    expect(() => parseChoreography(one, composition)).toThrow(
      /at least two|not a station/,
    );
  });

  it("should refuse a station outside the five", () => {
    const odd = FIXTURE.replace("| `reference` |", "| `interlude` |");
    expect(() => parseChoreography(odd, composition)).toThrow(
      /`interlude` is not a station/,
    );
  });

  it("should refuse a station declared twice", () => {
    const twice = FIXTURE.replace("| `subject` |", "| `reference` |");
    expect(() => parseChoreography(twice, composition)).toThrow(
      /declared twice/,
    );
  });

  it("should refuse two stations in the wrong order", () => {
    const reversed = FIXTURE.replace(
      "| `reference` | the rule the claim is measured against | `reference-rule` | `columns` |\n" +
        "| `subject` | the one column the claim is about | `subject-column` | `columns` |",
      "| `subject` | the one column the claim is about | `subject-column` | `columns` |\n" +
        "| `reference` | the rule the claim is measured against | `reference-rule` | `columns` |",
    );
    expect(() => parseChoreography(reversed, composition)).toThrow(
      /follows a later station/,
    );
  });

  it("should refuse an entry naming a role the composition does not draw", () => {
    const ghost = FIXTURE.replace(
      "**The eye enters at** `columns`",
      "**The eye enters at** `sparkline`",
    );
    expect(() => parseChoreography(ghost, composition)).toThrow(
      /`sparkline` is not in this composition/,
    );
  });

  it("should refuse a claim that lands at a station the frame does not declare", () => {
    const stray = FIXTURE.replace(
      "**The claim lands at** `subject`",
      "**The claim lands at** `reveal`",
    );
    expect(() => parseChoreography(stray, composition)).toThrow(
      /a station this frame does not declare/,
    );
  });
});

describe("checkChoreography over a reading order", () => {
  it("should report no violation for the fixture's own order", () => {
    expect(
      checkChoreography(declared, frame).filter(
        (v: { severity: string }) => v.severity === "violation",
      ),
    ).toEqual([]);
  });

  it("should catch two stations subordinate to nothing — two accents", () => {
    const twoAccents = {
      ...declared,
      stations: declared.stations.map((s: { station: string }) =>
        s.station === "subject" ? { ...s, subordinateTo: null } : s,
      ),
    };
    expect(
      checkChoreography(twoAccents, frame).map((v: { id: string }) => v.id),
    ).toContain("no-accent-thing-claim");
  });

  it("should catch a station read beneath the very thing it carries", () => {
    const loop = {
      ...declared,
      stations: declared.stations.map(
        (s: { station: string; carries: string }) =>
          s.station === "reference" ? { ...s, subordinateTo: s.carries } : s,
      ),
    };
    expect(
      checkChoreography(loop, frame).map((v: { id: string }) => v.id),
    ).toContain("station-order");
  });

  it("should stay green on a different but legal reading order", () => {
    const other = {
      kind: "frame",
      entry: "subject-column",
      claimLands: "reveal",
      stations: [
        { station: "establish", carries: "columns", subordinateTo: null },
        {
          station: "reveal",
          carries: "subject-column",
          subordinateTo: "columns",
        },
      ],
    };
    expect(
      checkChoreography(other, frame).filter(
        (v: { severity: string }) => v.severity === "violation",
      ),
    ).toEqual([]);
  });
});

describe("precision, in one frame", () => {
  const precision = parsePrecision(FIXTURE, {
    rounding: { unit: "Gt", digits: 1 },
    labels: ["china-2024"],
    values: { "china-2024": { value: 12.3, unit: "Gt", digits: 1 } },
  });

  it("should read one rule id per bullet and carry the frame's printed labels", () => {
    expect(precision.kind).toBe("frame");
    expect(precision.asserts).toEqual([
      "every-column-prints-its-value",
      "one-value-scale-from-zero",
    ]);
    expect(precision.labels).toEqual(["china-2024"]);
  });

  it("should differ in shape from the other three exports", () => {
    expect(Object.keys(precision).sort()).toEqual([
      "asserts",
      "kind",
      "labels",
      "rounding",
      "values",
    ]);
  });

  it("should catch a declared number that has drifted from the frozen data", () => {
    expect(
      checkPrecision(precision, { data: { "china-2024": 11.9 } }).map(
        (v: { id: string }) => v.id,
      ),
    ).toEqual(["china-2024"]);
  });

  it("should count a printed label as covering a requirement", () => {
    expect(
      checkPrecision(precision, {
        required: [{ id: "china-2024", because: "grounding" }],
        data: { "china-2024": 12.3 },
      }),
    ).toEqual([]);
  });
});
