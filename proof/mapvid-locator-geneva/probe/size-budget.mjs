// proof/mapvid-locator-geneva/probe/size-budget.mjs
//
// WHAT ROOM IS LEFT FOR THE MAP, AT EVERY FRAME THIS TOOLCHAIN EXPORTS?
//
// This beat refuses all three rows of the export table, and it is the WORST of the three map videos
// by the ledger's own reading: at the video table's 30 px landscape floor its words measured
// **1191 px against a 910 px band** — over the whole band before a pixel of map. Its headline is
// also the longest of the four beats owing a pin, 113 characters, which is why it is the one beat
// where the removal ladder's new title rung has something to bite on.
//
// Usage, from the repository root:  bun proof/mapvid-locator-geneva/probe/size-budget.mjs
//
// ── WHAT THIS INSTRUMENT IS ───────────────────────────────────────────────────────────────────
//
// It REPRODUCES `LocatorVideo.tsx`'s layout arithmetic at each candidate frame; it does not render
// it. The component lays baselines down from the top and up from the bottom and leaves the plate
// whatever is in the middle:
//
//     titleTop     = PAD + TITLE.fontSize            MAP_Y >= titleBottom + 16
//     axisCaption  = mapBottom + 40, axis + 26, tick labels + 12 + 24, conclusion + 44   (down)
//     sourceBottom = height - PAD, caveatBottom = sourceTop - SOURCE.fontSize - 12       (up)
//     conclusionBottom <= caveatTop - NOTE.fontSize - 14                (the component's own guard)
//
// The distance ruler under the map is NOT a rung: it carries the same 0-to-6 km scale the circle
// sweeps, one tick per organisation, and it is the only thing on the frame that shows the gap the
// claim is about. Nor is the caveat — on a map the caveat is the honesty line.
//
// THE WORDS ARE NOT RETYPED. They are read from the beat's own committed `render/video-props.json`,
// which `render.mjs` writes with every number derived from the live Wikidata answer it froze.
//
// IT IS CALIBRATED RATHER THAN TRUSTED. The last row is the beat's own shipped frame at its own
// tuning, where the reproduction must return the 660 px plate the component really draws.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { shortenTitle } from "#shared/chart-beat/type-at-size.mjs";
import { SIZES } from "#shared/chart-video/sizes.mjs";
import { lonSpanOf, mapStageBox } from "../../../skills/map-beat/scripts/stage.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BEAT = join(HERE, "..");
const FONT_FAMILY = "Helvetica, Arial, sans-serif";

const props = JSON.parse(await readFile(join(BEAT, "render/video-props.json"), "utf8"));
const geometry = JSON.parse(await readFile(join(BEAT, "plate/geometry.json"), "utf8"));

/** The shipped 1080-frame tokens over that frame's own 1.20 against the 900-wide convention. */
const R = 1080 / 900;
const B = {
  TITLE: { fontSize: 34 / R, fontWeight: 700, lead: 43 / R },
  SOURCE: { fontSize: 18 / R, fontWeight: 400, lead: 23 / R },
  CAPTION: { fontSize: 18 / R, fontWeight: 600 },
  NOTE: { fontSize: 17 / R, fontWeight: 400, lead: 22 / R },
  CONCLUSION: { fontSize: 26 / R, fontWeight: 700, lead: 33 / R },
};
const GAP = {
  TITLE_TO_MAP: 16 / R,
  MAP_TO_CAPTION: 40 / R,
  CAPTION_TO_AXIS: 26 / R,
  AXIS: 12 / R,
  AXIS_TO_LABELS: 24 / R,
  LABELS_TO_CONCLUSION: 44 / R,
  CONCLUSION_TO_CAVEAT: 14 / R,
  CAVEAT_TO_SOURCE: 12 / R,
};
/** The smallest token this beat draws (the axis tick), at the same base. */
const SMALLEST = 16 / R;

function wrap(text, max, font) {
  const out = [];
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, { ...font, fontFamily: FONT_FAMILY }) > max) {
      out.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...out, line] : out;
}

