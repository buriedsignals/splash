/**
 * EVERY CATALOGUE BEAT'S FRONT MATTER RECORDS WHAT IT WAS PRODUCED FROM.
 *
 * A beat is produced from a RETAINED PROPOSAL. Exactly one of the 160 proofs has a `STORYBOARD.md`
 * to read that proposal back from, so for the other 159 the record is the BRIEF's own front
 * matter — and until this migration it recorded almost none of it. Measured before the repair:
 *
 *   40 beats pinned no `format` at all (37 `static-*`, the two `more-*`, and `proof/co2-suisse`,
 *      which had no front matter of any kind);
 *  160 beats pinned no `medium`, so `retainedFromBrief` defaulted every map beat to `chart` and
 *      resolved its frame against a chart sheet that does not exist for its type;
 *  160 beats pinned no `grounding`, which `requiredAssertions` refuses to guess — the three
 *      verdicts require three different things of a beat's precision, so a guessed `supported` is
 *      a beat asserting a number the journalist said could not be verified.
 *
 * WHAT THIS ASSERTS. For all 160: front matter exists, and it pins `format` (one of the four
 * exports), `medium` (one of the three), `type`, and `grounding`. And that `retainedFromBrief`
 * actually resolves for every one of them — the read is the point of the record.
 *
 * THE REPAIR WROTE FACTS, NOT DEFAULTS. `scripts/migrate-briefs.mjs --front-matter` takes `format`
 * from the front matter or from the beat's own `**Medium / format:**` line, `medium` from the type
 * the way the visual catalogue files it, `type` for the one beat that pins none from the type
 * sheet that names that beat as its worked example, and `grounding: supported` only where the beat
 * both commits the frozen data its claim is measured off and carries a refusal against it. A beat
 * failing either half is listed by the script and left alone; measured, none of the 160 does.
 *
 * MUTATIONS RUN (2026-09-17, task 11)
 *   - deleted `grounding:` from `proof/static-bar-top-emitters-2024/BRIEF.md` → RED, naming that
 *     beat and that key. Restored → green.
 *   - changed `proof/static-choropleth-europe-lowcarbon`'s `medium` to `chart` → RED on the read,
 *     because no chart sheet files `choropleth`. Restored → green.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
// @ts-expect-error — the repository's own tooling is ESM JavaScript.
import { chainFor, ROOT } from "../../../scripts/editorial-chain.mjs";
// @ts-expect-error — as above.
import { parseBriefFrontMatter } from "../../../shared/chart-beat/sizes.mjs";

const FORMATS = ["static", "video", "web", "scrolly"];
const MEDIUMS = ["chart", "map", "image"];

const beats = readdirSync(join(ROOT, "proof"), { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      existsSync(join(ROOT, "proof", entry.name, "BRIEF.md")),
  )
  .map((entry) => `proof/${entry.name}`)
  .sort();

describe("every catalogue beat records what it was produced from", () => {
  it("should find the whole catalogue, so nothing below can pass vacuously", () => {
    expect(beats.length).toBeGreaterThanOrEqual(160);
  });

  it("should pin a format, a medium, a type and a grounding on every one of them", () => {
    const incomplete: string[] = [];
    for (const beat of beats) {
      const record = parseBriefFrontMatter(
        readFileSync(join(ROOT, beat, "BRIEF.md"), "utf8"),
      );
      if (!record) {
        incomplete.push(`${beat}: no front matter at all`);
        continue;
      }
      const missing = (
        ["format", "medium", "type", "grounding"] as const
      ).filter((key) => !record[key]);
      if (missing.length) incomplete.push(`${beat}: no ${missing.join(", ")}`);
      else if (!FORMATS.includes(record.format))
        incomplete.push(`${beat}: format ${record.format}`);
      else if (!MEDIUMS.includes(record.medium))
        incomplete.push(`${beat}: medium ${record.medium}`);
    }
    expect(incomplete).toEqual([]);
  });

  it("should let the retained proposal and its frame be read back for every one of them", () => {
    const unreadable: string[] = [];
    for (const beat of beats) {
      try {
        const { retained, sheet } = chainFor(beat, ROOT);
        if (!retained.interaction?.kind)
          unreadable.push(`${beat}: no catalogue interaction`);
        if (!sheet.prohibitions?.length)
          unreadable.push(`${beat}: ${sheet.path} states no prohibition`);
      } catch (error) {
        unreadable.push(`${beat}: ${(error as Error).message.split("\n")[0]}`);
      }
    }
    expect(unreadable).toEqual([]);
  });
});
