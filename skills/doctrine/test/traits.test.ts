/**
 * A TRAIT IS A CLAIM ABOUT A SKILL'S OWN FILES, AND THIS IS WHAT MAKES IT ONE.
 *
 * The catalogue used to reach skills by name, and a rule written on Tuesday reached whichever skills
 * were typed into it on Tuesday. `map-beat` ships the video genre and carries a timing contract, and
 * `reveal-completes` — written the previous evening — never reached it, because nobody typed it.
 *
 * Traits fix that only if a trait cannot be claimed or dropped at will. Each one is proved against
 * the skill's own files: claiming `bakes-a-plate` without a `bake-plate.mjs` fails, and — the
 * direction that matters — DROPPING a trait whose witness is still there fails too, because the
 * cheapest way out of a red cell would otherwise be to stop admitting what the skill is.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  OUTSIDE_THE_CATALOGUE,
  PRODUCING_SKILLS,
  TRAITS,
  allSkills,
  cataloguedSkills,
  provenTraits,
  traitsOf,
} from "../../../scripts/traits.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");

describe("every catalogued skill declares what it is", () => {
  it("names only traits the vocabulary knows", () => {
    const known = new Set(TRAITS.map((trait) => trait.id));
    for (const skill of cataloguedSkills())
      for (const id of traitsOf(skill)) expect([...known]).toContain(id);
  });

  it("claims no trait its own files contradict", () => {
    for (const skill of cataloguedSkills()) {
      const proven = new Set(provenTraits(skill));
      const unproven = traitsOf(skill).filter((id) => !proven.has(id));
      expect(`${skill} claims unproven: ${unproven.join(", ")}`).toBe(
        `${skill} claims unproven: `,
      );
    }
  });

  it("drops no trait its own files still prove — the escape hatch this closes", () => {
    for (const skill of cataloguedSkills()) {
      const declared = new Set(traitsOf(skill));
      const hidden = provenTraits(skill).filter((id) => !declared.has(id));
      expect(`${skill} hides: ${hidden.join(", ")}`).toBe(`${skill} hides: `);
    }
  });

  it("writes a TRAITS.json for every skill the catalogue asks — including one with nothing to say", () => {
    for (const skill of cataloguedSkills())
      expect(`${skill}: ${existsSync(join(SKILLS, skill, "TRAITS.json"))}`).toBe(
        `${skill}: true`,
      );
  });

  it("gives every trait in the vocabulary a describing line a reader can disagree with", () => {
    for (const trait of TRAITS) {
      expect(trait.id).toMatch(/^[a-z][a-z-]+$/);
      expect(trait.describes.length).toBeGreaterThan(30);
    }
  });
});

/**
 * A WITNESS READS A MECHANISM, NOT A SUBSTRING THAT RESEMBLES ONE.
 *
 * The witnesses were written against the eight skills that DRAW, and only ever run against those
 * eight. Run over the whole tree they fire in places nobody wrote them for — measured 2026-08-23,
 * five of them. Every one is the same defect in miniature: a population typed by accident, because
 * the witness matched a NAME where it meant an ACT.
 *
 * These are pinned by name rather than left to the general both-directions check above, because
 * that check can only see a skill that DECLARES a `TRAITS.json` — and the day one of these skills
 * gains one, a witness still firing falsely would write the false trait into it and nothing would
 * object. This table is what stops that, and it is a table of MEASUREMENTS: each row names the file
 * and the line the false match was read from.
 */
