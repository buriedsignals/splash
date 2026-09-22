// skills/chart-video/scripts/scaffold-video-beat.mjs
//
// THE PLUMBING OF A DIRECTED CHART VIDEO, WRITTEN ONCE — AND NOTHING ELSE.
//
// Usage:  bun skills/chart-video/scripts/scaffold-video-beat.mjs --type <type> --beat proof/video-<type>-<subject>
//           --static proof/<static-beat> [--component <PascalName>]
//           [--size landscape|portrait|square]  the slot's own size; landscape when omitted
//
// OPTIONAL, by the owner's rule: a beat may be written by hand, and the scaffold must never constrain the creative
// part. The cold tests (`.superpowers/sdd/cold-test-chart-friction.md`) measured ~390 of a beat's ~900 lines as the
// same plumbing copied from the last worked example; this writes exactly those files, from
// `assets/video-beat-scaffold/`, with the beat's names in them.
//
// WHAT IT GENERATES — the files identical across beats, modulo names:
//   index.ts, Root.tsx, Directed<Name>Video.tsx       the Remotion entry, root and composition
//   render-directions-video.mjs                        the runner: ONE composed direction by default (the design base's
//                                                      best candidate for NEWSROOM.md), `--candidates <N>` to choose,
//                                                      `--filed` for the demo directions only, `--only`, `--still`,
//                                                      `--look`; type floor at every event's end; faces embedded;
//                                                      concurrency 1; an empty `--env-file`
//   timing-contract.ts                                 a legal six-event ~20 s skeleton (45-frame title, 60-frame hold)
//   states.mjs, scene.mjs                              `assertEventStates` wiring; `fieldAt`/WINDOWS/LINEAR mechanics
//   build.mjs                                          direction → registers → `videoRegistersOf`, `titleCardFor`,
//                                                      `sourceCreditFor(...CREDIT_ONE_LINE)`, `measure`, colour floors
//   <Name>Frame.tsx                                    `Word`, the title card, the credit
//   subject.mjs                                        the static beat's frozen data read, its path wired
//   timing.test.ts, states.test.ts, frame.test.ts      the plumbing's guards (checkTiming, ≤ 22 s, hold ≥ 60; type floor
//                                                      and data-width at every event's end; title at frame 0; credit on
//                                                      one line; one direction by default)
//   BRIEF.md                                           the choreography table's header and the owner's rules checklist
//   PALETTE.md                                         copied from the static beat
//
// WHAT IT DELIBERATELY DOES NOT GENERATE — the beat's own work, left as marked `SCAFFOLD` stubs:
//   the argument and the copy, the gestures (states' fields, WINDOWS), the layout (build.mjs, THE LAYOUT), the scene
//   maths (`sceneAt`), the story drawn (<Name>Frame.tsx, THE STORY), the claim's assertions (`assertClaim`), and the
//   gesture tests. Where a test must be written, the generated test FAILS until it is (its name carries SCAFFOLD), and
//   the runner refuses to render a beat whose copy or claim is still a placeholder.
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
import { EXPORT_SIZE_NAMES, sizeFor } from "#shared/chart-video/sizes.mjs";
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
export const CHAIN_FORMAT = "video";

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
const SKILL = "chart-video";
const TEMPLATES = join(HERE, "..", "assets", "video-beat-scaffold");
/**
 * THE SIZE IS THE SLOT'S, and it is not a default anything falls back to silently.
 *
 * `SIZES` draws three — landscape for YouTube and an article's column, portrait for stories, square
 * for a feed post — chosen at gate 2c and recorded on the slot. This scaffold wrote `landscape` into
 * four places and took no flag, so a journalist whose slot said `portrait` received a landscape beat
 * and had to hand-edit the composition's id, Root.tsx, build.mjs and the BRIEF. Landscape stays the
 * default because it is the commonest, and `--size` is how the other two are asked for.
 */
export const DEFAULT_SIZE = "landscape";

/** Refuses a size the table does not draw, naming the three — the `sizeFor` precedent. */
export function assertSize(size) {
  if (!EXPORT_SIZE_NAMES.includes(size))
    throw new Error(
      `--size takes one of ${EXPORT_SIZE_NAMES.join(", ")}, got ${JSON.stringify(size)}. ` +
        "It is chosen at gate 2c and recorded on the slot in STORYBOARD.md; it is not a default " +
        "anything may fall back to.",
    );
  return size;
}

export const DEFAULT_ROOT = resolve(HERE, "..", "..", "..");

