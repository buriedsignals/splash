// skills/scrolly/scripts/depth-independent.mjs
//
// Every worked example under proof/scrolly-*/ sits exactly two levels below the Splash root
// (proof/<beat>/) and its own code counts that depth by hand: `join(HERE, "..", "..", "docs", …)` for the
// filed directions, and `"../../skills/scrolly/scripts/…"` for the shared runner/live-map machinery. That is
// correct where the worked example itself lives, and silently wrong once the SAME code is copied into a
// story beat, which sits four levels down (stories/<story>/beats/<id>/) — the defect a cold run had to
// improvise past by hand (`.superpowers/sdd/2026-09-16-scrolly-any-subject/cold-run-5-friction.md`).
//
// These functions transform the IN-MEMORY COPY the scaffold (`scaffold-scrolly-beat.mjs`,
// `scaffold-scrolly-map-beat.mjs`) is about to write elsewhere — never a proof/scrolly-* beat on disk, which
// stays exactly as validated.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readPalette } from "#shared/chart-beat/colour.mjs";

// ── path depth ───────────────────────────────────────────────────────────────────────────────────

// A package.json import alias into skills/ (`#skills/*`) was tried first and reverted:
// `skills/splash/test/no-cross-skill-imports.test.ts` explicitly forbids any import-map alias landing inside
// `skills/` — the same rule that keeps every skill directory copy-pasteable on its own. So the shared
// runner/live-map machinery is reached the way the already-fixed worked example
// (proof/scrolly-choropleth-europe-nuclear) and the map scaffold's own `.tmpl` already reach
// `render-scrolly.mjs`/`live-map-cards-bake.mjs`: a DYNAMIC import built from `join(ROOT, "skills", "scrolly",
// "scripts", "…")`, resolved at runtime after `splashRoot()` walks up — never a literal specifier a static
// scanner (or a copy-pasted skill) could see leaving its own tree.

const HERE_DECL = /^const HERE = dirname\(fileURLToPath\(import\.meta\.url\)\);$/m;
const OLD_DIRECTIONS = /const DIRECTIONS = join\(HERE(?:, "\.\.")+, "docs", "design-base", "directions"\);/;
// A whole static import statement (single- or multi-line) reaching into skills/scrolly/scripts/ by counting
// `../` — captures the imported names and the path from "skills/" onward.
const SKILLS_STATIC_IMPORT = /import \{([^{}]*)\}\s*from\s*"(?:\.\.\/)+((?:skills\/scrolly\/scripts\/[A-Za-z0-9._-]+))";\n?/g;
const FS_IMPORT = /^import \{([^}]*)\} from "node:fs";$/m;

const SPLASH_ROOT_FN = [
  '/** The Splash repo root — the nearest ancestor whose package.json declares the "#shared/*" import — found by',
  " *  walking up rather than counting levels, so this runner works unchanged from proof/<beat>/ or a story's own",
  " *  stories/<slug>/beats/<id>/. */",
  "function splashRoot(startDir) {",
  "  const looked = [];",
  "  for (let dir = startDir; ; ) {",
  "    looked.push(dir);",
  '    const manifest = join(dir, "package.json");',
  "    if (existsSync(manifest)) {",
  "      try {",
  '        if (JSON.parse(readFileSync(manifest, "utf8"))?.imports?.["#shared/*"]) return dir;',
  "      } catch {",
  "        // an unparsable package.json is not this function's business — keep walking",
  "      }",
  "    }",
  "    const parent = dirname(dir);",
  '    if (parent === dir) throw new Error(`no Splash root above ${startDir} — looked in:\\n  ${looked.join("\\n  ")}`);',
  "    dir = parent;",
  "  }",
  "}",
].join("\n");

/** `A, B` from a captured multi-line import clause, collapsed to one line. */
function collapseNames(names) {
  return names
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .join(", ");
}

/** `join(ROOT, "skills", "scrolly", "scripts", "X.mjs")` from a captured `skills/scrolly/scripts/X.mjs`. */
function joinFromRoot(pathFromRoot) {
  return `join(ROOT, ${pathFromRoot
    .split("/")
    .map((p) => JSON.stringify(p))
    .join(", ")})`;
}

function insertAfterLastImport(content, block) {
  const importRe = /^import .*;$/gm;
  let last = null;
  let m;
  while ((m = importRe.exec(content))) last = m;
  if (!last) return `${block}\n${content}`;
  const at = last.index + last[0].length;
  return `${content.slice(0, at)}\n${block}${content.slice(at)}`;
}

