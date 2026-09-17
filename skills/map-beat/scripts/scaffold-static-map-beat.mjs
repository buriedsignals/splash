// skills/map-beat/scripts/scaffold-static-map-beat.mjs
//
// THE PLUMBING OF A DIRECTED STATIC MAP — ADAPTED FROM THE TYPE'S OWN WORKED EXAMPLE BY DEFAULT.
//
// Usage:  bun skills/map-beat/scripts/scaffold-static-map-beat.mjs --type <type> --beat proof/static-<subject>
//           [--component <PascalName>] [--from <beat>] [--generic]
//
// The map sibling of `scaffold-static-beat.mjs` (`chart-beat`) — same tokens, same rules, the same
// --from/--generic contract, over a beat's `bake.mjs` (one MapTiler plate, `#shared/map-beat/bake.mjs`) besides
// its runner and directed component. This skill already hosts the map VIDEO scaffold
// (`scaffold-map-video-beat.mjs`); this is its static sibling, following the same conventions where the two
// agree and scrolly's `--from` conventions everywhere else — the static export was built first, before this
// plumbing was industrialised.
//
//   BY DEFAULT (no --from, no --generic): the type sheet's own "## Worked example" section names the validated
//   beat this type adapts from. Its render-directions.mjs, its one Directed<Type>.tsx, its bake.mjs, and every
//   OTHER local sibling `.mjs` file the runner imports by a bare `./name.mjs` specifier (a beat's own
//   `beat.mjs`/`plate-cache.mjs` split, when it has one) are copied into the new beat, renamed throughout, every
//   subject-specific region marked `SCAFFOLD:`, and the "render all three filed directions unconditionally"
//   plumbing every worked static beat still carries is rewritten into the composed-direction-default convention
//   (`static-plumbing.mjs`, `composedDirectionDefault`) — ONE direction, composed from this beat's own
//   PALETTE.md, by default; `--filed` for the three demo directions.
//
//   --from <beat>   adapts a named beat instead of the type's own worked example.
//   --generic       the fully generic stub output (assets/static-map-beat-scaffold/*.tmpl). Required for a type
//                   whose sheet names no worked example yet; optional otherwise.
//   BRIEF.md        always generated fresh from the generic template — in --from mode, one line names the beat
//                   it was adapted from.
//
// PALETTE.md is checked BEFORE anything is written — a beat's colours are a journalist's decision, and refusing
// early names the exact command to see the proposal, rather than failing deep inside a render.
//
// Works into an existing beat folder — the mandatory `analyst` step already creates
// `stories/<story>/beats/<id>/` before a map craft skill ever runs. Refuses only to overwrite a file it would
// itself write, naming every one that already exists.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { composedDirectionDefault, markBefore, markDividers, missingAssetsMessage, paletteReachable, paletteRefusalMessage, prependBanner, requiredLocalAssets, topBanner } from "./static-plumbing.mjs";

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
import { checkChoreography, renderChoreographySection } from "./static-choreography.mjs";
import { checkPrecision, renderPrecisionSection, scaffoldRequirements } from "./static-precision.mjs";

export { checkChoreography, checkPrecision };

/** This scaffold's own export. */
export const CHAIN_FORMAT = "static";

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
const TEMPLATES = join(HERE, "..", "assets", "static-map-beat-scaffold");
export const DEFAULT_ROOT = resolve(HERE, "..", "..", "..");

const FILES = Object.freeze({
  "render-directions.mjs.tmpl": "render-directions.mjs",
  "DirectedMap.tsx.tmpl": "Directed%%Name%%.tsx",
  "bake.mjs.tmpl": "bake.mjs",
  "BRIEF.md.tmpl": "BRIEF.md",
});

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const BEAT_NAME = /^\.?[a-z0-9][a-z0-9-]*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;

