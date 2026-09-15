// skills/chart-video/scripts/scaffold-video-beat.mjs
//
// THE PLUMBING OF A DIRECTED CHART VIDEO, WRITTEN ONCE — AND NOTHING ELSE.
//
// Usage:  bun skills/chart-video/scripts/scaffold-video-beat.mjs --type <type> --beat proof/video-<type>-<subject>
//           --static proof/<static-beat> [--component <PascalName>]
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

const HERE = import.meta.dirname;
const SKILL = "chart-video";
const TEMPLATES = join(HERE, "..", "assets", "video-beat-scaffold");
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
export function tokensFor({ root, skill, medium, type, beat, staticBeat, component }) {
  if (!KEBAB.test(type ?? "")) throw new Error(`--type must be a kebab-case chart type, got ${JSON.stringify(type)}`);
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
      COMPOSITION: `${basename(beatDir).replace(/^\./, "")}-landscape`,
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
export function scaffoldBeat({ root = DEFAULT_ROOT, templates, files, skill, medium, type, beat, staticBeat, component }) {
  const { beatDir, staticDir, values } = tokensFor({ root, skill, medium, type, beat, staticBeat, component });
  const planned = Object.entries(files).map(([template, target]) => [fill(target, values), fill(readFileSync(join(templates, template), "utf8"), values)]);
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
    const written = scaffoldBeat({ templates: TEMPLATES, files: FILES, skill: SKILL, medium: "chart", type: args.type, beat: args.beat, staticBeat: args.static, component: args.component });
    console.log(`scaffolded ${args.beat}:\n  ${written.join("\n  ")}\n\nNext: BRIEF.md's choreography, then the SCAFFOLD stubs (grep -n SCAFFOLD ${args.beat}).`);
  } catch (error) {
    console.error(`refused — ${error.message}`);
    process.exitCode = 1;
  }
}
