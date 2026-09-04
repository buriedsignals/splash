/**
 * `intent: unrecorded` IS AN ADMISSION, NOT AN ANSWER — and this is what stops it becoming one.
 *
 * `intent` (issue #48) records that the house's own ranking — `chart-choice.md` — was walked before
 * a treatment was chosen. It arrived after sixteen stories had already been produced and delivered,
 * whose walks cannot be reconstructed: nobody can say now what narrow intent was named for a slot
 * decided months ago. Writing one would be precisely the dishonesty the field exists to prevent —
 * a justification composed after the fact for a decision already taken — so they carry the literal
 * `unrecorded`, the `TYPEFACE.md` `origin: default` idiom applied to the same problem: "nobody
 * recorded this" said out loud, where anything downstream can see it.
 *
 * The obvious hazard is that a future agent meets the gate, finds the word, and writes it to get
 * past. So the set is PINNED. This is a ratchet: the count may fall as a story is genuinely
 * re-walked, and it may never rise. A new story carrying `unrecorded` reddens here, naming itself.
 *
 * WHY A PIN AND NOT A BAN. Banning it would mean deleting sixteen delivered stories from the tree or
 * fabricating sixteen walks, and both are worse than an admission that is counted (issue #65).
 *
 * TO PAY IT DOWN: a journalist walks `chart-choice.md` for that slot for real, writes the intent,
 * and removes the story from `CARRYING` below. That is the only edit to this file anybody should
 * be making.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const STORIES = join(ROOT, "stories");

/** The stories that predate the field, with how many of their slots carry the admission. Written
 *  out rather than counted, so a NEW story cannot slip in under a total that happens to match. */
const CARRYING: Record<string, number> = {
  "heat-pump-adoption-across-europe": 1,
  "milan-cortina-la-glace-des-sponsors": 2,
  "r8-chart-static-german-road-deaths-by-mode": 1,
  "r8-scrolly-swiss-avalanche-deaths": 1,
  "real-ember-renewables-share": 1,
  "real-gwis-wildfire-counts": 1,
  "real-owid-life-expectancy": 1,
  "stress-aa-salary-spread": 1,
  "stress-ad-polish-hospital-beds": 1,
  "stress-p-transport-ridership": 3,
  "stress-q-safety-incidents": 1,
  "stress-t-europe-recycling": 1,
  "stress-u-rhone-glacier": 1,
  "stress-x-tunisian-water": 1,
  "stress-y-rural-broadband": 1,
  "stress-z-budget-parts": 1,
};

function unrecordedSlots(slug: string): number {
  const path = join(STORIES, slug, "STORYBOARD.md");
  if (!existsSync(path)) return 0;
  return (readFileSync(path, "utf8").match(/^\s+intent:\s*unrecorded\s*$/gm) ?? []).length;
}

const slugs = existsSync(STORIES)
  ? readdirSync(STORIES, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  : [];

describe("the unrecorded-intent debt — counted, and only ever paid down", () => {
  it("should find the stories this pin was written against", () => {
    expect(slugs.length).toBeGreaterThan(0);
  });

  it("should carry the admission in no story the pin does not name, and never more than pinned", () => {
    for (const slug of slugs) {
      const found = unrecordedSlots(slug);
      const pinned = CARRYING[slug] ?? 0;
      expect([slug, "unrecorded slots", found > pinned ? found : pinned]).toEqual([
        slug,
        "unrecorded slots",
        pinned,
      ]);
    }
  });

  it("should let the debt fall, and name what has been paid off", () => {
    const paid = Object.keys(CARRYING).filter(
      (slug) => slugs.includes(slug) && unrecordedSlots(slug) < CARRYING[slug]!,
    );
    expect(["re-walked, remove from CARRYING", paid]).toEqual(["re-walked, remove from CARRYING", []]);
  });

  it("should not pin a story that no longer exists", () => {
    const gone = Object.keys(CARRYING).filter((slug) => !slugs.includes(slug));
    expect(["pinned but absent", gone]).toEqual(["pinned but absent", []]);
  });
});