/** `choropleth` -> `Choropleth`. Static map components are named after the TYPE, not the subject. */
export function pascalType(type) {
  return type
    .split("-")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

function beatDirOf(root, given, flag) {
  if (typeof given !== "string" || given === "") throw new Error(`${flag} takes a path under proof/, or a story's beats/`);
  const dir = resolve(root, given);
  const parent = basename(dirname(dir));
  if (parent !== "proof" && parent !== "beats") throw new Error(`${flag} must name a folder directly under proof/ or a story's beats/, got ${JSON.stringify(given)}`);
  if (!BEAT_NAME.test(basename(dir))) throw new Error(`${flag} must be a kebab-case folder name, got ${JSON.stringify(basename(dir))}`);
  return dir;
}

export function tokensFor({ root, type, beat, component }) {
  if (!KEBAB.test(type ?? "")) throw new Error(`--type must be a kebab-case map type, got ${JSON.stringify(type)}`);
  const sheet = join(root, "skills", "map-beat", "references", "types", `${type}.md`);
  if (!existsSync(sheet)) throw new Error(`--type ${JSON.stringify(type)} has no sheet at skills/map-beat/references/types/${type}.md`);
  const beatDir = beatDirOf(root, beat, "--beat");
  if (component !== undefined && !PASCAL.test(component)) throw new Error(`--component must be a PascalCase name, got ${JSON.stringify(component)}`);
  return {
    beatDir,
    values: {
      BEAT: basename(beatDir),
      BEAT_PATH: relative(root, beatDir).split(sep).join("/"),
      TYPE: type,
    },
  };
}

export function fill(template, values) {
  return template.replace(/%%([A-Za-z_]+)%%/g, (token, key) => {
    if (!(key in values)) throw new Error(`the scaffold template carries an unknown token ${token}`);
    return values[key];
  });
}

// ── --from: adapt a validated beat's own code, instead of the generic stub ──────────────────────

export function workedExampleOf(root, type) {
  const sheet = join(root, "skills", "map-beat", "references", "types", `${type}.md`);
  if (!existsSync(sheet)) return null;
  const text = readFileSync(sheet, "utf8");
  const heading = text.indexOf("## Worked example");
  if (heading === -1) return null;
  const m = /`(proof\/[a-z0-9-]+)/.exec(text.slice(heading));
  return m ? m[1] : null;
}

const DATA_ANCHOR = /^const \w+ = .*(?:readFile|readFileSync)\(join\((?:HERE|dir),/m;
const ASSERT_ANCHOR = /^if \(/m;
const CARDS_ANCHOR = /^const title = /m;
const LOCAL_IMPORT_RE = /from "\.\/([A-Za-z0-9_-]+\.mjs)"/g;

/** Reads `fromBeat`'s own runner, its one Directed*.tsx, its bake.mjs, and every OTHER local sibling `.mjs`
 *  file its runner imports by a bare `./name.mjs` specifier (a beat's own `beat.mjs`/`plate-cache.mjs` split,
 *  when it has one) — renamed for this beat's own name and path, and re-marked SCAFFOLD over the regions that
 *  are `fromBeat`'s own subject. Returns `{ filename: content }` plus the resolved component `name`. */
export function adaptFromBeat({ root, fromBeat, beatPath, component }) {
  const sourceDir = resolve(root, fromBeat);
  if (!existsSync(sourceDir)) throw new Error(`--from ${fromBeat} does not exist`);
  const entries = readdirSync(sourceDir);
  const runnerFile = "render-directions.mjs";
  if (!entries.includes(runnerFile)) throw new Error(`--from ${fromBeat} has no ${runnerFile}`);
  if (!entries.includes("bake.mjs")) throw new Error(`--from ${fromBeat} has no bake.mjs`);
  const tsxNames = entries.filter((f) => /^Directed[A-Za-z0-9]+\.tsx$/.test(f));
  if (tsxNames.length !== 1) throw new Error(`--from ${fromBeat} must carry exactly one Directed*.tsx, found ${tsxNames.length}`);
  const sourceName = /^Directed([A-Za-z0-9]+)\.tsx$/.exec(tsxNames[0])[1];
  const oldPath = relative(root, sourceDir).split(sep).join("/");
  const name = component ?? sourceName;
  // Renames the component IDENTIFIER, never bare prose that happens to share its letters — every
  // worked static beat spells its component only as `Directed<sourceName>` (the filename, the
  // import, the JSX tag), so matching that whole compound is enough to reach every real occurrence
  // and none of the prose or sibling file names that merely start with the same word.
  const identifier = `Directed${sourceName}`;
  const renamedIdentifier = `Directed${name}`;
  const rename = (text) => text.split(identifier).join(renamedIdentifier).split(oldPath).join(beatPath);
  const read = (fname) => rename(readFileSync(join(sourceDir, fname), "utf8"));

  const rawRunner = readFileSync(join(sourceDir, runnerFile), "utf8");
  const siblings = [...new Set([...rawRunner.matchAll(LOCAL_IMPORT_RE)].map((m) => m[1]))].filter((f) => f !== "bake.mjs" && entries.includes(f));

  let runner = markDividers(read(runnerFile));
  runner = composedDirectionDefault(runner, { fromBeat });
  runner = markBefore(runner, DATA_ANCHOR, [`SCAFFOLD: data loading — ${fromBeat}'s own reader. Point this at this beat's own frozen data and`, `shapes, and keep the shape (fields coerced to numbers, throw on anything unusable).`]);
  runner = markBefore(runner, ASSERT_ANCHOR, [`SCAFFOLD: assertions — ${fromBeat}'s own claim, checked against its data and its geography.`, `Rewrite every check against this beat's own figures and shapes.`]);
  runner = markBefore(runner, CARDS_ANCHOR, [`SCAFFOLD: card sentences — ${fromBeat}'s own title, standfirst, reading line and alt. Rewrite for this`, `beat's own subject; keep the register split (display/eyebrow/body/axis/annot/value).`]);
  runner = prependBanner(runner, topBanner(fromBeat));

  let tsx = markDividers(read(tsxNames[0]));
  tsx = prependBanner(tsx, topBanner(fromBeat, [`This is ${fromBeat}'s own layers, its own bounds and its own camera — read them before assuming they`, `carry over to this beat's own subject unchanged.`]));

  let bake = markDividers(read("bake.mjs"));
  bake = prependBanner(bake, topBanner(fromBeat, [`The bounds/style below (\`BEAT\`) are ${fromBeat}'s own camera — refit them to this beat's own subject.`]));

  const out = { [runnerFile]: runner, [`Directed${name}.tsx`]: tsx, "bake.mjs": bake };
  for (const sib of siblings) {
    let content = markDividers(read(sib));
    content = markBefore(content, DATA_ANCHOR, [`SCAFFOLD: data loading — ${fromBeat}'s own reader. Point this at this beat's own frozen data.`]);
    content = markBefore(content, ASSERT_ANCHOR, [`SCAFFOLD: assertions — ${fromBeat}'s own claim, checked against its data.`]);
    content = markBefore(content, CARDS_ANCHOR, [`SCAFFOLD: card sentences — ${fromBeat}'s own words. Rewrite for this beat's own subject.`]);
    content = prependBanner(content, topBanner(fromBeat));
    out[sib] = content;
  }
  return { files: out, name };
}

