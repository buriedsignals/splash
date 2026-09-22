// skills/map-web/scripts/scaffold-web-map-beat.mjs
//
// THE PLUMBING OF A DIRECTED WEB MAP BEAT, WRITTEN ONCE — AND NOTHING ELSE.
//
// Usage:  bun skills/map-web/scripts/scaffold-web-map-beat.mjs --type <type> --beat proof/web-<type>-<subject>
//           --static proof/static-<type>-<subject> [--component <PascalName>]
//
// ── THE LINE THIS SCRIPT IS WRITTEN ON, AND WHY IT IS DRAWN WHERE IT IS ───────────────────────
//
// The owner, on the day this was written: *« si générateur alors il faut pas que ça contraigne la
// création et que ça reste originale »* — and, on a batch of beats rejected the same day, *« tu
// reproduis toujours le même schéma »*. A scaffold that generates too much produces identical
// pages: the exact defect the catalogue exists to avoid, re-introduced by the tool meant to help.
//
// So: **THIS SCAFFOLD REMOVES TYPING, NOT THINKING.** A beat that looks like its neighbour has
// failed even if every test is green.
//
// WHAT IT GENERATES — measured shared across all SEVEN shipped live-map web beats
// (`web-choropleth-europe-lowcarbon`, `web-contour-europe-distance`, `web-dot-density-europe-stations`,
// `web-flow-map-danube`, `web-flow-map-ukraine-protection`, `web-locator-zaporizhzhia`,
// `web-proportional-symbol-europe-capacity`); the parts nobody would ever write differently on purpose:
//   bake.mjs                     the camera gate, the frame/bounds asserts, the basemap capture per
//                                filed direction, the cull-and-thin, `geometry.json`
//   camera.ts                    the sampled projected border, one scale for both axes, the unit box
//   render-directions-web.mjs    the imports, the plate cache keyed on the frame, `plateTints`, the
//                                three-plate camera agreement, `ASKED`, the MapLibre/style inlining,
//                                `bakeFallback`, the fallback hash cache, the keyed `.local.html`
//                                copy, the direction loop, `applicableTreatments`, the `interaction`
//                                SHAPE (a control that changes nothing is refused before the page is
//                                written), the live plan/script seam, the refusal cleanup and exit code
//   Directed<Name>Web.tsx        the props seam, the `{ key, name, detail }` row seam the table and
//                                the map join on, the figure and its two `<style>` tags, the header,
//                                the fieldset/`role="status"` notes pair the discovery contract needs,
//                                the `.chart-plot` box with its fallback `<svg data-plate>` and
//                                `.map-layer`, the claim/hint/reading stack, the `<details>` table
//                                shell with `data-mark`/`data-detail`, the source line, the three
//                                script tags
//   BRIEF.md                     the headings an author fills, gesture first
//   PALETTE.md                   copied from the static sibling
//
// WHAT IT DELIBERATELY DOES NOT GENERATE, left as named `SCAFFOLD` holes that throw or refuse:
//   · THE CAMERA. A map's window is an editorial assertion, not a setting — the choropleth's own
//     `camera.ts` argues equal-area because a page read by surface is read by surface. A scaffold
//     that picked a window would have made the beat's central claim for it.
//   · THE GESTURE. Which decision the author otherwise takes in silence is handed to the reader is
//     the beat's design decision. The vocabularies are listed in `SKILL.md` as a MENU; a type that
//     deserves none of them, or deserves a new one, is a legitimate outcome, and it is better than
//     borrowing a neighbour's. The fieldset/notes MARKUP is written because it is the format's
//     discovery contract (`interaction-plan.ts` reads `data-stack-note`); its stem, its legend, its
//     options and its sentences are holes, and a beat with no control deletes the block outright.
//   · THE KEY, THE RAIL, THE LEGEND. No two shipped beats carry the same furniture before the map —
//     a width scale, a class ramp, a dot value, a distance ring — so the scaffold writes none.
//   · THE ROW'S CELLS. The `<tr>` seam is shared because `data-mark`/`data-detail` is the crossing
//     between the table half and the canvas half; what a row PRINTS is the beat's.
//   · THE BASEMAP'S COUNTRIES. Six of the seven call `countryGround`; the seventh paints the
//     countries itself. Whether a reader needs national ground under these marks is a design
//     decision about this subject, so it is not generated.
//   · THE WORDS — title, caveat, reading, claim note, alt, source.
//   · THE PALETTE REASONING and the per-beat contrast floors. A dose is searched against this beat's
//     own renders in all three directions; a number found on another dataset transfers silently and
//     nothing goes red.
//   · THE REFUSALS — what this beat asserts about its markup, and the matching assertion about the
//     live plan.
//   · WHAT MERCATOR COSTS THIS SUBJECT. Every beat pays for the flat map on its own numbers.
//
// The runner it writes REFUSES to render until every hole is closed (`grep -n SCAFFOLD <beat>`).
//
// Refuses to overwrite: an existing beat folder is an error, never merged into.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

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
import { checkChoreography, renderChoreographySection } from "./choreography.mjs";
import { readPalette } from "./colour.mjs";
import { checkPrecision, renderPrecisionSection, scaffoldRequirements } from "./precision.mjs";

