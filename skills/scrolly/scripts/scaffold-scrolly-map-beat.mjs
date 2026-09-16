// skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs
//
// THE PLUMBING OF A DIRECTED LIVE-MAPTILER MAP SCROLLY, WRITTEN ONCE — AND NOTHING ELSE.
//
// Usage:  bun skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs --type <type> --beat proof/scrolly-<subject>
//           [--component <PascalName>]
//
// The map sibling of scaffold-scrolly-beat.mjs — same tokens, same rules, the map's own plumbing (from
// assets/scrolly-map-beat-scaffold/, mirroring the validated `proof/scrolly-dot-density-europe-stations`):
//
//   render-directions-scrolly.mjs   the runner: SCAFFOLD data loading with a named-error hook, the words object,
//                                    the cameras and STATES, composeDirections/report, resolveDirectionFamilies,
//                                    deriveFurniture, webRegisters, openLiveMapCards/renderWithCardImages wired
//                                    (the frozen-image bake, the __MAPTILER_KEY__ placeholder and its local,
//                                    keyed .local.html copy, --no-bake for a fast loop). ONE COMPOSED DIRECTION
//                                    BY DEFAULT; --filed renders the three filed demo directions; --only <id>.
//   <type>-plan.mjs                 the plan skeleton on shared/map-beat's own contract: flat Web Mercator, the
//                                    style URL keyed by placeholder, data-constant bindings (never per-feature
//                                    data that changes between cards), beneath:"water" documented for a
//                                    Countries-tileset fill, an empty layers list.
//   Directed<Name>Scrolly.tsx       an empty directed component: the carrier pattern (CardImages, the live-map
//                                    div, the plan's JSON script tag), the header unit + exclusive notes slot.
//   <type>-drive.mjs                an empty driver: initScrollyMap/applyScrollyMap wiring, the seat/paint
//                                    skeleton, exclusive notes, the narrow-stage flag.
//   BRIEF.md                        the choreography table's header (with each card's own camera) and the
//                                    owner's rules checklist.
//
// WHAT IT DELIBERATELY DOES NOT GENERATE — the beat's own work, left as marked SCAFFOLD stubs: the subject's
// data and its assertions, the claim, the copy, the cameras, the plan's own layers and bindings, the choreography
// (STATES' fields), and the paint (the driver's own fields). The runner throws a named error — its message
// carries SCAFFOLD_MARK — while any of the copy is still a placeholder.
//
// Refuses to overwrite: an existing beat folder is an error, never merged into.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

const HERE = import.meta.dirname;
const TEMPLATES = join(HERE, "..", "assets", "scrolly-map-beat-scaffold");
export const DEFAULT_ROOT = resolve(HERE, "..", "..", "..");

/** Template file → the file it becomes; `%%Name%%`/`%%TYPE%%` are filled from the beat's own names. */
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
  const sheet = join(root, "skills", "scrolly", "references", "types", `${type}.md`);
  if (!existsSync(sheet)) throw new Error(`--type ${JSON.stringify(type)} has no sheet at skills/scrolly/references/types/${type}.md — see the per-type list in skills/scrolly/SKILL.md`);
  const beatDir = beatDirOf(root, beat, "--beat");
  if (existsSync(beatDir)) throw new Error(`${relative(root, beatDir)} already exists — the scaffold never overwrites a beat`);
  const name = component ?? componentNameOf(basename(beatDir), type);
  if (!PASCAL.test(name)) throw new Error(`--component must be a PascalCase name, got ${JSON.stringify(name)}`);
  return {
    beatDir,
    values: {
      Name: name,
      name: name[0].toLowerCase() + name.slice(1),
      BEAT: basename(beatDir),
      BEAT_PATH: relative(root, beatDir).split(sep).join("/"),
      TYPE: type,
      UP: relative(beatDir, root).split(sep).join("/"),
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
 * Writes the scaffold. Every file is filled in memory first; the beat folder is then created (failing if it
 * exists, even when it appeared since the check) and each file written with an exclusive flag.
 * @returns {string[]} the files written, relative to the beat
 */
export function scaffoldBeat({ root = DEFAULT_ROOT, templates, files, type, beat, component }) {
  const { beatDir, values } = tokensFor({ root, type, beat, component });
  const planned = Object.entries(files).map(([template, target]) => [fill(target, values), fill(readFileSync(join(templates, template), "utf8"), values)]);
  mkdirSync(beatDir);
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
    console.log(`scaffolded ${args.beat}:\n  ${written.join("\n  ")}\n\nNext: read skills/scrolly/references/types/${args.type}.md, write BRIEF.md's choreography and cameras, then the SCAFFOLD stubs (grep -rn SCAFFOLD ${args.beat}).`);
  } catch (error) {
    console.error(`refused — ${error.message}`);
    process.exitCode = 1;
  }
}
