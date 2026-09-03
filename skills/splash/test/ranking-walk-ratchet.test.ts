/**
 * `unrecorded` IS AN ADMISSION, NOT AN ANSWER — and this is what stops it becoming one.
 *
 * `intent` and `rankingWalk` (issue #48) record that the house's own ranking — `chart-choice.md` —
 * was actually walked before a treatment was chosen. They arrived after sixteen stories had already
 * been produced and delivered, whose walks cannot be reconstructed: nobody can say now whether the
 * chooser was opened for a slot decided months ago. Writing a walk for those would be precisely the
 * dishonesty the fields exist to prevent — a justification composed after the fact for a decision
 * already taken — so they carry the literal `unrecorded`, the `TYPEFACE.md` `origin: default` idiom
 * applied to the same problem: "nobody recorded this" said out loud, where anything downstream can
 * see it, rather than a silence indistinguishable from an answer.
 *
 * The obvious hazard is that a future agent meets the gate, finds the word, and writes it to get
 * past. So the set is PINNED. This is a ratchet: the count may fall as a story is genuinely
 * re-walked, and it may never rise. A new story carrying `unrecorded` reddens here, naming itself.
 *
 * WHY A PIN AND NOT A BAN. Banning it outright would mean either deleting sixteen delivered stories
 * from the tree or fabricating sixteen walks, and both are worse than an admission that is counted.
 * The number is the point: it is a debt, it is visible, and it can only be paid down.
 *
 * TO PAY IT DOWN: walk `chart-choice.md` for that slot for real, write the intent and the walk, and
 * remove the story from `CARRYING` below. That is the only edit to this file anybody should be
 * making.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");
const STORIES = join(TWIN, "stories");

/**
 * The stories that predate the contract, with how many of their slots carry the admission. Written
 * out rather than counted, so a NEW story cannot slip in under a total that happens to match.
 */
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

/** How many slots in one storyboard record an unwalked ranking. */
function unrecordedSlots(slug: string): number {
  const path = join(STORIES, slug, "STORYBOARD.md");
  if (!existsSync(path)) return 0;
  return (readFileSync(path, "utf8").match(/^\s+rankingWalk:\s*unrecorded\s*$/gm) ?? []).length;
}

const slugs = existsSync(STORIES)
  ? readdirSync(STORIES, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  : [];

describe("the ranking-walk debt — counted, and only ever paid down", () => {
  it("should find the stories this pin was written against", () => {
    // Premise: without it, every assertion below goes vacuously green on an empty stories/ tree.
    expect(slugs.length).toBeGreaterThan(0);
  });

  it("should carry the admission in no story the pin does not name", () => {
    // THE ASSERTION THAT MATTERS. A story written after #48 has no excuse: its walk happened, or it
    // did not, and either way somebody was there to write it down.
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
    // The other direction, and it is not an error — a story that has been genuinely re-walked
    // SHOULD go under its pin. It reddens so the pin gets updated rather than silently drifting
    // out of date, and the failure says which story to strike from the list.
    const paid = Object.keys(CARRYING).filter(
      (slug) => slugs.includes(slug) && unrecordedSlots(slug) < CARRYING[slug]!,
    );
    expect(["re-walked, remove from CARRYING", paid]).toEqual([
      "re-walked, remove from CARRYING",
      [],
    ]);
  });

  it("should not pin a story that no longer exists", () => {
    const gone = Object.keys(CARRYING).filter((slug) => !slugs.includes(slug));
    expect(["pinned but absent", gone]).toEqual(["pinned but absent", []]);
  });

  it("should never let the admission stand in for the intent alone", () => {
    // The two fields travel together. A slot claiming a real intent while admitting no walk is
    // worse than admitting both: it reads as though the chooser was consulted for the half that is
    // hardest to check.
    for (const slug of slugs) {
      const path = join(STORIES, slug, "STORYBOARD.md");
      if (!existsSync(path)) continue;
      const text = readFileSync(path, "utf8");
      const intents = (text.match(/^\s+intent:\s*unrecorded\s*$/gm) ?? []).length;
      expect([slug, "intent and walk admit together", intents]).toEqual([
        slug,
        "intent and walk admit together",
        unrecordedSlots(slug),
      ]);
    }
  });
});
