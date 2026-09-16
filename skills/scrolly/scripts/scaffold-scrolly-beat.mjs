// skills/scrolly/scripts/scaffold-scrolly-beat.mjs
//
// THE PLUMBING OF A DIRECTED CHART SCROLLY, WRITTEN ONCE — AND NOTHING ELSE.
//
// Usage:  bun skills/scrolly/scripts/scaffold-scrolly-beat.mjs --type <type> --beat proof/scrolly-<subject>
//           [--component <PascalName>]
//
// Cold runs starting from skills/splash/SKILL.md alone were measured copying ~400-500 lines of identical
// plumbing from the last worked example (`proof/scrolly-boxplot-france-co2-decades`,
// `proof/scrolly-dot-density-europe-stations`). This writes exactly those files, from
// `assets/scrolly-beat-scaffold/`, with the beat's own names in them:
//
//   render-directions-scrolly.mjs   the runner: SCAFFOLD data loading with a named-error hook, the words object,
//                                    STATES, composeDirections/report, resolveDirectionFamilies, deriveFurniture,
//                                    webRegisters, one renderScrolly call per direction with the reveal driver
//                                    inlined. ONE COMPOSED DIRECTION BY DEFAULT; --filed renders the three filed
//                                    demo directions (a catalogue proof only); --only <id> picks one.
//   Directed<Name>Scrolly.tsx       an empty directed component: the carrier pattern (data-<type> JSON payload),
//                                    the header unit + exclusive notes slot, the stage/field.
//   <type>-drive.mjs                an empty driver: the seat/paint skeleton, the `set` helper, exclusive notes,
//                                    the narrow-stage flag.
//   BRIEF.md                        the choreography table's header and the owner's rules checklist.
//
// WHAT IT DELIBERATELY DOES NOT GENERATE — the beat's own work, left as marked SCAFFOLD stubs: the subject's data
// and its assertions, the claim, the copy (title/prose/source/words/alt), the choreography (STATES' fields), the
// marks (the component's SVG geometry and labels), and the paint (the driver's own fields). The runner throws a
// named error — its message carries SCAFFOLD_MARK — while any of the copy is still a placeholder.
//
// Works into an existing beat folder — the mandatory `analyst` step already creates
// `stories/<story>/beats/<id>/` (with data.json, DATA-NOTES.md) before scrolly ever runs. Refuses only to
// overwrite a file it would itself write, naming every one that already exists.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const HERE = import.meta.dirname;
const TEMPLATES = join(HERE, "..", "assets", "scrolly-beat-scaffold");
export const DEFAULT_ROOT = resolve(HERE, "..", "..", "..");

/** Template file → the file it becomes; `%%Name%%`/`%%TYPE%%` are filled from the beat's own names. */
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

/**
 * Writes the scaffold. Every file is filled in memory first; then, if the beat folder already carries any of
 * the files this scaffold would write, the whole call refuses and names every collision. Otherwise the folder
 * is created if needed (a no-op when the beat already exists, e.g. analyst's own data.json beside it) and each
 * file written with an exclusive flag.
 * @returns {string[]} the files written, relative to the beat
 */
export function scaffoldBeat({ root = DEFAULT_ROOT, templates, files, type, beat, component }) {
  const { beatDir, values } = tokensFor({ root, type, beat, component });
  const planned = Object.entries(files).map(([template, target]) => [fill(target, values), fill(readFileSync(join(templates, template), "utf8"), values)]);
  const collisions = planned.map(([target]) => target).filter((target) => existsSync(join(beatDir, target))).sort();
  if (collisions.length) throw new Error(`${relative(root, beatDir)} already has ${collisions.join(", ")} — the scaffold never overwrites a file`);
  mkdirSync(beatDir, { recursive: true });
  for (const [target, content] of planned) writeFileSync(join(beatDir, target), content, { flag: "wx" });
  return planned.map(([target]) => target).sort();
}

export function parseArgs(argv) {
  const known = new Set(["--type", "--beat", "--component"]);
  const out = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!known.has(argv[i])) throw new Error(`unknown argument ${JSON.stringify(argv[i])} — takes --type, --beat, --component`);
    if (argv[i + 1] === undefined || argv[i + 1].startsWith("--")) throw new Error(`${argv[i]} takes a value`);
    out[argv[i].slice(2)] = argv[i + 1];
  }
  for (const required of ["type", "beat"]) if (!out[required]) throw new Error(`--${required} is required`);
  return out;
}

if (import.meta.main) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const written = scaffoldBeat({ templates: TEMPLATES, files: FILES, type: args.type, beat: args.beat, component: args.component });
    console.log(`scaffolded ${args.beat}:\n  ${written.join("\n  ")}\n\nNext: read skills/scrolly/references/types/${args.type}.md, write BRIEF.md's choreography, then the SCAFFOLD stubs (grep -rn SCAFFOLD ${args.beat}).`);
  } catch (error) {
    console.error(`refused — ${error.message}`);
    process.exitCode = 1;
  }
}