/**
 * Rewrites two depth-counted patterns into depth-independent ones:
 *   1. `const DIRECTIONS = join(HERE, "..", "..", …, "docs", "design-base", "directions")` — replaced with
 *      `join(ROOT, "docs", …)`.
 *   2. `import { A, B } from "../../skills/scrolly/scripts/X.mjs"` (any depth) — lifted out of the static
 *      import block and replaced with `const { A, B } = await import(join(ROOT, "skills", "scrolly", "scripts",
 *      "X.mjs"))`, placed right after `ROOT` is resolved.
 * Both anchor on the same `splashRoot()` walk-up — inserted once, right after the file's own `HERE` constant
 * when one already exists (every runner), or built from scratch after the last import when it does not (a
 * `.tsx` component, which has no `HERE` of its own yet). A no-op on content carrying neither pattern (a driver
 * or plan file with no such import and no DIRECTIONS constant).
 */
export function depthIndependentPaths(content) {
  const dynamicImports = [];
  let out = content.replace(SKILLS_STATIC_IMPORT, (_m, names, pathFromRoot) => {
    dynamicImports.push(`const { ${collapseNames(names)} } = await import(${joinFromRoot(pathFromRoot)});`);
    return "";
  });
  const needsRoot = dynamicImports.length > 0 || OLD_DIRECTIONS.test(out);
  if (needsRoot && !/function splashRoot\(/.test(out)) {
    if (HERE_DECL.test(out)) {
      out = out.replace(HERE_DECL, (m) => `${m}\n\n${SPLASH_ROOT_FN}\n\nconst ROOT = splashRoot(HERE);${dynamicImports.length ? `\n${dynamicImports.join("\n")}` : ""}`);
      out = out.replace(FS_IMPORT, (_m, names) => {
        const set = new Set(names.split(",").map((s) => s.trim()).filter(Boolean));
        set.add("existsSync");
        set.add("readFileSync");
        return `import { ${[...set].sort().join(", ")} } from "node:fs";`;
      });
    } else {
      const preamble = [
        'import { existsSync, readFileSync } from "node:fs";',
        'import { dirname, join } from "node:path";',
        'import { fileURLToPath } from "node:url";',
        "",
        "const HERE = dirname(fileURLToPath(import.meta.url));",
        "",
        SPLASH_ROOT_FN,
        "",
        "const ROOT = splashRoot(HERE);",
        ...dynamicImports,
      ].join("\n");
      out = insertAfterLastImport(out, `${preamble}\n`);
    }
  } else if (dynamicImports.length) {
    // splashRoot() already present (a second call on already-rewritten content) — anchor the dynamic imports
    // right after the existing `const ROOT = …` line instead of inserting the walk-up again.
    out = out.replace(/^const ROOT = splashRoot\(HERE\);$/m, (m) => `${m}\n${dynamicImports.join("\n")}`);
  }
  out = out.replace(OLD_DIRECTIONS, 'const DIRECTIONS = join(ROOT, "docs", "design-base", "directions");');
  return out;
}

// ── language ─────────────────────────────────────────────────────────────────────────────────────

const LOCALE_OF = { fr: "fr-FR", en: "en-GB", de: "de-DE", it: "it-IT" };
// `EXPR.toFixed(N).replace(".", ",")` — a decimal comma hardcoded regardless of the beat's own declared
// language (the defect: a beat scaffolded for another language still prints French decimals).
const HARD_FRENCH_DECIMAL = /([A-Za-z0-9_.()*+\-\s]+?)\.toFixed\((\d)\)\.replace\("\.",\s*","\)/g;
const LANG_LITERAL = /lang: "[a-z]{2}"/;

function formatterBlock(lang, { typed }) {
  const locale = LOCALE_OF[lang];
  if (!locale) throw new Error(`languageAwareNumbers: no Intl locale recorded for language ${JSON.stringify(lang)}`);
  const sig = typed ? `function ${lang}(value: number, decimals = 1): string {` : `function ${lang}(value, decimals = 1) {`;
  return `
/** SCAFFOLD: ${lang} number formatting, defaulted from NEWSROOM.md's own declared language — one call, so a
 *  beat scaffolded for another language never keeps a hardcoded decimal separator. */
${sig}
  return new Intl.NumberFormat("${locale}", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}
`;
}

/**
 * Replaces every hardcoded `X.toFixed(N).replace(".", ",")` with a call to a locally-defined, honestly-named
 * `fr`/`en`/`de`/`it` formatter (the shape `skills/splash/test/number-format-honest.test.ts` holds every such
 * formatter to: delegates to `Intl.NumberFormat`, and the name never lies about the locale it formats in) —
 * and lines up a bare `lang: "xx"` literal (the page's own declared language) to match. `typed` emits a
 * TypeScript signature for a `.tsx` file; a plain one for a `.mjs` driver, which has no type stripping. A
 * no-op on content carrying neither pattern.
 */
export function languageAwareNumbers(content, lang, { typed = false } = {}) {
  let out = content;
  if (HARD_FRENCH_DECIMAL.test(out)) {
    HARD_FRENCH_DECIMAL.lastIndex = 0;
    out = out.replace(HARD_FRENCH_DECIMAL, (_m, expr, decimals) => `${lang}(${expr.trim()}, ${decimals})`);
    if (!new RegExp(`function ${lang}\\(`).test(out)) out = insertAfterLastImport(out, formatterBlock(lang, { typed }));
  }
  if (LANG_LITERAL.test(out)) out = out.replace(LANG_LITERAL, `lang: "${lang}"`);
  return out;
}

// ── NEWSROOM.md's own declared language, read the way PALETTE.md's origin is recorded ──────────────

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

/** `{ name, brandColor, ground, languages }` off the Splash root's own NEWSROOM.md, or `null` when it does not
 *  exist yet (preflight's own concern, not this one). */
export function readNewsroomBasics(root) {
  const path = join(root, "NEWSROOM.md");
  if (!existsSync(path)) return null;
  const record = parseFrontmatter(readFileSync(path, "utf8"));
  return { name: record.name, brandColor: record.brandColor, ground: record.ground, languages: record.languages ?? record.language };
}

/** The newsroom's own primary language (the first of `languages`/`language`), defaulting to "en" when
 *  NEWSROOM.md carries neither field or does not exist yet. */
export function defaultLanguage(root) {
  const basics = readNewsroomBasics(root);
  const first = basics?.languages?.split(",")[0]?.trim();
  return first || "en";
}

// ── PALETTE.md — refuse at scaffold time, not deep inside the render ───────────────────────────────

/**
 * The exact, runnable refusal a scaffold gives when no PALETTE.md is reachable — named the way
 * `skills/palette/SKILL.md` insists a beat's colours are decided (a journalist's answer, never scaffolded
 * silently: "There is no write path in this skill, not a commented-out one, not a flag"). Carries a real
 * `bun -e` command built from this NEWSROOM.md's own recorded house colours when one exists, so the proposal
 * it prints is this run's own, not a generic example.
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

/** Whether `readPalette` (walked from `beatDir` to the filesystem root) would find one — a plain existence +
 *  parse probe, so a malformed PALETTE.md is reported by the same throw a render would give, not masked here. */
export function paletteReachable(beatDir) {
  try {
    readPalette(beatDir);
    return true;
  } catch {
    return false;
  }
}

// ── the data assets a worked example's own reader assumes beside it ────────────────────────────────

const LOCAL_READ = /(?:readFileSync|readFile)\(join\(HERE,\s*"([^"]+)"\)/g;

/**
 * Every literal filename an adapted runner/plan reads with `readFileSync(join(HERE, "…"))` /
 * `readFile(join(HERE, "…"))` — the data assets a worked example's own code assumes sit beside it (`data.csv`,
 * `shapes.geojson`, a type's own differently-named CSV) — excluding the plumbing files the scaffold itself is
 * about to write (`exclude`) and the two files `analyst` already leaves beside a story beat.
 */
export function requiredLocalAssets(sources, exclude) {
  const excluded = new Set([...exclude, "data.json", "DATA-NOTES.md"]);
  const found = new Set();
  for (const text of sources) {
    LOCAL_READ.lastIndex = 0;
    for (const m of text.matchAll(LOCAL_READ)) if (!excluded.has(m[1])) found.add(m[1]);
  }
  return [...found].sort();
}

/** The refusal for a scaffold that would otherwise copy a reader assuming files never written beside it — one
 *  line per missing asset, saying whether the worked example's own copy of it looks reusable verbatim (a
 *  geometry file, sitting in `fromBeat` too) or must be this beat's own (the same name exists there only
 *  because it is `fromBeat`'s own frozen data, not because the file travels). */
export function missingAssetsMessage({ relBeatDir, fromBeat, sourceDir, missing }) {
  const lines = missing.map((name) => {
    const inSource = existsSync(join(sourceDir, name));
    const hint =
      /\.geojson$/.test(name) && inSource
        ? `likely reusable verbatim if this subject shares its map window — copy ${fromBeat}/${name}, or provide this beat's own`
        : `this beat's own frozen data — freeze it as ${relBeatDir}/${name} before scaffolding (the task's own instruction to copy it beside the beat)`;
    return `  - ${name}: ${hint}`;
  });
  return [`${relBeatDir} is missing the data ${fromBeat}'s own render-directions-scrolly.mjs assumes sits beside it:`, lines.join("\n"), `Place these beside the beat, then scaffold again.`].join("\n\n");
}
