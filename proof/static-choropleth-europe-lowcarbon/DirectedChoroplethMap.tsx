/**
 * Europe's low-carbon electricity share in 2024, forty countries, drawn THROUGH the design base. The
 * first `map` component in this tree, and the last of the harvest's families to get one.
 *
 * `three-classes-of-place-three-treatments` (SCMP, ProPublica) — administrative area, settlement and
 * water take three treatments, and a reader separates them without a legend. No direction in this
 * base files a `place` row — all three were measured on pieces that are not maps — so the three are
 * DERIVED from registers the directions did file, the way `hairline` is derived from `rule`.
 *
 * `the-basemap-gives-up-its-contrast` (La Nación, ProPublica; Toxmap at the other pole) — the land
 * that carries no value, the coastlines and the borders are all small steps off the ground, so the
 * ramp is the only thing on the plate with any weight.
 *
 * `water-is-a-tint-not-a-grey` (Toxmap, SCMP) — the one hue on a directed plate that is not a step
 * of the direction's accent, admissible because nothing here is measured in blue.
 *
 * `the-ramp-is-monotone-in-lightness` and `a-sequential-grid-is-one-hue-cluster` (from the heatmap's
 * harvest) — the same ramp construction, between the direction's own poles.
 *
 * `the-scale-is-stepped-not-continuous` and `the-key-prints-its-breaks-in-the-data-s-units` — five
 * classes, every break printed in %, each set in the fill of the class it opens.
 *
 * `a-missing-cell-is-drawn-as-missing` (ONS, Datawrapper) — Ukraine has a shape and no 2024 data.
 * It is drawn in a neutral outside the ramp and NAMED, because a country left in the lowest class
 * would be a country reported as clean.
 *
 * AND EVERY ONE OF THOSE MARKS IS NOW A LAYER, NOT A PATH. The classes, the borders, the leaders,
 * the ringed subject and the placed words are declared in the beat's PLAN and drawn by MapLibre
 * inside the plate, at exactly the size this component draws the image at. What is left in the SVG
 * is the image and everything OUTSIDE the map rectangle: the key, the headline, the standfirst, the
 * reading line, the source line and the callout's sentence. The rules above still govern all of it
 * — they moved into `layersFor` in the runner, which spends this file's own constructions rather
 * than inventing a second set.
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix } from "#shared/chart-beat/colour.mjs";
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Shape = {
  iso: string;
  name: string;
  /** Rings already projected into the plate's own pixel space by the render script. */
  rings: Array<Array<[number, number]>>;
  /** The largest ring's centre and its drawn width, for placing a label inside the country. */
  anchor: { x: number; y: number; width: number; height: number } | null;
  value: number | null;
  /** Whether the beat's own source is SUPPOSED to report this country. A shape with no value is one
   *  of two different things and they must not be drawn alike: a country the source should report
   *  and does not (Ukraine, whose 2024 row is blank), or a neighbour that is only in the frame
   *  because the camera reaches it (Morocco, Syria). The first is an absence the plate names; the
   *  second is context. */
  inStudySet: boolean;
};
/** A sea carries its own forms, longest first — `Mer Méditerranée`, `Méditerranée`, `Médit.` — the
 *  same ladder every other register in this base spends. A camera is a width, and how much sea a
 *  label has to sit in changes with it. */
export type Water = { forms: string[]; x: number; y: number };
/** The sentence in the panel and the country it is about. The RING that marks that country is a
 *  layer in the plate now, placed from the shape's own anchor, so the callout no longer carries a
 *  position of its own. */
export type Callout = {
  iso: string;
  lines: string[];
};

/** The measuring helpers the LADDER and the DRAWING both spend, at module scope because both now
 *  need them and neither owns them. Nothing here closes over a render: they are pure functions of a
 *  string and a register. */
const set = (text: string, r: { transform: string }) =>
  applyCase(text, r.transform);
const sizeOf = (r: {
  fontSize: number;
  fontWeight: number;
  fontFamily: string;
}) => ({
  fontSize: r.fontSize,
  fontWeight: r.fontWeight,
  fontFamily: r.fontFamily,
});
const widthOf = (text: string, r: any) =>
  measureText(text, sizeOf(r)) +
  Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
const BAND_PROBE = "Hxpg1,";
const bandOf = (r: any) => measureTextBand(BAND_PROBE, sizeOf(r));
/** A register, resolved against the direction and given the ink its own row names. */
const registerOf = (direction: any, name: RegisterName) => {
  const { ink, muted } = deriveFurniture(direction.ground);
  const r = resolveRegister(direction, name);
  return {
    ...r,
    fill: ({ ink, muted, accent: direction.accent } as Record<string, string>)[
      r.ink
    ],
  };
};

/** THE DRAWN SIZE IS A LAYOUT OUTPUT, AND IT HAS EXACTLY ONE DEFINITION. The runner needs it before
 *  it can bake a plate at the right size; the component needs it to draw. Computing it twice is how
 *  the two drifted apart in the first place, so neither computes it: both call this.
 *
 *  Nothing in the ladder's logic changed when it moved here — the rungs, their order and their
 *  arithmetic are the ones the beat has always walked, and the three renders came out byte-identical
 *  across the move. What the chosen rung yields beyond the panel width (the layout it produced, the
 *  bands and the leads the drawing measures against) is RETURNED rather than recomputed below, for
 *  the same reason the drawn size is. */
