// WHAT A SKILL IS, read off its own files.
//
// The catalogue reaches skills through these, never by name. A trait is a MECHANISM the skill has —
// not the work it does, not the family it belongs to — because a defect is reachable wherever its
// mechanism is. `plate-follows-theme` reaches a baked plate and a delegated export alike: two
// families, one trait, which is the pairing a family table cannot express.
//
// Each trait carries a WITNESS: a check against the skill's own directory. The witness is what makes
// a trait a claim rather than an opinion, and it is checked in both directions — see
// `doctrine/test/traits.test.ts`.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Every skill that PRODUCES a visual. `deliver`, `storyboard`, `intake` and the rest shape or ship
 *  a beat; they never draw one, so a guard about a drawing cannot reach them.
 *
 *  This lives here, not in `guards.mjs`: it is a fact about skills, which is what this module is
 *  about. `guards.mjs` re-exports it so every existing importer keeps working unchanged. */
export const PRODUCING_SKILLS = [
  "chart-beat",
  "chart-web",
  "chart-video",
  "dw-beat",
  "map-beat",
  "map-web",
  "image-beat",
  "scrolly",
];

const skillDir = (skill) => join(ROOT, "skills", skill);

/** Every `.mjs` and `.ts`/`.tsx` under a skill's `scripts/` and `assets/`, as text. */
function sources(skill) {
  const out = [];
  for (const sub of ["scripts", "assets"]) {
    const dir = join(skillDir(skill), sub);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!/\.(mjs|ts|tsx)$/.test(name)) continue;
      out.push(readFileSync(join(dir, name), "utf8"));
    }
  }
  return out;
}

const has = (skill, relative) => existsSync(join(skillDir(skill), relative));
const anySource = (skill, pattern) => sources(skill).some((text) => pattern.test(text));

export const TRAITS = [
  {
    id: "draws-own-geometry",
    describes: "the skill writes the marks it renders, rather than fetching a picture of them",
    witness: (skill) => has(skill, "scripts/render-still.mjs"),
  },
  {
    id: "bakes-a-plate",
    describes: "it bakes a basemap raster and the frame its marks were projected into, side by side",
    witness: (skill) => has(skill, "scripts/bake-plate.mjs"),
  },
  {
    id: "projects-geography",
    describes: "it resolves a camera and projects coordinates into a frame's pixels",
    witness: (skill) => has(skill, "scripts/bake-plate.mjs"),
  },
  {
    id: "delegates-rendering",
    describes: "the delivered artefact is produced by a provider and fetched, never drawn here",
    witness: (skill) => anySource(skill, /api\.datawrapper\.de|exportChartPng/),
  },
  {
    id: "owns-a-surface-it-did-not-choose",
    describes: "the ground its marks land on is baked or returned, so its luminance is not the beat's own decision",
    witness: (skill) => has(skill, "scripts/bake-plate.mjs") || anySource(skill, /exportChartPng/),
  },
  {
    id: "timed-build-that-ends",
    describes: "it renders a build against a frame count with a last frame a reader stops on",
    witness: (skill) => has(skill, "assets/timing.ts"),
  },
  {
    id: "reader-driven-reveal",
    describes: "the reader's own gesture drives how much of the picture is shown",
    witness: (skill) => anySource(skill, /data-progress/),
  },
  {
    id: "ships-standalone-html",
    describes: "it writes an HTML file a reader opens with no server and no build",
    witness: (skill) => anySource(skill, /\.html\b/),
  },
  {
    id: "inlines-its-assets",
    describes: "it embeds its own images or fonts into the delivered file as data URIs",
    witness: (skill) => anySource(skill, /data:image|data:font|base64/),
  },
  {
    id: "embeds-reader-photos",
    describes: "the evidence it carries is the journalist's own photographs, not a drawing",
    witness: (skill) => anySource(skill, /manifest\.json/) && has(skill, "scripts/build-sample-photo.mjs"),
  },
];

export function traitsOf(skill) {
  const path = join(skillDir(skill), "TRAITS.json");
  if (!existsSync(path)) return [];
  const record = JSON.parse(readFileSync(path, "utf8"));
  return record.traits ?? [];
}

export function provenTraits(skill) {
  return TRAITS.filter((trait) => trait.witness(skill)).map((trait) => trait.id);
}