describe("no witness fires on a skill whose files only MENTION what it looks for", () => {
  const measured: { trait: string; skill: string; read: string }[] = [
    {
      trait: "delegates-rendering",
      skill: "splash",
      read: 'keys.mjs — `const DATAWRAPPER_PROBE = "https://api.datawrapper.de/v3/me"`, a liveness probe. splash renders nothing and fetches no artefact.',
    },
    {
      trait: "ships-standalone-html",
      skill: "deliver",
      read: "deliver.mjs — writes `EMBED_CODE.html`, whose whole content is an `<iframe>` plus a `<script>` tag (`embedCodeFor`). A snippet a CMS pastes into someone else's page, not a page a reader opens.",
    },
    {
      trait: "inlines-its-assets",
      skill: "deliver",
      read: "deploy-embed.mjs — `buffer.toString(\"base64\")`, the body encoding Cloudflare's asset-upload API requires. Nothing it delivers carries a data URI.",
    },
    {
      trait: "reads-a-palette",
      skill: "palette",
      read: "palette.mjs — `export function readPalette(` is the DECLARATION every other skill copies. palette renders nothing, so it never calls it; the trait's own `describes` says its own RENDER calls it.",
    },
    {
      trait: "reads-a-journalists-csv",
      skill: "splash",
      read: 'sealed-map-bake.mjs — `const DATA_FORMATS = new Set(["csv", "geojson", "json", "tsv"])`, an allowlist of format NAMES in a request validator. splash opens no table.',
    },
  ];

  for (const row of measured)
    it(`${row.trait} does not fire on ${row.skill}`, () => {
      expect(`${row.skill}: ${provenTraits(row.skill).join(", ")}`).not.toContain(row.trait);
    });

  it("still fires where the mechanism really is — the other half of every tightening", () => {
    const holds: [string, string][] = [
      ["delegates-rendering", "dw-beat"],
      ["ships-standalone-html", "chart-web"],
      ["ships-standalone-html", "dw-beat"],
      ["ships-standalone-html", "map-web"],
      ["ships-standalone-html", "scrolly"],
      ["inlines-its-assets", "image-beat"],
      ["inlines-its-assets", "map-beat"],
      ["inlines-its-assets", "map-web"],
      ["inlines-its-assets", "scrolly"],
      ["reads-a-palette", "chart-beat"],
      ["reads-a-palette", "map-web"],
      ["reads-a-journalists-csv", "map-beat"],
      ["reads-a-journalists-csv", "intake"],
      ["reads-a-journalists-csv", "storyboard"],
    ];
    for (const [trait, skill] of holds)
      expect(`${skill}: ${provenTraits(skill).join(", ")}`).toContain(trait);
  });
});

/**
 * THE POPULATION IS READ OFF THE TREE, NOT TYPED INTO IT.
 *
 * `PRODUCING_SKILLS` is a fact about skills that DRAW, and other code depends on it meaning exactly
 * that. It was never a fact about who the CATALOGUE may ask — but it was doing that job too, and so
 * seven skills were asked nothing. Every fix made to the editorial checker, the profiler, the gates
 * and delivery was local by construction: no rule could reach them however many traits they proved.
 *
 * A second hand-written constant would have been the same defect with a new name. The catalogue's
 * population is now DERIVED: every directory under `skills/` that ships a `SKILL.md`, minus the ones
 * argued permanently outside — and the argument, not just the name, lives with the exclusion.
 */
describe("the catalogue's population is derived from the tree", () => {
  it("misses no skill on disk — every one is catalogued, or argued out by name", () => {
    const onDisk = readdirSync(SKILLS, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(SKILLS, entry.name, "SKILL.md")))
      .map((entry) => entry.name)
      .sort();
    const accounted = [...cataloguedSkills(), ...Object.keys(OUTSIDE_THE_CATALOGUE)].sort();
    expect(accounted).toEqual(onDisk);
  });

  it("still knows which skills DRAW, and that is a smaller set", () => {
    for (const skill of PRODUCING_SKILLS) expect(cataloguedSkills()).toContain(skill);
    expect(PRODUCING_SKILLS.length).toBeLessThan(cataloguedSkills().length);
  });

  it("asks the skills that shape and ship a beat, which it never used to", () => {
    for (const skill of ["splash", "storyboard", "intake", "deliver", "palette", "newsroom-charter"])
      expect(cataloguedSkills()).toContain(skill);
  });

  // AN ABSENCE THAT IS ARGUED IS NOT A GAP — and this is what stops the argument going stale. An
  // exclusion nobody re-measures is the cheapest hiding place in the whole mechanism: name a skill
  // here and no rule reaches it again, ever, whatever it grows. So the exclusion is only allowed to
  // stand while the skill witnesses NOTHING. The day `doctrine` grows a render, a lexicon, a probe
  // or a proposal, this goes red and somebody has to argue it again or let it in.
  it("excludes only a skill that witnesses nothing at all", () => {
    for (const [skill, reason] of Object.entries(OUTSIDE_THE_CATALOGUE)) {
      expect(`${skill} proves: ${provenTraits(skill).join(", ")}`).toBe(`${skill} proves: `);
      expect(reason.length).toBeGreaterThan(120);
    }
  });

  it("names doctrine, and only doctrine, as permanently outside", () => {
    expect(Object.keys(OUTSIDE_THE_CATALOGUE)).toEqual(["doctrine"]);
    expect(allSkills()).toContain("doctrine");
    expect(cataloguedSkills()).not.toContain("doctrine");
  });
});
