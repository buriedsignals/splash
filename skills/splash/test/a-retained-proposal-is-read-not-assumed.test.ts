/**
 * WHAT THE JOURNALIST RETAINED, READ BACK — AND THE ONE FIELD NOTHING MAY DEFAULT.
 *
 * `retainedFrom` / `readRetained` / `retainedFromBrief` are the single reader of gate 2's answer.
 * Before them each scaffold picked the two or three fields it happened to need and inferred the
 * rest, which is how the `interaction` the catalogue had recorded since it was written reached no
 * beat at all (audit gap 2).
 *
 * THE FIELD THAT IS NEVER DEFAULTED IS `grounding`. The three verdicts require three DIFFERENT
 * things of a beat's precision — `supported` requires the claim's own datum to be asserted,
 * `unverifiable` forbids it and widens the rounding, `overridden` makes the exactness note
 * mandatory (§1.4). A default of `supported` is therefore not a safe fallback: it is a beat
 * asserting, as measured, a number the journalist recorded as unverifiable.
 *
 * MUTATIONS, run and verified (task 4 of `docs/superpowers/plans/2026-09-17-editorial-chain.md`):
 *   - default `grounding` to `"supported"` in `retainedFromBrief` → "should refuse a beat whose
 *     front matter pins no grounding" red.
 *   - let `retainedFrom` fall back to the catalogue when a slot records no `interaction` → "should
 *     refuse a slot that recorded no interaction" red.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  retainedFrom,
  readRetained,
  retainedFromBrief,
  REQUIRED_RETAINED_FIELDS,
} from "#shared/editorial/retained.mjs";
import { parseStoryboard } from "../scripts/gate-contract.mjs";
import { visualCatalogueEntries } from "../../storyboard/scripts/propose.mjs";

/** The injection the trunk rule forces: the catalogue lives in a skill, `shared/` may not reach it. */
const catalogueInteraction = (medium: string, format: string) =>
  visualCatalogueEntries().find(
    (e) => e.medium === medium && e.format === format,
  )!.interaction;

const STORYBOARD = `---
takeaway: "The six countries under sixty years are all in sub-Saharan Africa."
grounding: supported
claimShape: comparison
claimColumn: "life_expectancy"
claimEntity: "Nigeria"
claimVersus: "Norway"
claimDirection: less
language: "en"
slots:
  - id: 1-life-expectancy
    proves: "that the six under sixty are all in one region"
    medium: map
    format: web
    reachable: yes
    candidates: ["Choropleth"]
    intent: "show a level over a territory"
    interaction: explore
    chosen: "Choropleth"
---
`;

let story: string;
let beat: string;

beforeAll(() => {
  story = mkdtempSync(join(tmpdir(), "retained-"));
  writeFileSync(join(story, "STORYBOARD.md"), STORYBOARD);
  beat = join(story, "beat");
  mkdirSync(beat);
  writeFileSync(
    join(beat, "BRIEF.md"),
    "---\nmedium: chart\nformat: static\nsize: landscape\ntype: bar\ngrounding: supported\n---\n\n# A beat\n",
  );
});

afterAll(() => rmSync(story, { recursive: true, force: true }));

describe("the retained proposal", () => {
  it("should read every field gate 2 recorded, as one typed object", () => {
    const retained = retainedFrom(
      parseStoryboard(STORYBOARD).meta,
      "1-life-expectancy",
    );
    expect(retained).toMatchObject({
      slotId: "1-life-expectancy",
      medium: "map",
      format: "web",
      size: null,
      type: "Choropleth",
      claim: { shape: "comparison", grounding: "supported" },
      interaction: { kind: "explore" },
    });
  });

  it("should read one off a story directory, through the parser the caller injects", () => {
    expect(
      readRetained(story, "1-life-expectancy", { parseStoryboard }).format,
    ).toBe("web");
  });

  it("should refuse to reach into a skill for its own parser", () => {
    expect(() => readRetained(story, "1-life-expectancy")).toThrow(
      /parseStoryboard/,
    );
  });

  it("should name the one missing field rather than call the slot invalid", () => {
    const withOut = STORYBOARD.replace("\n    interaction: explore", "");
    expect(() =>
      retainedFrom(parseStoryboard(withOut).meta, "1-life-expectancy"),
    ).toThrow(/records no interaction/);
  });

  it("should name a slot that is not there, and say which ones are", () => {
    expect(() => retainedFrom(parseStoryboard(STORYBOARD).meta, "7")).toThrow(
      /"1-life-expectancy"/,
    );
  });

  it("should rebuild a catalogue beat's proposal from its BRIEF and the catalogue", () => {
    const retained = retainedFromBrief(beat, { catalogueInteraction });
    expect(retained.format).toBe("static");
    expect(retained.type).toBe("bar");
    expect(retained.interaction.kind).toBe("none");
    expect(retained.interaction.promise.length).toBeGreaterThan(0);
  });

  it("should refuse a beat whose front matter pins no grounding", () => {
    const bare = join(story, "ungrounded");
    mkdirSync(bare, { recursive: true });
    writeFileSync(
      join(bare, "BRIEF.md"),
      "---\nformat: static\ntype: bar\nsize: landscape\n---\n",
    );
    expect(() => retainedFromBrief(bare, { catalogueInteraction })).toThrow(
      /records no grounding/,
    );
  });

  it("should hold the five fields a proposal cannot be built without", () => {
    expect(REQUIRED_RETAINED_FIELDS).toEqual([
      "medium",
      "format",
      "type",
      "interaction",
      "grounding",
    ]);
  });
});
