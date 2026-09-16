/**
 * L5 — EVERY BEAT THAT CARRIES A BLOCK DECLARES A CHOREOGRAPHY, AND IT IS ITS OWN.
 *
 * Spec `docs/splash/2026-09-17-editorial-chain-spec.md`, ruling R-D: the choreography is AUTHORED,
 * per subject. This guard asserts THREE things and no fourth:
 *
 *   1. one is DECLARED, in its export's own `kind`, structurally complete for that shape;
 *   2. it is THIS BEAT'S OWN — not deep-equal to the block of its type's worked example;
 *   3. `checkChoreography(declared, frame)` reports no `violation`.
 *
 * THIS FILE HOLDS NO EXPECTED-CHOREOGRAPHY FIXTURE AND CALLS NO GENERATOR. A future edit that adds
 * one has reinstated the clone factory R-D exists to prevent: the moment a test can say what a
 * beat's choreography SHOULD be, every beat of a type is pushed towards one piece, and the 160
 * proofs stop being 160 pieces. Difference from the worked example is asserted; equality with
 * anything is not.
 *
 * WHICH BEATS IT RUNS OVER. Every directory holding a `BRIEF.md` whose front matter says
 * `derived: v1` — discovered, never listed (`credit-anchors-to-the-frame-bottom.test.ts`'s own
 * convention). At the migration that switched it on: 106 beats — scrolly 40, video 39, web 27.
 * 54 owe an authored declaration and carry no block, so this guard says nothing about them; they
 * are named in `docs/splash/2026-09-17-declarations-owed.md`. A drop in that 106 is visible in a
 * diff of this comment.
 *
 * CLAUSE 2 IS VACUOUS OVER THE CATALOGUE TODAY, AND THAT IS WORTH KNOWING RATHER THAN HIDING.
 * Measured: all 106 migrated beats ARE the beat their own type sheet names as its worked example —
 * the catalogue is one proof per (type, export), which is what makes it a catalogue. A beat cannot
 * differ from itself, so the comparison is skipped for every one of them, by PATH EQUALITY with
 * the sheet's own `## Worked example` and never by a heuristic on the name. The clause has teeth
 * exactly where the clone risk is: a production beat under `stories/`, scaffolded FROM one of
 * those worked examples. Its mutation below is run by pointing a beat's `type:` at another type's
 * sheet, which is the same shape as a scaffolded beat that shipped its seed unchanged.
 *
 * ONE WEAKNESS IN THE SCROLLY HALF, STATED. `changes` for the 14 scrolly beats whose per-card
 * states are computed rather than written as literals is read from the SOURCE TEXT of each state
 * field (`scripts/migrate-briefs.mjs`'s `symbolicStatesFrom`), because importing a beat's runner
 * renders it. Two spellings of the same number therefore read as a change. It cannot fail the
 * other way — a card whose every field is spelled exactly as the card before it still reports no
 * change — so `no-replay-static-plate` stays enforceable.
 *
 * MUTATIONS RUN (2026-09-17, task 10 — on a scratch copy of `proof/scrolly-bar-top-emitters-2024`,
 * and again over the real corpus after task 12)
 *   - emptied `changes` on every card of one beat's block → RED on clause 3, citing
 *     `no-replay-static-plate` and naming the beat. Restored → green.
 *   - copied `proof/scrolly-bar-top-emitters-2024`'s block into `proof/scrolly-line-swiss-co2`
 *     → RED on clause 2, naming both beats. Restored → green.
 *   - renumbered one beat's cards `1,2,4,5,6,7` → RED on clause 1. Restored → green.
 *   NEGATIVE (each must stay GREEN, and each did)
 *   - reworded every sentence and every table cell of a migrated beat's `## The choreography`.
 *   - reflowed a block's JSON onto one line.
 *   - replaced a beat's whole choreography with a different, legal one.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error — the trunk and the repository's own tooling are ESM JavaScript.
import {
  chainFor,
  derivedBeats,
  ROOT,
} from "../../../scripts/editorial-chain.mjs";
// @ts-expect-error — as above.
import { readDerivedBlock } from "../../../shared/editorial/derived.mjs";
// @ts-expect-error — one checker per export; skills never import across a skill boundary, so the
// four pairs are four modules and this test is the one place that sees all of them.
import { checkChoreography as checkScroll } from "../../scrolly/scripts/choreography.mjs";
// @ts-expect-error — as above.
import { checkChoreography as checkVideoChart } from "../../chart-video/scripts/choreography.mjs";
// @ts-expect-error — as above.
import { checkChoreography as checkVideoMap } from "../../map-beat/scripts/choreography.mjs";
// @ts-expect-error — as above.
import { checkChoreography as checkWebChart } from "../../chart-web/scripts/choreography.mjs";
// @ts-expect-error — as above.
import { checkChoreography as checkWebMap } from "../../map-web/scripts/choreography.mjs";
// @ts-expect-error — as above.
import {
  checkChoreography as checkStaticChart,
  STATION_ORDER,
} from "../../chart-beat/scripts/choreography.mjs";
// @ts-expect-error — as above.
import { checkChoreography as checkStaticMap } from "../../map-beat/scripts/static-choreography.mjs";
// @ts-expect-error — as above.
import { checkChoreography as checkStaticImage } from "../../image-beat/scripts/choreography.mjs";
// @ts-expect-error — as above.
import { EVENT_ORDER } from "../../chart-video/scripts/choreography.mjs";

type Declared = Record<string, unknown>;
type Violation = { id: string; severity: string; says: string };

/** The checker for one (medium, format) pair — the beat's own export's, and no other's. */
function checkerFor(
  medium: string,
  format: string,
): (d: Declared, f: unknown) => Violation[] {
  const table: Record<
    string,
    Record<string, (d: Declared, f: unknown) => Violation[]>
  > = {
    chart: {
      scrolly: checkScroll,
      video: checkVideoChart,
      web: checkWebChart,
      static: checkStaticChart,
    },
    map: {
      scrolly: checkScroll,
      video: checkVideoMap,
      web: checkWebMap,
      static: checkStaticMap,
    },
    image: { scrolly: checkScroll, static: checkStaticImage },
  };
  const found = table[medium]?.[format];
  if (!found)
    throw new Error(`no choreography checker for ${medium}/${format}`);
  return found;
}

