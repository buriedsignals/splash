/**
 * Europe's low-carbon power stations, one circle each, sized by capacity, drawn THROUGH the design
 * base. The first `proportional symbol` component in this tree, and the third map beat.
 *
 * IT DRAWS THE SAME 8 900 STATIONS AS `proof/static-dot-density-europe-stations`, and the pair is
 * the argument. A dot map gives the COUNT of places and says nothing about their weight; sizing the
 * mark gives the weight and costs the count, because a big circle covers small ones. Neither is the
 * better map; they answer different questions, and the two plates side by side are what makes that
 * checkable instead of asserted.
 *
 * `the-dots-resolution-is-what-the-data-supports` (La Nación, ProPublica) — every circle sits at
 * the latitude and longitude the source recorded for that station.
 *
 * `an-overlap-accumulates-rather-than-occluding` (Carbon Brief, Buried Signals) — the circles are
 * HOLLOW. Buried Signals' Yemen map: filled discs would have hidden each other and lost exactly the
 * information the piece is about. Here a cluster of outlines is still countable and a big circle no
 * longer erases the small ones beneath it.
 *
 * `a-radius-is-not-read-by-eye` — area is proportional to capacity, so the radius runs on a square
 * root; and because nobody reads an area accurately, the key carries three named circles at stated
 * megawatts rather than a note saying the area is proportional.
 *
 * `the-basemap-gives-up-its-contrast` (La Nación's `#FEFEFE`, ProPublica's `#FDFDFD`) — against a
 * dense point field that is the only way the points stay countable. The land is a step off the
 * ground, the coastline barely more.
 *
 * `water-is-a-tint-not-a-grey` (Toxmap, SCMP) — from `palette`'s own grounded conventions, mixed
 * toward the direction's ground and checked against it.
 *
 * `the-subject-is-ringed-not-recoloured` (IiB, Reuters) — the seventy-two nuclear stations are the
 * subject, so they are ringed. Recolouring them would put a second hue on a plate whose whole
 * reading is one field's density.
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
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { matchConvention } from "../../skills/palette/scripts/palette.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Shape = { iso: string; d: string };
export type Symbol = { x: number; y: number; r: number; subject: boolean };
export type KeyCircle = { mw: number; r: number };

/**
 * HOW MUCH OF THE BUSIEST PART OF THE MAP IS INK.
 *
 * THE DEFECT THIS EXISTS FOR. `an-overlap-accumulates-rather-than-occluding` says hollow marks pile
 * into a cluster the reader can still count — and Buried Signals' Yemen map, where the rule comes
 * from, draws a few hundred strikes. This plate drew 8 900 stations on a continental camera and the
 * outlines fused: Rémy's read of the shipped plate was one word, "illisible". The rule was obeyed and
 * the plate was unreadable, which means the rule had a condition nobody had measured.
 *
 * The condition is DENSITY, and an average hides it — the whole map was 13 % ink while western
 * Europe was solid. So the measure is the WORST CELL of a grid over the camera: the stroke length of
 * every circle whose centre falls in that cell, times its width, against the cell's own area. At
 * 8 900 stations the worst cell measured **302 %** — three times its own area in outline. That is
 * not a field a reader counts; it is a blot.
 */
/**
 * HOW MUCH OF A STACKED PLATE THE MAP OWES — a third everywhere but square, and more than half
 * there.
 *
 * A third of the usable height is the statement `static-choropleth-europe-lowcarbon` makes: below a
 * third the map stops being the largest thing on the page and the beat is a caption with an
 * illustration. That floor holds for a choropleth at any frame, because a choropleth's ink does not
 * depend on how wide its camera is — a country is a country.
 *
 * A PROPORTIONAL-SYMBOL FIELD IS NOT LIKE THAT, and square is where it shows. The outline is 0.7px
 * at every camera, so halving the map does not halve the ink in a cell, it DOUBLES that ink's share
 * of the cell — and the beat answers a crowded camera by raising its capacity threshold, which
 * throws stations away. Measured 2026-09-23 on this data: a third of a 540px square is 184px of
 * camera, at which the only threshold under the 40 % ink floor is 6 000 MW and leaves ONE of 8 900
 * stations. At 265px it is 1 200 MW and 69 stations survive, which is a field.
 *
 * So at square the copy gives the map 48 % of the plate instead of a third, and 48 is not a round
 * number: it is the largest share every one of the three filed directions can actually pay for with
 * the rungs it has — the headline's shortest form, the reading line dropped, the limit note's
 * shortest form, the eyebrow dropped, the key laid out as a row and the credit's short form. Asked
 * for 55 % the plate refuses in two directions of three, which is a refusal about the copy rather
 * than about the map. Landscape lays the map BESIDE its copy and never reads this; portrait clears
 * a third with room to spare and is left alone.
 */
