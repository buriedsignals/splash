// skills/scrolly/scripts/scaffold-scrolly-beat.mjs
//
// THE PLUMBING OF A DIRECTED CHART SCROLLY — ADAPTED FROM THE TYPE'S OWN WORKED EXAMPLE BY DEFAULT.
//
// Usage:  bun skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type <type> --beat proof/scrolly-<subject>
//           [--component <PascalName>] [--from <beat>] [--generic]
//
// Two cold runs starting from skills/splash/SKILL.md alone were measured either improvising the whole plumbing or
// never reaching a rendered page: the type sheets pointed only at the worked beat's BRIEF.md (the editorial
// half), never its CODE. The owner's own method, every time a beat of this type was built and validated in this
// session, was: read the validated beat's own runner/driver/directed component (the CODE, not just its BRIEF)
// and adapt it. This scaffold now does that copy mechanically:
//
//   BY DEFAULT (no --from, no --generic): the type sheet's own "## Worked example" names the validated beat this
//   type adapts from (`workedExampleOf`); its render-directions-scrolly.mjs, Directed<Name>Scrolly.tsx and
//   <word>-drive.mjs are copied into the new beat, the source beat's own component name and path renamed
//   throughout, and every subject-specific region (data loading, its assertions, its card sentences, its marks)
//   marked `SCAFFOLD:` in place — the working code stays working code, not blanked into a stub, because reading
//   a real pattern is exactly what the cold runs lacked.
//
//   --from <beat>   adapts a named beat instead of the type's own worked example (a deliberate override — reuse
//                   another subject's beat of the same type, or, for an unusual case, a different type's).
//
//   --generic       the old, fully generic stub output (assets/scrolly-beat-scaffold/*.tmpl) — empty plumbing
//                   with no subject to adapt from. Required for a type whose sheet names no worked example yet;
//                   optional otherwise.
//
//   BRIEF.md        always generated fresh from the generic template (its own choreography table is this beat's
//                   own work, never copied) — in --from mode, one line names the beat it was adapted from.
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
const TEMPLATES = join(HERE, "..", "assets", "scrolly-beat-scaffold");
export const DEFAULT_ROOT = resolve(HERE, "..", "..", "..");

/** Template file → the file it becomes; `%%Name%%`/`%%TYPE%%` are filled from the beat's own names. Used only in
 *  `--generic` mode, or to generate BRIEF.md (always template-driven — see the header). */
const FILES = Object.freeze({
  "render-directions-scrolly.mjs.tmpl": "render-directions-scrolly.mjs",
  "DirectedScrolly.tsx.tmpl": "Directed%%Name%%Scrolly.tsx",
  "drive.mjs.tmpl": "%%TYPE%%-drive.mjs",
  "BRIEF.md.tmpl": "BRIEF.md",
});

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const BEAT_NAME = /^\.?[a-z0-9][a-z0-9-]*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;

/** `scrolly-boxplot-france-co2-decades` of type `boxplot` → `FranceCo2Decades`. */
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
  if (!KEBAB.test(type ?? "")) throw new Error(`--type must be a kebab-case chart type, got ${JSON.stringify(type)}`);
  const sheet = join(root, "skills", "scrolly", "references", "types", `${type}.md`);
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

/** The `## Worked example` section of a type sheet names the validated beat this type's default `--from` adapts
 *  — parsed here (a backtick-quoted `proof/scrolly-…` path) rather than hardcoded, so the scaffold and the sheet
 *  cannot drift apart. Returns null when the sheet carries no such section (a type with no worked example yet). */
