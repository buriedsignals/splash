/**
 * Ukrainians under temporary protection in Europe, drawn as bands whose width is the number of
 * people, THROUGH the design base. The first `flow map` component in this tree.
 *
 * MINARD, REVERSED. The reference harvested for this form is Minard's 1862 plate — many origins, one
 * destination, band width in tonnes, conserved along the network. This is that form with the arrow
 * turned round, and the four rules the record files survive the inversion:
 *
 *   **Width is the quantity, and it is conserved.** Here the conservation is at the SOURCE: the
 *   node's circumference IS the total, and each band leaves through an arc of that circumference
 *   exactly as wide as its own number. The node is not sized by the city it sits on; it is sized by
 *   what the bands need, which is the record's own rule for Minard's Paris disc.
 *
 *   **State the width scale in the key, in the data's units.** Minard's plate says "un millimètre
 *   pour mille tonnes". This one prints how many people one pixel of width is worth, measured at the
 *   size the plate actually drew.
 *
 *   **The route is schematic and the basemap is furniture.** The bands are not itineraries — nobody
 *   travelled along these curves — and the plate says so in its reading line. Under them the map is
 *   land in one faint step off the ground, no borders, no water tint: `PALETTE.md` records why.
 *
 *   **Every other place is a name at the end of its band.**
 *
 * A BAND TOO THIN TO SEE IS NOT DRAWN, AND IS COUNTED. Below the floor a band is thinner than a
 * hairline and reads as a scratch; those countries keep a dot at their seat and are named, with
 * their total, in a line under the map. Silently dropping them would make the circumference lie.
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix } from "#shared/chart-beat/colour.mjs";
import { applyCase, DERIVED_SIZE_RATIO } from "#shared/chart-beat/registers.mjs";
import { frameInsetFor, viewedAtCssPx } from "#shared/chart-beat/sizes.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Shape = { iso: string; host: boolean; origin: boolean; d: string };
export type Band = {
  code: string;
  name: string;
  people: number;
  seat: number[];
  subject: boolean;
};
type Box = { x0: number; y0: number; x1: number; y1: number };

export function DirectedFlowMap({
  plate,
  shapes,
  bands,
  originSeat,
  focus,
  originLabel,
  total,
  aspect,
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
  bands: Band[];
  originSeat: number[];
  focus: { x0: number; y0: number; x1: number; y1: number };
  originLabel: string;
  total: number;
  aspect: number;
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
  const SIZE =
    width > height ? "landscape" : width === height ? "square" : "portrait";
  /**
   * THE MARGIN IS A PROPORTION OF THE PLATE, AND THE DIRECTION FILED ITS OWN ON A 960-WIDE ONE.
   *
   * `nocturne`'s filed 56 is 12 % of the plate it was measured on and 21 % of a 540-wide one, and
   * at a reflowed frame it is spent twice: height the map's band comes out of, and width the copy
   * is set across. Scaled rather than replaced, and never below the toolchain's own inset for the
   * size (`frameInsetFor`, two type floors).
   */
  const PAD =
    SIZE === "landscape"
      ? direction.pad
      : Math.max(
          frameInsetFor(SIZE) / 2,
          Math.round((direction.pad * width) / FRAME.width),
        );

  const reg = (name: RegisterName) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const value = reg("value");

  const set = (text: string, r: { transform: string }) => applyCase(text, r.transform);
  const sizeOf = (r: any) => ({
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    fontFamily: r.fontFamily,
  });
  const widthOf = (text: string, r: any) =>
    measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
  const bandOf = (r: any) => measureTextBand("Hxpg1,", sizeOf(r));

  function wrap(text: string, maxWidth: number, r: any): string[] {
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
  const accentInk = adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN);
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);

  /** French thousands with an ordinary space: `toLocaleString("fr-FR")` emits U+202F, which no face
   *  on this base's family ladders covers, and one uncovered glyph refuses every family. */
  const grouped = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const land = mix(direction.ground, ink, 0.075);
  /** THE BANDS ARE OPAQUE, AND THE TRANSPARENCY IS BAKED INTO THE COLOUR RATHER THAN SET AS AN
   *  ALPHA. An `opacity` on a path makes it a LAYER; a layer inside a clip whose bounds fall outside
   *  that clip gives the rasteriser an empty rectangle to round out, and resvg aborts the process
   *  rather than throwing — `called Option::unwrap() on a None value`, with no plate and no stack.
   *  Mixing the tone toward the ground gives the same tone and no layer. Minard's bands are opaque
   *  too: a band that shows what is under it is a band whose width a reader stops trusting. */
  const flow = mix(direction.accent, direction.ground, 0.38);
  const subjectFlow = direction.accent;
  const nodeInk = adjustToContrast(ink, direction.ground, TEXT_CONTRAST_MIN);

  // ── the ladder ────────────────────────────────────────────────────────────
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);
  const SHARES = [0.3, 0.34, 0.38, 0.42, 0.46];
  const GUTTER = 24;
  const panelFor = (share: number) => Math.round((width - PAD * 2) * share);

  /**
   * TWO LAYOUTS, AND THE FRAME CHOOSES — `static-choropleth-europe-lowcarbon`'s worked answer.
   *
   * Beside the map is right at landscape: a map's aspect is fixed by the ground it shows, so the
   * copy takes the column the map does not need. At a square or tall plate there is no such column.
   * Measured 2026-09-23 at 540x540: the panel came to 131px and two of the three directions refused
   * outright — « the panel's copy does not fit its column, at any share » — while at 540x960 the
   * footnote could not be wrapped into the rows the layout had budgeted for it.
   *
   * So below the width where a column can hold a map at least as wide as it is tall, the copy goes
   * on top at full width and the map takes a measured band underneath.
   */
  const besideWidth = width - PAD * 2 - panelFor(SHARES[0]) - GUTTER;
  const STACKED = besideWidth < height - PAD * 2;
  /** THE MAP IS THE SUBJECT, so a stacked ladder has to leave a map-sized band, not merely clear
   *  the foot. A third of the usable height is the choropleth's own statement about what a map beat
   *  IS, rather than a number tuned to make one plate pass. */
  const MIN_MAP_SHARE = 1 / 3;
  const mapBandFloor = STACKED ? (height - PAD * 2) * MIN_MAP_SHARE : 0;
  /** AND THE BAND STARTS WHERE THE INK STOPS, NOT WHERE A DROPPED LINE WOULD HAVE BEEN. `footTop`
   *  is the reading line's baseline, and the ladder drops that line at square — so the band began
   *  a whole reading block below the last thing drawn, and this map fills its band on both axes, so
   *  every pixel of that came straight off the map. `spare` keeps reading `footTop`: it is the
   *  number the beside ladder was accepted on. */
  const mapBandOf = (l: { copyBottom: number; sourceTop: number }) => {
    const top = l.copyBottom + annotLead * BAND_AIR;
    return { top, height: l.sourceTop - bodyLead - top };
  };

  /** THE FOOTNOTE'S ROWS ARE BUDGETED BEFORE ITS SENTENCE EXISTS — its wording depends on the band
   *  floor, which depends on the node's radius, which depends on this very layout. Landscape keeps
   *  the flat 4 it was tuned at. At a reflowed frame the budget is taken from the sentence's own
   *  WORST case instead — the widest numbers it can carry — because at 540 the real one needed five
   *  rows against the four reserved and all that was left was a refusal. */
  /** AND THE FOOTNOTE ITSELF TAKES A SHORTER FORM AT A REFLOWED FRAME. It is the same statement —
   *  how many countries are under the band floor and what share they hold — said in one row instead
   *  of two, which is the « give the beat shorter forms » the refusal asks for rather than dropping
   *  the fact. The one sentence it loses says that the ones inside the frame carry a dot, and the
   *  dots are on the plate for a reader to see. */
  const dottedNoteFor = (count: number, share: string) =>
    SIZE === "landscape"
      ? `Les ${count} autres pays, ${share} % du total : ruban trop fin, ou pays hors cadre. ` +
        `Ceux qui sont dans le cadre portent un point.`
      : `Les ${count} autres pays (${share} % du total) : ruban trop fin, ou hors cadre.`;
  const WORST_DOTTED_NOTE = dottedNoteFor(999, "99");

  /** THE AIR INSIDE THE COPY BLOCK, TIGHTENED AT A REFLOWED FRAME. Every one of these is a gap
   *  measured on a 960-wide plate, and stacked they are spent against a band the map owes a third
   *  of the plate for. Measured at square: the copy left 135px where the map owed 156, and this is
   *  where the difference was. Landscape keeps the numbers it was accepted at. */
  const KEY_ROW_AIR = SIZE === "landscape" ? 6 : 3;
  const KEY_GAP = SIZE === "landscape" ? 0.8571 : 0.6;
  const READING_GAP = SIZE === "landscape" ? 1 : 0.7;
  const BAND_AIR = SIZE === "landscape" ? 0.9 : 0.6;

  /**
   * HOW SMALL A HEADLINE MAY GET AND STILL BE ONE — the two floors the choropleth states. The large
   * text relaxation binds only where the filed size already clears it; landscape never walks this
   * ladder, and stacked the headline is the last thing spent after the panel share has ceased to
   * exist as a rung.
   */
  const LARGE_TEXT_CSS_PX = 24;
  const LARGE_TEXT_BOLD_CSS_PX = 18.66;
  const displayAt = (fontSize: number) => ({
    ...display,
    fontSize,
    letterSpacing: (display.letterSpacing * fontSize) / display.fontSize,
  });
  const displayRungs: Array<typeof display> =
    SIZE === "landscape"
      ? [display]
      : (() => {
          const largeText =
            (Number(display.fontWeight) >= 700
              ? LARGE_TEXT_BOLD_CSS_PX
              : LARGE_TEXT_CSS_PX) *
            (width / viewedAtCssPx(SIZE));
          const floor =
            display.fontSize >= largeText
              ? Math.max(largeText, display.fontSize * DERIVED_SIZE_RATIO)
              : display.fontSize * DERIVED_SIZE_RATIO;
          const out: Array<typeof display> = [display];
          for (let s = display.fontSize - 0.5; s >= floor - 1e-9; s -= 0.5)
            out.push(displayAt(Math.round(s * 100) / 100));
          return out;
        })();

  const layoutFor = (
    panel: number,
    t: number,
    l: number,
    r: number,
    dsp: typeof display,
  ) => {
    const titleLines = wrap(set(title[t], dsp), panel, dsp);
    const dspLead = leadOf(dsp);
    const limitLines = wrap(set(limits[l], body), panel, body);
    /** ROOM IS RESERVED FOR THE FOOTNOTE BEFORE IT EXISTS. Its text depends on the node's radius,
     *  which depends on the map box, which depends on this layout — so the rows are budgeted here
     *  and the component throws below if the finished sentence needs more than the budget. A panel
     *  is a frame too, and this note ran under the map on its first render. */
    const dottedLines =
      SIZE === "landscape"
        ? 4
        : wrap(set(WORST_DOTTED_NOTE, axis), panel, axis).length;
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), panel, annot);
    const sourceLines = wrap(set(source, body), panel, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + dsp.fontSize;
    const limitsTop =
      titleTop + titleLines.length * dspLead + gapOf(body, 0.5517);
    const keyTop =
      limitsTop + limitLines.length * bodyLead + gapOf(annot, KEY_GAP) + annotBand.ascent;
    const keyRows = 3;
    const dottedTop =
      keyTop + keyRows * (annotBand.ascent + annotBand.descent + KEY_ROW_AIR) + axisBand.ascent;
    const dottedLead = axisBand.ascent + axisBand.descent + 2;
    const readingTop =
      dottedTop +
      Math.max(0, dottedLines - 1) * dottedLead +
      axisBand.descent +
      gapOf(annot, READING_GAP) +
      annotBand.ascent;
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const footTop = readingTop + Math.max(0, readingLines.length - 1) * annotLead;
    /** The last descender the copy actually draws: the reading line's when there is one, and the
     *  footnote's own last budgeted row when the ladder has spent it. */
    const copyBottom = readingLines.length
      ? readingTop + (readingLines.length - 1) * annotLead + annotBand.descent
      : dottedTop + Math.max(0, dottedLines - 1) * dottedLead + axisBand.descent;
    return {
      titleLines,
      titleLead: dspLead,
      footTop,
      copyBottom,
      limitLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      keyTop,
      dottedLines,
      dottedTop,
      dottedLead,
      readingTop,
      sourceTop,
      spare: sourceTop - bodyLead * 1.4 - footTop,
    };
  };

  const rungs: Array<{
    share: number;
    title: number;
    limit: number;
    reading: number;
    display: typeof display;
  }> = [];
  /** THE HEADLINE IS SPENT LAST, NOT FIRST. Ordered with the panel's share outermost — which is what
   *  the sibling map beats do, because there the map is the whole subject — this plate gave up its
   *  claim ("4,5 millions… la moitié") to keep the narrowest panel, and shipped a title that says
   *  only what the plate is about. A wider panel costs the map some ground; a shorter headline costs
   *  the beat its sentence. */
  for (let t = 0; t < title.length; t++)
    for (const share of STACKED ? [1] : SHARES)
      for (const dsp of displayRungs)
        for (let l = 0; l < limits.length; l++) {
          for (let r = 0; r < reading.length; r++)
            rungs.push({ share, title: t, limit: l, reading: r, display: dsp });
          rungs.push({ share, title: t, limit: l, reading: -1, display: dsp });
        }
  let fits: { rung: (typeof rungs)[number]; layout: ReturnType<typeof layoutFor> } | null = null;
  for (const rung of rungs) {
    const l = layoutFor(
      STACKED ? width - PAD * 2 : panelFor(rung.share),
      rung.title,
      rung.limit,
      rung.reading,
      rung.display,
    );
    if ((STACKED ? mapBandOf(l).height : l.spare) >= mapBandFloor) {
      fits = { rung, layout: l };
      break;
    }
  }
  if (!fits)
    throw new Error(
      (STACKED
        ? `the copy leaves no room for the map in this direction: the shortest rung at the smallest ` +
          `headline leaves ${rungs
            .map((rung) =>
              mapBandOf(
                layoutFor(width - PAD * 2, rung.title, rung.limit, rung.reading, rung.display),
              ).height,
            )
            .reduce((a, b) => Math.max(a, b), 0)
            .toFixed(0)}px where the map owes ${mapBandFloor.toFixed(0)}. `
        : `the panel's copy does not fit its column in this direction, at any share. `) +
        `Give the beat shorter forms — do not shrink the map, which is the subject.`,
    );
  const layout = fits.layout;
  const drawnDisplay = fits.rung.display;
  const titleLead = layout.titleLead;
  const panel = STACKED ? width - PAD * 2 : panelFor(fits.rung.share);
  const band = mapBandOf(layout);
  const mapBox = STACKED
    ? { x: PAD, y: band.top, width: width - PAD * 2, height: band.height }
    : {
        x: PAD + panel + GUTTER,
        y: PAD,
        width: width - PAD * 2 - panel - GUTTER,
        height: height - PAD * 2,
      };
  /** THE CAMERA IS THE BOX THE FLOWS NEED. `render-directions.mjs` computes it from the origin and
   *  the ten largest hosts; here it is fitted into the map box without distortion — the map fills the
   *  box and crops whatever the aspect ratios do not share, which for a fitted box is very little. */
  const focusW = focus.x1 - focus.x0;
  const focusH = focus.y1 - focus.y0;
  /** CONTAIN, NOT COVER. `Math.max` fills the box and crops what does not fit — which is right for
   *  the sibling map beats, whose subject is the whole continent, and wrong here: it pushed the node
   *  every band leaves from off the right edge. The focus box is the thing that must be whole. */
  const scale = Math.min(mapBox.width / focusW, mapBox.height / focusH);
  const mapW = 1000 * scale;
  const mapX = mapBox.x + mapBox.width / 2 - ((focus.x0 + focus.x1) / 2) * scale;
  const mapY = mapBox.y + mapBox.height / 2 - ((focus.y0 + focus.y1) / 2) * scale;
  const at = ([x, y]: number[]) => [mapX + x * scale, mapY + y * scale];
  /** THE CAMERA IS WHAT THE PLATE COVERS, NOT WHAT THE COLUMN OFFERS. Containing the focus box
   *  leaves the plate shorter than the box it was fitted into, and a mark placed in that shortfall
   *  would sit on the bare page with no geography under it. So the camera is the box ∩ the plate:
   *  everything — the clip, the in-frame tests, the label seats — is measured against it. */
  const plateH = mapW / aspect;
  const camera = {
    x: Math.max(mapBox.x, mapX),
    y: Math.max(mapBox.y, mapY),
    width: Math.min(mapBox.x + mapBox.width, mapX + mapW) - Math.max(mapBox.x, mapX),
    height: Math.min(mapBox.y + mapBox.height, mapY + plateH) - Math.max(mapBox.y, mapY),
  };

  /** WHAT THIS PLATE TRIED FIRST, AND WHY IT WAS WRONG.
   *
   *  The first version made the bands TILE the node's circumference, so that the sum of the widths
   *  was literally the ring and the total was never asserted. It was unreadable, and the reason is
   *  structural rather than a matter of degree: **an arc of the rim is a direction, and spending the
   *  rim on widths spends the directions.** Germany's band alone needed a hundred degrees, so it left
   *  wherever the walk put it and swept back across the map — twenty-five ribbons crossing each other
   *  over the countries they were about.
   *
   *  Conservation is Minard's rule and it belongs to a NETWORK: a band that splits at a junction
   *  splits its width. A fan out of one origin has no junctions, so there is nothing for the rule to
   *  hold, and inventing a geometry to make it look like there is cost the plate its legibility.
   *  The total is printed instead, with the share the drawn bands carry.
   *
   *  So: every band leaves at its OWN bearing, straight to its destination, and the widths are set
   *  by a scale the key draws rather than by the rim. */
  const nodeLabelWidth = widthOf(set(originLabel, axis), axis);
  const NODE_RADIUS = Math.max(13, nodeLabelWidth / 2 + 7);

  /** HOW MANY BANDS, AND HOW WIDE, ARE ONE MEASUREMENT. The widest band is capped at a share of the
   *  map so the plate stays a map; the rest follow from it, and a band under the floor is not drawn.
   *  The beat then draws as many of the largest hosts as clear that floor. */
  const biggest = Math.max(...bands.map((b) => b.people));
  const WIDEST = Math.min(camera.width * 0.05, 17);
  const perPixel = biggest / WIDEST;
  const widthOfPeople = (people: number) => people / perPixel;
  const FLOOR = 1.15;

  const ranked = [...bands].sort((a, b) => b.people - a.people);
  /** A BAND WHOSE DESTINATION IS OUTSIDE THE FRAME IS NOT DRAWN, IT IS COUNTED. The camera is fitted
   *  to the largest hosts; a band to a country beyond that box runs off the edge and cannot be
   *  named, and an unnamed ribbon leaving the plate is a quantity going nowhere. */
  const inFrame = (b: Band) => {
    const [x, y] = at(b.seat);
    return (
      x > camera.x + 4 &&
      x < camera.x + camera.width - 4 &&
      y > camera.y + 4 &&
      y < camera.y + camera.height - 4
    );
  };
  const drawn = ranked.filter((b) => widthOfPeople(b.people) >= FLOOR && inFrame(b));
  const dotted = ranked.filter((b) => !(widthOfPeople(b.people) >= FLOOR && inFrame(b)));
  if (!drawn.some((b) => b.subject))
    throw new Error(`the subject's own band falls under the floor, and the headline is about it`);
  const drawnShare = (drawn.reduce((s, b) => s + b.people, 0) / total) * 100;

  const origin = at(originSeat);
  const bearing = (b: Band) => {
    const [x, y] = at(b.seat);
    return Math.atan2(y - origin[1], x - origin[0]);
  };

  /** The band leaves the rim at its own bearing and bows a little, so two destinations on close
   *  bearings separate before they arrive. The bow is a fraction of the chord and alternates side by
   *  the destination's own position, never by taste. */
  const pathOf = (b: Band) => {
    const angle = bearing(b);
    const start = [
      origin[0] + Math.cos(angle) * NODE_RADIUS,
      origin[1] + Math.sin(angle) * NODE_RADIUS,
    ];
    const end = at(b.seat);
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const len = Math.hypot(dx, dy) || 1;
    const bow = Math.min(len * 0.1, 22) * (b.seat[1] < originSeat[1] ? -1 : 1);
    const control = [(start[0] + end[0]) / 2 - (dy / len) * bow, (start[1] + end[1]) / 2 + (dx / len) * bow];
    return `M ${start[0].toFixed(1)} ${start[1].toFixed(1)} Q ${control[0].toFixed(1)} ${control[1].toFixed(1)} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
  };

  /** EVERY DRAWN BAND IS NAMED AT ITS OWN END, at the first of eight offsets that clears the labels
   *  already placed and stays inside the camera. A band with no name is a quantity going nowhere. */
  const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  /** THE NODE IS THE FIRST THING PLACED. It carries its own name inside itself, so it is a label
   *  like the others — and a host's name printed across it is the same defect as two host names
   *  printed across each other. Only a shared set makes marks of the same kind see each other. */
  const placed: Box[] = [
    {
      x0: origin[0] - NODE_RADIUS,
      y0: origin[1] - NODE_RADIUS,
      x1: origin[0] + NODE_RADIUS,
      y1: origin[1] + NODE_RADIUS,
    },
  ];
  const labels: Array<{ b: Band; x: number; y: number; anchor: "start" | "end" | "middle"; text: string }> = [];
  let unnamed = 0;
  for (const b of [...drawn].sort((a, c) => c.people - a.people)) {
    const end = at(b.seat);
    const text = `${b.name} ${Math.round(b.people / 1000)}k`;
    const w = widthOf(set(text, axis), axis);
    const h = axisBand.ascent + axisBand.descent;
    let seat: (typeof labels)[number] | null = null;
    for (const [dx, dy, anchor] of [
      [9, h / 2 - axisBand.descent, "start"],
      [-9, h / 2 - axisBand.descent, "end"],
      [0, -10, "middle"],
      [0, 14, "middle"],
      [9, -11, "start"],
      [-9, -11, "end"],
      [9, 15, "start"],
      [-9, 15, "end"],
    ] as Array<[number, number, "start" | "end" | "middle"]>) {
      const x = end[0] + dx;
      const y = end[1] + dy;
      const left = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
      const box = { x0: left - 2, y0: y - axisBand.ascent, x1: left + w + 2, y1: y + axisBand.descent };
      if (box.x0 < camera.x + 2 || box.x1 > camera.x + camera.width - 2) continue;
      if (box.y0 < camera.y + 2 || box.y1 > camera.y + camera.height - 2) continue;
      if (placed.some((p) => overlaps(p, box))) continue;
      placed.push(box);
      seat = { b, x, y, anchor, text };
      break;
    }
    if (seat) labels.push(seat);
    else unnamed++;
  }

  const dottedNote =
    dotted.length > 0
      ? dottedNoteFor(dotted.length, (100 - drawnShare).toFixed(0))
      : "";
  const keyNote = `${drawn.length} rubans dessinés, ${Math.round(drawnShare)} % des ${grouped(total)} personnes.`;
  const dottedLines = dottedNote ? wrap(set(dottedNote, axis), panel, axis) : [];
  if (dottedLines.length > layout.dottedLines)
    throw new Error(
      `the footnote naming the countries under the floor needs ${dottedLines.length} lines and the ` +
        `layout reserved ${layout.dottedLines}. A row that is drawn has to be a row that is budgeted.`,
    );

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · node r=${NODE_RADIUS.toFixed(0)}px, ${Math.round(perPixel)} people per pixel · ` +
      `${drawn.length} bands drawn, ${dotted.length} under the floor, ${unnamed} unnamed · ` +
      `${STACKED ? "stacked" : `panel ${panel}px`} · headline ${drawnDisplay.fontSize.toFixed(1)}px`,
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
        <text key={l + i} x={PAD} y={layout.titleTop + i * titleLead} {...line(drawnDisplay)}>
          {l}
        </text>
      ))}
      {layout.limitLines.map((l, i) => (
        <text key={l + i} x={PAD} y={layout.limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {/* THE WIDTH SCALE, DRAWN — Minard prints "un millimètre pour mille tonnes"; a plate whose
          scale is a sentence about pixels tells a reader nothing they can measure. Two sample bands
          at stated counts, at exactly the widths the map uses. */}
      {[1000000, 100000].map((n, i) => (
        <g key={`key${n}`}>
          <line
            x1={PAD}
            x2={PAD + 26}
            y1={layout.keyTop - annotBand.ascent * 0.35 + i * (annotBand.ascent + annotBand.descent + KEY_ROW_AIR)}
            y2={layout.keyTop - annotBand.ascent * 0.35 + i * (annotBand.ascent + annotBand.descent + KEY_ROW_AIR)}
            stroke={flow}
            strokeWidth={widthOfPeople(n)}
          />
          <text
            x={PAD + 34}
            y={layout.keyTop + i * (annotBand.ascent + annotBand.descent + KEY_ROW_AIR)}
            {...line(axis)}
            fill={mutedInk}
          >
            {set(`${grouped(n)} personnes`, axis)}
          </text>
        </g>
      ))}
      <text
        x={PAD}
        y={layout.keyTop + 2 * (annotBand.ascent + annotBand.descent + KEY_ROW_AIR) + 2}
        {...line(axis)}
        fill={mutedInk}
      >
        {set(keyNote, axis)}
      </text>
      {dottedLines.map((l, i) => (
        <text
          key={`d${i}`}
          x={PAD}
          y={layout.dottedTop + i * layout.dottedLead}
          {...line(axis)}
          fill={mutedInk}
        >
          {l}
        </text>
      ))}
      {layout.readingLines.map((l, i) => (
        <text key={`r${i}`} x={PAD} y={layout.readingTop + i * annotLead} {...line(annot)} fill={mutedInk}>
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
          <rect x={camera.x} y={camera.y} width={camera.width} height={camera.height} />
        </clipPath>
      </defs>

      <g clipPath="url(#camera)">
        {/* THE MAP IS WHAT THE FLOW IS DRAWN ON, NOT WHAT IT IS DRAWN OF — and it is MapTiler's
            geography, baked once per filed direction in that direction's own tints. The country
            shapes still draw over it: the plate carries the coastline and the sea, the shapes carry
            which countries are hosts. */}
        <image
          href={plate}
          x={mapX}
          y={mapY}
          width={mapW}
          height={plateH}
          preserveAspectRatio="none"
        />
        {shapes.map((s) => (
          <path
            key={s.iso}
            d={s.d}
            transform={`translate(${mapX} ${mapY}) scale(${mapW / 1000})`}
            fill={land}
          />
        ))}

        {drawn.map((b) => (
          <path
            key={`band-${b.code}`}
            d={pathOf(b)}
            fill="none"
            stroke={b.subject ? subjectFlow : flow}
            strokeWidth={widthOfPeople(b.people)}
            strokeLinecap="butt"
          />
        ))}

        {dotted.map((b) => {
          const [x, y] = at(b.seat);
          return <circle key={`dot-${b.code}`} cx={x} cy={y} r={1.6} fill={flow} />;
        })}

        {/* THE NODE, sized by what the bands need and named inside itself. */}
        <circle cx={origin[0]} cy={origin[1]} r={NODE_RADIUS} fill={direction.ground} />
        <circle
          cx={origin[0]}
          cy={origin[1]}
          r={NODE_RADIUS}
          fill="none"
          stroke={nodeInk}
          strokeWidth={direction.stroke.rule}
        />
        <text
          x={origin[0]}
          y={origin[1] + (axisBand.ascent - axisBand.descent) / 2}
          textAnchor="middle"
          {...line(axis)}
          fontWeight={700}
          fill={nodeInk}
        >
          {set(originLabel, axis)}
        </text>

        {labels.map(({ b, x, y, anchor, text }) => (
          <g key={`label-${b.code}`}>
            <text
              x={x}
              y={y}
              textAnchor={anchor}
              {...line(axis)}
              fill="none"
              stroke={direction.ground}
              strokeWidth={3.2}
              strokeLinejoin="round"
              fontWeight={b.subject ? 700 : axis.fontWeight}
            >
              {set(text, axis)}
            </text>
            <text
              x={x}
              y={y}
              textAnchor={anchor}
              {...line(axis)}
              fill={b.subject ? accentInk : nodeInk}
              fontWeight={b.subject ? 700 : axis.fontWeight}
            >
              {set(text, axis)}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