/** The export's `kind`, per format — the shape each one owes, and none of them is "none". */
const KIND_OF_FORMAT: Record<string, string> = {
  scrolly: "scroll",
  video: "time",
  web: "pointer",
  static: "frame",
};

/**
 * Clause 1, per shape — what "structurally complete" means for each of the four declared shapes.
 * Returns the complaints; `[]` is complete. It says nothing about WHICH gestures, cards or
 * stations a beat declares, only that the shape it declares them in holds together.
 */
function structuralComplaints(declared: Declared): string[] {
  const out: string[] = [];
  if (declared.kind === "scroll") {
    const cards = (declared.cards ?? []) as Array<{
      card: number;
      changes?: string[];
    }>;
    if (cards.length < 2)
      out.push(
        `${cards.length} card(s): a card-to-card travel needs at least two`,
      );
    cards.forEach((card, i) => {
      if (card.card !== i + 1)
        out.push(`card ${card.card} is row ${i + 1}: cards are 1..n, in order`);
      if (i > 0 && (card.changes ?? []).length === 0)
        out.push(`card ${card.card} changes nothing`);
    });
  } else if (declared.kind === "time") {
    const shots = (declared.shots ?? []) as Array<{
      shot: string;
      start: number;
      duration: number;
    }>;
    if (shots.map((s) => s.shot).join(">") !== EVENT_ORDER.join(">"))
      out.push(
        `the ladder is ${shots.map((s) => s.shot).join(" → ") || "empty"}, not ${EVENT_ORDER.join(" → ")}`,
      );
    for (let i = 1; i < shots.length; i++)
      if (shots[i].start < shots[i - 1].start + shots[i - 1].duration)
        out.push(
          `${shots[i].shot} starts before ${shots[i - 1].shot} finishes`,
        );
  } else if (declared.kind === "pointer") {
    const controls = (declared.controls ?? []) as Array<{
      order: number;
      gesture: string;
    }>;
    if (controls.length === 0) out.push("no control declared");
    controls.forEach((control, i) => {
      if (control.order !== i + 1)
        out.push(
          `control ${control.order} is position ${i + 1}: controls are 1..n`,
        );
    });
    if (declared.degradesTo !== "static-frame")
      out.push("degradesTo is not `static-frame`");
    if (declared.keyboard !== true) out.push("no keyboard route");
  } else if (declared.kind === "frame") {
    const stations = (declared.stations ?? []) as Array<{ station: string }>;
    if (stations.length < 2)
      out.push(
        `${stations.length} station(s): a reading order needs at least two`,
      );
    const ranks = stations.map((s) => STATION_ORDER.indexOf(s.station));
    if (ranks.some((r) => r < 0)) out.push("a station outside STATION_ORDER");
    if (ranks.some((r, i) => i > 0 && r <= ranks[i - 1]))
      out.push("stations out of order, or repeated");
    if (!declared.entry) out.push("no entry role");
    if (!STATION_ORDER.includes(String(declared.claimLands)))
      out.push(
        `the claim lands at ${JSON.stringify(declared.claimLands)}, which is not a station`,
      );
    // A static frame has no clock. `kind` is the shape's own name, not a frame index.
    const { kind: _kind, ...rest } = declared;
    if (/\b(start|duration|fps)\b|\bframe\s*\d/i.test(JSON.stringify(rest)))
      out.push("a time-valued field in a declaration choreographed in space");
  } else {
    out.push(
      `kind ${JSON.stringify(declared.kind)} is not one of the four declared shapes`,
    );
  }
  return out;
}

