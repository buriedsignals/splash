// A RIGHT-TO-LEFT RUN THE RASTERISER WILL LAY OUT LEFT TO RIGHT — ROUND-FIVE FINDING X3.
//
// MEASURED, not assumed, on 2026-08-21 while running `stress-x-tunisian-water`. resvg runs Arabic
// joining and the Unicode bidi algorithm inside each run on its own — a frozen Arabic string comes
// out joined and in reading order with no help at all. What it does NOT do is resolve the PARAGRAPH
// level: it treats every `<text>` as left-to-right and IGNORES SVG's own `direction` attribute and
// `unicode-bidi`. Three renders of one string — with `direction="rtl"`, with
// `unicode-bidi: bidi-override`, and with neither — produced identical ink.
//
// The consequence a reader sees is punctuation on the wrong side: a sentence ending in an ASCII full
// stop has that stop drawn at the visual RIGHT of the line, so the line reads `.الجدول` — the full
// stop at the START of the sentence. `stress-x`'s own frozen article says a previous attempt was
// rejected by the desk for exactly that class of defect.
//
// WHAT resvg DOES HONOUR is the Unicode explicit formatting CHARACTERS, because they are characters
// and not attributes. Measured on the same run: U+202B/U+202C (RLE/PDF), U+2067/U+2069 (RLI/PDI),
// U+2068/U+2069 (FSI/PDI) and a TRAILING U+200F all place the stop correctly; the bare string and a
// LEADING U+200F do not.
//
// SO THIS IS A RASTERISER LIMITATION WITH A KNOWN REMEDY, and the whole point of the rule is that
// the toolchain now SAYS SO instead of shipping silently-wrong punctuation. Before it,
// `grep -rniE '\brtl\b|unicode-bidi|right-to-left|bidi' skills shared` returned two hits, both
// inside a bundled third-party map library: no direction switch, no anchor flip, no axis-side rule
// anywhere. Every beat in every right-to-left story had to rediscover this by rendering, zooming in
// and reading the punctuation — which is what `stress-x`'s own component did, in a local helper its
// header says has nowhere to live.
//
// IT DOES NOT ASK FOR `direction="rtl"`, and that is deliberate: the attribute is exactly what this
// rasteriser ignores, so requiring it would be a rule that certifies the defect.
//
// SCOPE, stated. It reads the `.svg` files a BEAT produced — what the component actually drew. The
// copies under a story's `export/` are `detect-delivered-text.mjs`'s territory, and a delivery is a
// copy of what is checked here.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative, sep } from "node:path";

/** The capabilities this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["rtlRunsAreIsolated"];

/** A letter from a right-to-left script: Hebrew, Arabic, Syriac, Thaana, Arabic Supplement and the
 *  two Arabic presentation-form blocks. Not a property escape, so the set is readable as the set it
 *  is — and it is the same range `stress-x-tunisian-water`'s own component wrote by hand. */
const RTL_LETTER =
  /[֐-׿؀-ۿ܀-ݏݐ-ݿࢠ-ࣿיִ-﷿ﹰ-﻿]/;

/** The explicit formatting characters resvg honours, measured. An ISOLATE (U+2067 RLI / U+2068 FSI,
 *  popped by U+2069 PDI) is preferred over an EMBEDDING (U+202B RLE, popped by U+202C PDF) because
 *  an isolate cannot change the direction of anything drawn after it — but both work, and a rule
 *  that refused the one that works would be a rule about taste. A TRAILING U+200F (RLM) works too
 *  and a LEADING one does not, which is why the mark is only accepted at the end. */
const OPENS_RTL = /[⁧⁨‫‮]/;
const POPS_RTL = /[⁩‬]/;
const TRAILING_MARK = "‏";

/** Every `.svg` under a beat directory, sorted, ignoring dot-directories and `node_modules`. */
function svgsUnder(beatDir) {
  const found = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith(".") || name === "node_modules") continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.svg$/i.test(name)) found.push(path);
    }
  };
  walk(beatDir);
  return found;
}

/** The text runs an SVG actually draws — what sits between tags, with comments, `<script>`,
 *  `<style>` and `<desc>`/`<title>` removed. A `<desc>` is spoken by a screen reader, which does its
 *  own bidi, and is not laid out by this rasteriser at all. Entities are decoded, because a beat is
 *  free to write `&#1575;` and a reader still receives the letter. */
function drawnRuns(path) {
  const stripped = readFileSync(path, "utf8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|desc|title)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  return [...stripped.matchAll(/>([^<>]+)</g)]
    .map((match) =>
      match[1]
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&amp;/g, "&"),
    )
    .filter((run) => run.trim() !== "");
}

/** Whether one drawn run carries its own paragraph direction. */
function carriesItsDirection(run) {
  const text = run.trim();
  if (text.endsWith(TRAILING_MARK)) return true;
  return OPENS_RTL.test(text[0] ?? "") && POPS_RTL.test(text[text.length - 1] ?? "");
}

/**
 * WHETHER EVERY RIGHT-TO-LEFT RUN THIS BEAT DRAWS CARRIES ITS OWN DIRECTION.
 *
 * Returns `{ applies: false }` when the question does not arise — the beat drew no SVG, or nothing
 * it drew carries a right-to-left letter, which is every beat in this tree except the Arabic one.
 * When it does arise, each drawn run holding an RTL letter must open with an explicit isolate or
 * embedding and close with its pop, or end with U+200F. A run that does not is named with the file
 * it was drawn in.
 *
 * REPORTING, NEVER REPAIR. It does not wrap anything and it has no opinion about which of the three
 * working forms a component should use. Nor does it read the pixels: what it decides is that the
 * component asked for a direction in the one way this rasteriser honours, which is the difference
 * between a beat that got it right and a beat that got it right by accident.
 */
export function rtlRunsAreIsolated(beatDir) {
  const files = svgsUnder(beatDir);
  if (files.length === 0) return { applies: false, reason: "this beat drew no .svg" };

  const hits = [];
  let rtlRuns = 0;
  for (const file of files) {
    for (const run of drawnRuns(file)) {
      if (!RTL_LETTER.test(run)) continue;
      rtlRuns += 1;
      if (carriesItsDirection(run)) continue;
      hits.push(
        `${basename(file)}: the run ${JSON.stringify(run.trim())} carries right-to-left letters and no explicit direction — resvg ignores SVG's own direction attribute and lays the paragraph out left to right, so sentence-final punctuation is drawn at the wrong end of the line. Wrap the run in U+2067/U+2069 (isolate), U+202B/U+202C (embedding), or end it with U+200F`,
      );
    }
  }
  if (rtlRuns === 0)
    return { applies: false, reason: "nothing this beat drew carries a right-to-left letter" };
  return { applies: true, files: files.map((file) => basename(file)), rtlRuns, clean: hits.length === 0, hits };
}

/** Every beat directory whose own committed runner calls the named skill. A runner CALLS a skill
 *  when its source names that skill's `scripts/` directory or its vendored `#shared/` copy — the
 *  same pair `example-runners.mjs` reads, and the pair a rename of either would break together. */
export function beatsCalling(root, skill) {
  const found = new Set();
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.mjs$/.test(name)) {
        const source = readFileSync(path, "utf8");
        if (source.includes(`shared/${skill}/`) || source.includes(`skills/${skill}/scripts`)) found.add(dir);
      }
    }
  };
  for (const top of ["stories", "proof"]) walk(join(root, top));
  return [...found].map((dir) => relative(root, dir).split(sep).join("/")).sort();
}