export function minMapShare(width: number, height: number) {
  return width === height ? 0.48 : 1 / 3;
}

export function worstCellInk(
  symbols: Symbol[],
  mapW: number,
  aspect: number,
  strokeWidth: number,
): number {
  const GX = 24;
  const GY = 17;
  const cells = new Float64Array(GX * GY);
  for (const d of symbols) {
    const gx = Math.min(GX - 1, Math.max(0, Math.floor(d.x * GX)));
    const gy = Math.min(GY - 1, Math.max(0, Math.floor(d.y * aspect * GY)));
    const r = Math.max(0.7, d.r * mapW);
    cells[gy * GX + gx] += 2 * Math.PI * r * strokeWidth;
  }
  const cellArea = (mapW / GX) * (mapW / aspect / GY);
  return (Math.max(...cells) / cellArea) * 100;
}

export function DirectedProportionalSymbol({
  plate,
  shapes,
  symbols,
  keyCircles,
  aspect,
  dotIs,
  subjectNote,
  limitNote,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  direction,
  treatments,
  onLadder,
  frame,
}: {
  /** The baked MapTiler basemap for THIS direction, already a data URI. */
  plate: string;
  shapes: Shape[];
  symbols: Symbol[];
  keyCircles: KeyCircle[];
  aspect: number;
  dotIs: string;
  subjectNote: string;
  limitNote: string[];
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
  /** The frame this render draws at — `sizeFor(size)` halved, so one component
   *  serves landscape, portrait and square. Absent means the landscape this beat was accepted at. */
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  const { ink, muted } = deriveFurniture(direction.ground);
  const PAD = direction.pad;
  const on = (id: string) => treatments.includes(id);

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");

  const set = (text: string, r: { transform: string }) =>
    applyCase(text, r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthCache = new Map<string, number>();
  const widthOf = (text: string, r: any) => {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${r.letterSpacing}|${text}`;
    let w = widthCache.get(key);
    if (w === undefined) {
      w =
        measureText(text, sizeOf(r)) +
        Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
      widthCache.set(key, w);
    }
    return w;
  };
  const bandOf = (r: any) => measureTextBand("Hxpg1,", sizeOf(r));

  const wrapCache = new Map<string, string[]>();
  function wrap(text: string, maxWidth: number, r: any): string[] {
    const key = `${r.fontFamily}|${r.fontSize}|${r.fontWeight}|${maxWidth}|${text}`;
    const hit = wrapCache.get(key);
    if (hit) return hit;
    const out: string[] = [];
    let current = "";
    for (const word of text.split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        out.push(current);
        current = word;
      } else current = trial;
    }
    if (current) out.push(current);
    wrapCache.set(key, out);
    return out;
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
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);

  /** THE BASEMAP GIVES UP ITS CONTRAST — against 8 900 points that is the only way the points stay
   *  countable. The land is a small step off the ground; the coastline is barely more. */
  const land = mix(direction.ground, ink, 0.045);
  const coast = mix(direction.ground, ink, 0.16);
  const waterHue = matchConvention("water")!.accent;
  const water = mix(direction.ground, waterHue, 0.14);
  if (contrast(water, direction.ground) > 1.6)
    throw new Error(
      `the water tint measures ${contrast(water, direction.ground).toFixed(2)}:1 against the ground; ` +
        `a basemap under a dense point field must stay under 1.6:1`,
    );
  const dotInk = direction.accent;
  const subjectInk = accentInk;

  // ── the layout: the map is the subject, so the text sits beside it ─────────
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);
  const SHARES = [0.3, 0.34, 0.38, 0.42];
  const GUTTER = 24;
  /**
   * TWO LAYOUTS, AND THE FRAME CHOOSES — not taste.
   *
   * Beside the map is right at landscape: a map's aspect is fixed by the ground it shows, so a 1.32:1
   * Europe stacked under a header on a 960x540 plate would be a strip. At a SQUARE or TALL frame the same
   * arithmetic inverts, and measured 2026-09-23 it inverted violently. At 540x540 the narrowest panel is
   * 136px and no rung of this beat's copy fits that column — the beat refused outright, in all three
   * directions. At 540x960 it did fit, and that was worse: the map box came to 297 x 872, the camera FILLS
   * its box, so the drawn map was 1126px wide inside a 297px window — a vertical sliver of Europe at four
   * times the frame's width, and resvg aborted on it rather than rasterising it.
   *
   * The condition is the one the reasoning is about: is there room beside the widest panel this ladder
   * spends for a map at least as wide as the plate is tall? Below that there is no column to put text in.
   * This mirrors `static-choropleth-europe-lowcarbon`, which is where the stacked form was worked.
   */
  const STACKED = width - PAD * 2 - Math.round((width - PAD * 2) * SHARES[0]) - GUTTER < height - PAD * 2;
  const panelFor = (share: number) =>
    STACKED ? width - PAD * 2 : Math.round((width - PAD * 2) * share);
  /** The map's width in the BESIDE layout — the key's circles are sized in units of it, so it has to
   *  be known before the panel's own height can be. Stacked, it is not known: see `keyDiaFor`. */
  const mapWidthFor = (panel: number) => width - PAD * 2 - panel - GUTTER;
  const keyRows = keyCircles.length * (axisBand.ascent + axisBand.descent + 3);
  /**
   * THE KEY IS A COLUMN AT LANDSCAPE AND A ROW AT SQUARE, and that is `REMOVAL_LADDER`'s
   * re-arrangement rung rather than a removal: nothing leaves the plate, it is laid out the other
   * way round.
   *
   * Beside the map the key has a narrow panel and all the height it wants, so the nested circles sit
   * above their own sentences. Stacked on a square plate the panel is the whole width and height is
   * the scarce thing — measured 2026-09-23, the circles-over-sentences block ran 84px of the 436px
   * the plate has to share between the copy and a map that owes half of it. Set beside the circles
   * instead, the same three sentences cost the height of the tallest of the two stacks and nothing
   * more.
   */
  const KEY_IN_A_ROW = STACKED && width === height;
  const keyLabelW = Math.max(
    ...keyCircles.map((k) => widthOf(set(`${k.mw}`, axis), axis)),
  );
  /** THE MAP IS THE SUBJECT, and how much of the plate it owes is `minMapShare`'s answer — one
   *  number, read here and again by the runner that picks the capacity threshold, because the two
   *  have to agree or the threshold is chosen against a camera the layout never delivers. */
  const mapBandFloor = STACKED ? (height - PAD * 2) * minMapShare(width, height) : 0;
  /** The band between where the panel's copy stops and where the source's own line begins, with air
   *  at both edges. */
  const mapBandOf = (l: { footTop: number; sourceTop: number }) => {
    const top = l.footTop + annotLead * 0.9;
    return { top, height: l.sourceTop - bodyLead - top };
  };

  const layoutFor = (
    panel: number,
    t: number,
    l: number,
    r: number,
    n: number,
    kicker: boolean,
    keyDia: number,
  ) => {
    const titleLines = wrap(set(title[t], display), panel, display);
    const standfirstLines = wrap(set(limits[l], body), panel, body);
    const readingLines =
      r < 0 ? [] : wrap(set(reading[r], annot), panel, annot);
    const sourceLines = wrap(set(source, body), panel, body);
    /** THE LIMIT NOTE WRAPS TOO. It was drawn as one unwrapped run and ran straight under the map —
     *  and no guard saw it, because the overlap and frame guards measure the PLATE's frame and this
     *  text was well inside that. A panel is a frame too, and every run in it is measured against
     *  the panel's own width. */
    /** The column the nested circles and their pushed labels occupy when the key is a row; every
     *  sentence beside them is wrapped against what is left, not against the whole panel. */
    const keyColWidth = KEY_IN_A_ROW ? keyDia + 8 + keyLabelW + 14 : 0;
    const noteWidth = KEY_IN_A_ROW ? panel - keyColWidth : panel - 18;
    const limitLines = wrap(set(limitNote[n], axis), KEY_IN_A_ROW ? noteWidth : panel, axis);
    /** EVERY RUN IN THE PANEL IS WRAPPED AGAINST THE PANEL. The key's two lines were drawn
     *  unwrapped and `nocturne`, whose annot register is tracked capitals, ran the first one under
     *  the map. There is no such thing as a line short enough to skip this: how wide a string is
     *  depends on the direction, and a direction is exactly what changes between plates. */
    const swatchInset = 18;
    const dotLines = wrap(set(dotIs, annot), noteWidth, annot);
    const subjectLines = wrap(set(subjectNote, annot), noteWidth, annot);
    /** THE SUBJECT COUNT SITS ON THE SAME BASELINE AS THE SWATCH SENTENCE WHERE BOTH ARE ONE LINE —
     *  again a re-arrangement, not a removal: « 33 sites nucléaires » keeps its own weight and its
     *  own ink, which is what makes it findable, and it stops owing a row of the annot register.
     *  Square is where a row of that register is the difference between a map and a caption. */
    const subjectGap = 12;
    const subjectInline =
      KEY_IN_A_ROW &&
      dotLines.length === 1 &&
      subjectLines.length === 1 &&
      widthOf(dotLines[0], annot) + subjectGap + widthOf(subjectLines[0], annot) <= noteWidth;
    const noteRows = dotLines.length + (subjectInline ? 0 : subjectLines.length);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    /** THE EYEBROW IS THE LAST RUNG. It names the section, not the argument, and every other line on
     *  this plate is the argument, the method or the attribution. It is spent only once the copy has
     *  been, and it is what closes the last 34px at 540x540. */
    const titleTop = kicker
      ? eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize
      : PAD + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.5517);
    const keyTop =
      limitsTop +
      standfirstLines.length * bodyLead +
      gapOf(annot, 0.8571) +
      annotBand.ascent;
    /** The key's biggest circle is drawn from `keyCircles`, whose radii are in map-width units, so
     *  its height depends on the camera — which is not known until the panel is chosen. The layout
     *  reserves the circle's own diameter at the widest camera this share can give, which is an
     *  over-reservation of a few pixels and never an under-one. */
    const keyCircleH = keyDia + keyRows;
    /** Where the key's own sentences start: under the circles when the key is a column, level with
     *  them when it is a row. */
    const notesTop = KEY_IN_A_ROW
      ? keyTop + annotBand.ascent
      : keyTop + keyCircleH + annotBand.ascent + 10;
    const limitTop = notesTop + noteRows * annotLead;
    const limitLead = axisBand.ascent + axisBand.descent + 2;
    const notesBottom = limitTop + limitLines.length * limitLead;
    /** A row is as tall as its taller stack — the circles, or the sentences beside them. */
    const keyBlockBottom = KEY_IN_A_ROW
      ? Math.max(keyTop + keyCircleH, notesBottom)
      : notesBottom;
    /**
     * AND A DROPPED READING LINE NOW RECOVERS ITS OWN GAP AND ASCENT, WHERE THE MAP IS STACKED.
     *
     * With `reading: -1` the foot still landed exactly where a one-line reading would have put it,
     * so the rung bought the map nothing at all and the ladder spent it for free — the same defect
     * `static-choropleth-europe-lowcarbon` found when square refused it by two pixels.
     *
     * IT IS NOT APPLIED TO THE BESIDE LAYOUT, and that is a deliberate boundary rather than an
     * oversight. Beside the map the rung does not buy the map height, it buys the PANEL slack — and
     * a rung that suddenly fits reopens the share the panel took, which re-wraps the headline and
     * redraws a landscape plate that was accepted as it stands. Measured here: landscape `creme`
     * moved from a wider share to 0.30, its headline from two lines to three. The correction is
     * worth having where it changes the map and is not worth a plate nobody asked to change.
     */
    const readingTop =
      r < 0 && STACKED
        ? keyBlockBottom
        : keyBlockBottom + annotBand.ascent + gapOf(annot, 0.4286);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const footTop =
      readingTop + Math.max(0, readingLines.length - 1) * annotLead;
    return {
      titleLines,
      kicker,
      standfirstLines,
      dotLines,
      subjectLines,
      subjectInline,
      subjectGap,
      noteRows,
      swatchInset,
      limitLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      keyTop,
      keyCircleH,
      keyColWidth,
      notesTop,
      limitTop,
      limitLead,
      readingTop,
      sourceTop,
      footTop,
      spare: sourceTop - bodyLead * 0.9 - footTop,
    };
  };

  const rungs: Array<{
    share: number;
    title: number;
    limit: number;
    reading: number;
    note: number;
    kicker: boolean;
  }> = [];
  for (const share of STACKED ? [1] : SHARES)
    for (let t = 0; t < title.length; t++)
      for (let l = 0; l < limits.length; l++) {
        for (let r = 0; r < reading.length; r++)
          rungs.push({ share, title: t, limit: l, reading: r, note: 0, kicker: true });
        rungs.push({ share, title: t, limit: l, reading: -1, note: 0, kicker: true });
      }
  /** THE LIMIT NOTE AND THE EYEBROW ARE SPENT AFTER THE WHOLE COPY LADDER, NOT BEFORE IT, and the
   *  order is not cosmetic: spending the note first changed the LANDSCAPE plate, which was accepted
   *  with its full note. Each is a pass over every rung already listed. */
  const base = [...rungs];
  for (let n = 1; n < limitNote.length; n++)
    for (const rung of base) rungs.push({ ...rung, note: n });
  for (const rung of [...rungs]) rungs.push({ ...rung, kicker: false });
  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
  } | null = null;
  /**
   * THE KEY'S CIRCLES AND THE MAP'S WIDTH EACH DEPEND ON THE OTHER, AND STACKED THAT IS A CIRCLE.
   *
   * The key states megawatts as areas, so its radii are in units of the DRAWN map's width or the key
   * is a decoration. Beside the map that width is known before the copy is laid out — it is the
   * column left over — and the layout simply reserves it. Stacked it is not: the map is fitted into
   * the band the copy leaves, so the band decides the map, the map decides the key, and the key is
   * part of the copy that decides the band.
   *
   * It is not solved by iterating, because it does not need to be. Everything but the key's own
   * diameter is fixed for a given copy rung, and the diameter is LINEAR in the map's width:
   *
   *     band = band0 - 2·r0·w      and      w = min(column, band · aspect)
   *
   * so where the fit is height-bound, band = band0 / (1 + 2·r0·aspect), exactly. Where that answer
   * would be wider than the column the map is width-bound instead, and w is the column.
   *
   * Reserving the column's whole width for the key — the first attempt — made the key three times
   * the size of the map it belonged to and left the map 88px of a 540px frame.
   */
  const solveFor = (rung: (typeof rungs)[number]) => {
    const panel = panelFor(rung.share);
    const bare = layoutFor(panel, rung.title, rung.limit, rung.reading, rung.note, rung.kicker, 0);
    if (!STACKED) {
      const keyDia = keyCircles[0].r * mapWidthFor(panel) * 2;
      const l = layoutFor(panel, rung.title, rung.limit, rung.reading, rung.note, rung.kicker, keyDia);
      return { layout: l, got: l.spare };
    }
    const band0 = mapBandOf(bare).height;
    const heightBound = band0 / (1 + 2 * keyCircles[0].r * aspect);
    const band =
      heightBound * aspect <= width - PAD * 2
        ? heightBound
        : band0 - keyCircles[0].r * (width - PAD * 2) * 2;
    const keyDia = keyCircles[0].r * Math.min(width - PAD * 2, band * aspect) * 2;
    const l = layoutFor(panel, rung.title, rung.limit, rung.reading, rung.note, rung.kicker, keyDia);
    return { layout: l, got: mapBandOf(l).height };
  };

  let best = -Infinity;
  for (const rung of rungs) {
    const { layout: l, got } = solveFor(rung);
    if (got > best) best = got;
    if (got >= mapBandFloor) {
      fits = { rung, layout: l };
      break;
    }
  }
  if (!fits)
    throw new Error(
      STACKED
        ? `the panel's copy leaves the map ${best.toFixed(0)}px of a ${height}px frame and a map beat ` +
          `owes ${mapBandFloor.toFixed(0)}px. Give the beat shorter forms — do not shrink the map, ` +
          `which is the subject.`
        : `the panel's copy does not fit its column in this direction, at any share. Give the beat ` +
          `shorter forms — do not shrink the map, which is the subject.`,
    );
  const layout = fits.layout;
  const panel = panelFor(fits.rung.share);
  const mapBand = mapBandOf(layout);
  const mapBox = STACKED
    ? { x: PAD, y: mapBand.top, width: width - PAD * 2, height: mapBand.height }
    : {
        x: PAD + panel + GUTTER,
        y: PAD,
        width: width - PAD * 2 - panel - GUTTER,
        height: height - PAD * 2,
      };
  /** BESIDE: FILL THE BOX AND CROP, never letterbox — the map is the subject, its box is as tall as
   *  the plate, and the ground it gives up is the far east while the field it must not lose is
   *  Iberia. STACKED: FIT inside the band instead. The box is only as tall as the copy left it, so
   *  filling it draws a vertical sliver at several times the frame's own width — measured at
   *  540x960, a 1126px camera in a 297px window, which resvg aborted on. A whole map that is smaller
   *  is a map; a sliver of one is not. */
  const fill = STACKED
    ? Math.min(mapBox.width, mapBox.height * aspect)
    : Math.max(mapBox.width, mapBox.height * aspect);
  const mapW = fill;
  const mapH = fill / aspect;
  /** STACKED: centred in its band on both axes, because it is FIT rather than filled and a band
   *  shorter than the plate is wide leaves slack on the sides. */
  const mapX = STACKED ? mapBox.x + (mapBox.width - mapW) / 2 : mapBox.x;
  const mapY = mapBox.y + (mapBox.height - mapH) / 2;
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      `, limit note ${fits.rung.note + 1}` +
      (fits.rung.kicker ? "" : ", eyebrow dropped") +
      ` · ${STACKED ? "stacked" : "beside"} · panel ${panel}px · map ${mapW.toFixed(0)} x ` +
      `${mapH.toFixed(0)} · ${symbols.length} circles`,
  );

  /** THE RADII ARRIVE ALREADY COMPUTED, in units of the drawn map's width, because the square-root
   *  scale and the key's own circles have to come from one place or the key is a decoration. The
   *  component only scales them to the camera it ended up with. */
  const rOf = (u: number) => u * mapW;

  /** THE INK FLOOR, ENFORCED AT THE CAMERA THIS DIRECTION ACTUALLY GOT. The beat chooses which
   *  stations to draw; this refuses to ship a field that has fused whatever the beat chose. Forty
   *  per cent is the point past which the outlines in a cell start closing into a solid — measured
   *  on this data, not assumed. */
  const INK_FLOOR = 40;
  const inkShare = worstCellInk(symbols, mapW, aspect, 0.7);
  if (inkShare > INK_FLOOR)
    throw new Error(
      `the busiest cell of this map is ${inkShare.toFixed(0)} % ink and the floor is ${INK_FLOOR} %. ` +
        `${symbols.length} hollow circles have fused into a blot: the overlap rule keeps a cluster ` +
        `countable only while the cluster is countable. Draw fewer symbols.`,
    );
  onLadder?.(`ink: busiest cell ${inkShare.toFixed(0)} % of ${INK_FLOOR} % allowed, ${symbols.length} circles`);

  /** THE KEY'S GEOMETRY, COMPUTED ONCE AND ABOVE THE MARKUP. Its labels are pushed apart, so where
   *  the key's text block starts depends on where the LAST label landed — and a block placed from
   *  the circles' own height instead put `100` on top of the sentence under it. A stack's extent is
   *  not known until the stack has been built. */
  const keyBig = rOf(keyCircles[0].r);
  const keyCx = PAD + keyBig + 1;
  const keyBase = layout.keyTop + keyBig * 2;
  const keyPitch = axisBand.ascent + axisBand.descent + 3;
  const keyTops = keyCircles.map((k) => keyBase - rOf(k.r) * 2);
  const keyYs: number[] = [];
  for (let i = 0; i < keyTops.length; i++)
    keyYs.push(i === 0 ? keyTops[i] : Math.max(keyTops[i], keyYs[i - 1] + keyPitch));
  const keyTextTop =
    Math.max(keyBase, keyYs[keyYs.length - 1] + axisBand.descent) + annotBand.ascent + 8;
  /** WHERE THE KEY'S SENTENCES ARE SET. A column puts them under the circles, at the panel's own
   *  left edge and measured off the stack that was actually built; a row puts them to the RIGHT of
   *  the circles, level with the top of the key, where `layoutFor` already reserved their column. */
  const notesX = KEY_IN_A_ROW ? PAD + layout.keyColWidth : PAD;
  const notesY0 = KEY_IN_A_ROW ? layout.notesTop : keyTextTop;

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

      {layout.kicker ? (
        <text x={PAD} y={layout.eyebrowBaseline} {...line(eyebrowReg)}>
          {set(eyebrow, eyebrowReg)}
        </text>
      ) : null}
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
      {layout.standfirstLines.map((l, i) => (
        <text
          key={l + i}
          x={PAD}
          y={layout.limitsTop + i * bodyLead}
          {...line(body)}
        >
          {l}
        </text>
      ))}

      {/* A RADIUS IS NOT READ BY EYE, so the key carries circles at stated megawatts rather than a
          sentence claiming the area is proportional. Nested from the same centre, which is what lets
          a reader compare two of them without moving their eye. */}
      <g>
        {keyCircles.map((k, i) => (
          <g key={k.mw}>
            <circle
              cx={keyCx}
              cy={keyBase - rOf(k.r)}
              r={rOf(k.r)}
              fill="none"
              stroke={mutedInk}
              strokeWidth={0.8}
            />
            <path
              d={`M ${keyCx} ${keyTops[i].toFixed(1)} L ${(keyCx + keyBig + 4).toFixed(1)} ${keyYs[i].toFixed(1)}`}
              fill="none"
              stroke={mutedInk}
              strokeWidth={0.5}
            />
            <text
              x={keyCx + keyBig + 8}
              y={keyYs[i] + axisBand.ascent * 0.5}
              {...line(axis)}
              fill={mutedInk}
            >
              {set(`${k.mw}`, axis)}
            </text>
          </g>
        ))}
        {layout.dotLines.map((l, i) => (
          <text
            key={`d${i}`}
            x={notesX}
            y={notesY0 + i * annotLead}
            {...line(annot)}
            fill={mutedInk}
          >
            {l}
          </text>
        ))}
        {layout.subjectLines.map((l, i) => (
          <text
            key={`sub${i}`}
            x={
              layout.subjectInline
                ? notesX + widthOf(layout.dotLines[0], annot) + layout.subjectGap
                : notesX
            }
            y={
              layout.subjectInline
                ? notesY0
                : notesY0 + (layout.dotLines.length + i) * annotLead
            }
            {...line(annot)}
            fill={subjectInk}
            fontWeight={700}
          >
            {l}
          </text>
        ))}
        {layout.limitLines.map((l, i) => (
          <text
            key={`lim${i}`}
            x={notesX}
            y={
              notesY0 + 4 + layout.noteRows * annotLead + i * layout.limitLead
            }
            {...line(axis)}
            fill={mutedInk}
          >
            {l}
          </text>
        ))}
      </g>


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

      {/* THE CLIP IS THE CAMERA, NOT THE BAND — and stacked the two are not the same rectangle.
          The band is as wide as the plate and only as tall as the copy left it, so a map FITTED
          into it is narrower than the band by whatever the letterbox is: 154px of a 428px band at
          540x540. Clipped and backed to the BOX, that leftover was painted flat with the sea tint
          and read as open water running to the plate's own margins — a sea nobody surveyed, on
          both sides of a map whose edge had disappeared. Clipped to the camera, the map ends where
          its ground ends. Beside the copy the map FILLS its box and the two rectangles are the
          same, so the landscape plate is drawn exactly as it was accepted. */}
      <defs>
        <clipPath id="camera">
          <rect
            x={STACKED ? mapX : mapBox.x}
            y={STACKED ? mapY : mapBox.y}
            width={STACKED ? mapW : mapBox.width}
            height={STACKED ? mapH : mapBox.height}
          />
        </clipPath>
      </defs>

      <g clipPath="url(#camera)">
        {/* MapTiler's geography, baked once per filed direction in that direction's own tints. The
            rect under it is a backstop for a short bake, never a second basemap. */}
        <rect
          x={STACKED ? mapX : mapBox.x}
          y={STACKED ? mapY : mapBox.y}
          width={STACKED ? mapW : mapBox.width}
          height={STACKED ? mapH : mapBox.height}
          fill={water}
        />
        {/* STACKED: THE PLATE IS LAID ON THE CAMERA, NOT ON THE BOX. The shapes and the symbols are
            drawn at `mapX/mapY/mapW`, so a plate stretched to the box instead lands out of register
            with its own coastlines the moment the box and the camera differ — and under the stacked
            form they differ by whatever the band letterboxes. Beside, the two are within 2 % of each
            other and the box is kept so that the landscape plate this beat was accepted at is drawn
            exactly as it was. */}
        <image
          href={plate}
          x={STACKED ? mapX : mapBox.x}
          y={STACKED ? mapY : mapBox.y}
          width={STACKED ? mapW : mapBox.width}
          height={STACKED ? mapH : mapBox.height}
          preserveAspectRatio="none"
        />
        {shapes.map((s) => (
          <path
            key={s.iso}
            d={s.d}
            transform={`translate(${mapX} ${mapY}) scale(${mapW / 1000})`}
            fill={land}
            stroke={coast}
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* THE FIELD. Every circle at the coordinates its source recorded, its AREA proportional to
            the station's capacity — and HOLLOW, so a cluster piles into a countable knot instead of
            a big disc erasing the small ones under it. That is the whole reason this plate can be
            read at all: sized and filled, Europe's nuclear circles would cover the wind farms
            beside them and the map would answer its own question by hiding the evidence. */}
        <g>
          {symbols
            .filter((d) => !d.subject)
            .map((d, i) => (
              <circle
                key={i}
                cx={mapX + d.x * mapW}
                cy={mapY + d.y * mapW}
                r={Math.max(0.7, rOf(d.r))}
                fill="none"
                stroke={dotInk}
                strokeWidth={0.7}
                opacity={0.7}
              />
            ))}
        </g>

        {on("the-subject-is-ringed-not-recoloured") &&
          symbols
            .filter((d) => d.subject)
            .map((d, i) => (
              <circle
                key={`s${i}`}
                cx={mapX + d.x * mapW}
                cy={mapY + d.y * mapW}
                r={Math.max(1.2, rOf(d.r))}
                fill="none"
                stroke={subjectInk}
                strokeWidth={1.6}
              />
            ))}
      </g>
    </svg>
  );
}