export function workedExampleOf(root, type) {
  const sheet = join(root, "skills", "scrolly", "references", "types", `${type}.md`);
  if (!existsSync(sheet)) return null;
  const text = readFileSync(sheet, "utf8");
  const heading = text.indexOf("## Worked example");
  if (heading === -1) return null;
  const m = /`(proof\/scrolly-[a-z0-9-]+)/.exec(text.slice(heading));
  return m ? m[1] : null;
}

/** A worked beat's own `// ── section ──` divider comments, re-labelled `SCAFFOLD:` wherever the label itself
 *  names subject-specific content (its data, its claim, its assertions, its card sentences) — the plumbing
 *  sections (the direction loop, the live-map wiring) are left alone. A beat with no divider comments, or none
 *  matching, is left as copied. */
const DIVIDER_KEYWORDS = /read|station|assert|word|claim|subject|data|figure|title|prose|\balt\b|camera|bucket|bound|rank|bank/i;
function markDividers(content) {
  return content.replace(/^(\/\/ ── )(.+?)( ─+)$/gm, (full, pre, label, tail) => (/scaffold/i.test(label) || !DIVIDER_KEYWORDS.test(label) ? full : `${pre}SCAFFOLD: ${label}${tail}`));
}

/** One banner, inserted before the first line an anchor (a `^`-anchored, `m`-flag regex) matches; a no-op when
 *  the beat's own code carries no such line — not every type's code has every region. */
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

const DATA_ANCHOR = /^const \w+ = .*(?:readFile|readFileSync)\(join\(HERE/m;
const ASSERT_ANCHOR = /^if \(/m;
const CARDS_ANCHOR = /^const (?:title|prose) = /m;
const RETURN_ANCHOR = /^(\s*)return \($/m;
const DRIVE_FN_ANCHOR = /^export function \w+\(/m;

/** Reads `fromBeat`'s own runner, directed component and driver, renamed for this beat's own name and path, and
 *  re-marked SCAFFOLD over the regions that are `fromBeat`'s own subject rather than this type's plumbing — the
 *  gesture the owner's cold-run method always used (read the worked beat's code, adapt it), encoded instead of
 *  left tacit. Returns `{ filename: content }`, ready to write beside a fresh BRIEF.md. */
export function adaptFromBeat({ root, fromBeat, values }) {
  const sourceDir = resolve(root, fromBeat);
  if (!existsSync(sourceDir)) throw new Error(`--from ${fromBeat} does not exist`);
  const entries = readdirSync(sourceDir);
  const runnerFile = "render-directions-scrolly.mjs";
  if (!entries.includes(runnerFile)) throw new Error(`--from ${fromBeat} has no ${runnerFile}`);
  const tsxNames = entries.filter((f) => /^Directed[A-Za-z0-9]+Scrolly\.tsx$/.test(f));
  if (tsxNames.length !== 1) throw new Error(`--from ${fromBeat} must carry exactly one Directed*Scrolly.tsx, found ${tsxNames.length}`);
  const driveNames = entries.filter((f) => f.endsWith("-drive.mjs"));
  if (driveNames.length !== 1) throw new Error(`--from ${fromBeat} must carry exactly one *-drive.mjs, found ${driveNames.length}`);
  const sourceName = /^Directed([A-Za-z0-9]+)Scrolly\.tsx$/.exec(tsxNames[0])[1];
  const oldPath = relative(root, sourceDir).split(sep).join("/");
  const rename = (text) => text.split(sourceName).join(values.Name).split(oldPath).join(values.BEAT_PATH);
  const read = (name) => rename(readFileSync(join(sourceDir, name), "utf8"));

  let runner = markDividers(read(runnerFile));
  runner = markBefore(runner, DATA_ANCHOR, [`SCAFFOLD: data loading — ${fromBeat}'s own reader. Point this at this beat's own frozen data and`, `keep the shape (fields coerced to numbers, throw on anything unusable).`]);
  runner = markBefore(runner, ASSERT_ANCHOR, [`SCAFFOLD: assertions — ${fromBeat}'s own claim, checked against its data. Rewrite every check against`, `this beat's own figures; a beat whose numbers drift must refuse to render, not ship a stale claim.`]);
  runner = markBefore(runner, CARDS_ANCHOR, [`SCAFFOLD: card sentences — ${fromBeat}'s own title, prose, words and alt. Rewrite for this beat's own`, `subject; keep the no-break space escapes and the register split (display/body/axis/annot/value).`]);
  runner = prependBanner(runner, topBanner(fromBeat));

  let tsx = markDividers(read(tsxNames[0]));
  tsx = markBefore(tsx, RETURN_ANCHOR, [`SCAFFOLD: marks — the JSX below draws ${fromBeat}'s own geometry. Replace it with this beat's own`, `marks, keeping the data-part contract the driver and CSS rely on.`]);
  tsx = prependBanner(tsx, topBanner(fromBeat));

  let drive = markDividers(read(driveNames[0]));
  drive = markBefore(drive, DRIVE_FN_ANCHOR, [`SCAFFOLD: paint — the fields this driver reads and writes below are ${fromBeat}'s own. Adapt them to`, `this beat's own state fields; keep the seat/paint split.`]);
  drive = prependBanner(drive, topBanner(fromBeat));

  // Depth-independent paths (this beat may sit at any depth, unlike fromBeat's own proof/<beat>/) and a number
  // formatter matching this beat's own default language, defaulted from NEWSROOM.md — see depth-independent.mjs.
  const lang = defaultLanguage(root);
  runner = oneRunDirection(languageAwareNumbers(depthIndependentPaths(runner), lang), runnerFile);
  tsx = languageAwareNumbers(depthIndependentPaths(tsx), lang, { typed: true });
  drive = languageAwareNumbers(depthIndependentPaths(drive), lang);

  return eachThroughSkillScript({
    [runnerFile]: runner,
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
 * @returns {string[]} the files written, relative to the beat
 */
export function scaffoldBeat({ root = DEFAULT_ROOT, templates, files, type, beat, component, from, generic = false, filed = false }) {
  // The provenance line a `--from` scaffold owes its author, carried into the empty
  // choreography section by `withChainSections` rather than injected into the template by hand.
  let scaffoldedFrom = "";
  const { beatDir, values } = tokensFor({ root, type, beat, component });
  const briefTemplate = fill(readFileSync(join(templates, "BRIEF.md.tmpl"), "utf8"), values);
  let planned;
  if (generic) {
    planned = Object.entries(files).map(([template, target]) => [fill(target, values), fill(readFileSync(join(templates, template), "utf8"), values)]);
  } else {
    const fromBeat = from ?? workedExampleOf(root, type);
    if (!fromBeat) throw new Error(`--type ${JSON.stringify(type)} has no worked example in its sheet — pass --from <beat>, or --generic for the empty stub`);
    const adapted = adaptFromBeat({ root, fromBeat, values });
    scaffoldedFrom = `SCAFFOLD: this beat's code was scaffolded \`--from ${fromBeat}\` — read that beat's own BRIEF.md and its\nrunner/driver/directed component (marked SCAFFOLD: where they are its own subject) before writing this table.`;
    const brief = briefTemplate;
    planned = Object.entries({ ...adapted, "BRIEF.md": brief });
    const missing = requiredLocalAssets(Object.values(adapted), Object.keys(adapted)).filter((name) => !existsSync(join(beatDir, name)));
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
      ? `Next: read skills/scrolly/references/types/${args.type}.md, write BRIEF.md's choreography, then the SCAFFOLD stubs (grep -rn SCAFFOLD ${args.beat}).`
      : `Next: grep -rn SCAFFOLD ${args.beat} and work through each marked region; BRIEF.md names the beat it was adapted from — read its own BRIEF.md too.`;
    console.log(`scaffolded ${args.beat}:\n  ${written.join("\n  ")}\n\n${next}`);
  } catch (error) {
    console.error(`refused — ${error.message}`);
    process.exitCode = 1;
  }
}