export function mapGeometryFor({
  aspect,
  callout,
  title,
  limits,
  reading,
  source,
  direction,
}: {
  aspect: number;
  callout: Callout;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  direction: any;
}) {
  const { width, height } = FRAME;
  const PAD = direction.pad;
  const display = registerOf(direction, "display");
  const eyebrowReg = registerOf(direction, "eyebrow");
  const body = registerOf(direction, "body");
  const axis = registerOf(direction, "axis");
  const annot = registerOf(direction, "annot");
  const axisBand = bandOf(axis);
  const annotBand = bandOf(annot);

  /** WRAPPING IS MEMOISED BY TEXT, WIDTH AND REGISTER. Every rung of the ladder re-wraps all five
   *  blocks of the panel, and the source and the callout are byte-identical at every rung — the
   *  same paragraph was being broken twenty-six times, and each break measures every growing prefix
   *  through a rasteriser that scans the system fonts on the ones it has not seen. The answer is a
   *  pure function of its three inputs, so it is computed once. */
  const wrapCache = new Map<string, string[]>();
  function wrap(text: string, maxWidth: number, r: any): string[] {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${r.letterSpacing}|${maxWidth}|${text}`;
    const hit = wrapCache.get(key);
    if (hit) return hit;
    const lines: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        lines.push(current);
        current = word;
      } else current = trial;
    }
    if (current) lines.push(current);
    wrapCache.set(key, lines);
    return lines;
  }

  // ── the layout: TWO COLUMNS, because the map is the subject ───────────────
  //
  // THE FIRST VERSION PUT THE HEADER ABOVE THE MAP, the way every chart in this base does, and that
  // is the wrong shape for this form. A chart's plot can be any aspect the frame gives it; a map's
  // is fixed by the ground it shows. Europe in an equal-area projection is 1.39:1, so filling the
  // width of a 960px plate would need 616px of height — more than the whole plate is tall. Stacked,
  // the map is bound by whatever height the header leaves, and it came out 306 x 220 on a page where
  // two thirds of the width sat empty.
  //
  // So the text goes BESIDE the map, which is what both ProPublica map records do — a large map with
  // its own panel — and the map takes the full height of the plate. Same page, same registers, and
  // 2.4x the map.
  const titleLead = display.fontSize * 1.22;
  const bodyLead = body.fontSize * 1.45;
  const annotLead = annot.fontSize * 1.4;
  const keyRoom = axisBand.ascent * 2 + axisBand.descent + 14;

  /** The panel is a SHARE of the plate rather than a fixed width, so a direction with a larger body
   *  register gets a proportionally wider column instead of a narrower map — and the share itself is
   *  a rung, spent LAST. The order is the plate's own priority, stated: cut the reading line, then
   *  the standfirst, then the headline, and only when there is nothing left to cut does the panel
   *  take width from the map. `nocturne` sets its body register in Futura and overran the foot by
   *  35px at every copy rung; it takes a wider column rather than a smaller Europe. */
  /** The narrowest panel comes FIRST, because the biggest map is what the beat wants: at 26 % the
   *  camera fills the plate's whole height and there is no slack above or below it, which is the
   *  point of putting the text beside it. Wider shares are the ladder's last rungs, spent only when
   *  the copy will not fit. */
  const SHARES = [0.26, 0.29, 0.33, 0.37, 0.41, 0.45];
  const GUTTER = 26;
  const panelFor = (share: number) => Math.round((width - PAD * 2) * share);

  /** THE PANEL IS A STACK, AND EVERY BLOCK IN IT IS MEASURED. The first version placed the callout
   *  relative to the reading line's top and let it grow upward — and when the ladder dropped the
   *  reading line, the callout grew straight through the key. A block whose position is derived from
   *  a block that may not exist is a block that will one day be drawn on top of something. */
  const layoutFor = (panel: number, t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), panel, display);
    const limitLines = wrap(set(limits[l], body), panel, body);
    const calloutLines = callout.lines.flatMap((c) =>
      wrap(set(c, annot), panel, annot),
    );
    const readingLines =
      r < 0 ? [] : wrap(set(reading[r], annot), panel, annot);
    const sourceLines = wrap(set(source, body), panel, body);

    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + body.fontSize * 0.8;
    const calloutTop =
      limitsTop +
      limitLines.length * bodyLead +
      annot.fontSize * 0.7 +
      annotBand.ascent;
    const keyTop =
      calloutTop +
      calloutLines.length * annotLead +
      axisBand.ascent * 0.8 +
      axisBand.ascent;
    const readingTop =
      keyTop + keyRoom + annot.fontSize * 1.0 + annotBand.ascent;
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const footTop =
      readingTop + Math.max(0, readingLines.length - 1) * annotLead;
    return {
      titleLines,
      limitLines,
      calloutLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      calloutTop,
      keyTop,
      readingTop,
      sourceTop,
      /** What the panel has left over the plate's own foot. */
      spare: sourceTop - bodyLead * 0.9 - footTop,
    };
  };

  /** THE LADDER NOW ANSWERS A DIFFERENT QUESTION. Stacked, it asked how much height was left for the
   *  map; beside, the map's height is fixed and the ladder asks whether the PANEL's copy fits the
   *  column it has. The rungs and their order are unchanged — reading line first, then the
   *  standfirst, then the headline — because that is the order a desk cuts in whatever the shape of
   *  the page. */
  const rungs: Array<{
    share: number;
    title: number;
    limit: number;
    reading: number;
  }> = [];
  for (const share of SHARES)
    for (let t = 0; t < title.length; t++)
      for (let l = 0; l < limits.length; l++) {
        for (let r = 0; r < reading.length; r++)
          rungs.push({ share, title: t, limit: l, reading: r });
        rungs.push({ share, title: t, limit: l, reading: -1 });
      }
  /** THE LADDER IS WALKED LAZILY, AND THAT IS NOT A MICRO-OPTIMISATION. Building every rung's
   *  layout eagerly and then taking the first that fits computed 144 of them to use one — and each
   *  layout wraps five blocks of copy, each wrap measures every growing prefix, and every prefix
   *  the upstream cache has not seen instantiates a rasteriser that scans the system fonts. The
   *  render took three minutes, of which 176 seconds were SYSTEM time: the shape of the number said
   *  syscalls, not arithmetic, and three guesses that ignored it were all wrong. Stop at the first
   *  rung that fits; compute the rest only to report the shortfall. */
  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
  } | null = null;
  for (const rung of rungs) {
    const layout = layoutFor(
      panelFor(rung.share),
      rung.title,
      rung.limit,
      rung.reading,
    );
    if (layout.spare >= 0) {
      fits = { rung, layout };
      break;
    }
  }
  if (!fits) {
    const best = rungs
      .map((rung) => ({
        rung,
        layout: layoutFor(
          panelFor(rung.share),
          rung.title,
          rung.limit,
          rung.reading,
        ),
      }))
      .reduce((a, b) => (b.layout.spare > a.layout.spare ? b : a));
    throw new Error(
      `the panel's copy does not fit its column in this direction: the shortest rung at the widest ` +
        `panel still overruns the foot by ${(-best.layout.spare).toFixed(0)}px. Give the beat ` +
        `shorter forms — do not shrink the map, which is the subject.`,
    );
  }
  const layout = fits.layout;
  const panel = panelFor(fits.rung.share);
  const mapBox = {
    x: PAD + panel + GUTTER,
    y: PAD,
    width: width - PAD * 2 - panel - GUTTER,
    height: height - PAD * 2,
  };
  /** ONE SCALE FOR BOTH AXES, AND THE BOX IS FILLED — the map covers its whole box and the surplus
   *  is CROPPED, rather than the map being letterboxed inside it.
   *
   *  Fitting the camera inside the box (`min`) never distorts, and it left 42px of empty plate above
   *  and below whenever the box was narrower than the camera: Rémy read that as the map not taking
   *  the space it should. `max` fills both dimensions at one scale, so the map is still not
   *  stretched — the frame simply shows less ground on one axis. The crop is anchored WEST, because
   *  the ground it gives up is the far east of Russia and the ground it must not give up is Iceland,
   *  which is one of the seven the headline is about. */
  const fill = Math.max(mapBox.width, mapBox.height * aspect);
  const mapW = fill;
  const mapH = fill / aspect;
  const mapX = mapBox.x;
  const mapY = mapBox.y + (mapBox.height - mapH) / 2;
  return {
    rung: fits.rung,
    layout,
    panel,
    mapBox,
    mapX,
    mapY,
    mapW,
    mapH,
    axisBand,
    annotBand,
    titleLead,
    bodyLead,
    annotLead,
  };
}