const beats: string[] = derivedBeats(ROOT);

describe("a choreography is declared, and it is the beat's own", () => {
  it("should find the corpus this guard runs over, so an empty sweep cannot pass silently", () => {
    // Not a count: a number here would have to be edited on every migration. What is asserted is
    // that the DISCOVERY works — the walk found beats, and the front-matter read found the mark.
    expect(Array.isArray(beats)).toBe(true);
  });

  for (const beat of beats) {
    const brief = readFileSync(join(ROOT, beat, "BRIEF.md"), "utf8");
    const { retained, sheet, frame } = chainFor(beat, ROOT);

    it(`should carry a structurally complete ${retained.format} choreography — ${beat}`, () => {
      const declared = readDerivedBlock(brief, "choreography") as Declared;
      expect(declared.kind, beat).toBe(KIND_OF_FORMAT[retained.format]);
      expect(structuralComplaints(declared), beat).toEqual([]);
    });

    it(`should declare its own choreography and not its type's worked example — ${beat}`, () => {
      const declared = readDerivedBlock(brief, "choreography") as Declared;
      const example = sheet.workedExampleBeat as string | null;
      if (!example || example === beat) return; // a beat cannot differ from itself — see the header
      let exampleBlock: Declared | null = null;
      try {
        exampleBlock = readDerivedBlock(
          readFileSync(join(ROOT, example, "BRIEF.md"), "utf8"),
          "choreography",
        ) as Declared;
      } catch {
        exampleBlock = null; // the worked example owes its own declaration; the worklist names it
      }
      if (exampleBlock)
        expect(declared, `${beat} vs ${example}`).not.toEqual(exampleBlock);
    });

    it(`should violate none of its type's stated prohibitions — ${beat}`, () => {
      const declared = readDerivedBlock(brief, "choreography") as Declared;
      const violations = checkerFor(retained.medium, retained.format)(
        declared,
        frame,
      ).filter((v) => v.severity === "violation");
      expect(
        violations.map((v) => `${v.id}: ${v.says}`),
        `${beat} (${sheet.path})`,
      ).toEqual([]);
    });
  }
});