/**
 * THE SHORTER FORM OF THIS BEAT'S TITLE — this beat's own words, written by a person and offered to
 * R6, which decides whether it still makes the claim and whether it recovers a line.
 *
 * The long form: "All 11 of these international organisations sit inside 4.4 km of central Geneva
 * — and a 6 km search finds no more."
 *
 * Kept, because each is part of what the sentence asserts: the count (11), what that count counts
 * (international organisations), both distances with their unit (4.4 km, 6 km), the place (central
 * Geneva), the universal (all) and the negation the second half turns on (no more). What goes is
 * "of these" and the aside's "and" — three words of grammar, no fact.
 *
 * THE EM DASH IS KEPT ON PURPOSE, and it was measured rather than assumed. A semicolon is one
 * character shorter and wraps identically (2 lines at landscape, 5 at square); a comma-and is three
 * characters longer and costs the line back (3 at landscape). The dash is the punctuation the
 * journalist wrote and the one that holds the sentence's beat before its second half, so where the
 * measurement is a tie the sentence keeps what it had.
 */
const SHORT_TITLE =
  "All 11 international organisations sit within 4.4 km of central Geneva — a 6 km search finds no more.";

const CANDIDATES = {
  ...SIZES,
  /**
   * Landscape at the LOWEST type scale that still clears its own 30 px floor, rather than at the
   * table's default of 2.5. `typeScaleFor` never returns it — the table's default is a floor of its
   * own — but it is the most generous reading of landscape that is still legible, and carrying it
   * means the verdict below does not rest on agreeing with one number in the table. The same arm
   * `proof/vidz-diverging-bar-eu-per-capita/probe/size-budget.mjs` carries, for the same reason.
   */
  "landscape, floor tuning": { ...SIZES.landscape, typeScale: 0 },
  "CALIBRATION — as shipped": {
    width: 1080,
    height: 1350,
    typeScale: R,
    minTypePx: 12,
    stage: null,
    pad: 72,
    shippedPlateHeight: 660,
  },
};

/** The ladder, in `type-at-size.mjs`'s order. The caveat and the ruler are not on it — see above. */
const LADDER = [
  { name: "keep everything", title: "long", conclusion: true, caveat: "full" },
  { name: "R6 (title shortened)", title: "short", conclusion: true, caveat: "full" },
  { name: "R6+R7 (no conclusion line)", title: "short", conclusion: false, caveat: "full" },
  {
    name: "R6+R7+R3 (caveat's last sentence)",
    title: "short",
    conclusion: false,
    caveat: "clipped",
  },
  {
    /**
     * NOT AVAILABLE, and measured anyway. On a map the caveat is the honesty line, so this arm is
     * never a frame the beat may ship at — it is here so the refusal above does not rest on it. If
     * spending the disclosure bought a frame, that would be a decision for a person; it does not.
     */
    name: "R6+R7+ caveat GONE (not available)",
    title: "short",
    conclusion: false,
    caveat: "none",
  },
];

