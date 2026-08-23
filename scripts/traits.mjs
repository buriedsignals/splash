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

/** Every skill in this tree, read off the filesystem: a directory under `skills/` that ships a
 *  `SKILL.md`. NOT A LIST. The one list this module still keeps is `PRODUCING_SKILLS` above, and it
 *  keeps it because "the skills that DRAW" is a claim someone has to make; "the skills that exist"
 *  is not, and typing it would only be a slower way of reading the directory. */
export function allSkills() {
  return readdirSync(join(ROOT, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(ROOT, "skills", entry.name, "SKILL.md")))
    .map((entry) => entry.name)
    .sort();
}

/** THE SKILLS THE CATALOGUE MAY ASK, and the one it never will, with the argument attached.
 *
 *  A rule reaches a skill through the traits that skill proves. Until 2026-08-23 it could only
 *  reach one of the eight that DRAW, because `reachable()` iterated `PRODUCING_SKILLS` — so the
 *  editorial checker, the profiler, the gates and delivery were asked nothing at all, and every fix
 *  made in them was local by construction. Widening was not free: five witnesses had to be tightened
 *  first, because each was matching a NAME where it meant an ACT (see the trait comments above).
 *
 *  `doctrine` is permanently outside, and this is the statement a reader meets before wondering why
 *  it has no rows anywhere. It is not an exception per rule — it is one fact about one skill:
 *  `skills/doctrine/scripts/` holds a single 90-line file exporting two pure string functions over a
 *  markdown table (`checkReferenceSet`, `countReferenceRows`). It has no story directory, no gate,
 *  no lexicon, no probe, no proposal, and it witnesses none of the traits in this vocabulary. It is
 *  also the REGISTRY: `guard-catalogue.json` lives in it, and `guard-parity.test.ts`,
 *  `guard-wiring.test.ts` and `traits.test.ts` live in its own `test/`. A catalogue rule about
 *  `doctrine` would be the registry judging itself through itself.
 *
 *  The exclusion is not permission to stop looking. `traits.test.ts` holds it to witnessing NOTHING:
 *  the day this skill grows a mechanism, the exclusion goes red and has to be argued again. */
export const OUTSIDE_THE_CATALOGUE = {
  doctrine:
    "the registry itself, not a skill the registry can judge: one 90-line script exporting two pure " +
    "string functions over a markdown table, no story directory, no gate, no lexicon, no probe, no " +
    "proposal — it witnesses no trait in this vocabulary, and it is where the catalogue and the tests " +
    "that hold the catalogue honest already live",
};

/** The population every catalogue rule is asked of: every skill in the tree except those argued
 *  permanently outside. DERIVED — this is the thing a rule's `requires` filters, and the reason a
 *  rule can now reach a skill that ships a beat as well as one that draws it. */
export function cataloguedSkills() {
  return allSkills().filter((skill) => !(skill in OUTSIDE_THE_CATALOGUE));
}

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

/** A single source file CALLS a write function, names an `.html` target, AND carries a document
 *  opening — not just mentions the extension somewhere, which a bare substring match cannot tell
 *  apart from a comment, a URL, or an unrelated string. All three must share one file: two different
 *  sources each matching part of it would prove nothing about either.
 *
 *  THE DOCTYPE IS THE THIRD CONDITION, and it was added on 2026-08-23 when the population widened
 *  past the eight skills that draw. Write-plus-`.html` alone fired on `deliver`, which writes
 *  `EMBED_CODE.html` — an `<iframe>` and a `<script>` tag (`embedCodeFor`), a snippet a CMS pastes
 *  into someone else's page. That is the opposite of what this trait names: a file a reader opens
 *  with no server and no build has to BE a document. Measured across all fifteen skills, exactly
 *  four sources write an `.html` target and open a document — `chart-web/render-web.mjs`,
 *  `dw-beat/produce.mjs`, `map-web/render-web.mjs`, `scrolly/render-scrolly.mjs` — the same four
 *  skills this trait already reached, unchanged. */
