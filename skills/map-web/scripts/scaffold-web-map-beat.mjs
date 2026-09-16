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

/** A path given on the command line, resolved and held to one directory directly under `<root>/proof/`. */
function proofDirOf(root, given, flag) {
  if (typeof given !== "string" || given === "") throw new Error(`${flag} takes a path under proof/`);
  const proof = join(root, "proof");
  const dir = resolve(root, given);
  if (dirname(dir) !== proof) throw new Error(`${flag} must name a folder directly under proof/, got ${JSON.stringify(given)}`);
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
  if (existsSync(beatDir)) throw new Error(`${relative(root, beatDir)} already exists — the scaffold never overwrites a beat`);
  if (!existsSync(staticDir) || !statSync(staticDir).isDirectory()) throw new Error(`--static names no beat: ${relative(root, staticDir)} does not exist`);
  if (!existsSync(join(staticDir, "PALETTE.md"))) throw new Error(`${relative(root, staticDir)} carries no PALETTE.md to copy`);
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
export function scaffoldBeat({ root = DEFAULT_ROOT, templates = TEMPLATES, files = FILES, skill = SKILL, type, beat, staticBeat, component }) {
  const { beatDir, staticDir, values } = tokensFor({ root, skill, type, beat, staticBeat, component });
  const planned = Object.entries(files).map(([template, target]) => [
    fill(target, values),
    fill(readFileSync(join(templates, template), "utf8"), values),
  ]);
  mkdirSync(beatDir);
  for (const [target, content] of planned) writeFileSync(join(beatDir, target), content, { flag: "wx" });
  copyFileSync(join(staticDir, "PALETTE.md"), join(beatDir, "PALETTE.md"), 1 /* COPYFILE_EXCL */);
  return [...planned.map(([target]) => target), "PALETTE.md"].sort();
}

export function parseArgs(argv) {
  const known = new Set(["--type", "--beat", "--static", "--component"]);
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!known.has(argv[i])) throw new Error(`unknown argument ${JSON.stringify(argv[i])} — takes --type, --beat, --static, --component`);
    if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) throw new Error(`${argv[i]} takes a value`);
    out[argv[i].slice(2)] = argv[i + 1];
  }
  for (const required of ["type", "beat", "static"]) if (!out[required]) throw new Error(`--${required} is required`);
  return out;
}

if (import.meta.main) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const written = scaffoldBeat({ type: args.type, beat: args.beat, staticBeat: args.static, component: args.component });
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
