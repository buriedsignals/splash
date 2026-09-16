/**
 * L4 — WHAT THE CHAIN REQUIRES REACHES EVERY BEAT THAT CARRIES A BLOCK, AND NO DECLARED NUMBER HAS
 * DRIFTED FROM THE FROZEN DATA.
 *
 * Spec `docs/splash/2026-09-17-editorial-chain-spec.md` §1.4, the two halves: what MUST be asserted
 * is the chain's (`requiredAssertions`); which numbers assert it is the JOURNALIST'S.
 *
 * WHERE THE PLAN AND THE SPEC WERE WRONG, MEASURED — read this before "fixing" the guard.
 *
 * Both write clause 1 as "every id from `requiredAssertions(retained, sheet)` is covered by the
 * block's `asserts`". Measured across the 106 migrated beats, that holds for NONE of them, and it
 * cannot: the two sides are different namespaces. `requiredAssertions` returns the CHAIN's ids —
 * `claim-datum` (from the grounding), `asserted-per-card` (from the format), and the type sheet's
 * own `## Precision to assert` bullets, slugged. A beat's `## Precision` is the JOURNALIST's list
 * of the rules THIS beat holds itself to (`every-sentence-is-asserted`,
 * `laid-out-in-the-reader-pixels`, `values-rounded-to-tenths-before-formatting`). Slug-matching one
 * against the other is comparing a requirement to an answer and calling the difference a failure.
 *
 * Widening the slug match until the two met would have been the exact defect R-C names: a guard
 * that passes by being loosened. Answering the requirements in the harvest would have been R-D's:
 * the chain writing the beat's assertions. So the block carries a third field, `covers` — a map
 * from every requirement id the chain makes of this beat to the beat's OWN assert id that answers
 * it, or `null` where it is unanswered. The harvest ENUMERATES the keys and answers none of them;
 * a person answers them, beat by beat, from
 * `docs/splash/2026-09-17-declarations-owed.md`.
 *
 * SO THIS GUARD ASSERTS FOUR THINGS.
 *   1. every id `requiredAssertions` returns is a KEY of `covers` — the requirement REACHED the
 *      beat. This is what goes red when a beat's grounding flips, when its type sheet gains a rule,
 *      or when a step stops reading the chain: the drift the whole spec exists to catch.
 *   2. every requirement the beat has ANSWERED names an assert the block really carries, and every
 *      value the block declares still equals the frozen data at the declared rounding — both
 *      through `checkPrecision`, the export's own.
 *   3. `grounding: "unverifiable"` takes `claim-datum` out of the requirements and puts
 *      `rounding-widened` in. No beat in the corpus is unverifiable, so this is asserted directly
 *      on `requiredAssertions` rather than waiting for one.
 *   4. the four exports' `parsePrecision` output shapes are pairwise distinct — a static frame, a
 *      card, a shot and a JS-off floor do not assert alike, and a shared shape would be R-B lost.
 *
 * THE FROZEN DATA, AND WHY THE CORPUS EXERCISES CLAUSE 2 ONLY PARTLY. A beat's `data.csv` is read
 * into `{ <first column's value>-<column name>: value }` — `china-co2` for the row `China` under
 * the column `co2`. That is the convention an author writes `values` against. No migrated beat
 * declares a machine-readable value yet (the harvest parses what a beat DECLARES, and the corpus
 * declares its numbers in sentences), so `values` is empty on all 106 and the value half of clause
 * 2 is exercised by the fixture below and by the mutation, not by the corpus. Filling `values` is
 * the third column of the worklist.
 *
 * WHICH BEATS IT RUNS OVER. Every directory holding a `BRIEF.md` whose front matter says
 * `derived: v1`. At the migration: 106 — scrolly 40, video 39, web 27.
 *
 * MUTATIONS RUN (2026-09-17, task 10 on a scratch copy; again over the corpus after task 12)
 *   - deleted one requirement's key from a beat's `covers` → RED on clause 1, naming the beat and
 *     the requirement. Restored → green.
 *   - answered a requirement with an assert id the block does not carry → RED on clause 2.
 *     Restored → green.
 *   - let a declared value drift from `data.csv` → RED on clause 2. Restored → green.
 *   - made `requiredAssertions` ignore the grounding → RED on clause 3. Restored → green.
 *   NEGATIVE (stayed green): rewording the section's prose, reflowing the block's JSON.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error — the repository's own tooling is ESM JavaScript.
import {
  chainFor,
  derivedBeats,
  ROOT,
} from "../../../scripts/editorial-chain.mjs";
// @ts-expect-error — as above.
import { readDerivedBlock } from "../../../shared/editorial/derived.mjs";
// @ts-expect-error — as above.
import {
  assertionId,
  requiredAssertions,
} from "../../../shared/editorial/frame.mjs";
// @ts-expect-error — one pair per export; skills never import across a skill boundary.
import {
  parsePrecision as parseScroll,
  checkPrecision as checkScroll,
} from "../../scrolly/scripts/precision.mjs";
// @ts-expect-error — as above.
import {
  parsePrecision as parseVideo,
  checkPrecision as checkVideoChart,
} from "../../chart-video/scripts/precision.mjs";
// @ts-expect-error — as above.
import { checkPrecision as checkVideoMap } from "../../map-beat/scripts/precision.mjs";
// @ts-expect-error — as above.
import {
  parsePrecision as parseWeb,
  checkPrecision as checkWebChart,
} from "../../chart-web/scripts/precision.mjs";
// @ts-expect-error — as above.
import { checkPrecision as checkWebMap } from "../../map-web/scripts/precision.mjs";
// @ts-expect-error — as above.
import {
  parsePrecision as parseStatic,
  checkPrecision as checkStaticChart,
} from "../../chart-beat/scripts/precision.mjs";
// @ts-expect-error — as above.
import { checkPrecision as checkStaticMap } from "../../map-beat/scripts/static-precision.mjs";
// @ts-expect-error — as above.
import { checkPrecision as checkStaticImage } from "../../image-beat/scripts/precision.mjs";

type Declared = Record<string, any>;
type Violation = { id: string; severity: string; says: string };

function checkerFor(
  medium: string,
  format: string,
): (d: Declared, a: unknown) => Violation[] {
  const table: Record<
    string,
    Record<string, (d: Declared, a: unknown) => Violation[]>
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
  if (!found) throw new Error(`no precision checker for ${medium}/${format}`);
  return found;
}

/** `China,12.29` under `country,co2` → `{ "china-co2": 12.29 }`. See the header. */
function frozenData(beat: string): Record<string, number | string> {
  const path = join(ROOT, beat, "data.csv");
  if (!existsSync(path)) return {};
  const lines = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (lines.length < 2) return {};
  const columns = lines[0].split(",").map((c) => c.trim());
  const out: Record<string, number | string> = {};
  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((c) => c.trim());
    const key = assertionId(cells[0]);
    if (!key) continue;
    columns.slice(1).forEach((column, i) => {
      const raw = cells[i + 1];
      if (raw === undefined || raw === "") return;
      const n = Number(raw);
      out[`${key}-${assertionId(column)}`] = Number.isFinite(n) ? n : raw;
    });
  }
  return out;
}

