// proof/mapvid-dot-population/probe/size-budget.mjs
//
// WHAT ROOM IS LEFT FOR THE MAP, AT EVERY FRAME THIS TOOLCHAIN EXPORTS?
//
// This beat refuses all three rows of the export table. It is the LEAST word-heavy of the three map
// videos — the ledger measured its words at 729 px of a 910 px band, against the hex grid's 879 and
// the locator's 1191 — and its headline is the shortest of the four beats owing a pin, 56
// characters. It is therefore the case that decides whether the words are really the constraint: if
// a beat whose title already fits on one line still refuses, the title was never the whole answer.
//
// Usage, from the repository root:  bun proof/mapvid-dot-population/probe/size-budget.mjs
//
// ── WHAT THIS INSTRUMENT IS ───────────────────────────────────────────────────────────────────
//
// It REPRODUCES `DotDensityVideo.tsx`'s layout arithmetic at each candidate frame; it does not
// render it:
//
//     titleTop     = PAD + TITLE.fontSize            MAP_Y >= titleBottom + 16
//     dotKey       = mapBottom + 38, meter + 12 + 30 + 19, readout + 22, conclusion + 40   (down)
//     sourceBottom = height - PAD, caveatBottom = sourceTop - SOURCE.fontSize - 12         (up)
//     conclusionBottom <= caveatTop - NOTE.fontSize - 14                (the component's own guard)
//
// The dot key and the meter are not rungs. The key states what one dot is worth — without it the
// field is a texture rather than a count — and the meter is the beat's own answer to its claim,
// because time on screen is deliberately not population.
//
// THE WORDS ARE NOT RETYPED. They are read from the beat's own committed `render/video-props.json`.
//
// IT IS CALIBRATED RATHER THAN TRUSTED. The last row is the beat's own shipped frame at its own
// tuning, where the reproduction must return the 827 px plate the component really draws.

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
  DOT_KEY: { fontSize: 17 / R, fontWeight: 700 },
  NOTE: { fontSize: 17 / R, fontWeight: 400, lead: 22 / R },
  CONCLUSION: { fontSize: 26 / R, fontWeight: 700, lead: 33 / R },
};
const GAP = {
  TITLE_TO_MAP: 16 / R,
  MAP_TO_KEY: 38 / R,
  KEY_TO_METER: 12 / R,
  METER: 30 / R,
  METER_TO_LABEL: 19 / R,
  LABEL_TO_READOUT: 22 / R,
  READOUT_TO_CONCLUSION: 40 / R,
  CONCLUSION_TO_CAVEAT: 14 / R,
  CAVEAT_TO_SOURCE: 12 / R,
};
/** The smallest token this beat draws (the meter label), at the same base. */
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
 * THE SHORTER FORM OF THIS BEAT'S TITLE — this beat's own words, offered to R6.
 *
 * The long form: "Half of this map's people live in 5 of its 42 countries."
 *
 * There is almost nothing here that is not a fact: the quantity (half), what it counts (this map's
 * people), the count (5) and the field (its 42 countries). What goes is one preposition — English
 * takes "half the people" as readily as "half of the people" — and at landscape that one word is
 * worth a whole line, because the long form overruns the measure by 10 px.
 */
const SHORT_TITLE = "Half this map's people live in 5 of its 42 countries.";

const CANDIDATES = {
  ...SIZES,
  /**
   * Landscape at the LOWEST type scale that still clears its own 30 px floor, rather than at the
   * table's default of 2.5 — the most generous legible reading of landscape, carried so the verdict
   * does not rest on agreeing with one number in the table.
   */
  "landscape, floor tuning": { ...SIZES.landscape, typeScale: 0 },
  "CALIBRATION — as shipped": {
    width: 1080,
    height: 1440,
    typeScale: R,
    minTypePx: 12,
    stage: null,
    pad: 72,
    shippedPlateHeight: 827,
  },
};

/** The ladder, in `type-at-size.mjs`'s order. The caveat, the key and the meter are not on it. */
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
    what: `mapvid-dot-population at ${name}`,
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
    const keyTop =
      conclusionTop -
      g.READOUT_TO_CONCLUSION -
      g.LABEL_TO_READOUT -
      g.METER_TO_LABEL -
      g.METER -
      g.KEY_TO_METER -
      g.MAP_TO_KEY;
    const plateTop = titleBottom + g.TITLE_TO_MAP;
    const availableHeight = keyTop - plateTop;

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
  `\nThe caveat is never a rung on a map: it is the honesty line — here, that a dot's position ` +
    `inside its country is random, that time on screen is not population, and that Russia and seven ` +
    `micro-territories are excluded. A frame that only fits by dropping it is not a frame this beat ` +
    `ships at.`,
);