// THE PALETTE IS REACHED, NOT NECESSARILY CARRIED. `readPalette` walks up from a beat to the
// filesystem root, so a story records one answer at its own root and every beat under it reads the
// same colours. The catalogue's flow puts one in each beat directory, and copying the static
// sibling's was the same thing there — but it refused every story beat, whose palette is one level
// up and perfectly reachable. So: reach first, copy only when the new beat cannot reach one.
const PALETTE_NOT_FOUND = "No PALETTE.md found for ";
function paletteReachableFrom(dir) {
  try {
    readPalette(dir);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(PALETTE_NOT_FOUND)) return false;
    throw error;
  }
}

export { checkChoreography, checkPrecision };

/** This scaffold's own export. */
export const CHAIN_FORMAT = "web";

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
const SKILL = "map-web";
const TEMPLATES = join(HERE, "..", "assets", "web-map-beat-scaffold");
export const DEFAULT_ROOT = resolve(HERE, "..", "..", "..");

/** The eight map types this skill carries a sheet for. A type with no sheet has no worked example
 *  to read, which is the step before this one. */
export const TYPES = Object.freeze([
  "cartogram",
  "choropleth",
  "contour-isoline",
  "dot-density",
  "flow-map",
  "hex-grid",
  "locator",
  "proportional-symbol",
]);

/** The one type in this tree that is NOT a live map: no basemap, no tiles, no plate, no fallback.
 *  Its cells are the whole picture, drawn as SVG through the design base — so the bake, the camera
 *  and the two-layer plumbing this scaffold writes do not apply to it at all. */
export const NOT_A_LIVE_MAP = Object.freeze(["cartogram"]);

/** Template file → the file it becomes; `%%Name%%` is the component's name. */
const FILES = Object.freeze({
  "bake.mjs.tmpl": "bake.mjs",
  "camera.ts.tmpl": "camera.ts",
  "render-directions-web.mjs.tmpl": "render-directions-web.mjs",
  "DirectedWeb.tsx.tmpl": "Directed%%Name%%Web.tsx",
  "BRIEF.md.tmpl": "BRIEF.md",
});

const BEAT_NAME = /^\.?[a-z0-9][a-z0-9-]*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;

