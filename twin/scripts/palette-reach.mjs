// twin/scripts/palette-reach.mjs
//
// HOW FAR THE RECORDED PALETTE ACTUALLY REACHES, counted rather than claimed.
//
// `twin-palette/SKILL.md` states a reach; `AUDIT-W2-palette-credits.md` measured it and found the
// stated number and the real one had drifted twice (16 of 70 written where 20 of 75 was true — the
// denominator moved when new beats landed the same day). So the number is produced by a script and
// re-run, rather than typed into a document and left there.
//
// TWO numbers, because they answer two different questions and collapsing them is how a headline
// gets to be optimistic:
//
//   reached — the beat calls `readPalette`, so its colours are the recorded answer and change when
//             that answer changes. This is the owner's question ("make the palette changeable").
//   clean   — the beat additionally names NO other hex of its own, beyond the two contrast poles
//             and the values its own PALETTE.md records. A beat can be `reached` and not `clean`:
//             every map bakes its plate with the basemap's own water and land paint, and the flow
//             beats hold a territory cycle in `geo-flow.ts`. Whether each of those is a colour
//             somebody should be able to change is a judgement, so it is REPORTED rather than
//             scored — `--beats` prints every one.
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

/**
 * Comments stripped, so a paragraph explaining why a hex is no longer there does not read as one.
 *
 * LINE COMMENTS GO FIRST, and the order is the whole point. Doing block comments first — which is
 * what every other stripper in this tree does — means a `/*` written INSIDE a `//` line swallows
 * everything up to the next `*​/`, which can be hundreds of lines away. Measured on 2026-08-10: six
 * chart-video beats carry the header sentence "not the `#shared/​*` alias", that `/​*` opened a
 * phantom block, and the region it ate contained their `readPalette(` call — so six correctly
 * migrated beats measured as NOT reached. The same blind spot hides hex literals, so the error runs
 * in both directions and the headline number could have been optimistic just as easily.
 *
 * `(^|[^:])` keeps `https://` from reading as a comment.
 */
function stripComments(source) {
  return source
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * EVERY hex literal, and then a stated exemption — rather than a pattern of "colour-looking
 * identifiers", which is what this held until 2026-08-10 and which was measured wrong in four beats
 * in one genre. `const COLOURS = {…}` never matched `[A-Z_]*COLOUR` (the identifier ends in `S`
 * before the `[:=]`); the object's own keys (`increase`, `male`, `y2000`, `nuclear`) were not in any
 * allow-list; and `NOMINAL_ACCENT` never matched `\bACCENT` because `_A` is not a word boundary.
 * Four beats therefore reported "reached" while still drawing in hexes no newsroom could reach —
 * the error running in the direction that HIDES the problem, which is the one direction a number
 * somebody steers by must not run in.
 *
 * So the scan is now total, and the exemptions are named:
 *
 *   - the two CONTRAST POLES. `#000000` and `#FFFFFF` are physics — WCAG's own endpoints, what
 *     `deriveFurniture` escalates to, and what a mask's keep/erase stops mean. Nobody chooses them.
 *   - a hex the beat's OWN `PALETTE.md` records. A runner may legitimately name the value it also
 *     records — in a comment explaining a migration, in a test fixture, in an assertion — and a
 *     value that is in the recorded answer is by definition reachable.
 *   - a Remotion `Root.tsx` placeholder block (see `PLACEHOLDER_MARKER`).
 *
 * Everything else is REPORTED, and reporting is the honest verb: this cannot tell a basemap's own
 * water paint from a data colour somebody typed. `--beats` prints each one so the judgement is made
 * by a person looking at it, not by a regex pretending to know intent.
 */
const ANY_HEX = /"(#[0-9A-Fa-f]{3,8})"/g;
const POLES = new Set(["#000", "#fff", "#000000", "#ffffff"]);

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
  const record = join(dir, "PALETTE.md");
  const recorded = new Set(
    existsSync(record)
      ? [...readFileSync(record, "utf8").matchAll(/#[0-9A-Fa-f]{3,8}/g)].map((m) =>
          m[0].toLowerCase(),
        )
      : [],
  );
  let readsPalette = false;
  const named = [];
  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const source = stripComments(raw);
    if (/\breadPalette\s*\(/.test(source)) readsPalette = true;
    if (file.endsWith("Root.tsx") && PLACEHOLDER_MARKER.test(raw)) continue;
    for (const match of source.matchAll(ANY_HEX)) {
      const hex = match[1].toLowerCase();
      if (POLES.has(hex) || recorded.has(hex)) continue;
      named.push(`${file.slice(dir.length + 1)}: ${match[1]}`);
    }
  }
  return {
    readsPalette,
    hasRecord: existsSync(record),
    named,
    reached: readsPalette || files.length === 0,
    clean: named.length === 0,
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
      `${row.reached ? "reached" : "   ----"} ${row.clean ? "clean" : "     "}  ${row.genre.padEnd(12)}  ${row.beat}` +
        (row.named.length ? `\n           ${row.named.join("\n           ")}` : ""),
    );
  }
}

const genres = [...new Set(rows.map((r) => r.genre))].sort();
console.log("\ngenre                reached    clean  total");
for (const genre of genres) {
  const inGenre = rows.filter((r) => r.genre === genre);
  console.log(
    `${genre.padEnd(20)} ${String(inGenre.filter((r) => r.reached).length).padStart(7)}  ` +
      `${String(inGenre.filter((r) => r.clean).length).padStart(7)}  ${String(inGenre.length).padStart(5)}`,
  );
}
console.log(
  `${"ALL".padEnd(20)} ${String(rows.filter((r) => r.reached).length).padStart(7)}  ` +
    `${String(rows.filter((r) => r.clean).length).padStart(7)}  ${String(rows.length).padStart(5)}`,
);