export function scaffoldBeat({ root = DEFAULT_ROOT, templates, files, type, beat, component, from, generic = false, filed = false }) {
  // The provenance line a `--from` scaffold owes its author, carried into the empty
  // choreography section by `withChainSections` rather than injected into the template by hand.
  let scaffoldedFrom = "";
  const { beatDir, values } = tokensFor({ root, type, beat, component });
  let planned;
  if (generic) {
    const name = component ?? pascalType(type);
    const filled = { ...values, Name: name };
    planned = Object.entries(files).map(([template, target]) => [fill(target, filled), fill(readFileSync(join(templates, template), "utf8"), filled)]);
  } else {
    const fromBeat = from ?? workedExampleOf(root, type);
    if (!fromBeat) throw new Error(`--type ${JSON.stringify(type)} has no worked example in its sheet — pass --from <beat>, or --generic for the empty stub`);
    const adapted = adaptFromBeat({ root, fromBeat, beatPath: values.BEAT_PATH, component });
    const briefTemplate = fill(readFileSync(join(templates, "BRIEF.md.tmpl"), "utf8"), { ...values, Name: adapted.name });
    scaffoldedFrom = `SCAFFOLD: this beat's code was scaffolded \`--from ${fromBeat}\` — read that beat's own BRIEF.md and its\nrunner/directed component/bake (marked SCAFFOLD: where they are its own subject) before writing this table.`;
    const brief = briefTemplate;
    planned = Object.entries({ ...adapted.files, "BRIEF.md": brief });
    const missing = requiredLocalAssets(Object.values(adapted.files), Object.keys(adapted.files)).filter((n) => !existsSync(join(beatDir, n)));
    if (missing.length) throw new Error(missingAssetsMessage({ relBeatDir: relative(root, beatDir), fromBeat, sourceDir: resolve(root, fromBeat), missing }));
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
  return planned.map(([target]) => target).sort();
}

export function parseArgs(argv) {
  const known = new Set(["--type", "--beat", "--component", "--from"]);
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
    if (!known.has(flag)) throw new Error(`unknown argument ${JSON.stringify(flag)} — takes --type, --beat, --component, --from, --generic, --filed`);
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
    const written = scaffoldBeat({ templates: TEMPLATES, files: FILES, type: args.type, beat: args.beat, component: args.component, filed: Boolean(args.filed), from: args.from, generic });
    const next = generic
      ? `Next: read skills/map-beat/references/types/${args.type}.md, write BRIEF.md's choreography, then the SCAFFOLD stubs (grep -rn SCAFFOLD ${args.beat}).`
      : `Next: grep -rn SCAFFOLD ${args.beat} and work through each marked region; BRIEF.md names the beat it was adapted from — read its own BRIEF.md too.`;
    console.log(`scaffolded ${args.beat}:\n  ${written.join("\n  ")}\n\n${next}`);
  } catch (error) {
    console.error(`refused — ${error.message}`);
    process.exitCode = 1;
  }
}