/** THE THREE TREATMENTS A MAP SETS ITS WORDS IN, DERIVED ONCE. `area` is the axis register
 *  uppercased and tracked; `feature` is that at weight 700, because the countries the headline is
 *  about should be the first thing read on the plate rather than the last thing that technically
 *  passes; `water` is the axis size in italic, untracked.
 *
 *  ONE DEFINITION, because the SEARCH measures a word's box in these registers and the PLAN declares
 *  the layer that draws it in them. Two copies is how a plate ends up placing a word it then sets in
 *  a different cut. */
export function mapRegistersFor(direction: any) {
  const axis = registerOf(direction, "axis");
  const area = {
    ...axis,
    letterSpacing: Math.max(Number(axis.letterSpacing ?? 0), 0.8),
  };
  return {
    axis,
    area,
    feature: { ...area, fontWeight: 700 },
    water: { ...axis, fontStyle: "italic", letterSpacing: 0, transform: "none" },
  };
}

const inRing = (ring: Array<[number, number]>, x: number, y: number) => {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      hit = !hit;
  }
  return hit;
};

export type Placed = {
  iso: string;
  text: string;
  x: number;
  y: number;
  /** Where the leader starts — the country's own anchor — or `null` for a name that fits inside its
   *  shape and needs no leader. */
  from: { x: number; y: number } | null;
  onCell: string;
  klass: "feature" | "area";
};

