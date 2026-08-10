// proof/mapvid-hexgrid-quakes/probe/size-budget.mjs
//
// WHAT ROOM IS LEFT FOR THE MAP, AT EVERY FRAME THIS TOOLCHAIN EXPORTS?
//
// This beat refuses all three rows of the export table, and the ledger records the cause in one
// line: at the video table's 30 px landscape floor **the beat's WORDS fill the band**. That is a
// measurement rather than an opinion, and this file is where it is made — and re-made after
// R6, the removal ladder's new title rung, has been applied to this beat's own headline.
//
// Usage, from the repository root:  bun proof/mapvid-hexgrid-quakes/probe/size-budget.mjs
//
// ── WHAT THIS INSTRUMENT IS ───────────────────────────────────────────────────────────────────
//
// It REPRODUCES `HexGridVideo.tsx`'s layout arithmetic at each candidate frame; it does not render
// it. That arithmetic is a chain of baselines from both edges of the frame toward the middle, and
// the quantity nobody has written down is what is left in the MIDDLE:
//
//     titleTop      = PAD + TITLE.fontSize                       (down from the top)
//     titleBottom   = titleTop + (lines - 1) * TITLE.lead
//     MAP_Y        >= titleBottom + 16
//                     … the plate …
//     legendCaption = mapBottom + 36, swatch + 14, labels + 22 + 18, conclusion + 42  (down)
//     sourceBottom  = height - PAD                               (up from the bottom)
//     caveatBottom  = sourceTop - SOURCE.fontSize - 12
//     conclusionBottom <= caveatTop - NOTE.fontSize - 14         (the component's own guard)
//
// Everything below the plate is fixed by the frame once the strings are wrapped, so the plate's
// available height falls out of the chain. `mapStageBox` then answers what box the plate's own
// geography can take inside it — a map is never given more stage than its geography can fill, and
// the plate's aspect IS the shape that geography takes.
//
// THE WORDS ARE NOT RETYPED. They are read from the beat's own committed `render/video-props.json`,
// which `render.mjs` writes with every number in them derived from the frozen catalogue. A probe
// that retyped a headline would go stale the first time the data was refreshed, silently.
//
// THE TOKENS ARE RE-BASED, not invented. The component is tuned at its own 1080-wide frame; every
// craft skill's `typeScale` is a multiplier over a 900-wide convention, so each token is divided by
// 1080/900 = 1.2 before the table's scale is applied. The same re-basing
// `proof/vidz-diverging-bar-eu-per-capita/probe/size-budget.mjs` does, for the same reason.
//
// IT IS CALIBRATED RATHER THAN TRUSTED. The last row is the beat's own shipped frame at its own
// tuning, where the reproduction must return the plate height the component really draws — 540 px.
// The run prints the difference, so the reader can see how far the model is from the picture before
// believing anything above it.

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
  TICK: { fontSize: 16 / R, fontWeight: 400 },
  NOTE: { fontSize: 17 / R, fontWeight: 400, lead: 22 / R },
  CONCLUSION: { fontSize: 26 / R, fontWeight: 700, lead: 33 / R },
};
/** The component's own spacing literals, at the same base. Every one is a gap between words. */
const GAP = {
  TITLE_TO_MAP: 16 / R,
  MAP_TO_CAPTION: 36 / R,
  CAPTION_TO_SWATCH: 14 / R,
  SWATCH: 22 / R,
  SWATCH_TO_TICKS: 18 / R,
  TICKS_TO_CONCLUSION: 42 / R,
  CONCLUSION_TO_CAVEAT: 14 / R,
  CAVEAT_TO_SOURCE: 12 / R,
};
/** The smallest token this beat draws, at the same base — what `typeScaleFor` reads. */
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
 * R6, which decides whether it still makes the claim and whether it recovers a line at all.
 *
 * What the long form asserts, and what this keeps: the SUBJECT (the Ring of Fire, and the densest
 * cell on the plate), the QUANTITIES (360 of 2024's 366 days), and the CLAIM's own qualifier (it is
 * *not* *one* bad day). What goes is the copula and one preposition — "is not" becomes the colon's
 * job, "days out of" becomes "of … days".
 */
const SHORT_TITLE =
  "Not one bad day: the Ring of Fire's densest cell shook on 360 of 2024's 366 days.";

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
    height: 1080,
    typeScale: R,
    minTypePx: 12,
    stage: null,
    pad: 70,
    /** What the component really draws, so the reproduction can be checked against the picture. */
    shippedPlateHeight: 540,
  },
};

/**
 * The ladder, in `type-at-size.mjs`'s order, with R6 in its place. **The caveat is not on it.** On a
 * map the caveat is the honesty line — what the projection leaves out, what the count is not — and a
 * frame that only fits by dropping it is worse than a frame that does not fit. R3 takes its last
 * sentence, which is the disclosure of what is off-frame, and even that is offered here only so the
 * reader can see what it would buy.
 */
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
    what: `mapvid-hexgrid-quakes at ${name}`,
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
    // The legend is the KEY to the encoding, so it is never a rung: a shaded map with no scale
    // states nothing. Its caption baseline, swatches and class labels are reserved whole.
    const legendTop =
      conclusionTop -
      g.TICKS_TO_CONCLUSION -
      g.SWATCH_TO_TICKS -
      g.SWATCH -
      g.CAPTION_TO_SWATCH -
      g.MAP_TO_CAPTION;
    const plateTop = titleBottom + g.TITLE_TO_MAP;
    const availableHeight = legendTop - plateTop;
    const availableWidth = measure;

    let box = null;
    if (availableHeight > 0)
      box = mapStageBox({
        availableWidth,
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
    if (!r.r6.fires) console.log(`  R6 at ${r.name}: DECLINED — ${r.r6.reason.split("\n")[0]}`);
    else
      console.log(
        `  R6 at ${r.name}: FIRED — title ${r.r6.linesBefore} lines -> ${r.r6.linesAfter}`,
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
  `\nThe caveat is never a rung on a map: it is the honesty line — what is off-frame, and that a ` +
    `count is not an energy. A frame that only fits by dropping it is not a frame this beat ships at.`,
);