const lonSpan = lonSpanOf(geometry);
const rows = [];
for (const [name, row] of Object.entries(CANDIDATES)) {
  const { width, height, typeScale, minTypePx, stage } = row;
  const scale = Math.max(typeScale, minTypePx / SMALLEST);
  const sp = (v) => Math.round(v * scale);
  const f = (t) => ({
    fontSize: sp(t.fontSize),
    fontWeight: t.fontWeight,
    ...(t.lead === undefined ? {} : { lead: sp(t.lead) }),
  });
  const T = Object.fromEntries(Object.entries(B).map(([k, v]) => [k, f(v)]));
  const g = Object.fromEntries(Object.entries(GAP).map(([k, v]) => [k, sp(v)]));
  const PAD = row.pad ?? Math.max(Math.round((40 / 900) * width), minTypePx * 2);
  const measure = width - PAD * 2;
  const top = stage ? stage.top : PAD;
  const bottom = stage ? stage.bottom : height - PAD;

  const linesOf = (text) => wrap(text, measure, T.TITLE).length;
  const r6 = shortenTitle({
    long: props.title,
    short: SHORT_TITLE,
    linesOf,
    what: `mapvid-locator-geneva at ${name}`,
  });

  for (const rung of LADDER) {
    const title = rung.title === "short" && r6.fires ? r6.title : props.title;
    const caveat =
      rung.caveat === "none"
        ? ""
        : rung.caveat === "clipped"
          ? props.caveat.slice(0, props.caveat.lastIndexOf(". ") + 1)
          : props.caveat;
    const titleLines = wrap(title, measure, T.TITLE).length;
    const titleBottom = top + T.TITLE.fontSize + (titleLines - 1) * T.TITLE.lead;

    const sourceLines = wrap(`${props.source} · ${props.basemapCredit}`, measure, T.SOURCE).length;
    const sourceTop = bottom - (sourceLines - 1) * T.SOURCE.lead;
    const caveatBottom = sourceTop - T.SOURCE.fontSize - g.CAVEAT_TO_SOURCE;
    const caveatLines = caveat ? wrap(caveat, measure, T.NOTE).length : 0;
    const caveatTop = caveat ? caveatBottom - (caveatLines - 1) * T.NOTE.lead : caveatBottom + T.NOTE.fontSize;

    const conclusionLines = rung.conclusion
      ? wrap(props.conclusion, measure, T.CONCLUSION).length
      : 0;
    const conclusionBottom = caveatTop - T.NOTE.fontSize - g.CONCLUSION_TO_CAVEAT;
    const conclusionTop = conclusionBottom - Math.max(conclusionLines - 1, 0) * T.CONCLUSION.lead;
    const rulerTop =
      conclusionTop -
      g.LABELS_TO_CONCLUSION -
      g.AXIS_TO_LABELS -
      g.AXIS -
      g.CAPTION_TO_AXIS -
      g.MAP_TO_CAPTION;
    const plateTop = titleBottom + g.TITLE_TO_MAP;
    const availableHeight = rulerTop - plateTop;

    let box = null;
    if (availableHeight > 0)
      box = mapStageBox({
        availableWidth: measure,
        availableHeight,
        plateFrame: geometry.frame,
        studyLonSpanDeg: lonSpan,
      });
    rows.push({
      name,
      rung: rung.name,
      scale,
      width,
      titleLines,
      caveatLines,
      availableHeight: Math.round(availableHeight),
      box,
      shippedPlateHeight: row.shippedPlateHeight ?? null,
      r6,
    });
  }
}

const shown = new Set();
for (const r of rows) {
  if (!shown.has(r.name)) {
    shown.add(r.name);
    console.log("");
    console.log(
      r.r6.fires
        ? `  R6 at ${r.name}: FIRED — title ${r.r6.linesBefore} lines -> ${r.r6.linesAfter}, ${r.r6.long.length} characters -> ${r.r6.short.length}`
        : `  R6 at ${r.name}: DECLINED — ${r.r6.reason.split("\n")[0]}`,
    );
  }
  const box = r.box;
  console.log(
    `${r.name.padEnd(26)} ${r.rung.padEnd(33)} scale ${r.scale.toFixed(2)}  ` +
      `title ${r.titleLines}L  caveat ${r.caveatLines}L  plate room ` +
      `${String(r.availableHeight).padStart(5)}px  ` +
      (box
        ? `map ${box.width}x${box.height} (${((box.width / r.width) * 100).toFixed(0)}% of the frame's width)`
        : `NO ROOM — the words alone overrun the band by ${-r.availableHeight}px`) +
      (r.shippedPlateHeight
        ? `  | the component really draws ${r.shippedPlateHeight}px here`
        : ""),
  );
}

console.log(
  `\nThe caveat is never a rung on a map: it is the honesty line — here, that the empty outer ring ` +
    `is the source's own query result and not a missing layer, and that two markers are nudged ` +
    `apart so no point may be read as a surveyed position. A frame that only fits by dropping it ` +
    `is not a frame this beat ships at.`,
);
