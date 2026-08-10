// twin/scripts/palette-reach.mjs
//
// HOW FAR THE RECORDED PALETTE ACTUALLY REACHES, counted rather than claimed.
//
// `twin-palette/SKILL.md` states a reach; `AUDIT-W2-palette-credits.md` measured it and found the
// stated number and the real one had drifted twice (16 of 70 written where 20 of 75 was true — the
// denominator moved when new beats landed the same day). So the number is produced by a script and
// re-run, rather than typed into a document and left there.
//
// A beat COUNTS as reached when it names no hex in a colour position of its own AND calls
// `readPalette`. Naming no colour at all also counts — a beat that delegates its colours to
// another file has nothing to migrate.
//
//   bun scripts/palette-reach.mjs            per-genre table
//   bun scripts/palette-reach.mjs --beats    every beat, one per line, with what it still names

import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const TWIN = join(import.meta.dirname, "..");
const SOURCE = /\.(mjs|tsx|ts)$/;

/** The genre a beat belongs to, read off its own folder name — the same prefixes the tree uses. */
export function genreOf(beat) {
  if (/^mapscrolly-/.test(beat)) return "map scrolly";
  if (/^(scrolly-)/.test(beat)) return "scrolly";
  if (/^mapmore-scrolly/.test(beat)) return "map scrolly";
  if (/^(map|mapgen-|mapmore-|mapvid-)/.test(beat)) return "map";
  if (/^(vid|video-)/.test(beat)) return "chart video";
  if (/^web/.test(beat)) return "chart web";
  if (/^(static-|more-)/.test(beat)) return "chart static";
  return "other";
}

function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // A beat's own renders and drives are outputs, not source.
      if (["render", "drive", "out", "plate", "frames"].includes(entry.name)) continue;
      sourceFiles(path, out);
    } else if (SOURCE.test(entry.name)) out.push(path);
  }
  return out;
}

/** Comments stripped, so a paragraph explaining why a hex is no longer there does not read as one. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");
}

/** A hex sitting in a colour position this project would otherwise have recorded. */
const COLOUR_POSITION =
  /\b(ground|accent|GROUND|ACCENT|barColor|BAR_COLOUR|[A-Z_]*COLOUR|[A-Z_]*COLOR|fill|stroke)\s*[:=]\s*"(#[0-9A-Fa-f]{3,8})"/g;

/**
 * A Remotion `Root.tsx` registers a composition so the studio can LIST it, and every real render
 * is driven by the beat's own runner, which passes the props it computed. Those default props are
 * labelled placeholders in the file itself — round numbers, `"Placeholder"` strings — and their
 * colours never reach a frame. Counting them would report a defect that is not one.
 *
 * The exemption is CONDITIONAL and the condition is in the file: the marker below is the sentence
 * every one of them carries. A `Root.tsx` that stopped being a placeholder would lose the marker
 * and be counted again. Stated blind spot: a file that keeps the sentence while feeding a real
 * render would slip through, and nothing here can see that.
 */
const PLACEHOLDER_MARKER = /Placeholder — render through|A placeholder so `remotion compositions`/;

export function measureBeat(dir) {
  const files = sourceFiles(dir);
  let readsPalette = false;
  const named = [];
  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const source = stripComments(raw);
    if (/\breadPalette\s*\(/.test(source)) readsPalette = true;
    if (file.endsWith("Root.tsx") && PLACEHOLDER_MARKER.test(raw)) continue;
    for (const match of source.matchAll(COLOUR_POSITION)) {
      named.push(`${file.slice(dir.length + 1)}: ${match[1]} = ${match[2]}`);
    }
  }
  return {
    readsPalette,
    hasRecord: existsSync(join(dir, "PALETTE.md")),
    named,
    reached: named.length === 0 && (readsPalette || files.length === 0),
  };
}

const proof = join(TWIN, "proof");
const beats = readdirSync(proof)
  .filter((name) => statSync(join(proof, name)).isDirectory())
  .filter((name) => existsSync(join(proof, name, "BRIEF.md")))
  .sort();

const rows = beats.map((beat) => ({
  beat,
  genre: genreOf(beat),
  ...measureBeat(join(proof, beat)),
}));

if (process.argv.includes("--beats")) {
  for (const row of rows) {
    console.log(
      `${row.reached ? "reached" : "   ----"}  ${row.genre.padEnd(12)}  ${row.beat}` +
        (row.named.length ? `\n           ${row.named.join("\n           ")}` : ""),
    );
  }
}

const genres = [...new Set(rows.map((r) => r.genre))].sort();
console.log("\nbeat                 reached  total");
for (const genre of genres) {
  const inGenre = rows.filter((r) => r.genre === genre);
  console.log(
    `${genre.padEnd(20)} ${String(inGenre.filter((r) => r.reached).length).padStart(7)}  ${String(inGenre.length).padStart(5)}`,
  );
}
console.log(
  `${"ALL".padEnd(20)} ${String(rows.filter((r) => r.reached).length).padStart(7)}  ${String(rows.length).padStart(5)}`,
);
