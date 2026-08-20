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

/** Every `.mjs` and `.ts`/`.tsx` under a skill's `scripts/` and `assets/`, as text. `exclude`, when
 *  given, is a FILENAME pattern to leave out — for a witness that must read what a skill RENDERS
 *  rather than the guard machinery written afterward to check it (see `inlines-its-assets` below,
 *  the one witness that needs this). */
function sources(skill, { exclude } = {}) {
  const out = [];
  for (const sub of ["scripts", "assets"]) {
    const dir = join(skillDir(skill), sub);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (!/\.(mjs|ts|tsx)$/.test(name)) continue;
      if (exclude && exclude.test(name)) continue;
      out.push(readFileSync(join(dir, name), "utf8"));
    }
  }
  return out;
}

const has = (skill, relative) => existsSync(join(skillDir(skill), relative));
const anySource = (skill, pattern, options) => sources(skill, options).some((text) => pattern.test(text));

/** A single source file both CALLS a write function and names an `.html` target — not just mentions
 *  the extension somewhere, which a bare substring match cannot tell apart from a comment, a URL, or
 *  an unrelated string. The two must share one file: two different sources each matching half of it
 *  would prove nothing about either. */
const writesHtmlArtifact = (skill) =>
  sources(skill).some(
    (text) => /\bwrite(File(Sync)?|Atomic)\s*\(/.test(text) && /\.html["'`]/.test(text),
  );

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
    witness: writesHtmlArtifact,
  },
  {
    id: "inlines-its-assets",
    describes: "it embeds its own images or fonts into the delivered file as data URIs",
    // GUARD-MACHINERY EXCLUDED (ruled 2026-08-20): this witness used to read the whole `scripts/`
    // directory, so a `verify-*.mjs`'s own doc comment and regex LITERAL — written to DETECT a
    // `data:` URI, never to write one — satisfied it on their own. Measured on `chart-web`: the
    // only three hits were `verify-guards.mjs:23` (a doc comment), `verify-guards.mjs:33`
    // (`duplicatedPayload`'s own regex source), and `detect-weight-has-a-ceiling.mjs:7`
    // ("pre-base64" in a doc comment) — and not one of its 18 delivered pages contains `base64,`.
    // A witness downstream of the thing it protects means the cheapest way to make a red
    // `duplicated-payload` or `weight-has-a-ceiling` cell go away is to delete the decision
    // function that watches for it — the exact escape hatch this whole mechanism exists to close.
    // `verify-*.mjs` and `detect-*.mjs` are excluded: this witness now reads only what a skill's
    // own render/asset code actually writes. Checked every other trait built on `anySource` for the
    // same shape (a match found ONLY inside `verify-*`/`detect-*`, never in real production code):
    // `delegates-rendering` and `owns-a-surface-it-did-not-choose` (`exportChartPng`) both also
    // match `dw-beat/scripts/dw-client.mjs` and `produce.mjs`; `reader-driven-reveal`
    // (`data-progress`) also matches `scrolly/assets/interaction.mjs` and `ScrollySeed.tsx`;
    // `embeds-reader-photos` (`manifest.json`) matches only `render-preview.mjs`, never a
    // `verify-*`/`detect-*` file, and is additionally gated on `build-sample-photos.mjs` existing.
    // None of the four share this trait's defect.
    witness: (skill) =>
      anySource(skill, /data:image|data:font|base64/, { exclude: /^(verify|detect)-.*\.mjs$/ }),
  },
  {
    id: "embeds-reader-photos",
    describes: "the evidence it carries is the journalist's own photographs, not a drawing",
    witness: (skill) => anySource(skill, /manifest\.json/) && has(skill, "scripts/build-sample-photos.mjs"),
  },
  {
    id: "reads-a-journalists-csv",
    describes: "its own scripts or assets ingest a frozen .csv, rather than receiving already-typed values",
    // GUARD-MACHINERY EXCLUDED, same reasoning `inlines-its-assets` was ruled on 2026-08-20: the
    // guard this trait reaches (`csvSplitByHand`) names its OWN defect with the word "csv"
    // throughout its doc comment, which satisfies a literal-`.csv`-path witness on its own, in the
    // very file that decides the guard. Measured after adding the guard to all four reachable
    // skills: excluding `verify-*`/`detect-*` keeps the witness to the real production reads,
    // several of which turned out not to reference a `.csv` PATH at all — `map-beat/assets/geo.ts`
    // takes a `csv: string` parameter handed to it already read, and never names the extension —
    // so the witness matches the WORD, not the file extension: `chart-video/scripts/render-video.mjs`,
    // `dw-beat/scripts/prove-co2.mjs`, `map-beat/scripts/render-map.mjs` and `assets/geo.ts`,
    // `scrolly/scripts/render-scrolly.mjs`, `assets/gauge-data.ts` and `scripts/extent-range.mjs`.
    witness: (skill) => anySource(skill, /\bcsv\b/i, { exclude: /^(verify|detect)-.*\.mjs$/ }),
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