const writesHtmlArtifact = (skill) =>
  sources(skill).some(
    (text) =>
      /\bwrite(File(Sync)?|Atomic)\s*\(/.test(text) &&
      /\.html["'`]/.test(text) &&
      /<!doctype\s+html/i.test(text),
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
    // THE PROVIDER'S ADDRESS IS NOT THE DELEGATION. This witness used to accept
    // `api.datawrapper.de` as an alternative to `exportChartPng`, and on 2026-08-23, when the
    // population widened past the eight skills that draw, that alternative fired on `splash` —
    // whose only match is `keys.mjs`'s `const DATAWRAPPER_PROBE = "https://api.datawrapper.de/v3/me"`,
    // a liveness probe for a preflight. splash renders nothing and fetches no artefact; naming a
    // provider is not handing it the drawing. The remaining half is the ACT: `exportChartPng` asks
    // the provider for the rendered picture and takes it back. Measured across all fifteen skills,
    // it appears only in `dw-beat` — `dw-client.mjs` (the call itself) and `produce.mjs` (two real
    // uses) as well as its own `verify-range-annotation.mjs`, so this is not a trait a verify script
    // could satisfy on its own, and the exclusion below matches the convention the other
    // guard-adjacent witnesses already use.
    witness: (skill) => anySource(skill, /exportChartPng/, { exclude: /^(verify|detect)-.*\.mjs$/ }),
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
    //
    // A DATA URI, NOT AN ENCODING (ruled 2026-08-23, when the population widened past the eight
    // skills that draw). The bare word `base64` fired on `deliver`, whose every match is in
    // `deploy-embed.mjs` — `buffer.toString("base64")` and a `{ key, value, base64: true }` request
    // body, the encoding Cloudflare's asset-upload API requires on the wire. Nothing `deliver`
    // hands a reader carries a data URI at all. The witness now reads the URI's own payload
    // separator `;base64,` (or a literal `data:image`/`data:font`, for the forms that carry no
    // base64 payload), which is the shape a file EMBEDS rather than the verb a request uses:
    // `data:${mime};base64,` (image-beat), `data:image/png;base64,` (map-beat, map-web, scrolly).
    // The four skills this trait reached before are the four it reaches after.
    witness: (skill) =>
      anySource(skill, /data:image|data:font|;base64,/, { exclude: /^(verify|detect)-.*\.mjs$/ }),
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
    //
    // A FIFTH FALSE FIRING, found here on 2026-08-23 and NOT in the report that opened this task —
    // which listed four. Widened past the eight skills that draw, the bare word matched `splash`,
    // whose one and only hit is `sealed-map-bake.mjs:35`
    // `const DATA_FORMATS = new Set(["csv", "geojson", "json", "tsv"])` — an allowlist of format
    // NAMES inside a request validator, next to `MAP_TREATMENTS` and `GEOMETRY_TYPES`. splash opens
    // no table; it checks that somebody else said they would.
    //
    // So the witness keeps reading the WORD rather than the extension — that part was right and the
    // comment above says why — but only where the word is CODE: an identifier containing `Csv`
    // (`parseCsvRows`, `valuesFromCsv`, `toCsv`), or a bare `csv` followed by the syntax of a
    // parameter, an argument, a property or a module path (`csv:`, `csv,`, `csv)`, `csv.`). A
    // quoted `"csv"` in a set of format names matches none of them: the character after it is the
    // closing quote. Measured across all fifteen skills — the seven that really ingest a frozen
    // table (chart-video, dw-beat, map-beat, map-web, scrolly, intake, storyboard) all keep it, and
    // only splash drops.
    //
    // A `.csv` PATH was tried as a second alternative and REMOVED: swept over every source file in
    // the tree, not one names a `.csv` without also using `csv` as code, so the alternative could
    // never decide anything on its own — a branch that cannot fire is worse than a missing one. The
    // reverse is not true and is why this half is the one kept: `map-beat/assets/geo.ts`,
    // `scrolly/assets/gauge-data.ts`, `dw-beat/scripts/dw-client.mjs` and three more take csv text
    // already read and never name a file at all.
    witness: (skill) =>
      anySource(skill, /[a-z]Csv\b|[a-z]Csv[A-Z(]|\bcsv\s*[:,).]/, {
        exclude: /^(verify|detect)-.*\.mjs$/,
      }),
  },
  {
    id: "paints-a-region-with-no-reading",
    describes: "it fills a region that has no value with a COLOUR derived from the same palette its classes are, so that fill can be confused with a class",
    // THE RISK, NOT THE RULE. A skill reaches this trait by deriving a colour for a region that
    // filed nothing — `noDataFor` — because a derived colour is a colour that can land on top of a
    // reading, which is exactly what happened on the rabies world map (1.28:1 from class 1, on the
    // ground the story shipped on).
    //
    // `map-beat` does NOT reach it, and that is a real editorial difference rather than a gap:
    // `assets/Co2MapStill.tsx` paints its no-data regions with `url(#no-data)`, a 45° hatch over the
    // ground, under its own comment — *"No-data is a TEXTURE, not another shade: any shade is a
    // shade the ramp could have used (`geo-discipline.md` rule 7)"*. A texture cannot be read as a
    // class whatever the palette does, so the reading this rule makes has nothing to fire on there.
    // The static genre had the answer the web genre did not.
    //
    // Witnessed by the DERIVATION and not by the guard: deleting `noDataFor` to escape the rule
    // would mean the skill no longer derives a no-data colour at all, which is a change to what it
    // paints and not a way of hiding from a check — unlike a `verify-*` function, which is why the
    // usual `verify`/`detect` exclusion is applied here too.
    witness: (skill) =>
      anySource(skill, /export function noDataFor\(/, {
        exclude: /^(verify|detect)-.*\.mjs$/,
      }),
  },
  {
    id: "joins-values-to-shapes",
    describes: "it matches a source's per-key readings onto a fixed set of shapes it must fully account for",
    // Witnessed by the export itself, not a description of it — `joinValues` is the mechanism, and a
    // skill either has this exact join or it does not. `map-web`'s own `assets/geo-symbol.ts` says so
    // explicitly in its own header: "a proportional-symbol beat has no polygon and no data JOIN the
    // way a choropleth does — every point either has a coordinate and a value, or it is not in the
    // study set at all", so the risk this trait's guard refuses cannot arise there. Excluding
    // `verify-*`/`detect-*` matches the same convention every other guard-adjacent trait uses, even
    // though nothing in this skill's verify script currently re-declares the function's own name in
    // a way that would self-satisfy it — a re-export statement is not a declaration.
    witness: (skill) => anySource(skill, /export function joinValues\(/, { exclude: /^(verify|detect)-.*\.mjs$/ }),
  },
  {
    id: "reads-a-palette",
    describes: "its own render calls readPalette, so the ground and accent it draws in come from a journalist's recorded answer, never a literal",
    // Witnessed by the CALL, not a mention of the name — `dw-beat` names `readPalette` twice in its
    // own comments (verify-owned.mjs, sizes.mjs), each time drawing an ANALOGY to its own unrelated
    // throw ("the same way `readPalette` throws"), and neither is followed by a `(` — dw-beat never
    // calls the function, because it delegates rendering to Datawrapper and threads its accent a
    // different way. Measured: `readPalette\(` (the call, not the bare name) appears in the real
    // render/preview scripts of exactly seven producing skills — chart-beat, chart-web, chart-video,
    // map-beat, map-web, image-beat, scrolly — and in none of dw-beat's. Excluding `verify-*`/
    // `detect-*` matches the convention every other guard-adjacent trait already uses, even though
    // no such file currently mentions this call at all.
    //
    // AND NOT THE DECLARATION (ruled 2026-08-23, when the population widened past the eight skills
    // that draw). `readPalette(` matched `export function readPalette(dir, { stopAt } = {})` — the
    // declaration — as readily as a call, so it fired on `palette/scripts/palette.mjs:1617`, the
    // ORIGIN every other skill's copy is taken from. `palette` renders nothing: it writes the file
    // the others read, and this trait's own `describes` says "its own RENDER calls readPalette".
    // The seven producing skills that hold the trait each declare the function in their own
    // `render-still.mjs` AND call it somewhere else (`render-preview.mjs`, `render-web.mjs`,
    // `render-map.mjs`, `render-video.mjs`, `render-scrolly.mjs`), so excluding the declaration
    // leaves all seven and drops only the skill that has nothing to draw.
    witness: (skill) =>
      anySource(skill, /(?<!function\s)readPalette\(/, { exclude: /^(verify|detect)-.*\.mjs$/ }),
  },
  {
    id: "reads-a-provider-credential",
    describes: "its own scripts read a live third-party API key or token off the environment, by its canonical name or a declared alias list — so a name the root's .env holds under a different alias is a live risk, not a hypothetical one",
    // FINDING 2 (stress round two): the root's `.env` names the Datawrapper credential
    // `DATAWRAPPER_API_TOKEN` and MapTiler's key `MAPTILER_API_KEY`/`REMOTION_MAPTILER_KEY`/
    // `VITE_MAPTILER_KEY` — the engine's own names — while two live code paths read a bare
    // `process.env.DATAWRAPPER_TOKEN`/`process.env.MAPTILER_KEY` with no fallback at all, so a
    // real, present credential under an alias read back as "not set". `map-beat`/`map-web`/
    // `scrolly`'s own `bake-plate.mjs` already carried a `MAPTILER_KEY_ALIASES` array before this
    // was named; `dw-beat` earned its own `DATAWRAPPER_TOKEN_ALIASES` closing the gap.
    //
    // Witnessed by EITHER a literal `env.NAME`/`env["NAME"]` property read of a canonical
    // `..._KEY`/`..._TOKEN` name, OR a declared `..._KEY_ALIASES`/`..._TOKEN_ALIASES` list —
    // never a bare `..._KEY`/`..._TOKEN` substring on its own, which is exactly the pattern that
    // makes `map-web/assets/MapWebSeed.tsx`'s own `SUBJECT_KEY` (a data-selection constant with no
    // credential in it at all) a false positive: measured directly, the bare-substring form matches
    // it and the property-read/alias-list form does not. `scrolly/scripts/bake-plate.mjs` reads its
    // key through a loop over an array of names (`names.map((name) => process.env[name])`) rather
    // than any literal property — already alias-safe by construction, and caught here by its own
    // `MAPTILER_KEY_ALIASES` declaration rather than by the read. Excluding `verify-*`/`detect-*`
    // matches the convention every other guard-adjacent trait already uses.
    //
    // A WITNESS THAT DISAPPEARS WHEN THE DEFECT IS FIXED IS NOT A WITNESS (2026-08-23). The two forms
    // above are a LITERAL property read and a declared `..._ALIASES` array — and a skill that routes
    // every one of its reads through a resolver has neither. Measured: `splash` was one line from
    // losing this trait entirely by fixing its last bare read, which would have deleted the rule's
    // own cell at the exact moment the skill started complying, leaving a later regression invisible.
    // A guard that erases its own population as a reward for passing is the sharpest form of the
    // false confirmation this tree keeps finding.
    //
    // So two more forms, each a MECHANISM rather than a spelling: a canonical name handed to a
    // resolver beside an environment (`resolveEnvKey(process.env, "MAPTILER_KEY")`), and an alias
    // list declared as a TABLE row (`MAPTILER_KEY: ["MAPTILER_API_KEY", ...]`) rather than as an
    // `..._ALIASES` array. Both are the same act the first two forms describe. Measured across all
    // fifteen skills before and after: the answers are byte-identical, so nothing about today's
    // population moved — what moved is that it can no longer vanish tomorrow.
    witness: (skill) =>
      anySource(
        skill,
        /\benv(\.|\[["'`])[A-Z][A-Z0-9_]*_(KEY|TOKEN)\b|\b[A-Z][A-Z0-9_]*_(KEY|TOKEN)_ALIASES\b|\benv\s*,\s*["'`][A-Z][A-Z0-9_]*_(KEY|TOKEN)["'`]|\b[A-Z][A-Z0-9_]*_(KEY|TOKEN)\s*:\s*\[/,
        { exclude: /^(verify|detect)-.*\.mjs$/ },
      ),
  },
  {
    id: "materialises-a-beat",
    describes:
      "the skill carries the one entrypoint that turns a story's beat directory into its delivered artefact — a render/produce script, not a preview or a verify script",
    // FINDING 9 (stress round three): no existing trait is shared by all eight producing skills —
    // `draws-own-geometry` excludes `dw-beat` (it delegates rendering), `reads-a-palette` excludes
    // `dw-beat` too, and every other trait is narrower still. The STORYBOARD-closed gate a craft
    // skill should be able to see is a concern every producing skill shares regardless of genre or
    // substrate, so it needs a trait every one of them actually has — this is the real mechanism
    // that was missing a name, not an invented one to make a population come out even.
    //
    // Witnessed by the skill's own canonical MATERIALISING entrypoint, never `render-preview.mjs`
    // (a look-at-it preview, not the delivered artefact) and never a `verify-*`/`detect-*` file (the
    // check AFTER the fact, not the production itself). Measured: exactly these six filenames,
    // across exactly the eight producing skills and no other skill directory in this tree —
    // `render-still.mjs` (chart-beat, chart-web, chart-video, map-beat, image-beat, scrolly),
    // `render-web.mjs` (chart-web, map-web), `render-video.mjs` (chart-video),
    // `render-map.mjs` (map-beat), `render-scrolly.mjs` (scrolly), `produce.mjs` (dw-beat).
    witness: (skill) =>
      [
        "render-still.mjs",
        "render-web.mjs",
        "render-video.mjs",
        "render-map.mjs",
        "render-scrolly.mjs",
        "produce.mjs",
      ].some((name) => has(skill, `scripts/${name}`)),
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