const beats: string[] = derivedBeats(ROOT);

describe("precision covers what the chain requires", () => {
  for (const beat of beats) {
    const brief = readFileSync(join(ROOT, beat, "BRIEF.md"), "utf8");
    const { retained, sheet, required } = chainFor(beat, ROOT);

    it(`should be shown every requirement the chain makes of it — ${beat}`, () => {
      const declared = readDerivedBlock(brief, "precision") as Declared;
      const covers = declared.covers ?? {};
      const missing = required
        .map((r: { id: string; because: string }) => ({
          id: assertionId(r.id),
          because: r.because,
        }))
        .filter((r: { id: string }) => !(r.id in covers));
      expect(
        missing.map(
          (r: { id: string; because: string }) => `${r.id} (${r.because})`,
        ),
        `${beat} — ${sheet.path}`,
      ).toEqual([]);
    });

    it(`should answer a requirement only with an assert it carries, and no number that drifted — ${beat}`, () => {
      const declared = readDerivedBlock(brief, "precision") as Declared;
      const answered = Object.entries(declared.covers ?? {})
        .filter(([, answer]) => answer !== null && answer !== undefined)
        .map(([, answer]) => ({ id: String(answer), because: "covers" }));
      const violations = checkerFor(retained.medium, retained.format)(
        declared,
        {
          required: answered,
          data: frozenData(beat),
        },
      );
      expect(
        violations.map((v) => `${v.id}: ${v.says}`),
        beat,
      ).toEqual([]);
    });
  }

  it("should drop the claim's datum and widen the rounding when the grounding is unverifiable", () => {
    const base = {
      format: "static",
      type: "bar",
      claim: { shape: "comparison", grounding: "supported" },
    };
    const sheet = { precisionToAssert: ["zero baseline"] };
    expect(
      requiredAssertions(base, sheet).map((r: { id: string }) => r.id),
    ).toContain("claim-datum");
    const out = requiredAssertions(
      { ...base, claim: { ...base.claim, grounding: "unverifiable" } },
      sheet,
    );
    expect(out.map((r: { id: string }) => r.id)).not.toContain("claim-datum");
    expect(out).toContainEqual({
      id: "rounding-widened",
      because: "grounding",
    });
  });

  it("should give the four exports four pairwise distinct precision shapes", () => {
    const section =
      "## Precision\n\n- **Every sentence is asserted** — from the frozen data.\n";
    const shapes = [
      parseScroll(section, {}),
      parseVideo(section, {
        declared: { kind: "time", shots: [{ shot: "hold", asserts: [] }] },
      }),
      parseWeb(section, { html: "<svg><text>1</text></svg>" }),
      parseStatic(section, {}),
    ].map((shape) => Object.keys(shape).sort().join(","));
    expect(new Set(shapes).size, shapes.join(" / ")).toBe(4);
  });

  it("should catch a declared value that no longer equals the frozen data", () => {
    const declared = {
      kind: "scroll",
      rounding: { unit: "Gt", digits: 2 },
      asserts: [],
      values: { "china-co2": { value: 11.1, unit: "Gt", digits: 2 } },
      perCard: {},
    };
    const violations = checkScroll(declared, {
      required: [],
      data: { "china-co2": 12.29 },
    });
    expect(violations.map((v: Violation) => v.id)).toEqual(["china-co2"]);
  });
});
