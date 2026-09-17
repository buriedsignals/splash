// skills/chart-beat/scripts/static-plumbing.mjs
//
// Shared machinery for `scaffold-static-beat.mjs` (this skill) and `scaffold-static-map-beat.mjs`
// (`map-beat`, its own copy — skills never import across a skill boundary at runtime,
// `skills/splash/test/no-cross-skill-imports.test.ts`). Two concerns, neither specific to one
// chart type:
//
//   1. PALETTE.md is a journalist's decision, never scaffolded silently — checked HERE, at scaffold
//      time, so a beat refuses before any file is written rather than deep inside a render.
//   2. EVERY DIRECTED STATIC BEAT IN THIS TREE STILL COUNTS "WHICH DIRECTION(S) TO RENDER" THE OLD
//      WAY: `readdirSync(DIRECTIONS)` over all three filed directions, unconditionally — because
//      every one of them predates `composeDirections` being used for anything but the printed
//      report. `composedDirectionDefault` rewrites that copied block into the convention
//      `chart-video`/`chart-web`/`scrolly` already settled on: ONE direction, composed from this
//      beat's own PALETTE.md, by default; `--filed` for every filed demo direction (a catalogue or
//      demo proof, never a production render). It is a literal-shape rewrite, not a generic one —
//      it refuses, naming the beat, rather than silently leaving the old loop in place, when a
//      worked example's own code does not match the shape every beat this rewrite has been run
//      against actually has.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readPalette } from "#shared/chart-beat/colour.mjs";

// ── PALETTE.md — refuse at scaffold time, not deep inside the render ───────────────────────────

function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  const record = {};
  for (const line of m[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z]+):\s*(.*)$/.exec(line.trim());
    if (!pair) continue;
    record[pair[1]] = pair[2].replace(/^["']|["']$/g, "").trim();
  }
  return record;
}

/** `{ name, brandColor, ground }` off the Splash root's own NEWSROOM.md, or `null` when it does not
 *  exist yet. */
export function readNewsroomBasics(root) {
  const path = join(root, "NEWSROOM.md");
  if (!existsSync(path)) return null;
  const record = parseFrontmatter(readFileSync(path, "utf8"));
  return { name: record.name, brandColor: record.brandColor, ground: record.ground };
}

/**
 * The exact, runnable refusal a scaffold gives when no PALETTE.md is reachable — named the way
 * `skills/palette/SKILL.md` insists a beat's colours are decided ("There is no write path in this
 * skill, not a commented-out one, not a flag"). Carries a real `bun -e` command built from this
 * NEWSROOM.md's own recorded house colours when one exists.
 */
export function paletteRefusalMessage({ root, relBeatDir }) {
  const nr = readNewsroomBasics(root);
  const newsroomLit = nr?.brandColor && nr?.ground ? `{ name: ${JSON.stringify(nr.name ?? "this newsroom")}, brandColor: ${JSON.stringify(nr.brandColor)}, ground: ${JSON.stringify(nr.ground)} }` : null;
  const command = newsroomLit
    ? `bun -e 'import { proposePalette } from "./skills/palette/scripts/palette.mjs"; import { formatProposal } from "./skills/palette/scripts/format-proposal.mjs"; console.log(formatProposal(proposePalette({ newsroom: ${newsroomLit} })));'`
    : `NEWSROOM.md has no brandColor/ground yet — read skills/palette/SKILL.md's own Quick start instead.`;
  return [
    `${relBeatDir} has no PALETTE.md reachable (readPalette walks up from the beat to the filesystem root and found none).`,
    `A beat's colours are a journalist's decision, never scaffolded silently — skills/palette/SKILL.md is explicit: "There is no write path in this skill, not a commented-out one, not a flag."`,
    `Run this to see the proposal, then record the journalist's answer at ${relBeatDir}/PALETTE.md (or an ancestor's, e.g. the story root) in the ground/accent/accents/origin shape readPalette expects:`,
    `  ${command}`,
  ].join("\n\n");
}

