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
import {
  PRODUCING_SKILLS,
  TRAITS,
  provenTraits,
  traitsOf,
} from "../../../scripts/traits.mjs";

describe("every producing skill declares what it is", () => {
  it("names only traits the vocabulary knows", () => {
    const known = new Set(TRAITS.map((trait) => trait.id));
    for (const skill of PRODUCING_SKILLS)
      for (const id of traitsOf(skill)) expect([...known]).toContain(id);
  });

  it("claims no trait its own files contradict", () => {
    for (const skill of PRODUCING_SKILLS) {
      const proven = new Set(provenTraits(skill));
      const unproven = traitsOf(skill).filter((id) => !proven.has(id));
      expect(`${skill} claims unproven: ${unproven.join(", ")}`).toBe(
        `${skill} claims unproven: `,
      );
    }
  });

  it("drops no trait its own files still prove — the escape hatch this closes", () => {
    for (const skill of PRODUCING_SKILLS) {
      const declared = new Set(traitsOf(skill));
      const hidden = provenTraits(skill).filter((id) => !declared.has(id));
      expect(`${skill} hides: ${hidden.join(", ")}`).toBe(`${skill} hides: `);
    }
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
