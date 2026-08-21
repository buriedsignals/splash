/**
 * A BEAT DRAWN FROM A COUNT WITH A DENOMINATOR BESIDE IT SAYS WHICH READING IT DRAWS.
 *
 * Round four's finding 5: nothing in this tree reasoned about a count against its denominator.
 * `stress-q-safety-incidents` ranks five districts by `incidents` with `residents` in the next
 * column — Centro leads on the raw count and Sul leads per resident — and
 * `stress-p-transport-ridership` inverts at the very top (Porto 416 trips per resident against
 * Lisboa's 393). `intake` now names the candidate column and `storyboard`'s grounding refuses to
 * confirm a raw-count superlative while one exists; this is the producing half.
 *
 * Two things are walked here, and the second is the one that matters. The unit cases below prove
 * the decision can actually FAIL — a sweep that can only pass is a sweep that measures nothing.
 * The sweep itself runs over this format's OWN committed beats, real material, never a fixture:
 * measured on the day this landed, all six beats in the tree that meet a denominator belong to
 * `chart-beat` (one of them to `chart-web` as well) and every one of them was silent about which
 * reading it drew. The other six formats sweep an empty population today and are already swept
 * the day they meet one — which is why the rule's population is derived from
 * `materialises-a-beat` rather than typed.
 */
import { describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  denominatorReadingStated,
  beatsCalling,
} from "../scripts/detect-denominator-reading.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const SKILL = "map-beat";

/** A throwaway story on disk: a frozen table, and one beat with the given BRIEF (or none). */
function storyWith(csv: string, brief: string | null): string {
  const story = mkdtempSync(join(tmpdir(), "denominator-reading-"));
  mkdirSync(join(story, "source"), { recursive: true });
  writeFileSync(join(story, "source", "data.csv"), csv);
  const beat = join(story, "beats", "one");
  mkdirSync(beat, { recursive: true });
  if (brief !== null) writeFileSync(join(beat, "BRIEF.md"), brief);
  return beat;
}

const COUNT_AND_DENOMINATOR = "district,incidents,residents\nCentro,412,201000\nSul,205,88000\n";

describe("denominatorReadingStated decides, and can fail", () => {
  it("refuses a beat whose BRIEF says nothing, naming both columns", () => {
    const found = denominatorReadingStated(
      storyWith(COUNT_AND_DENOMINATOR, "# Beat\n\nNothing about a reading here.\n"),
    );
    expect(found.applies).toBe(true);
    expect(found.stated).toBe(false);
    expect(found.reason).toContain("residents");
    expect(found.reason).toContain("incidents");
  });

  it("accepts `reading: raw`, which is a complete answer and not a lesser one", () => {
    // stress-a-energy-bills draws `price_eur` raw BECAUSE a household energy bill is already a
    // per-household figure. This rule asks a question; it has no opinion about the answer.
    const found = denominatorReadingStated(
      storyWith(COUNT_AND_DENOMINATOR, "# Beat\n\n**Reading**: raw — the count is the claim.\n"),
    );
    expect(found.stated).toBe(true);
    expect(found.reading).toBe("raw");
  });

  it("accepts `reading: per <column>` when the column is really in the frozen table", () => {
    const found = denominatorReadingStated(
      storyWith(COUNT_AND_DENOMINATOR, "# Beat\n\nreading: per residents\n"),
    );
    expect(found.stated).toBe(true);
    expect(found.reading).toBe("per residents");
  });

  it("refuses a reading that names a column the frozen table does not carry", () => {
    const found = denominatorReadingStated(
      storyWith(COUNT_AND_DENOMINATOR, "# Beat\n\nreading: per commuters\n"),
    );
    expect(found.stated).toBe(false);
    expect(found.reason).toContain("residents");
  });

  it("never fires where no denominator sits beside the count", () => {
    const found = denominatorReadingStated(
      storyWith("country,loss_ha\nBrazil,1120000\nPeru,180000\n", "# Beat\n"),
    );
    expect(found.applies).toBe(false);
  });

  it("never fires on a beat with no frozen table above it — every worked example under proof/", () => {
    expect(denominatorReadingStated(join(ROOT, "proof")).applies).toBe(false);
  });
});

describe(`every committed ${"map-beat"} beat that meets a denominator states its reading`, () => {
  const unstated = beatsCalling(ROOT, SKILL)
    .map((beat) => ({ beat, found: denominatorReadingStated(join(ROOT, beat)) }))
    .filter(({ found }) => found.applies && !found.stated)
    .map(({ beat, found }) => `${beat} — ${found.reason}`);

  it("leaves none of them silent about which reading it draws", () => {
    expect(unstated).toEqual([]);
  });
});