/** Template file → the file it becomes; `%%Name%%` is the component's name. */
const FILES = Object.freeze({
  "index.ts.tmpl": "index.ts",
  "Root.tsx.tmpl": "Root.tsx",
  "DirectedVideo.tsx.tmpl": "Directed%%Name%%Video.tsx",
  "render-directions-video.mjs.tmpl": "render-directions-video.mjs",
  "timing-contract.ts.tmpl": "timing-contract.ts",
  "states.mjs.tmpl": "states.mjs",
  "scene.mjs.tmpl": "scene.mjs",
  "build.mjs.tmpl": "build.mjs",
  "Frame.tsx.tmpl": "%%Name%%Frame.tsx",
  "subject.mjs.tmpl": "subject.mjs",
  "timing.test.ts.tmpl": "timing.test.ts",
  "states.test.ts.tmpl": "states.test.ts",
  "frame.test.ts.tmpl": "frame.test.ts",
  "BRIEF.md.tmpl": "BRIEF.md",
});

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const BEAT_NAME = /^\.?[a-z0-9][a-z0-9-]*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;

/** `video-area-world-population` of type `area` → `WorldPopulation`. */
export function componentNameOf(beatName, type) {
  const subject = beatName.replace(/^\./, "").replace(/^video-/, "").replace(new RegExp(`^${type}-`), "");
  return subject
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

/** The frozen data the static beat carries at its top level: `data.csv` first, else its first CSV, else its first JSON. */
export function dataFileOf(staticDir) {
  const files = readdirSync(staticDir).filter((f) => statSync(join(staticDir, f)).isFile()).sort();
  if (files.includes("data.csv")) return "data.csv";
  return files.find((f) => /\.csv$/i.test(f)) ?? files.find((f) => /\.(geo)?json$/i.test(f)) ?? null;
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
export function tokensFor({ root, skill, medium, type, beat, staticBeat, component, size = DEFAULT_SIZE }) {
  if (!KEBAB.test(type ?? "")) throw new Error(`--type must be a kebab-case chart type, got ${JSON.stringify(type)}`);
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
      COMPOSITION: `${basename(beatDir).replace(/^\./, "")}-${size}`,
      SIZE: size,
      SIZE_PX: `${sizeFor(size).width} × ${sizeFor(size).height}`,
      TYPE: type,
      MEDIUM: medium,
      SKILL: skill,
      UP: relative(beatDir, root).split(sep).join("/"),
      STATIC: basename(staticDir),
      STATIC_REL: relative(beatDir, staticDir).split(sep).join("/"),
      DATA_FILE: dataFile,
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

/**
 * Writes the scaffold. Every file is filled in memory first; the beat folder is then created (failing if it exists,
 * even when it appeared since the check) and each file written with an exclusive flag.
 * @returns {string[]} the files written, relative to the beat
 */
export function scaffoldBeat({ root = DEFAULT_ROOT, templates, files, skill, medium, type, beat, staticBeat, component, filed = false, size = DEFAULT_SIZE }) {
  // No `--from` provenance here: this scaffold fills its own templates rather than adapting
  // another beat's code, so the empty choreography section carries the frame and nothing else.
  const scaffoldedFrom = "";
  assertSize(size);
  const { beatDir, staticDir, values } = tokensFor({ root, skill, medium, type, beat, staticBeat, component, size });
  const planned = Object.entries(files).map(([template, target]) => [fill(target, values), fill(readFileSync(join(templates, template), "utf8"), values)]);
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
  // Re-read at the write site rather than carrying a flag across two functions: the answer is a
  // filesystem fact, and asking it twice is cheaper than a variable that can go stale.
  const paletteAlreadyReachable = paletteReachableFrom(beatDir);
  if (!paletteAlreadyReachable) copyFileSync(join(staticDir, "PALETTE.md"), join(beatDir, "PALETTE.md"), 1 /* COPYFILE_EXCL */);
  return [...planned.map(([target]) => target), "PALETTE.md"].sort();
}

export function parseArgs(argv) {
  const known = new Set(["--type", "--beat", "--static", "--component", "--filed", "--size"]);
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
    const written = scaffoldBeat({ templates: TEMPLATES, files: FILES, skill: SKILL, medium: "chart", type: args.type, beat: args.beat, staticBeat: args.static, component: args.component, filed: Boolean(args.filed), size: args.size ?? DEFAULT_SIZE });
    console.log(`scaffolded ${args.beat}:\n  ${written.join("\n  ")}\n\nNext: BRIEF.md's choreography, then the SCAFFOLD stubs (grep -n SCAFFOLD ${args.beat}).`);
  } catch (error) {
    console.error(`refused — ${error.message}`);
    process.exitCode = 1;
  }
}
