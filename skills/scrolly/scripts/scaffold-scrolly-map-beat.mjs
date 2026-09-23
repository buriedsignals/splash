// skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs
//
// THE PLUMBING OF A DIRECTED LIVE-MAPTILER MAP SCROLLY — ADAPTED FROM THE TYPE'S OWN WORKED EXAMPLE BY DEFAULT.
//
// Usage:  bun skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs --type <type> --beat proof/scrolly-<subject>
//           [--component <PascalName>] [--from <beat>] [--shape <points|per-area|...>] [--generic]
//
// The map sibling of scaffold-scrolly-beat.mjs — same tokens, same rules, the same --from/--generic contract:
//
//   BY DEFAULT (no --from, no --generic): the type sheet's own "## Worked example" section names every validated
//   beat this type may adapt from, each with its own recorded DATA SHAPE (`workedExamplesOf`) — `points`
//   (per-row real lon/lat) or `per-area` (one row per named region, no coordinates), most commonly. The scaffold
//   picks the worked example whose shape matches the SUBJECT's own (given as --shape, or inferred from the
//   beat's own data.json/data.csv columns when omitted); with one worked example only, or none matching, it
//   still scaffolds from the closest one — never a silent mismatch. Its render-directions-scrolly.mjs, its plan
//   (`*plan.mjs`), Directed<Name>Scrolly.tsx and its driver (`*-drive.mjs`) are copied into the new beat, the
//   source beat's own component name and path renamed throughout, and every subject-specific region (data
//   loading, its assertions, its card sentences, its cameras, its buckets, its layers/marks) marked `SCAFFOLD:`
//   in place — the working code stays working code, not blanked into a stub, because reading a real live-map
//   pattern (`shared/map-beat`'s own contract, `$state` bindings, the frozen-card bake) is exactly what the cold
//   map run never reached in 50 minutes. A SHAPE MISMATCH additionally stamps a loud banner over the two regions
//   a differently-shaped subject actually breaks (data loading, marks) naming what must change.
//
//   --from <beat>   adapts a named beat instead of the type's own worked example (still shape-checked against it
//                   when the sheet records that beat's shape).
//   --shape <name>  the subject's own data shape, when it cannot or should not be inferred from disk.
//   --generic       the old, fully generic stub output (assets/scrolly-map-beat-scaffold/*.tmpl). Required for a
//                   type whose sheet names no worked example yet; optional otherwise.
//   BRIEF.md        always generated fresh from the generic template — in --from mode, one line names the beat
//                   it was adapted from, plus a SHAPE MISMATCH line when the shapes differ.
//
// Works into an existing beat folder — the mandatory `analyst` step already creates
// `stories/<story>/beats/<id>/` (with data.json, DATA-NOTES.md) before scrolly ever runs. Refuses only to
// overwrite a file it would itself write, naming every one that already exists.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { defaultLanguage, depthIndependentPaths, languageAwareNumbers, missingAssetsMessage, paletteReachable, paletteRefusalMessage, requiredLocalAssets } from "./depth-independent.mjs";
import { eachThroughSkillScript } from "#shared/design-base/skill-import.mjs";

// ── THE EDITORIAL CHAIN, WIRED (spec `docs/splash/2026-09-17-editorial-chain-spec.md` §4) ──────
//
// A scaffold is the ONLY place a beat's files are written, so it is where the chain has to be read
// or the chain reaches nothing. Three reads, and one refusal:
//
//   the type SHEET  → `choreographyFrame` → the vocabulary and the prohibitions quoted for the
//                     author, in a section that carries NO ROWS AND NO BLOCK (R-D: a scaffold that
//                     pre-filled a row would be the clone factory this whole chain exists to stop);
//   `scaffoldRequirements` → the precision requirements a type and a format already fix, with the
//                     two the journalist answers at G1 named as owed rather than guessed;
//   `DIRECTION.md`  → refused when unreachable, in the same shape as the PALETTE.md refusal and
//                     naming the command that produces it. `--filed` is the catalogue-only escape.
//
// `checkChoreography` and `checkPrecision` are re-exported below, so a beat's own verifier reaches
// the chain through the scaffold that wrote the beat rather than finding its own copy, and so
// `skills/splash/test/the-chain-is-read-end-to-end.test.ts` can see this scaffold joined to them.
//
// The node builtins are imported under their own names here because these eight files each import
// a different subset of them already; aliasing keeps this block identical in all eight.