/**
 * WHERE THE WORDS ACTUALLY GO — the one definition, and the reason it is not inside the component
 * any more.
 *
 * The picture never put a country's name at its declared anchor. The anchor is where the SEARCH
 * STARTS: the name goes inside the shape when the whole word fits inside it, and otherwise in the
 * nearest open water on a leader, which is how six of the seven names are drawn. A plan built from
 * the anchors would put every name somewhere the picture never put it, and nothing would notice,
 * because an anchor is a perfectly valid coordinate.
 *
 * ONE DEFINITION, ONE CALLER — and that is the honest shape of it now. The component used to run
 * this search and draw the result; the words are LAYERS now, so the runner runs it, converts each
 * position to degrees and hands it to the plan. What must never happen is a second copy of the
 * search living beside the first, which is the defect this whole sub-project exists to remove; a
 * renderer of another genre calls THIS.
 *
 * Everything below is the component's own machine, moved whole: the visible-crop bound, the
 * scanline land grid, `fitsAt`, the sea ladder with its gap and its leash, and the outward-leaning
 * spiral. Not one rule changed in the move.
 */
export function placementsFor({
  shapes,
  geometry,
  aspect,
  direction,
  named,
  context,
  waters,
  cellUnder,
  waterTint,
  namesWater,
  onNote,
}: {
  shapes: Shape[];
  geometry: ReturnType<typeof mapGeometryFor>;
  aspect: number;
  direction: any;
  named: string[];
  context: string[];
  waters: Water[];
  /** The colour a word lands on, given the value of the area under it — the class fill, or the
   *  missing fill. The ink and the halo are both measured against it. */
  cellUnder: (value: number | null) => string;
  /** The sea the plate is actually baked in: what a name pushed out of its country lands on. */
  waterTint: string;
  namesWater: boolean;
  onNote?: (note: string) => void;
}) {
  const { mapBox, mapX, mapY, mapW, axisBand } = geometry;
  const { area, feature, water: waterReg } = mapRegistersFor(direction);
  const byIso = new Map(shapes.map((s) => [s.iso, s]));

  /** What of the unit box actually survives the crop — the bound every label placement is held to,
   *  so nothing is placed on ground the frame does not show. */
  const visible = {
    x1: mapBox.width / mapW,
    y0: (mapBox.y - mapY) / mapW,
    y1: (mapBox.y + mapBox.height - mapY) / mapW,
  };

  /** IS THERE LAND HERE? — answered by a GRID FILLED ONCE, not by walking the coastlines.
   *
   *  The label searches run hundreds of thousands of probes, and the first version answered each one
   *  by testing the point against every ring on the plate: about 1 500 rings, 9 000 vertices, per
   *  probe. That is hundreds of millions of comparisons, and a render that should take seconds took
   *  three minutes. Two guesses at the cause were wrong — the ring bounding boxes helped a little,
   *  and memoising the text widths helped not at all, because `measureText` was already memoised
   *  upstream. Measuring beat guessing, twice over.
   *
   *  What it is now is the classic scanline fill: for each row of a grid over the camera, collect
   *  where every edge crosses that row, sort the crossings, and fill the spans between them. The
   *  cost is rows x edges once — a couple of million steps — and every probe afterwards is one
   *  array lookup. The grid is fine enough that a cell is well under a pixel of the drawn map, so
   *  no label can be placed on land the grid rounded away. */
  const GRID_W = 900;
  const GRID_H = Math.ceil(GRID_W / aspect);
  const land = new Uint8Array(GRID_W * GRID_H);
  {
    const rows: number[][] = Array.from({ length: GRID_H }, () => []);
    for (const sh of shapes)
      for (const ring of sh.rings)
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [xi, yi] = ring[i];
          const [xj, yj] = ring[j];
          if (yi === yj) continue;
          const y0 = Math.min(yi, yj);
          const y1 = Math.max(yi, yj);
          const r0 = Math.max(0, Math.ceil(y0 * GRID_W - 0.5));
          const r1 = Math.min(GRID_H - 1, Math.floor(y1 * GRID_W - 0.5));
          for (let r = r0; r <= r1; r++) {
            const y = (r + 0.5) / GRID_W;
            if (y < y0 || y >= y1) continue;
            rows[r].push(xi + ((y - yi) / (yj - yi)) * (xj - xi));
          }
        }
    for (let r = 0; r < GRID_H; r++) {
      const xs = rows[r].sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil(xs[k] * GRID_W - 0.5));
        const c1 = Math.min(GRID_W - 1, Math.floor(xs[k + 1] * GRID_W - 0.5));
        for (let c = c0; c <= c1; c++) land[r * GRID_W + c] = 1;
      }
    }
  }
  const onLand = (x: number, y: number) => {
    const c = Math.round(x * GRID_W - 0.5);
    const r = Math.round(y * GRID_W - 0.5);
    if (c < 0 || c >= GRID_W || r < 0 || r >= GRID_H) return false;
    return land[r * GRID_W + c] === 1;
  };

  /** A WORD IS MEASURED ONCE. `measureText` loads and walks a face; calling it inside the probe
   *  loop measured the same string tens of thousands of times, and a render that should take
   *  seconds took three minutes. Widths are memoised by string and register. */
  const widthCache = new Map<string, number>();
  const widthOnce = (text: string, r: any) => {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${r.letterSpacing}|${text}`;
    let w = widthCache.get(key);
    if (w === undefined) {
      w = widthOf(text, r);
      widthCache.set(key, w);
    }
    return w;
  };

  /** THE LABEL'S FOOTPRINT, NOT ITS BASELINE. Sampling only the centre line put `Balt.` in a strait
   *  whose water was narrower than the word is tall: the contrast guard then measured it at 1.80:1
   *  on Sweden's own fill. A word occupies a box, so the box is what gets tested — eleven columns by
   *  three rows of it, in the map's own units. */
  const fitsAt = (text: string, x: number, y: number, r: any = waterReg) => {
    const half = widthOnce(set(text, r), r) / 2 / mapW;
    const up = axisBand.ascent / mapW;
    const down = axisBand.descent / mapW;
    /** AND INSIDE THE FRAME, which this test did not ask until the camera moved onto the MapTiler
     *  plate. `visible` was already computed and already enforced — on the COUNTRY names, a few
     *  hundred lines below. The sea names never met it, so nothing went red while `Mer Méditerranée`
     *  had its baseline under the bottom edge and printed as half a word. A guard that holds one
     *  class of mark and not the other is the shape most defects here take. */
    if (x - half < 0.004 || x + half > visible.x1 - 0.004) return false;
    if (y - up < visible.y0 + 0.004 || y + down > visible.y1 - 0.004)
      return false;
    /** ELEVEN COLUMNS, NOT FIVE. `ISLANDE` is wider than Iceland, and with five sample columns the
     *  island slipped between two of them: every probe was open water and the drawn word still had
     *  its first letters on the coast. A sample grid coarser than the smallest thing it has to find
     *  will one day fail to find it. */
    for (let i = 0; i <= 10; i++) {
      const dx = -half + (i / 10) * half * 2;
      for (const dy of [-up, (down - up) / 2, down])
        if (onLand(x + dx, y + dy)) return false;
    }
    return true;
  };

  /** THE LABEL GOES TO THE NEAREST OPEN WATER, NOT TO THE DECLARED CENTRE. `Balt.` at the Baltic's
   *  own middle still put its left end inside Sweden — at 58° N the sea is narrower than the word.
   *  The declared position is a fact about where the sea is; where its NAME fits is a measurement,
   *  and the two are not the same point. So the beat declares the centre and the plate searches
   *  outward from it in a ring-by-ring spiral, taking the first position whose whole label clears
   *  every drawn coast. Nudging the declared number until the guard went quiet would have hidden
   *  exactly this. */
  const boxOf = (text: string, x: number, y: number) => {
    const half = widthOnce(set(text, waterReg), waterReg) / 2;
    return {
      x0: x * mapW - half,
      x1: x * mapW + half,
      y0: y * mapW - axisBand.ascent,
      y1: y * mapW + axisBand.descent,
    };
  };
  /** SEA NAMES KEEP A REAL GAP FROM EACH OTHER, and the gap is part of the SEARCH rather than a
   *  check run after it. Placed independently and only then tested for overlap at a 2px tolerance,
   *  `Mer du N.` and `Balt.` came out two pixels apart and read as one word: the overlap guard was
   *  satisfied and the plate was not. A label that has to move because it is in the wrong place has
   *  to move somewhere that is right on both counts at once. */
  const WATER_GAP = 10;
  const clearOf = (box: any, taken: any[]) =>
    taken.every(
      (t) =>
        box.x1 + WATER_GAP < t.x0 ||
        t.x1 + WATER_GAP < box.x0 ||
        box.y1 + WATER_GAP < t.y0 ||
        t.y1 + WATER_GAP < box.y0,
    );
  const placeIn = (text: string, w: Water, taken: any[]) => {
    const ok = (x: number, y: number) =>
      fitsAt(text, x, y) && clearOf(boxOf(text, x, y), taken);
    if (ok(w.x, w.y)) return { x: w.x, y: w.y };
    /** The search reaches as far as the label is long, rather than a fixed distance: a sea is
     *  usually wider somewhere else, and how much further "somewhere else" is scales with the word,
     *  not with a constant somebody once typed. */
    const step = Math.max(
      0.008,
      widthOnce(set(text, waterReg), waterReg) / mapW / 3,
    );
    /** AND THE SEARCH HAS A LEASH. Ten rings of a step that scales with the word is more than half
     *  the frame for a long name: `Mer Baltique` walked out of the Baltic, across Denmark and into
     *  the North Sea, where it sat two lines above `Mer du Nord` — both labels legible, both clear
     *  of land, both clear of each other, and one of them naming the wrong sea. A name that has
     *  travelled a tenth of the frame is no longer the name of the place it was declared at, so the
     *  ring stops there and the next SHORTER form of the same sea is tried instead. */
    const LEASH = 0.1;
    for (let r = 1; r <= 10 && r * step <= LEASH; r++)
      for (let a = 0; a < 24; a++) {
        const t = (a / 24) * Math.PI * 2;
        const x = w.x + Math.cos(t) * r * step;
        const y = w.y + Math.sin(t) * r * step;
        if (ok(x, y)) return { x, y };
      }
    return null;
  };

  /** A SEA IS NAMED WHERE ITS NAME FITS THE SEA, AND SKIPPED WHERE IT DOES NOT — reported either
   *  way. At this camera the Baltic is about 21px across and its shortest declared form is 28px
   *  wide: the sea is narrower than its own name, and no amount of searching will change that. The
   *  references do the same thing — SCMP and ProPublica name the waters their camera can carry — so
   *  the beat declares candidates and the plate places what it can. It refuses only if it can place
   *  NONE, because then `three-classes-of-place-three-treatments` is a claim the plate is not
   *  keeping. What it must never do is name a sea on top of a country. */
  const placedWaters: Array<{ text: string; x: number; y: number }> = [];
  const unplacedWaters: string[] = [];
  {
    const taken: any[] = [];
    for (const w of waters) {
      let done = false;
      for (const form of w.forms) {
        const spot = placeIn(form, w, taken);
        if (spot) {
          taken.push(boxOf(form, spot.x, spot.y));
          placedWaters.push({ text: form, x: spot.x, y: spot.y });
          done = true;
          break;
        }
      }
      if (!done) unplacedWaters.push(w.forms[0]);
    }
  }
  if (namesWater && !placedWaters.length)
    throw new Error(
      `none of the ${waters.length} declared seas can be named in open water at this camera, in any ` +
        `form the beat supplies. Move the camera or declare seas it can carry — do not move a label ` +
        `onto a country to keep a legend honest.`,
    );
  onNote?.(
    `waters: ${placedWaters.map((w) => w.text).join(", ") || "none"}` +
      (unplacedWaters.length
        ? ` · not placed, narrower than their own name here: ${unplacedWaters.join(", ")}`
        : ""),
  );

  /** A NAME GOES INSIDE A COUNTRY ONLY IF THE WHOLE WORD IS INSIDE IT. Testing the anchor alone —
   *  the centre of the largest ring's box — put `FRANCE` in France with its last three letters in
   *  Germany, and a label that names its neighbour is worse than a label in the sea. Both ends and
   *  the middle are tested, against that same ring. */
  const anchorIsInside = (sh: Shape) => {
    if (!sh.anchor) return false;
    const ring = sh.rings.reduce((a, b) => (b.length > a.length ? b : a));
    const reg = named.includes(sh.iso) ? feature : area;
    const half = widthOnce(set(sh.name, reg).toUpperCase(), reg) / 2 / mapW;
    const { x, y } = sh.anchor;
    return [0, -half / 2, half / 2, -half, half].every((dx) =>
      inRing(ring, x + dx, y),
    );
  };
  const insideFits = (sh: Shape) =>
    sh.anchor !== null &&
    anchorIsInside(sh) &&
    axisBand.ascent + axisBand.descent <= sh.anchor.height * mapW - 2;

  const labelBox = (text: string, x: number, y: number, r: any) => {
    const half = widthOnce(set(text, r), r) / 2;
    return {
      x0: x * mapW - half,
      x1: x * mapW + half,
      y0: y * mapW - axisBand.ascent,
      y1: y * mapW + axisBand.descent,
    };
  };
  const placeNear = (
    text: string,
    sx: number,
    sy: number,
    taken: any[],
    reg: any,
  ) => {
    const ok = (x: number, y: number) =>
      fitsAt(text, x, y, reg) && clearOf(labelBox(text, x, y, reg), taken);
    /** THE SEARCH LEANS OUTWARD. The spiral is nearest-first by radius, which is right, but within a
     *  ring it used to try angles from east round to east, so ties broke toward the map's right-hand
     *  side whatever the country's position — and `NORVÈGE` ended up in the Barents Sea with its
     *  leader crossing `SUÈDE`'s and `FINLANDE`'s. Angles are ordered by how close they point AWAY
     *  from the middle of the frame, which is where an atlas puts a label it cannot fit in place,
     *  and which makes crossing leaders the exception rather than the tie-break. */
    const outward = Math.atan2(sy - visible.y1 / 2, sx - visible.x1 / 2);
    const angles = Array.from(
      { length: 32 },
      (_, a) => (a / 32) * Math.PI * 2,
    ).sort((p, q) => {
      const d = (t: number) =>
        Math.abs(Math.atan2(Math.sin(t - outward), Math.cos(t - outward)));
      return d(p) - d(q);
    });
    const step = 0.012;
    for (let r = 1; r <= 14; r++)
      for (const t of angles) {
        const x = sx + Math.cos(t) * r * step;
        const y = sy + Math.sin(t) * r * step;
        /** THE WHOLE LABEL HAS TO BE IN FRAME, NOT ITS CENTRE. Bounding the anchor let `CHYPRE`
         *  sit half past the crop and come out as `CHYPR` — and no guard saw it, because the
         *  overlap and frame guards measure the PLATE's frame and this label was well inside that;
         *  what it left was the MAP's. A crop is a frame too. */
        const halfW = widthOnce(text, reg) / 2 / mapW;
        if (
          x - halfW < 0.01 ||
          x + halfW > visible.x1 - 0.01 ||
          y < visible.y0 + 0.02 ||
          y > visible.y1 - 0.02
        )
          continue;
        if (ok(x, y)) return { x, y };
      }
    return null;
  };

  const wanted: Array<{ shape: Shape; klass: "feature" | "area" }> = [
    ...named.map((iso) => ({
      shape: byIso.get(iso)!,
      klass: "feature" as const,
    })),
    ...context.map((iso) => ({
      shape: byIso.get(iso)!,
      klass: "area" as const,
    })),
  ].filter((w) => Boolean(w.shape));
  const labels: Placed[] = [];
  const notOnTheMap: string[] = [];
  {
    const taken: any[] = placedWaters.map((w) =>
      labelBox(w.text, w.x, w.y, waterReg),
    );
    for (const { shape: sh, klass } of wanted) {
      const reg = klass === "feature" ? feature : area;
      const text = set(sh.name, reg).toUpperCase();
      if (
        insideFits(sh) &&
        clearOf(labelBox(text, sh.anchor!.x, sh.anchor!.y, reg), taken)
      ) {
        taken.push(labelBox(text, sh.anchor!.x, sh.anchor!.y, reg));
        labels.push({
          iso: sh.iso,
          text,
          x: sh.anchor!.x,
          y: sh.anchor!.y,
          from: null,
          onCell: cellUnder(sh.value),
          klass,
        });
        continue;
      }
      const spot = sh.anchor
        ? placeNear(text, sh.anchor.x, sh.anchor.y, taken, reg)
        : null;
      if (spot) {
        taken.push(labelBox(text, spot.x, spot.y, reg));
        labels.push({
          iso: sh.iso,
          text,
          x: spot.x,
          y: spot.y,
          from: { x: sh.anchor!.x, y: sh.anchor!.y },
          /** A NAME PUSHED OUT OF ITS COUNTRY LANDS ON THE SEA, and its ink and halo are measured
           *  against that rather than against the class it left behind. */
          onCell: namesWater ? waterTint : direction.ground,
          klass,
        });
        continue;
      }
      notOnTheMap.push(sh.name);
    }
  }
  onNote?.(
    `places: ${labels.filter((l) => l.klass === "feature").length} feature, ` +
      `${labels.filter((l) => l.klass === "area").length} context, ` +
      `${labels.filter((l) => l.from).length} of them on a leader` +
      (notOnTheMap.length
        ? ` · no room on the map, named in the standfirst only: ${notOnTheMap.join(", ")}`
        : ""),
  );

  return { registers: { area, feature, water: waterReg }, waters: placedWaters, unplacedWaters, labels, notOnTheMap };
}

export function DirectedChoroplethMap({
  plate,
  aspect,
  callout,
  missingLabel,
  breaks,
  unit,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  format,
  direction,
  treatments,
  onLadder,
}: {
  /** The baked MapTiler basemap for THIS direction, already a data URI — and it is no longer only
   *  a basemap. The classes, the borders, the leaders, the ring and every word the beat placed are
   *  LAYERS inside it, drawn by MapLibre at exactly the size this component draws the image at. */
  plate: string;
  aspect: number;
  callout: Callout;
  missingLabel: string;
  breaks: number[];
  unit: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  format: (v: number) => string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
}) {
  const { width, height } = FRAME;
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const display = registerOf(direction, "display");
  const eyebrowReg = registerOf(direction, "eyebrow");
  const body = registerOf(direction, "body");
  const axis = registerOf(direction, "axis");
  const annot = registerOf(direction, "annot");

  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontStyle: r.fontStyle,
    letterSpacing: r.letterSpacing,
    fill: r.fill,
  });
  const accentInk = adjustToContrast(
    direction.accent,
    direction.ground,
    TEXT_CONTRAST_MIN,
  );
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);

  /** THE COPY-FITTING LADDER AND THE DRAWN SIZE, ASKED FOR RATHER THAN COMPUTED — one definition,
   *  shared with the runner that has to size a plate before this component ever runs. */
  const {
    rung,
    layout,
    panel,
    mapBox,
    mapX,
    mapY,
    mapW,
    mapH,
    axisBand,
    annotBand,
    titleLead,
    bodyLead,
    annotLead,
  } = mapGeometryFor({
    aspect,
    callout,
    title,
    limits,
    reading,
    source,
    direction,
  });

  /** THE RAMP, STILL DERIVED HERE — because the KEY is still drawn here. The classes themselves are
   *  in the plate now; the swatches under the standfirst are not, and they must be the same five
   *  colours. `layersFor` in the runner spends the same construction between the same two poles. */
  const low = mix(direction.accent, direction.ground, 0.88);
  const high = mix(direction.accent, ink, 0.3);
  const classCount = breaks.length + 1;
  const classFill = (i: number) =>
    mix(low, high, classCount > 1 ? i / (classCount - 1) : 0.5);
  /** OUTSIDE THE RAMP, and separated from its low end by lightness as well as hue: a country in the
   *  lowest class is a country that is 10 % low-carbon, and a country with no data is neither. */
  const missingFill = mix(direction.ground, ink, 0.13);
  const border = grid;

  onLadder?.(
    `ladder: headline ${rung.title + 1}, standfirst ${rung.limit + 1}, reading ` +
      (rung.reading < 0 ? "dropped" : `form ${rung.reading + 1}`) +
      ` · panel ${(rung.share * 100).toFixed(0)}% (${panel}px), ${layout.spare.toFixed(0)}px spare` +
      ` · map ${mapW.toFixed(0)} x ${mapH.toFixed(0)}`,
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={alt}
    >
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />

      <text x={PAD} y={layout.eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {layout.titleLines.map((l, i) => (
        <text
          key={l + i}
          x={PAD}
          y={layout.titleTop + i * titleLead}
          {...line(display)}
        >
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text
          key={l + i}
          x={PAD}
          y={layout.limitsTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}
      {layout.readingLines.map((l, i) => (
        <text
          key={`r${i}`}
          x={PAD}
          y={layout.readingTop + i * annotLead}
          {...line(annot)}
          fill={mutedInk}
        >
          {l}
        </text>
      ))}
      {layout.sourceLines.map((l, i) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={layout.sourceTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}

      <defs>
        <clipPath id="camera">
          <rect
            x={mapBox.x}
            y={mapBox.y}
            width={mapBox.width}
            height={mapBox.height}
          />
        </clipPath>
      </defs>

      <g clipPath="url(#camera)">
        {/* THE MAP IS AN IMAGE, AND EVERYTHING INSIDE IT IS IN THE IMAGE. MapTiler's geography in
            this direction's own tints, and on top of it — as MapLibre LAYERS, baked by `bake.mjs`
            from the plan the runner declared — the choropleth classes, the study borders, the
            leaders and their dots, the ringed subject, and every word the beat placed.

            NOTHING IS DRAWN OVER THE GEOGRAPHY ANY MORE. The SVG used to paint all of it at the
            component's own scale over a plate baked at another, with `preserveAspectRatio="none"`
            squashing the ground under marks that were not squashed with it. The plate is now baked
            at exactly this box, so there is nothing left to stretch and the attribute is gone with
            the marks: a future size mismatch has to show as a mismatch instead of a silent squash. */}
        <image href={plate} x={mapX} y={mapY} width={mapW} height={mapH} />
      </g>

      {/* THE KEY, IN THE PANEL, under the standfirst — classes with edges, every break printed in
          its unit, each set in the fill of the class it opens, and the absence given its own swatch
          and its own name. It is sized to the panel rather than to a fixed swatch, so a direction
          with a wider column gets wider steps instead of a key that runs off it. */}
      {on("the-scale-is-stepped-not-continuous") &&
        (() => {
          const swatchW = panel / (classCount + 0.2);
          const top = layout.keyTop;
          const left = PAD;
          return (
            <g>
              {Array.from({ length: classCount }, (_, i) => (
                <g key={`key-${i}`}>
                  <rect
                    x={left + i * swatchW}
                    y={top}
                    width={swatchW - 1}
                    height={axisBand.ascent}
                    fill={classFill(i)}
                    stroke={border}
                    strokeWidth={direction.stroke.hairline}
                  />
                  {i > 0 && (
                    <text
                      x={left + i * swatchW}
                      y={top + axisBand.ascent * 2 + 2}
                      textAnchor="middle"
                      {...line(axis)}
                      fill={adjustToContrast(
                        classFill(i),
                        direction.ground,
                        TEXT_CONTRAST_MIN,
                      )}
                    >
                      {set(format(breaks[i - 1]), axis)}
                    </text>
                  )}
                </g>
              ))}
              <text
                x={left}
                y={top - axisBand.descent - 4}
                {...line(axis)}
                fill={mutedInk}
              >
                {set(unit, axis)}
              </text>
              <rect
                x={left}
                y={top + axisBand.ascent * 2 + 8}
                width={swatchW - 1}
                height={axisBand.ascent}
                fill={missingFill}
                stroke={border}
                strokeWidth={direction.stroke.hairline}
              />
              <text
                x={left + swatchW + 5}
                y={top + axisBand.ascent * 3 + 6}
                {...line(axis)}
                fill={mutedInk}
              >
                {set(missingLabel, axis)}
              </text>
            </g>
          );
        })()}

      {/* THE CALLOUT'S SENTENCE, in the panel, in the accent that rings its subject on the map. The
          ring itself is a layer in the plate; this is the other half of SCMP's third treatment, and
          the colour is what joins them. */}
      {layout.calloutLines.map((l, i) => (
        <text
          key={`c${i}`}
          x={PAD}
          y={layout.calloutTop + i * annotLead}
          {...line(annot)}
          fill={accentInk}
        >
          {l}
        </text>
      ))}
    </svg>
  );
}
