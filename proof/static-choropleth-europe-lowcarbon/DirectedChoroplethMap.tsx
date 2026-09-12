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
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix } from "#shared/chart-beat/colour.mjs";
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";
import { matchConvention } from "../../skills/palette/scripts/palette.mjs";

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
export type Callout = {
  iso: string;
  lines: string[];
  toX: number;
  toY: number;
};

export function DirectedChoroplethMap({
  shapes,
  plate,
  aspect,
  named,
  context,
  waters,
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
  shapes: Shape[];
  /** The baked MapTiler basemap for THIS direction, already a data URI. It is the ground the
   *  country fills sit on, and it is the only pixel content on this plate. */
  plate: string;
  aspect: number;
  named: string[];
  context: string[];
  waters: Water[];
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
  const inkOf = { ink, muted, accent: direction.accent } as Record<
    string,
    string
  >;
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => {
    const r = resolveRegister(direction, name);
    return { ...r, fill: inkOf[r.ink] };
  };
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");

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
  const axisBand = bandOf(axis);
  const annotBand = bandOf(annot);

  // ── the ramp, the basemap and the water ───────────────────────────────────
  /** ONE HUE, FIVE CLASSES, LIGHTNESS FALLING THE WHOLE WAY — the heatmap's construction, reused
   *  because it is the same family of rule and the same two poles. */
  const low = mix(direction.accent, direction.ground, 0.88);
  const high = mix(direction.accent, ink, 0.3);
  const classCount = breaks.length + 1;
  const classOf = (v: number) => breaks.filter((b) => v >= b).length;
  const classFill = (i: number) =>
    mix(low, high, classCount > 1 ? i / (classCount - 1) : 0.5);

  /** THE BASEMAP GIVES UP ITS CONTRAST. Land with no value, and every coastline and border, are
   *  small steps off the ground — `deriveFurniture`'s own `grid` step and less. They are defined
   *  against the GROUND rather than as "a light grey", so on a dark direction they lighten and on a
   *  pale one they darken, and the rule holds at either pole. */
  const landNoValue = mix(direction.ground, ink, 0.05);
  const coast = mix(direction.ground, ink, 0.22);
  const border = grid;
  /** OUTSIDE THE RAMP, and separated from its low end by lightness as well as hue: a country in the
   *  lowest class is a country that is 10 % low-carbon, and a country with no data is neither. */
  const missingFill = mix(direction.ground, ink, 0.13);
  /** WATER IS A TINT, NOT A GREY — the one hue here that is not a step of the accent, and it is not
   *  named here either. `palette`'s own grounded conventions already hold one for water, with its
   *  own reasoning recorded ("the single most reliably held colour association in the
   *  semantic-resonance study"), and asking that table is the difference between a beat that takes a
   *  convention and a beat that invents a colour. It is then MIXED toward the direction's own
   *  ground, so it recedes on a pale page and on a dark one alike, and its contrast against the
   *  ground is checked rather than assumed. */
  const waterHue = matchConvention("water")!.accent;
  const water = mix(direction.ground, waterHue, 0.16);
  const waterInk = adjustToContrast(waterHue, water, TEXT_CONTRAST_MIN);
  if (contrast(water, direction.ground) > 1.6)
    throw new Error(
      `the water tint measures ${contrast(water, direction.ground).toFixed(2)}:1 against the ground; ` +
        `the basemap must stay under 1.6:1 so the ramp is the only thing with weight on the plate`,
    );

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
    const calloutLines = callout.lines.flatMap((c) => wrap(set(c, annot), panel, annot));
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), panel, annot);
    const sourceLines = wrap(set(source, body), panel, body);

    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop = eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
    const limitsTop = titleTop + titleLines.length * titleLead + body.fontSize * 0.8;
    const calloutTop =
      limitsTop + limitLines.length * bodyLead + annot.fontSize * 0.7 + annotBand.ascent;
    const keyTop =
      calloutTop + calloutLines.length * annotLead + axisBand.ascent * 0.8 + axisBand.ascent;
    const readingTop = keyTop + keyRoom + annot.fontSize * 1.0 + annotBand.ascent;
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const footTop = readingTop + Math.max(0, readingLines.length - 1) * annotLead;
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
  const rungs: Array<{ share: number; title: number; limit: number; reading: number }> = [];
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
  let fits: { rung: (typeof rungs)[number]; layout: ReturnType<typeof layoutFor> } | null = null;
  for (const rung of rungs) {
    const layout = layoutFor(panelFor(rung.share), rung.title, rung.limit, rung.reading);
    if (layout.spare >= 0) {
      fits = { rung, layout };
      break;
    }
  }
  if (!fits) {
    const best = rungs
      .map((rung) => ({
        rung,
        layout: layoutFor(panelFor(rung.share), rung.title, rung.limit, rung.reading),
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
  /** What of the unit box actually survives the crop — the bound every label placement is held to,
   *  so nothing is placed on ground the frame does not show. */
  const visible = {
    x1: mapBox.width / mapW,
    y0: (mapBox.y - mapY) / mapW,
    y1: (mapBox.y + mapBox.height - mapY) / mapW,
  };
  const at = (p: [number, number]): [number, number] => [
    mapX + p[0] * mapW,
    mapY + p[1] * mapW,
  ];
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · panel ${(fits.rung.share * 100).toFixed(0)}% (${panel}px), ${layout.spare.toFixed(0)}px spare` +
      ` · map ${mapW.toFixed(0)} x ${mapH.toFixed(0)}`,
  );

  const pathOf = (s: Shape) =>
    s.rings
      .map((ring) => {
        const pts = ring.map(at);
        return `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`;
      })
      .join(" ");

  const byIso = new Map(shapes.map((s) => [s.iso, s]));

  /** THE THREE TREATMENTS, DERIVED. `area` is the axis register uppercased and tracked, in the
   *  muted ink — the quietest of the three, which is where both records put it. `settlement` would
   *  be the annot register in mixed case; this beat names no settlements and so draws none, which is
   *  why `three-classes-of-place-three-treatments` is checked against what a beat NAMES rather than
   *  against what a family could name. `water` is the annot register in italic, in the water ink. */
  /** THE SEVEN ARE NOT CONTEXT — THEY ARE THE STORY, and setting them in the quiet grey the corpus
   *  reserves for administrative context made the one thing a reader is here to find the hardest
   *  thing on the plate to read. SCMP's own plate says so: the country is grey because it is
   *  context, the FEATURE UNDER DISCUSSION is in the accent. So the named seven take the accent at
   *  weight 700, and the quiet area treatment goes to the countries at the other end of the ramp,
   *  which is where it belongs and which gives the reader both ends of the scale by name.
   *
   *  That also makes `three-classes-of-place-three-treatments` real rather than nominal: three
   *  classes are drawn — feature, administrative context, water — and a reader separates them from
   *  typography and ink alone. */
  const area = {
    ...axis,
    letterSpacing: Math.max(Number(axis.letterSpacing ?? 0), 0.8),
  };
  /** Water takes the AXIS size in italic, not the annot size: it is the basemap naming itself, and
   *  the first version set it at the annot register, where three sea names were the loudest text on
   *  the map and collided with the callout. */
  const waterReg = { ...axis, fontStyle: "italic", letterSpacing: 0, transform: "none" };

  const inRing = (ring: Array<[number, number]>, x: number, y: number) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };

  const namesWaterEarly = on("water-is-a-tint-not-a-grey");

  /** THE SEAS TAKE THE LONGEST FORMS THAT DO NOT COLLIDE. At this camera `Mer du Nord` and
   *  `Mer Baltique` are together wider than the water between them, and the tempting fix — nudge the
   *  declared coordinates until the overlap guard goes quiet — is the exact defect this tree keeps
   *  finding: a number moved until the measurement stops complaining, rather than a rule. So the
   *  forms are spent instead, longest first, and if even the shortest set collides the plate says so
   *  rather than drawing two names on top of each other. */
  const waterBox = (text: string, w: Water) => {
    const half = widthOnce(set(text, waterReg), waterReg) / 2;
    return {
      x0: w.x * mapW - half,
      x1: w.x * mapW + half,
      y0: w.y * mapW - axisBand.ascent,
      y1: w.y * mapW + axisBand.descent,
    };
  };
  /** AND A SEA NAME HAS TO SIT IN ITS SEA. `Baltique` at the Baltic's own centre still reached
   *  Sweden's east coast at this camera, and landed on a dark cell where it measured 1.46:1 — the
   *  contrast guard caught it, and the cause is the one this tree keeps relearning: a mark's colour
   *  is chosen against everything it can LAND on, and the cheapest way to keep that promise is to
   *  make sure it lands on nothing else. A form is admissible only if its centre and both its ends
   *  clear every drawn land ring. */
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
  /** THE LABEL'S FOOTPRINT, NOT ITS BASELINE. Sampling only the centre line put `Balt.` in a strait
   *  whose water was narrower than the word is tall: the contrast guard then measured it at 1.80:1
   *  on Sweden's own fill. A word occupies a box, so the box is what gets tested — five columns by
   *  three rows of it, in the map's own units. */
  /** THE LABEL'S FOOTPRINT, NOT ITS BASELINE. Sampling only the centre line put `Balt.` in a strait
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
    if (y - up < visible.y0 + 0.004 || y + down > visible.y1 - 0.004) return false;
    /** ELEVEN COLUMNS, NOT FIVE. `ISLANDE` is wider than Iceland, and with five sample columns the
     *  island slipped between two of them: every probe was open water and the drawn word still had
     *  its first letters on the coast. A sample grid coarser than the smallest thing it has to find
     *  will one day fail to find it. */
    for (let i = 0; i <= 10; i++) {
      const dx = -half + (i / 10) * half * 2;
      for (const dy of [-up, (down - up) / 2, down]) if (onLand(x + dx, y + dy)) return false;
    }
    return true;
  };
  /** A WORD IS MEASURED ONCE. `measureText` loads and walks a face; calling it inside the probe

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
    const step = Math.max(0.008, widthOnce(set(text, waterReg), waterReg) / mapW / 3);
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
  const placedFor = (pick: string[]) => {
    const taken: any[] = [];
    const out: Array<{ text: string; x: number; y: number }> = [];
    for (const [i, text] of pick.entries()) {
      const spot = placeIn(text, waters[i], taken);
      if (!spot) return null;
      taken.push(boxOf(text, spot.x, spot.y));
      out.push({ text, x: spot.x, y: spot.y });
    }
    return out;
  };
  /** A SEA IS NAMED WHERE ITS NAME FITS THE SEA, AND SKIPPED WHERE IT DOES NOT — reported either
   *  way. At this camera the Baltic is about 21px across and its shortest declared form is 28px
   *  wide: the sea is narrower than its own name, and no amount of searching will change that. The
   *  references do the same thing — SCMP and ProPublica name the waters their camera can carry — so
   *  the beat declares candidates and the plate places what it can. It refuses only if it can place
   *  NONE, because then `three-classes-of-place-three-treatments` is a claim the plate is not
   *  keeping. What it must never do is name a sea on top of a country. */
  const placedWaters: Array<{ text: string; x: number; y: number }> = [];
  const unplaced: string[] = [];
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
      if (!done) unplaced.push(w.forms[0]);
    }
  }
  const waterForms = placedWaters;
  if (namesWaterEarly && !waterForms.length)
    throw new Error(
      `none of the ${waters.length} declared seas can be named in open water at this camera, in any ` +
        `form the beat supplies. Move the camera or declare seas it can carry — do not move a label ` +
        `onto a country to keep a legend honest.`,
    );
  onLadder?.(
    `waters: ${waterForms.map((w) => w.text).join(", ") || "none"}` +
      (unplaced.length ? ` · not placed, narrower than their own name here: ${unplaced.join(", ")}` : ""),
  );

  const feature = { ...area, fontWeight: 700 };
  const showsPlaces = on("three-classes-of-place-three-treatments");
  const namesWater = namesWaterEarly;

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
    return [0, -half / 2, half / 2, -half, half].every((dx) => inRing(ring, x + dx, y));
  };
  const insideFits = (sh: Shape) =>
    sh.anchor !== null &&
    anchorIsInside(sh) &&
    axisBand.ascent + axisBand.descent <= sh.anchor.height * mapW - 2;

  /** A COUNTRY IS LABELLED INSIDE ITSELF WHEN IT FITS, AND IN THE NEAREST OPEN WATER WHEN IT DOES
   *  NOT — on a short leader, never dropped, and never on a neighbour.
   *
   *  The stacked layout parked the ones that did not fit in a column to the right of the map. Beside
   *  the panel there is no such column: the map runs to the plate's own edge, which is the point.
   *  So the same search the sea names use is spent again — find open water near the country, put the
   *  name there, draw a hairline back to the shape. A name in the sea beside its country is how an
   *  atlas has always handled a country too small to hold one. */
  const labelBox = (text: string, x: number, y: number, r: any) => {
    const half = widthOnce(set(text, r), r) / 2;
    return {
      x0: x * mapW - half,
      x1: x * mapW + half,
      y0: y * mapW - axisBand.ascent,
      y1: y * mapW + axisBand.descent,
    };
  };
  const placeNear = (text: string, sx: number, sy: number, taken: any[], reg: any) => {
    const ok = (x: number, y: number) =>
      fitsAt(text, x, y, reg) && clearOf(labelBox(text, x, y, reg), taken);
    /** THE SEARCH LEANS OUTWARD. The spiral is nearest-first by radius, which is right, but within a
     *  ring it used to try angles from east round to east, so ties broke toward the map's right-hand
     *  side whatever the country's position — and `NORVÈGE` ended up in the Barents Sea with its
     *  leader crossing `SUÈDE`'s and `FINLANDE`'s. Angles are ordered by how close they point AWAY
     *  from the middle of the frame, which is where an atlas puts a label it cannot fit in place,
     *  and which makes crossing leaders the exception rather than the tie-break. */
    const outward = Math.atan2(sy - visible.y1 / 2, sx - visible.x1 / 2);
    const angles = Array.from({ length: 32 }, (_, a) => (a / 32) * Math.PI * 2).sort((p, q) => {
      const d = (t: number) => Math.abs(Math.atan2(Math.sin(t - outward), Math.cos(t - outward)));
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
    ...named.map((iso) => ({ shape: byIso.get(iso)!, klass: "feature" as const })),
    ...context.map((iso) => ({ shape: byIso.get(iso)!, klass: "area" as const })),
  ].filter((w) => Boolean(w.shape));
  const placedLabels: Array<{
    iso: string;
    text: string;
    x: number;
    y: number;
    from: { x: number; y: number } | null;
    onCell: string;
    klass: "feature" | "area";
  }> = [];
  const notOnTheMap: string[] = [];
  {
    const taken: any[] = waterForms.map((w) => labelBox(w.text, w.x, w.y, waterReg));
    for (const { shape: sh, klass } of wanted) {
      const reg = klass === "feature" ? feature : area;
      const text = set(sh.name, reg).toUpperCase();
      if (insideFits(sh) && clearOf(labelBox(text, sh.anchor!.x, sh.anchor!.y, reg), taken)) {
        taken.push(labelBox(text, sh.anchor!.x, sh.anchor!.y, reg));
        placedLabels.push({
          iso: sh.iso,
          text,
          x: sh.anchor!.x,
          y: sh.anchor!.y,
          from: null,
          onCell: sh.value === null ? missingFill : classFill(classOf(sh.value)),
          klass,
        });
        continue;
      }
      const spot = sh.anchor ? placeNear(text, sh.anchor.x, sh.anchor.y, taken, reg) : null;
      if (spot) {
        taken.push(labelBox(text, spot.x, spot.y, reg));
        placedLabels.push({
          iso: sh.iso,
          text,
          x: spot.x,
          y: spot.y,
          from: { x: sh.anchor!.x, y: sh.anchor!.y },
          onCell: namesWater ? water : direction.ground,
          klass,
        });
        continue;
      }
      notOnTheMap.push(sh.name);
    }
  }
  onLadder?.(
    `places: ${placedLabels.filter((l) => l.klass === "feature").length} feature, ` +
      `${placedLabels.filter((l) => l.klass === "area").length} context, ` +
      `${placedLabels.filter((l) => l.from).length} of them on a leader` +
      (notOnTheMap.length
        ? ` · no room on the map, named in the standfirst only: ${notOnTheMap.join(", ")}`
        : ""),
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
        <text key={`s${i}`} x={PAD} y={layout.sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      <defs>
        <clipPath id="camera">
          <rect x={mapBox.x} y={mapBox.y} width={mapBox.width} height={mapBox.height} />
        </clipPath>
      </defs>

      <g clipPath="url(#camera)">
        {/* THE BASEMAP IS MAPTILER'S GEOGRAPHY IN THIS DIRECTION'S OWN TINTS — baked by `bake.mjs`
            once per filed direction, never a published style picked off a shelf. `the-basemap-gives-
            up-its-contrast` cannot be satisfied by choosing between `dataviz-light` and
            `dataviz-dark`: the dark one paints dark land under a LIGHT blue sea, which on
            `nocturne`'s navy makes the water the loudest thing on the page.

            A rect of the direction's own ground goes underneath it: the image is opaque and exactly
            covers the box, so nothing shows through — but if a bake ever came back short, the gap
            would be the plate's ground rather than white paper. */}
        <rect x={mapX} y={mapY} width={mapW} height={mapH} fill={namesWater ? water : direction.ground} />
        <image
          href={plate}
          x={mapX}
          y={mapY}
          width={mapW}
          height={mapH}
          preserveAspectRatio="none"
        />

        {shapes.map((s) => (
          <path
            key={s.iso}
            d={pathOf(s)}
            fill={
              s.value !== null
                ? classFill(classOf(s.value))
                : s.inStudySet
                  ? missingFill
                  : landNoValue
            }
            stroke={s.value === null ? coast : border}
            strokeWidth={direction.stroke.hairline}
          />
        ))}

        {showsPlaces &&
          placedLabels.map((l) => (
            <g key={`p-${l.iso}`}>
              {l.from && (
                <>
                  <path
                    d={`M ${(mapX + l.from.x * mapW).toFixed(1)} ${(mapY + l.from.y * mapW).toFixed(1)} L ${(mapX + l.x * mapW).toFixed(1)} ${(mapY + l.y * mapW + axisBand.descent + 1).toFixed(1)}`}
                    fill="none"
                    stroke={coast}
                    strokeWidth={direction.stroke.rule}
                  />
                  <circle
                    cx={mapX + l.from.x * mapW}
                    cy={mapY + l.from.y * mapW}
                    r={1.8}
                    fill={mutedInk}
                  />
                </>
              )}
              {/* A HALO, AND THE INK CHOSEN AGAINST IT.
                  The ink used to be walked to the floor against `onCell` — the fill the label was
                  ASSUMED to sit on. A name placed in the sea beside its country straddles a coast,
                  and half of it lands on a cell of the ramp instead; the assumption was wrong for
                  exactly the labels that mattered, and the pixel guard cleared them because it
                  samples the most common ground under the box. A halo in the ground the label was
                  placed on removes the assumption: whatever is behind it, the letters sit on a
                  known colour, so the ink can be chosen once and be right. It is the same repair
                  the calendar heatmap's streak outline needed, for the same reason.
                  And the FEATURE is taken to 7:1 rather than the 4.5 floor. The floor is what makes
                  text legible; the seven countries the headline is about should be the first thing
                  read on the plate, not the last thing that technically passes. */}
              <text
                x={mapX + l.x * mapW}
                y={mapY + l.y * mapW + (axisBand.ascent - axisBand.descent) / 2}
                textAnchor="middle"
                {...line(l.klass === "feature" ? feature : area)}
                fill="none"
                stroke={l.onCell}
                strokeWidth={Math.max(2.5, axisBand.ascent * 0.34)}
                strokeLinejoin="round"
              >
                {l.text}
              </text>
              <text
                x={mapX + l.x * mapW}
                y={mapY + l.y * mapW + (axisBand.ascent - axisBand.descent) / 2}
                textAnchor="middle"
                {...line(l.klass === "feature" ? feature : area)}
                fill={
                  l.klass === "feature"
                    ? adjustToContrast(direction.accent, l.onCell, 7)
                    : adjustToContrast(muted, l.onCell, TEXT_CONTRAST_MIN)
                }
              >
                {l.text}
              </text>
            </g>
          ))}

        {namesWater &&
          waterForms.map((w) => (
            <g key={w.text}>
              <text
                x={mapX + w.x * mapW}
                y={mapY + w.y * mapW}
                textAnchor="middle"
                {...line(waterReg)}
                fill="none"
                stroke={water}
                strokeWidth={Math.max(2, axisBand.ascent * 0.3)}
                strokeLinejoin="round"
              >
                {set(w.text, waterReg)}
              </text>
              <text
                x={mapX + w.x * mapW}
                y={mapY + w.y * mapW}
                textAnchor="middle"
                {...line(waterReg)}
                fill={waterInk}
              >
                {set(w.text, waterReg)}
              </text>
            </g>
          ))}
      </g>


      {/* THE FEATURE THE STORY IS ABOUT — SCMP's third treatment, split in two because the map now
          runs to the plate's own edge and a leader from Albania to the panel would cross the whole
          continent. On the MAP, the subject takes a ring in the accent, which is
          `the-subject-is-ringed-not-recoloured` doing on a country exactly what it does on a row: it
          costs no encoding channel, so Albania keeps the class it earned. In the PANEL, the sentence
          the ring is about, in the same accent. The colour is the leader. */}
      {(() => {
        const target = byIso.get(callout.iso);
        if (!target?.anchor) return null;
        const r = Math.max(
          (Math.max(target.anchor.width, target.anchor.height) * mapW) / 2 + 5,
          7,
        );
        return (
          <circle
            cx={mapX + target.anchor.x * mapW}
            cy={mapY + target.anchor.y * mapW}
            r={r}
            fill="none"
            stroke={accentInk}
            strokeWidth={direction.stroke.rule * 1.6}
          />
        );
      })()}

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
                      fill={adjustToContrast(classFill(i), direction.ground, TEXT_CONTRAST_MIN)}
                    >
                      {set(format(breaks[i - 1]), axis)}
                    </text>
                  )}
                </g>
              ))}
              <text x={left} y={top - axisBand.descent - 4} {...line(axis)} fill={mutedInk}>
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

      {/* THE CALLOUT'S SENTENCE, in the panel, in the accent that rings its subject on the map. */}
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