import { existsSync as chainExists, readFileSync as chainRead } from "node:fs";
import { join as chainJoin, relative as chainRelative } from "node:path";
import { choreographyFrame, parseTypeSheet } from "#shared/editorial/frame.mjs";
import { replaceSection } from "#shared/editorial/derived.mjs";
import { directionReachable, directionRefusalMessage } from "#shared/design-base/run-direction.mjs";
import { workingRoot } from "#shared/design-base/working-root.mjs";
import { oneRunDirection } from "#shared/design-base/adapt-direction.mjs";
import { checkChoreography, renderChoreographySection } from "./choreography.mjs";
import { checkPrecision, renderPrecisionSection, scaffoldRequirements } from "./precision.mjs";

export { checkChoreography, checkPrecision };

/** This scaffold's own export. */
export const CHAIN_FORMAT = "scrolly";

/** Where this export's type sheets live — a function, so it does not race this file's own consts. */
const chainSheets = () => chainJoin(import.meta.dirname, "..", "references", "types");

/** The parsed sheet and the frame it supplies for one type. It returns no choreography. */
export function chainFrameFor(type) {
  const path = chainJoin(chainSheets(), `${type}.md`);
  const sheet = chainExists(path) ? parseTypeSheet(chainRead(path, "utf8")) : {};
  return { sheet, frame: choreographyFrame({ format: CHAIN_FORMAT }, sheet) };
}

/**
 * The BRIEF with its two chain sections rewritten EMPTY — headers, the frame quoted, no rows.
 *
 * `note` is the provenance line a `--from` scaffold owes its author ("this beat's code was
 * scaffolded from X; read that beat before writing this table"). It is kept because it is about
 * where the CODE came from, not about what the choreography should be — and rewriting the section
 * would otherwise drop it on the floor.
 */
export function withChainSections(brief, type, note = "") {
  const { sheet, frame } = chainFrameFor(type);
  const choreography = renderChoreographySection(frame) + (note ? `\n${note}\n` : "");
  const precision = renderPrecisionSection(scaffoldRequirements(sheet, CHAIN_FORMAT));
  const out = replaceSection(brief, choreography.split("\n")[0], choreography);
  return replaceSection(out, precision.split("\n")[0], precision);
}

/**
 * Refuses before anything is written when the run's one art direction is not reachable.
 *
 * TWO EXEMPTIONS, AND NEITHER IS A HEURISTIC. `--filed` is the author saying out loud that this
 * beat renders the three filed demo directions. And a beat under `proof/` is the catalogue, which
 * R-A names as THE exception — the proofs render the three filed directions precisely to show the
 * art direction is a parameter of the run. The exemption is by explicit path prefix, exactly as
 * `skills/splash/test/a-production-run-has-one-direction.test.ts` writes its own, and never by a
 * guess at what a directory name means.
 */
export function assertRunDirection(root, beatDir, filed) {
  const relative = chainRelative(root, beatDir).split("\\").join("/");
  if (filed || relative.startsWith("proof/") || directionReachable(beatDir)) return;
  throw new Error(directionRefusalMessage({ relBeatDir: relative }));
}


const HERE = import.meta.dirname;
const TEMPLATES = join(HERE, "..", "assets", "scrolly-map-beat-scaffold");
export const DEFAULT_ROOT = resolve(HERE, "..", "..", "..");

// THE TYPE SHEETS AND THE WORKED EXAMPLES LIVE WITH THE SKILL, never under the root the journalist
// is working in — an installed stories root has no `skills/` and no `proof/` at all.
const SHEETS = join(HERE, "..", "references", "types");

/**
 * A `--from` beat, looked for in the journalist's own root first and in this skill's checkout
 * second, since the default one is a catalogue proof and a caller's own is not.
 *
 * It returns the ROOT it was found under as well as the directory, because the copied code spells
 * its own location relative to that root — `// twin/proof/<beat>/beat.mjs`, and every path the beat
 * records about itself. Measuring that against the journalist's root instead names a beat that does
 * not exist there, so the rename matches nothing and the copy keeps the proof's identity.
 */
function beatSource(root, fromBeat) {
  const here = resolve(root, fromBeat);
  if (existsSync(here)) return { dir: here, root };
  const catalogue = resolve(DEFAULT_ROOT, fromBeat);
  if (existsSync(catalogue)) return { dir: catalogue, root: DEFAULT_ROOT };
  throw new Error(`--from ${fromBeat} does not exist — looked in:\n  ${here}\n  ${catalogue}`);
}


/** Template file → the file it becomes; `%%Name%%`/`%%TYPE%%` are filled from the beat's own names. Used only in
 *  `--generic` mode, or to generate BRIEF.md (always template-driven — see the header). */
const FILES = Object.freeze({
  "render-directions-scrolly.mjs.tmpl": "render-directions-scrolly.mjs",
  "PlanOf.mjs.tmpl": "%%TYPE%%-plan.mjs",
  "DirectedScrolly.tsx.tmpl": "Directed%%Name%%Scrolly.tsx",
  "drive.mjs.tmpl": "%%TYPE%%-drive.mjs",
  "BRIEF.md.tmpl": "BRIEF.md",
});

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const BEAT_NAME = /^\.?[a-z0-9][a-z0-9-]*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;