/** The exact message `readPalette` throws when no `PALETTE.md` exists anywhere up the tree — the
 *  ONLY case `paletteReachable` reports as "not reachable" (`paletteRefusalMessage` then names the
 *  command that produces one). Any other failure (a `PALETTE.md` that exists but is wrong — a bad
 *  `origin`, a bad hex, an accent that fails contrast) is a different fault with its own real
 *  reason, and is left to propagate rather than being flattened into this generic refusal. */
const NOT_FOUND = "No PALETTE.md found for ";

/** Whether `readPalette` (walked from `beatDir` to the filesystem root) would find one. Rethrows
 *  any error that is not "none found" — a `PALETTE.md` that exists but fails to parse or measure
 *  legible is refused with ITS OWN message, not swallowed into "not reachable". */
export function paletteReachable(beatDir) {
  try {
    readPalette(beatDir);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(NOT_FOUND)) return false;
    throw error;
  }
}

// ── the data assets a worked example's own reader assumes beside it ────────────────────────────

const LOCAL_READ = /(?:readFileSync|readFile)\(join\((?:HERE|dir),\s*"([^"]+)"\)/g;

/** Every literal filename an adapted runner reads with `readFileSync(join(HERE, "…"))` /
 *  `readFile(join(HERE, "…"))` — the data (and, for a map, geometry) a worked example's own code
 *  assumes sits beside it — excluding the plumbing files the scaffold itself is about to write. */
export function requiredLocalAssets(sources, exclude) {
  // "geometry.json"/"plate.png" are a PLATE's own cache outputs (plate-cache.mjs reads them off a
  // per-direction plate directory it names `dir`, not off this beat's own HERE) — never a beat-level input.
  const excluded = new Set([...exclude, "data.json", "DATA-NOTES.md", "geometry.json", "plate.png"]);
  const found = new Set();
  for (const text of sources) {
    LOCAL_READ.lastIndex = 0;
    for (const m of text.matchAll(LOCAL_READ)) if (!excluded.has(m[1])) found.add(m[1]);
  }
  return [...found].sort();
}

/** The refusal for a scaffold that would otherwise copy a reader assuming files never written
 *  beside it. */
export function missingAssetsMessage({ relBeatDir, fromBeat, sourceDir, missing }) {
  const lines = missing.map((name) => {
    const inSource = existsSync(join(sourceDir, name));
    const hint =
      /\.geojson$/.test(name) && inSource
        ? `likely reusable verbatim if this subject shares its map window — copy ${fromBeat}/${name}, or provide this beat's own`
        : `this beat's own frozen data — freeze it as ${relBeatDir}/${name} before scaffolding`;
    return `  - ${name}: ${hint}`;
  });
  return [`${relBeatDir} is missing the data ${fromBeat}'s own runner assumes sits beside it:`, lines.join("\n"), `Place these beside the beat, then scaffold again.`].join("\n\n");
}

// ── the composed-direction default — rewritten from the copied worked example's own shape ──────

// `readDirection`/`composeDirections`/`resolveDirectionFamilies`, each reached by counting `../` up
// to `scripts/design-base/` — every worked static beat's own style, predating `#shared/design-base`.
const DESIGN_BASE_IMPORTS_RE = /import \{ readDirection \} from "(?:\.\.\/)+scripts\/design-base\/read-direction\.mjs";\r?\nimport \{ composeDirections(?:, report(?: as \w+)?)? \} from "(?:\.\.\/)+scripts\/design-base\/compose\.mjs";\r?\nimport \{ resolveDirectionFamilies \} from "(?:\.\.\/)+scripts\/design-base\/resolve-families\.mjs";\r?\n/;
const DIRECTIONS_CONST_RE = /^const DIRECTIONS = join\(HERE(?:, "\.\.")+, "docs", "design-base", "directions"\);\r?\n/m;