/** `web-dot-density-europe-stations` of type `dot-density` → `EuropeStations`. */
export function componentNameOf(beatName, type) {
  const subject = beatName.replace(/^\./, "").replace(/^web-/, "").replace(new RegExp(`^${type}-`), "");
  return subject
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

/** The frozen data the static sibling carries at its top level: `data.csv` first, else its first
 *  CSV, else its first JSON that is not the shapes file. */
export function dataFileOf(staticDir) {
  const files = readdirSync(staticDir).filter((f) => statSync(join(staticDir, f)).isFile()).sort();
  if (files.includes("data.csv")) return "data.csv";
  return (
    files.find((f) => /\.csv$/i.test(f)) ??
    files.find((f) => /\.(geo)?json$/i.test(f) && !/^shapes\./i.test(f)) ??
    null
  );
}

/** A path given on the command line, resolved and held to one folder directly under `<root>/proof/` —
 *  the catalogue's own place for a beat — or under a story's own `beats/`. A producer that only
 *  reaches the catalogue is not a producer a journalist has: without a scaffold there is no
 *  `BRIEF.md`, and without a brief gate G3 can never close on the beat. */
function proofDirOf(root, given, flag) {
  if (typeof given !== "string" || given === "") throw new Error(`${flag} takes a path under proof/, or a story's beats/`);
  const dir = resolve(root, given);
  const parent = basename(dirname(dir));
  if (parent !== "proof" && parent !== "beats") throw new Error(`${flag} must name a folder directly under proof/ or a story's beats/, got ${JSON.stringify(given)}`);
  if (!BEAT_NAME.test(basename(dir))) throw new Error(`${flag} must be a kebab-case folder name, got ${JSON.stringify(basename(dir))}`);
  return dir;
}

/** Every value the templates carry, derived and validated. */
export function tokensFor({ root, skill, type, beat, staticBeat, component }) {
  if (!TYPES.includes(type ?? ""))
    throw new Error(`--type must be one of the eight map types (${TYPES.join(", ")}), got ${JSON.stringify(type)}`);
  if (NOT_A_LIVE_MAP.includes(type))
    throw new Error(
      `${type} is not a live map — no basemap, no tiles, no plate, no fallback (see ` +
        `skills/map-web/references/types/${type}.md). This scaffold writes the two-layer plumbing ` +
        `none of which applies to it; write that beat by hand from its own worked example.`,
    );
  const beatDir = proofDirOf(root, beat, "--beat");
  const staticDir = proofDirOf(root, staticBeat, "--static");
  if (!existsSync(staticDir) || !statSync(staticDir).isDirectory()) throw new Error(`--static names no beat: ${relative(root, staticDir)} does not exist`);
  const paletteCarried = existsSync(join(staticDir, "PALETTE.md"));
  const paletteReached = paletteReachableFrom(beatDir);
  if (!paletteCarried && !paletteReached) {
    throw new Error(
      `${relative(root, beatDir)} has no PALETTE.md reachable (readPalette walks up from the beat and found none), and ${relative(root, staticDir)} carries none to copy. A beat's colours are a journalist's decision, never scaffolded silently — record one at the beat, or at the story root where every beat under it reads the same answer.`,
    );
  }
  const dataFile = dataFileOf(staticDir);
  if (!dataFile) throw new Error(`${relative(root, staticDir)} carries no frozen data (.csv or .json) at its top level`);
  const name = component ?? componentNameOf(basename(beatDir), type);
  if (!PASCAL.test(name)) throw new Error(`--component must be a PascalCase name, got ${JSON.stringify(name)}`);
  return {
    beatDir,
    staticDir,
    values: {
      Name: name,
      CONST: name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase(),
      BEAT: basename(beatDir),
      BEAT_PATH: relative(root, beatDir).split(sep).join("/"),
      TYPE: type,
      SKILL: skill,
      UP: relative(beatDir, root).split(sep).join("/"),
      STATIC: basename(staticDir),
      STATIC_REL: relative(beatDir, staticDir).split(sep).join("/"),
      DATA_FILE: dataFile,
    },
  };
}

export function fill(template, values) {
  return template.replace(/%%([A-Za-z_]+)%%/g, (token, key) => {
    if (!(key in values)) throw new Error(`the scaffold template carries an unknown token ${token}`);
    return values[key];
  });
}

/**
 * Writes the scaffold. Every file is filled in memory first; the beat folder is then created
 * (failing if it exists, even when it appeared since the check) and each file written with an
 * exclusive flag.
 * @returns {string[]} the files written, relative to the beat
 */
export function scaffoldBeat({ root = DEFAULT_ROOT, templates = TEMPLATES, files = FILES, skill = SKILL, type, beat, staticBeat, component, filed = false }) {
  // No `--from` provenance here: this scaffold fills its own templates rather than adapting
  // another beat's code, so the empty choreography section carries the frame and nothing else.
  const scaffoldedFrom = "";
  const { beatDir, staticDir, values } = tokensFor({ root, skill, type, beat, staticBeat, component });
  const planned = Object.entries(files).map(([template, target]) => [
    fill(target, values),
    fill(readFileSync(join(templates, template), "utf8"), values),
  ]);
  // The chain, read before a single file exists on disk (see "THE EDITORIAL CHAIN, WIRED" above).
  const briefAt = planned.findIndex(([target]) => target === "BRIEF.md");
  if (briefAt >= 0)
    planned[briefAt] = ["BRIEF.md", withChainSections(planned[briefAt][1], type, scaffoldedFrom)];
  assertRunDirection(root, beatDir, filed);
  // PER FILE, NOT PER DIRECTORY. The catalogue's own flow creates the beat here, so refusing an
  // existing directory was the same thing; a story's does not — the analyst writes the data
  // contract into `beats/<id>/` before any producer is dispatched, so a directory check refused
  // every story beat outright. What must not be overwritten is a file somebody wrote.
  const collisions = planned
    .map(([target]) => target)
    .filter((target) => existsSync(join(beatDir, target)))
    .sort();
  if (collisions.length) {
    throw new Error(
      `${relative(root, beatDir)} already has ${collisions.join(", ")} — the scaffold never overwrites a file`,
    );
  }
  mkdirSync(beatDir, { recursive: true });
  for (const [target, content] of planned) writeFileSync(join(beatDir, target), content, { flag: "wx" });
  if (!paletteReached) copyFileSync(join(staticDir, "PALETTE.md"), join(beatDir, "PALETTE.md"), 1 /* COPYFILE_EXCL */);
  return [...planned.map(([target]) => target), "PALETTE.md"].sort();
}

export function parseArgs(argv) {
  const known = new Set(["--type", "--beat", "--static", "--component", "--filed"]);
  const out = {};
  for (let i = 0; i < argv.length; ) {
    // `--filed` is the catalogue-only escape from the DIRECTION.md refusal, and it is the
    // one flag here that takes no value.
    if (argv[i] === "--filed") {
      out.filed = true;
      i += 1;
      continue;
    }
    if (!known.has(argv[i])) throw new Error(`unknown argument ${JSON.stringify(argv[i])} — takes --type, --beat, --static, --component, --filed`);
    if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) throw new Error(`${argv[i]} takes a value`);
    out[argv[i].slice(2)] = argv[i + 1];
    i += 2;
  }
  for (const required of ["type", "beat", "static"]) if (!out[required]) throw new Error(`--${required} is required`);
  return out;
}

if (import.meta.main) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const written = scaffoldBeat({ type: args.type, beat: args.beat, staticBeat: args.static, component: args.component, filed: Boolean(args.filed) });
    console.log(
      `scaffolded ${args.beat}:\n  ${written.join("\n  ")}\n\n` +
        `The plumbing is written. Nothing that decides what a reader sees is.\n` +
        `Next: BRIEF.md — the gesture, argued, before any code. Then: grep -n SCAFFOLD ${args.beat}\n` +
        `Read first: skills/map-web/references/types/${args.type}.md, then proof/web-choropleth-europe-lowcarbon.`,
    );
  } catch (error) {
    console.error(`refused — ${error.message}`);
    process.exitCode = 1;
  }
}