/** `scrolly-dot-density-europe-stations` of type `dot-density` → `EuropeStations`. */
export function componentNameOf(beatName, type) {
  const subject = beatName.replace(/^\./, "").replace(/^scrolly-/, "").replace(new RegExp(`^${type}-`), "");
  return subject
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

/**
 * A path given on the command line, resolved and held to one folder directly under `<root>/proof/` — the
 * catalogue's own place for a beat — or under a story's own `beats/`, when this scaffold runs inside a Splash
 * run (`stories/<story>/beats/<outputId>/`, `where.mjs` names the run's own beat folder).
 */
function beatDirOf(root, given, flag) {
  if (typeof given !== "string" || given === "") throw new Error(`${flag} takes a path under proof/, or a story's beats/`);
  const dir = resolve(root, given);
  const parent = basename(dirname(dir));
  if (parent !== "proof" && parent !== "beats") throw new Error(`${flag} must name a folder directly under proof/ or a story's beats/, got ${JSON.stringify(given)}`);
  if (!BEAT_NAME.test(basename(dir))) throw new Error(`${flag} must be a kebab-case folder name, got ${JSON.stringify(basename(dir))}`);
  return dir;
}

/** Every value the templates carry, derived and validated; refuses a `--type` with no sheet under `references/types/`. */
export function tokensFor({ root, type, beat, component }) {
  if (!KEBAB.test(type ?? "")) throw new Error(`--type must be a kebab-case map type, got ${JSON.stringify(type)}`);
  const sheet = join(SHEETS, `${type}.md`);
  if (!existsSync(sheet)) throw new Error(`--type ${JSON.stringify(type)} has no sheet at skills/scrolly/references/types/${type}.md — see the per-type list in skills/scrolly/SKILL.md`);
  const beatDir = beatDirOf(root, beat, "--beat");
  // The templates already append "Scrolly" to %%Name%% (Directed%%Name%%Scrolly) — strip a caller-supplied
  // trailing "Scrolly" (matching the worked examples' own DirectedXScrolly naming) so it isn't doubled.
  const name = (component ?? componentNameOf(basename(beatDir), type)).replace(/Scrolly$/, "");
  if (!PASCAL.test(name)) throw new Error(`--component must be a PascalCase name, got ${JSON.stringify(name)}`);
  return {
    beatDir,
    values: {
      Name: name,
      name: name[0].toLowerCase() + name.slice(1),
      BEAT: basename(beatDir),
      BEAT_PATH: relative(root, beatDir).split(sep).join("/"),
      TYPE: type,
    },
  };
}

/** A template with its `%%TOKEN%%`s filled; an unknown token is refused rather than left in a generated file. */
export function fill(template, values) {
  return template.replace(/%%([A-Za-z_]+)%%/g, (token, key) => {
    if (!(key in values)) throw new Error(`the scaffold template carries an unknown token ${token}`);
    return values[key];
  });
}

// ── --from: adapt a validated beat's own code, instead of the generic stub ──────────────────────

const SHAPE_RE = /\*\*Data shape:\*\*\s*([a-z][a-z-]*)/;

/** Every worked example the `## Worked example` section of a type sheet names, each paired with its own recorded
 *  DATA SHAPE (`**Data shape:** points` / `**Data shape:** per-area`, …) when the sheet records one — parsed here
 *  rather than hardcoded, so the scaffold and the sheet cannot drift apart. A type sheet names one worked example
 *  today; this returns an array so a type that later validates a second beat of a different shape (points AND
 *  per-area) is picked from correctly rather than always defaulting to the first. `{ beat, shape }`, `shape` is
 *  `null` when the sheet names the example but records no shape for it. Empty array when the sheet carries no
 *  `## Worked example` section (a type with no worked example yet). */
export function workedExamplesOf(root, type) {
  const sheet = join(SHEETS, `${type}.md`);
  if (!existsSync(sheet)) return [];
  const text = readFileSync(sheet, "utf8");
  const heading = text.indexOf("## Worked example");
  if (heading === -1) return [];
  const nextHeading = text.indexOf("\n## ", heading + 1);
  const section = text.slice(heading, nextHeading === -1 ? text.length : nextHeading);
  const matches = [...section.matchAll(/`(proof\/scrolly-[a-z0-9-]+)/g)];
  // A `**Data shape:**` line sits immediately before its own path (this repo's own convention, close enough to
  // read as "about this example") or immediately after it, up to the next path or the section's end — bounded
  // to a short lookback so a multi-example sheet's PREVIOUS entry (its own long paragraph) is never mistaken
  // for this one's shape.
  const LOOKBACK = 200;
  return matches.map((m, i) => {
    const prevEnd = i === 0 ? 0 : matches[i - 1].index + matches[i - 1][0].length;
    const windowStart = Math.max(prevEnd, m.index - LOOKBACK);
    const windowEnd = i + 1 < matches.length ? matches[i + 1].index : section.length;
    const window = section.slice(windowStart, windowEnd);
    const shapeMatch = SHAPE_RE.exec(window);
    return { beat: m[1], shape: shapeMatch ? shapeMatch[1] : null };
  });
}

/** The FIRST worked example a type sheet names — kept for callers that only ever want the default (`--from`'s
 *  own fallback when the subject's shape is unknown, or a type validated by exactly one beat). Prefer
 *  `workedExamplesOf` plus a shape match wherever the subject's own shape is known. Returns null when the sheet
 *  carries no such section. */
export function workedExampleOf(root, type) {
  return workedExamplesOf(root, type)[0]?.beat ?? null;
}

const SHAPE_COLUMN_HINTS = {
  points: [["lon", "lng", "long", "longitude", "x"], ["lat", "latitude", "y"]],
};
const AREA_COLUMN_NAMES = new Set(["entity", "country", "region", "admin", "iso", "iso_a2", "iso_a3", "code", "name"]);

/** Reads a column-name list off `<dir>/data.json` (the analyst's own artifact, when this scaffold runs inside a
 *  Splash story) or, failing that, `<dir>/data.csv`'s header row (a `proof/` catalogue beat that keeps its data
 *  beside the runner rather than behind analyst) — whichever exists. Returns `null` when neither file is present
 *  or readable; this is a hint, not a parse of the file's full grammar. */
function columnNamesOf(dir) {
  const dataJson = join(dir, "data.json");
  if (existsSync(dataJson)) {
    try {
      const parsed = JSON.parse(readFileSync(dataJson, "utf8"));
      const columns = parsed?.columns;
      if (Array.isArray(columns)) return columns.map((c) => String(c?.name ?? c).toLowerCase());
    } catch {
      // fall through to data.csv
    }
  }
  const dataCsv = join(dir, "data.csv");
  if (existsSync(dataCsv)) {
    const firstLine = readFileSync(dataCsv, "utf8").split("\n", 1)[0] ?? "";
    return firstLine.split(",").map((c) => c.trim().toLowerCase());
  }
  return null;
}

/** The subject's own data shape, inferred from its column names — `"points"` when a longitude- and a
 *  latitude-shaped column both appear, `"per-area"` when an area-name-shaped column appears with neither, `null`
 *  when the beat carries no `data.json`/`data.csv` yet or its columns name neither pattern. A hint for picking
 *  and for the mismatch banner, never a claim stronger than the column names themselves. */
export function inferSubjectShape(beatDir) {
  const columns = columnNamesOf(beatDir);
  if (!columns) return null;
  const [lonNames, latNames] = SHAPE_COLUMN_HINTS.points;
  const hasLon = columns.some((c) => lonNames.includes(c));
  const hasLat = columns.some((c) => latNames.includes(c));
  if (hasLon && hasLat) return "points";
  if (columns.some((c) => AREA_COLUMN_NAMES.has(c))) return "per-area";
  return null;
}

/** Picks which worked example to scaffold from, and whether that choice is an honest shape mismatch the caller
 *  must be told about loudly. `explicitFrom` (the caller's own `--from`) always wins outright — an operator who
 *  names a beat is not overruled — but its shape is still checked against the subject's when the sheet records
 *  one, so an explicit choice that mismatches is disclosed exactly like an inferred one. Otherwise: a worked
 *  example whose recorded shape equals the subject's own shape is preferred when one exists; failing that, the
 *  first worked example is used and, when both shapes are known and differ, `mismatch` names it. A beat whose
 *  shape differs from every worked example still scaffolds — this never throws. */
export function pickWorkedExample({ examples, explicitFrom, subjectShape }) {
  if (explicitFrom) {
    const named = examples.find((e) => e.beat === explicitFrom);
    const mismatch = named && named.shape && subjectShape && named.shape !== subjectShape ? { assumedShape: named.shape, subjectShape } : null;
    return { beat: explicitFrom, mismatch };
  }
  if (examples.length === 0) return { beat: null, mismatch: null };
  const match = subjectShape ? examples.find((e) => e.shape === subjectShape) : undefined;
  if (match) return { beat: match.beat, mismatch: null };
  const fallback = examples[0];
  const mismatch = fallback.shape && subjectShape && fallback.shape !== subjectShape ? { assumedShape: fallback.shape, subjectShape } : null;
  return { beat: fallback.beat, mismatch };
}

const shapeAsProse = (shape) => (shape === "points" ? "real per-row lon/lat coordinates" : shape === "per-area" ? "one row per named region, no coordinates (a centroid/polygon lookup, not a raw point)" : shape);

/** The loud, un-missable banner a shape mismatch earns — stamped at the exact regions that must change, never
 *  folded quietly into the ordinary SCAFFOLD prose. */
function shapeMismatchLines({ assumedShape, subjectShape }) {
  return [
    `SHAPE MISMATCH — READ BEFORE EDITING: this worked example's own data shape is "${assumedShape}"`,
    `(${shapeAsProse(assumedShape)}). This beat's own subject looks like "${subjectShape}"`,
    `(${shapeAsProse(subjectShape)}). The code copied below assumes the FIRST shape — it will not apply to`,
    `data shaped like the second. Rewrite this region for ${shapeAsProse(subjectShape)} before anything else.`,
  ];
}

/** A worked beat's own `// ── section ──` divider comments, re-labelled `SCAFFOLD:` wherever the label itself
 *  names subject-specific content (its data, its claim, its assertions, its card sentences, its cameras) — the
 *  plumbing sections (the direction loop, the live-map wiring) are left alone. A beat with no divider comments,
 *  or none matching, is left as copied. */
const DIVIDER_KEYWORDS = /read|station|assert|word|claim|subject|data|figure|title|prose|\balt\b|camera|bucket|bound|rank|bank/i;
function markDividers(content) {
  return content.replace(/^(\/\/ ── )(.+?)( ─+)$/gm, (full, pre, label, tail) => (/scaffold/i.test(label) || !DIVIDER_KEYWORDS.test(label) ? full : `${pre}SCAFFOLD: ${label}${tail}`));
}

/** One banner, inserted before the first line an anchor (a `^`-anchored, `m`-flag regex) matches; a no-op when
 *  the beat's own code carries no such line — not every beat's code has every region. */
function markBefore(content, anchor, lines) {
  const m = anchor.exec(content);
  if (!m) return content;
  const indent = /^\s*/.exec(m[0])[0];
  const banner = `${lines.map((l) => `${indent}// ${l}`).join("\n")}\n`;
  return content.slice(0, m.index) + banner + content.slice(m.index);
}

const topBanner = (fromBeat) => [
  `SCAFFOLD: scaffolded --from ${fromBeat} — this file is that beat's own code, renamed for this one. The`,
  `header comment below, and every region marked SCAFFOLD:, describe ${fromBeat}'s own subject; rewrite them`,
  `for this beat's. Read ${fromBeat}/BRIEF.md alongside this code before changing the choreography.`,
];
const prependBanner = (content, lines) => `// ${lines.join("\n// ")}\n${content}`;

// A worked example's own local ISO A2 table — `const ISO2 = {...}` plus the `iso2Of` that reads it — copied
// verbatim by every worked example that joins MapTiler Countries, covering only ITS OWN subject's countries
// (32 in the protection beat, 41 in the wind beat). Silently inherited into a fresh beat, it failed one
// missing code at a time (cold run 6, 2026-09-16: GBR, then ALB, discovered serially) because nothing marked
// it as a region to replace. Matched here so the scaffold can swap it for the shared canonical table instead
// of copying the partial one forward again.
// The `export` is optional, and that mattered: the CHOROPLETH worked example — the one this type's
// default `--from` copies — keeps its table in the RUNNER and does not export `iso2Of`, so the swap
// could never fire for it and the beat inherited a 41-country partial table anyway. Measured
// 2026-09-23, the same defect the comment above says this exists to prevent.
const ISO2_TABLE_RE = /(?:\/\*\*[^]*?\*\/\n)?const ISO2 = \{[^]*?\n\};\n(?:export )?const iso2Of = \(iso\) => \{\n(?:.*\n)*?\};\n/;

/** Swaps a copied worked example's own local ISO A2 table for the shared canonical one (`iso-codes.mjs`),
 *  named as a SCAFFOLD region so it is never again silently inherited. A no-op when the source beat's plan
 *  carries no such table (most types never join on MapTiler Countries this way). */
function replaceIso2Table(content, fromBeat) {
  if (!ISO2_TABLE_RE.test(content)) return content;
  const banner = [
    `SCAFFOLD: ISO A2 table — ${fromBeat}'s own table above only covered its own subject's countries. It is`,
    `replaced here by the shared canonical table (shared/map-beat/iso-codes.mjs). Call`,
    `iso2CodesFor(<this beat's own whole country list>) ONCE, before any per-country lookup, so every code`,
    `this beat needs is validated together and every missing one is named in one message — never one`,
    `refusal at a time. See proof/scrolly-hex-grid-europe-protection/plan.mjs for the worked pattern.`,
  ]
    .map((l) => `// ${l}`)
    .join("\n");
  return content.replace(ISO2_TABLE_RE, `${banner}\nimport { iso2CodesFor, iso2Of } from "#shared/map-beat/iso-codes.mjs";\n`);
}

const DATA_ANCHOR = /^const \w+ = .*(?:readFile|readFileSync)\(join\(HERE/m;
const ASSERT_ANCHOR = /^if \(/m;
const CARDS_ANCHOR = /^const (?:title|prose) = /m;
const CAMERA_ANCHOR = /^const (?:BOUNDS|CAMERAS?)\b/m;
const BUCKET_ANCHOR = /^const (?:EDGES|BANDS|BUCKETS)\b/m;
const RETURN_ANCHOR = /^(\s*)return \($/m;
const DRIVE_FN_ANCHOR = /^export function \w+\(/m;
const PLAN_FN_ANCHOR = /^export function \w+\(/m;

/** Reads `fromBeat`'s own runner, plan, directed component and driver, renamed for this beat's own name and
 *  path, and re-marked SCAFFOLD over the regions that are `fromBeat`'s own subject rather than this type's
 *  plumbing — the gesture the owner's cold-run method always used (read the worked beat's code, adapt it),
 *  encoded instead of left tacit. `shapeMismatch` (from `pickWorkedExample`), when given, stamps a loud
 *  `SHAPE MISMATCH` banner over the two regions a differently-shaped subject actually breaks — the data-loading
 *  read and the marks the plan draws — naming the shape assumed and what must change, ahead of the ordinary
 *  SCAFFOLD prose there. Returns `{ filename: content }`, ready to write beside a fresh BRIEF.md. */
export function adaptFromBeat({ root, fromBeat, values, shapeMismatch = null }) {
  const { dir: sourceDir, root: sourceRoot } = beatSource(root, fromBeat);
  const entries = readdirSync(sourceDir);
  const runnerFile = "render-directions-scrolly.mjs";
  if (!entries.includes(runnerFile)) throw new Error(`--from ${fromBeat} has no ${runnerFile}`);
  const planNames = entries.filter((f) => /(?:^|-)plan\.mjs$/.test(f));
  if (planNames.length !== 1) throw new Error(`--from ${fromBeat} must carry exactly one plan.mjs (or <word>-plan.mjs), found ${planNames.length}`);
  const tsxNames = entries.filter((f) => /^Directed[A-Za-z0-9]+Scrolly\.tsx$/.test(f));
  if (tsxNames.length !== 1) throw new Error(`--from ${fromBeat} must carry exactly one Directed*Scrolly.tsx, found ${tsxNames.length}`);
  const driveNames = entries.filter((f) => f.endsWith("-drive.mjs"));
  if (driveNames.length !== 1) throw new Error(`--from ${fromBeat} must carry exactly one *-drive.mjs, found ${driveNames.length}`);
  const sourceName = /^Directed([A-Za-z0-9]+)Scrolly\.tsx$/.exec(tsxNames[0])[1];
  const oldPath = relative(sourceRoot, sourceDir).split(sep).join("/");
  const rename = (text) => text.split(sourceName).join(values.Name).split(oldPath).join(values.BEAT_PATH);
  const read = (name) => rename(readFileSync(join(sourceDir, name), "utf8"));

  let runner = markDividers(read(runnerFile));
  runner = markBefore(runner, DATA_ANCHOR, [...(shapeMismatch ? shapeMismatchLines(shapeMismatch) : []), `SCAFFOLD: data loading — ${fromBeat}'s own reader. Point this at this beat's own frozen data and`, `keep the shape (fields coerced to numbers, throw on anything unusable).`]);
  runner = markBefore(runner, ASSERT_ANCHOR, [`SCAFFOLD: assertions — ${fromBeat}'s own claim, checked against its data. Rewrite every check against`, `this beat's own figures; a beat whose numbers drift must refuse to render, not ship a stale claim.`]);
  runner = markBefore(runner, CAMERA_ANCHOR, [`SCAFFOLD: cameras — ${fromBeat}'s own bounds and camera fits. Refit them to this beat's own subject on`, `the map (a whole view and any close-up), keeping the reference-stage / zoomShiftFor contract.`]);
  runner = markBefore(runner, BUCKET_ANCHOR, [`SCAFFOLD: buckets — ${fromBeat}'s own rank/class edges for staggered arrival. Rebuild them from this`, `beat's own data so every card still shows exactly its own count.`]);
  runner = markBefore(runner, CARDS_ANCHOR, [`SCAFFOLD: card sentences — ${fromBeat}'s own title, prose, words and alt. Rewrite for this beat's own`, `subject; keep the no-break space escapes and the register split (display/body/axis/annot/value).`]);
  runner = prependBanner(runner, topBanner(fromBeat));

  let plan = markDividers(read(planNames[0]));
  plan = replaceIso2Table(plan, fromBeat);
  // …and the runner, which is where the choropleth keeps its own.
  runner = replaceIso2Table(runner, fromBeat);
  plan = markBefore(plan, PLAN_FN_ANCHOR, [...(shapeMismatch ? shapeMismatchLines(shapeMismatch) : []), `SCAFFOLD: marks — the layers this function returns are ${fromBeat}'s own. Adapt the geometry, the`, `bindings and the buckets for this beat's own subject; keep the $state contract (a binding must stay`, `data-constant — validateScrollyPlan refuses one that reads a per-feature property).`]);
  plan = prependBanner(plan, topBanner(fromBeat));

  let tsx = markDividers(read(tsxNames[0]));
  tsx = markBefore(tsx, RETURN_ANCHOR, [`SCAFFOLD: the JSX below is ${fromBeat}'s own key/counter/notes around the live map. Adapt the words and`, `swatches to this beat's own subject, keeping the data-part contract the driver and CSS rely on.`]);
  tsx = prependBanner(tsx, topBanner(fromBeat));

  let drive = markDividers(read(driveNames[0]));
  drive = markBefore(drive, DRIVE_FN_ANCHOR, [`SCAFFOLD: paint — the fields this driver reads and writes below are ${fromBeat}'s own. Adapt them to`, `this beat's own state fields; keep the seat/paint split and the initScrollyMap/applyScrollyMap wiring.`]);
  drive = prependBanner(drive, topBanner(fromBeat));

  // Depth-independent paths (this beat may sit at any depth, unlike fromBeat's own proof/<beat>/) and a number
  // formatter matching this beat's own default language, defaulted from NEWSROOM.md — see depth-independent.mjs.
  const lang = defaultLanguage(root);
  runner = oneRunDirection(languageAwareNumbers(depthIndependentPaths(runner), lang), runnerFile);
  plan = languageAwareNumbers(depthIndependentPaths(plan), lang);
  tsx = languageAwareNumbers(depthIndependentPaths(tsx), lang, { typed: true });
  drive = languageAwareNumbers(depthIndependentPaths(drive), lang);

  return eachThroughSkillScript({
    [runnerFile]: runner,
    [planNames[0]]: plan,
    [`Directed${values.Name}Scrolly.tsx`]: tsx,
    [driveNames[0]]: drive,
  });
}

/**
 * Writes the scaffold. By default (no `generic`), adapts `from` — or, when `from` is not given, the type sheet's
 * own worked example — renamed and marked SCAFFOLD (`adaptFromBeat`); refuses when neither names a beat, telling
 * the caller to pass `--from` or `--generic`. With `generic: true`, writes the old fully empty stub from
 * `templates`/`files` instead. Either way, BRIEF.md is generated fresh from the template — in from-mode, with one
 * added line naming the beat it was adapted from.
 *
 * Every file is filled in memory first; then, if the beat folder already carries any of the files this scaffold
 * would write, the whole call refuses and names every collision. Otherwise the folder is created if needed (a
 * no-op when the beat already exists, e.g. analyst's own data.json beside it) and each file written exclusively.
 *
 * `shape`, when given, is the subject's own DATA SHAPE (`points` / `per-area`, …) — matched against every worked
 * example the type sheet records (`workedExamplesOf`) to pick the one that actually fits, via
 * `pickWorkedExample`. Left unspecified, it is inferred from the beat's own `data.json`/`data.csv`
 * (`inferSubjectShape`) when either already exists on disk. A mismatch never refuses the scaffold — it stamps a
 * loud `SHAPE MISMATCH` banner over the data-loading and marks regions instead (see `adaptFromBeat`), and is
 * reported back on the result so the caller can say so loudly too.
 * @returns {{ written: string[], fromBeat: string | null, shapeMismatch: { assumedShape: string, subjectShape: string } | null }}
 */
export function scaffoldBeat({ root = DEFAULT_ROOT, templates, files, type, beat, component, from, shape, generic = false, filed = false }) {
  // The provenance line a `--from` scaffold owes its author, carried into the empty
  // choreography section by `withChainSections` rather than injected into the template by hand.
  let scaffoldedFrom = "";
  const { beatDir, values } = tokensFor({ root, type, beat, component });
  const briefTemplate = fill(readFileSync(join(templates, "BRIEF.md.tmpl"), "utf8"), values);
  let planned;
  let fromBeat = null;
  let shapeMismatch = null;
  if (generic) {
    planned = Object.entries(files).map(([template, target]) => [fill(target, values), fill(readFileSync(join(templates, template), "utf8"), values)]);
  } else {
    const examples = workedExamplesOf(root, type);
    const subjectShape = shape ?? inferSubjectShape(beatDir);
    const picked = pickWorkedExample({ examples, explicitFrom: from, subjectShape });
    fromBeat = picked.beat;
    shapeMismatch = picked.mismatch;
    if (!fromBeat) throw new Error(`--type ${JSON.stringify(type)} has no worked example in its sheet — pass --from <beat>, or --generic for the empty stub`);
    const adapted = adaptFromBeat({ root, fromBeat, values, shapeMismatch });
    const mismatchNote = shapeMismatch
      ? `\n\nSHAPE MISMATCH: scaffolded from a worked example recorded as "${shapeMismatch.assumedShape}" data; this beat's own subject looks like "${shapeMismatch.subjectShape}". \`grep -rn "SHAPE MISMATCH" .\` in this beat finds the regions that must change first.\n`
      : "";
    scaffoldedFrom = `SCAFFOLD: this beat's code was scaffolded \`--from ${fromBeat}\` — read that beat's own BRIEF.md and its\nrunner/plan/driver/directed component (marked SCAFFOLD: where they are its own subject) before writing this table.${mismatchNote}`;
    const brief = briefTemplate;
    planned = Object.entries({ ...adapted, "BRIEF.md": brief });
    const missing = requiredLocalAssets(Object.values(adapted), Object.keys(adapted)).filter((name) => !existsSync(join(beatDir, name)));
    if (missing.length) throw new Error(missingAssetsMessage({ relBeatDir: relative(root, beatDir), fromBeat, sourceDir: beatSource(root, fromBeat).dir, missing }));
  }
  if (!paletteReachable(beatDir)) throw new Error(paletteRefusalMessage({ root, relBeatDir: relative(root, beatDir) }));
  const collisions = planned.map(([target]) => target).filter((target) => existsSync(join(beatDir, target))).sort();
  if (collisions.length) throw new Error(`${relative(root, beatDir)} already has ${collisions.join(", ")} — the scaffold never overwrites a file`);
  // The chain, read before a single file exists on disk (see "THE EDITORIAL CHAIN, WIRED" above).
  const briefAt = planned.findIndex(([target]) => target === "BRIEF.md");
  if (briefAt >= 0)
    planned[briefAt] = ["BRIEF.md", withChainSections(planned[briefAt][1], type, scaffoldedFrom)];
  assertRunDirection(root, beatDir, filed);
  mkdirSync(beatDir, { recursive: true });
  for (const [target, content] of planned) writeFileSync(join(beatDir, target), content, { flag: "wx" });
  return { written: planned.map(([target]) => target).sort(), fromBeat, shapeMismatch };
}

export function parseArgs(argv) {
  const known = new Set(["--type", "--beat", "--component", "--from", "--shape"]);
  const out = {};
  for (let i = 0; i < argv.length; ) {
    const flag = argv[i];
    if (flag === "--filed") {
      out.filed = true;
      i += 1;
      continue;
    }
    if (flag === "--generic") {
      out.generic = true;
      i += 1;
      continue;
    }
    if (!known.has(flag)) throw new Error(`unknown argument ${JSON.stringify(flag)} — takes --type, --beat, --component, --from, --shape, --generic, --filed`);
    if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) throw new Error(`${flag} takes a value`);
    out[flag.slice(2)] = argv[i + 1];
    i += 2;
  }
  for (const required of ["type", "beat"]) if (!out[required]) throw new Error(`--${required} is required`);
  return out;
}

if (import.meta.main) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const generic = Boolean(args.generic);
    const { written, shapeMismatch } = scaffoldBeat({ root: workingRoot(process.cwd(), DEFAULT_ROOT), templates: TEMPLATES, files: FILES, type: args.type, beat: args.beat, component: args.component, filed: Boolean(args.filed), from: args.from, shape: args.shape, generic });
    const next = generic
      ? `Next: read skills/scrolly/references/types/${args.type}.md, write BRIEF.md's choreography, then the SCAFFOLD stubs (grep -rn SCAFFOLD ${args.beat}).`
      : `Next: grep -rn SCAFFOLD ${args.beat} and work through each marked region; BRIEF.md names the beat it was adapted from — read its own BRIEF.md too.`;
    const banner = shapeMismatch
      ? `\n\n!! SHAPE MISMATCH !! scaffolded from a worked example built on "${shapeMismatch.assumedShape}" data; this beat's own\nsubject looks like "${shapeMismatch.subjectShape}" data. grep -rn "SHAPE MISMATCH" ${args.beat} finds every region\nthat must change before this beat's code applies to its own data — read those before anything else.`
      : "";
    console.log(`scaffolded ${args.beat}:\n  ${written.join("\n  ")}\n\n${next}${banner}`);
  } catch (error) {
    console.error(`refused — ${error.message}`);
    process.exitCode = 1;
  }
}