// The block every worked static beat computes ALL THREE filed directions and only ever prints the
// composition report from — never uses it to pick which direction(s) actually render.
const COMPOSE_BLOCK_RE =
  /const filed = readdirSync\(DIRECTIONS\)\r?\n\s*\.filter\(\(f\) => f\.endsWith\("\.md"\)\)\r?\n\s*\.map\(\(f\) => readDirection\(join\(DIRECTIONS, f\)\)\);\r?\nconst newsroom = readPalette\(HERE, \{ stopAt: join\(HERE, "\.\."\) \}\);\r?\nconst BEAT_FACTS = (\{[^\n]*\});\r?\nconsole\.log\(\r?\n\s*\w+\(composeDirections\(\{ newsroom, filed, beat: BEAT_FACTS, textPerRegister \}\), \{\r?\n\s*beat: BEAT_FACTS,\r?\n\s*\}\),\r?\n\);\r?\nconsole\.log\(""\);\r?\n/;

// The loop every worked static beat opens with, over ALL THREE filed directions.
const LOOP_HEADER_RE =
  /for \(const file of readdirSync\(DIRECTIONS\)\.filter\(\(f\) => f\.endsWith\("\.md"\)\)\) \{\r?\n\s*const id = file\.replace\(\/\\\.md\$\/, ""\);\r?\n\s*const direction = resolveDirectionFamilies\(readDirection\(join\(DIRECTIONS, file\)\), textPerRegister\);\r?\n/;

const COMPOSED_DEFAULT_BLOCK = (beatFactsExpr) => `// ── ONE ART DIRECTION BY DEFAULT ─────────────────────────────────────────────
//
// The composer's best candidate for this beat's own PALETTE.md and this beat's own text — a
// production render draws ONE direction, not three. \`--filed\` renders every filed demo direction
// instead (a catalogue or demo proof, never a production render); \`--only <label>\` narrows to one
// of the directions that would otherwise render.
//
// Usage:  bun render-directions.mjs [--filed] [--only <label>]
const RUN_ARGS = process.argv.slice(2);
const FILED = RUN_ARGS.includes("--filed");
const ONLY_AT = RUN_ARGS.indexOf("--only");
const ONLY = ONLY_AT === -1 ? null : RUN_ARGS[ONLY_AT + 1];
if (ONLY_AT !== -1 && (!ONLY || ONLY.startsWith("--"))) throw new Error("--only takes a label");

// A composed direction's own \`id\` (e.g. "creme/creme/the newsroom" — colour/type/space) is not a filename;
// a filed direction's is already a plain slug (its own file basename) — labelOf makes both safe to use as
// this beat's own \`renders/<label>.png\`.
const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const all = filedDirections();
const newsroom = readPalette(HERE, { stopAt: join(HERE, "..") });
/** SCAFFOLD: how many ranked levels of evidence this beat's own claim distinguishes — the composer
 *  wants that many distinguishable voices. */
const BEAT_FACTS = ${beatFactsExpr};
let chosen;
if (FILED) {
  chosen = all.map((d) => ({ label: labelOf(d.id), direction: d }));
  console.log("every filed demo direction (--filed): a catalogue proof, not a production render");
} else {
  const composition = composeDirections({ newsroom, filed: all, beat: BEAT_FACTS, textPerRegister });
  if (!composition.offered.length) throw new Error(\`no composed direction holds up for this beat:\\n\${composeReport(composition, { beat: BEAT_FACTS })}\`);
  console.log(composeReport(composition, { beat: BEAT_FACTS }));
  chosen = composition.offered.slice(0, 1).map((d) => ({ label: labelOf(d.id), direction: d }));
}
if (ONLY !== null && !chosen.some((d) => d.label === ONLY)) throw new Error(\`--only takes one of \${chosen.map((d) => d.label).join(", ")}\`);
chosen = chosen.filter((d) => ONLY === null || d.label === ONLY);
console.log("");
`;

const LOOP_HEADER_REPLACEMENT = `for (const { label: id, direction: chosenDirection } of chosen) {
  const direction = resolveDirectionFamilies(chosenDirection, textPerRegister);
`;

/**
 * Rewrites a copied worked example's own "render all three filed directions" plumbing into the
 * composed-direction-default convention. Refuses, naming exactly what did not match, rather than
 * silently leaving the old loop (which would still work, but never actually composes) in place —
 * see this module's own header.
 */
export function composedDirectionDefault(content, { fromBeat }) {
  if (!DESIGN_BASE_IMPORTS_RE.test(content)) throw new Error(`${fromBeat}'s own runner does not import readDirection/composeDirections/resolveDirectionFamilies the way every other worked static beat does — the composed-direction rewrite cannot run. Adapt this beat by hand.`);
  if (!DIRECTIONS_CONST_RE.test(content)) throw new Error(`${fromBeat}'s own runner has no "const DIRECTIONS = join(HERE, …, \"docs\", \"design-base\", \"directions\")" line — the composed-direction rewrite cannot run. Adapt this beat by hand.`);
  const composeMatch = COMPOSE_BLOCK_RE.exec(content);
  if (!composeMatch) throw new Error(`${fromBeat}'s own runner does not carry the expected "const filed = readdirSync(DIRECTIONS)…" plumbing shape — the composed-direction rewrite cannot run. Adapt this beat by hand.`);
  if (!LOOP_HEADER_RE.test(content)) throw new Error(`${fromBeat}'s own runner does not open its render loop with "for (const file of readdirSync(DIRECTIONS)…)" — the composed-direction rewrite cannot run. Adapt this beat by hand.`);

  let out = content;
  out = out.replace(DESIGN_BASE_IMPORTS_RE, 'import { composeDirections, filedDirections, report as composeReport, resolveDirectionFamilies } from "#shared/design-base/index.mjs";\n');
  out = out.replace(DIRECTIONS_CONST_RE, "");
  out = out.replace(COMPOSE_BLOCK_RE, COMPOSED_DEFAULT_BLOCK(composeMatch[1]));
  out = out.replace(LOOP_HEADER_RE, LOOP_HEADER_REPLACEMENT);
  if (!/readdirSync\(/.test(out)) out = out.replace(/^import \{ readdirSync \} from "node:fs";\r?\n/m, "");
  return out;
}

/** A worked beat's own `// ── section ──` divider comments, re-labelled `SCAFFOLD:` wherever the
 *  label itself names subject-specific content. */
const DIVIDER_KEYWORDS = /read|station|assert|word|claim|subject|data|figure|title|prose|\balt\b|camera|bucket|bound|rank|bank|selection|geography/i;
export function markDividers(content) {
  return content.replace(/^(\/\/ ── )(.+?)( ─+)$/gm, (full, pre, label, tail) => (/scaffold/i.test(label) || !DIVIDER_KEYWORDS.test(label) ? full : `${pre}SCAFFOLD: ${label}${tail}`));
}

/** One banner, inserted before the first line an anchor matches; a no-op when the beat's own code
 *  carries no such line. */
export function markBefore(content, anchor, lines) {
  const m = anchor.exec(content);
  if (!m) return content;
  const indent = /^\s*/.exec(m[0])[0];
  const banner = `${lines.map((l) => `${indent}// ${l}`).join("\n")}\n`;
  return content.slice(0, m.index) + banner + content.slice(m.index);
}

export const topBanner = (fromBeat, extra = []) => [
  `SCAFFOLD: scaffolded --from ${fromBeat} — this file is that beat's own code, renamed for this one. The`,
  `header comment below, and every region marked SCAFFOLD:, describe ${fromBeat}'s own subject; rewrite them`,
  `for this beat's. Read ${fromBeat}/BRIEF.md alongside this code before changing anything.`,
  ...extra,
];
export const prependBanner = (content, lines) => `// ${lines.join("\n// ")}\n${content}`;
