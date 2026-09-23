/**
 * Where Europe's largest power station is, drawn THROUGH the design base. The first `locator`
 * component in this tree, and the fourth map beat.
 *
 * IT IS THE FIRST PLATE HERE ON WHICH ALL THREE PLACE CLASSES EXIST.
 * `three-classes-of-place-three-treatments` (SCMP, ProPublica) was filed against the choropleth,
 * which names administrative areas and water and has no settlements to name. A locator has all
 * three, and the rule's whole return — that a reader separates them without a legend, from
 * typography alone — is only testable here:
 *
 *   · administrative area — the axis register, uppercased and tracked, in the muted ink
 *   · settlement          — the annot register, mixed case, a step darker, each on its own dot
 *   · water               — the annot register in italic, in the water tint
 *   · and the feature the story is about — the accent, on a leader, which is not a place class at
 *     all but the beat's subject wearing the clothes it wears on every other form in this base
 *
 * SCMP also states what a locator must NOT carry: "no borders, no cities, no graticule … a locator
 * map that named provinces would have made the reader look for one." So this plate names the
 * countries the story touches, the settlements a reader needs to place the station, three bodies of
 * water, and nothing else.
 *
 * `the-basemap-gives-up-its-contrast`, `water-is-a-tint-not-a-grey` — as the sibling map beats.
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

export type Shape = {
  iso: string;
  d: string;
  seat: { x: number; y: number } | null;
  name: string;
};
export type Place = { name: string; x: number; y: number };
export type Water = { forms: string[]; x: number; y: number };
export type Subject = { name: string; x: number; y: number; lines: string[] };

export function DirectedLocator({
  plate,
  tints,
  shapes,
  areas,
  places,
  waters,
  subject,
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
  /** THE TINTS THAT PLATE WAS ACTUALLY PAINTED WITH, from `plateTints` — handed in, never
   *  re-derived here. A second copy of the pair is what this file used to hold, and the two
   *  disagreed: the plate was baked at the measured water dose and a land dose of 0.07, while this
   *  component mixed its own water at a flat 0.16 and its own land at 0.05. The water label's ink
   *  was then lifted to 4.5:1 against a tint no pixel on the page carried, and measured against the
   *  plate it fell to 4.06:1 (3.89:1 in nocturne). The plate's paint is a fact of the render. */
  tints: { water: string; land: string };
  shapes: Shape[];
  areas: string[];
  places: Place[];
  waters: Water[];
  subject: Subject;
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

  const land = tints.land;
  const coast = mix(direction.ground, ink, 0.2);
  const border = mix(direction.ground, ink, 0.12);
  const waterHue = matchConvention("water")!.accent;
  const water = tints.water;
  const waterInk = adjustToContrast(waterHue, water, TEXT_CONTRAST_MIN);
  /** THE SUBJECT'S OWN SENTENCE IS TEXT, AND IT SITS ON THE LAND. `accentInk` is the accent lifted
   *  against the PAGE, and `composeDirection` measures the accent against the basemap's grounds at
   *  the non-text floor, because the accent is carried by a dot and a ring. The two lines beside
   *  that ring are words: they were drawn at 4.14:1 on rapport's land and 4.00:1 on creme's, under
   *  the 4.5 text floor. The mark keeps the accent; the sentence takes it lifted to the text floor
   *  against the land it is read on, the same two steps every settlement name here already takes. */
  const subjectInk =
    adjustToContrast(accentInk, land, TEXT_CONTRAST_MIN) ?? accentInk;
  if (contrast(water, direction.ground) > 1.6)
    throw new Error(
      `the water tint measures ${contrast(water, direction.ground).toFixed(2)}:1 against the ground`,
    );

  /** THE THREE TREATMENTS, DERIVED from registers the directions did file — no direction in this
   *  base carries a `place` row, because all three were measured on pieces that are not maps. */
  const areaReg = {
    ...axis,
    letterSpacing: Math.max(Number(axis.letterSpacing ?? 0), 0.9),
    transform: "uppercase",
  };
  const placeReg = { ...annot, fontStyle: "normal" };
  const waterReg = {
    ...axis,
    fontStyle: "italic",
    letterSpacing: 0,
    transform: "none",
  };

  // ── the layout ────────────────────────────────────────────────────────────
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);
  const SHARES = [0.3, 0.34, 0.38, 0.42];
  const GUTTER = 24;
  const panelFor = (share: number) => Math.round((width - PAD * 2) * share);

  const layoutFor = (panel: number, t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), panel, display);
    const standfirstLines = wrap(set(limits[l], body), panel, body);
    const readingLines =
      r < 0 ? [] : wrap(set(reading[r], annot), panel, annot);
    const sourceLines = wrap(set(source, body), panel, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + gapOf(body, 0.5517);
    const readingTop =
      limitsTop +
      standfirstLines.length * bodyLead +
      gapOf(annot, 1) +
      annotBand.ascent;
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const footTop =
      readingTop + Math.max(0, readingLines.length - 1) * annotLead;
    return {
      titleLines,
      standfirstLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      readingTop,
      sourceTop,
      /** Where the copy's last line ends — the top of the map's band in a stacked frame. */
      footTop,
      spare: sourceTop - bodyLead * 0.9 - footTop,
    };
  };

  /**
   * TWO LAYOUTS, AND THE FRAME CHOOSES — not taste. `proof/static-choropleth-europe-lowcarbon`
   * works this out at length; a locator lands in exactly the same arithmetic.
   *
   * Beside the map is right at landscape: a map's aspect is fixed by the ground it shows, so the
   * text goes in the column the map cannot use. At a square or tall frame it inverts. Measured at
   * 540x960: the column beside the narrowest panel is 276px against 848px of height, so the camera
   * filled the height and CROPPED to a 276px slice — the plate drew a vertical strip of Ukraine
   * with the Dnipro running off both ends — and « Zaporijjia » and « 6 000 MW installés », anchored
   * right of a dot near that slice's edge, ran 350px past the frame. `assertTextWithinFrame`
   * refused all three directions at both sizes.
   *
   * The condition is the one the reasoning is about: is there room, beside the narrowest panel this
   * ladder will spend, for a map at least as tall as the plate allows? Below that there is no column
   * to put text in, and the header goes on top.
   */
  const besideWidth =
    width - PAD * 2 - panelFor(SHARES[0]) - GUTTER;
  const STACKED = besideWidth < height - PAD * 2;
  /** THE MAP IS THE SUBJECT, so a stacked ladder does not merely have to clear the foot — it has to
   *  leave a map-sized band. A third of the usable height is the share the choropleth settled on
   *  and the reason is the same: below a third the map stops being the largest thing on the page
   *  and the beat is a caption with an illustration. */
  const MIN_MAP_SHARE = 1 / 3;
  const mapBandFloor = STACKED ? (height - PAD * 2) * MIN_MAP_SHARE : 0;
  /** AND CLEARING THE FLOOR IS NOT THE SAME AS BEING A MAP. The ladder stops at the first rung that
   *  pays, which is right when the thing being paid for is a margin and wrong when it is the
   *  subject: measured at 540x540, rung 1 cleared the 143px floor by four pixels and the camera
   *  came out 193x147 — with Kharkiv, Rostov, Dnipro, Odessa and the Dnipro itself all reported as
   *  having no room on it. So a stacked plate goes on spending until the map has HALF the usable
   *  height, and only if no rung reaches that does it keep the rung that leaves the most. The floor
   *  stays what it refuses at; the target is what it aims for. */
  const MAP_TARGET_SHARE = 0.5;
  const mapBandTarget = STACKED ? (height - PAD * 2) * MAP_TARGET_SHARE : 0;
  /** The band between where the copy stops and where the source's own line begins, with air at both
   *  edges — one measurement, spent by the fit test and by the drawing alike. */
  const mapBandOf = (l: { footTop: number; sourceTop: number }) => {
    const top = l.footTop + annotLead * 0.9;
    return { top, height: l.sourceTop - bodyLead - top };
  };

  const rungs: Array<{
    share: number;
    title: number;
    limit: number;
    reading: number;
  }> = [];
  for (const share of STACKED ? [1] : SHARES)
    for (let t = 0; t < title.length; t++)
      for (let l = 0; l < limits.length; l++) {
        for (let r = 0; r < reading.length; r++)
          rungs.push({ share, title: t, limit: l, reading: r });
        rungs.push({ share, title: t, limit: l, reading: -1 });
      }
  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
  } | null = null;
  let widest: typeof fits = null;
  for (const rung of rungs) {
    const l = layoutFor(
      panelFor(rung.share),
      rung.title,
      rung.limit,
      rung.reading,
    );
    const band = STACKED ? mapBandOf(l).height : l.spare;
    if (band < mapBandFloor) continue;
    if (
      !widest ||
      band >
        (STACKED ? mapBandOf(widest.layout).height : widest.layout.spare)
    )
      widest = { rung, layout: l };
    if (band >= mapBandTarget) {
      fits = { rung, layout: l };
      break;
    }
  }
  fits = fits ?? widest;
  if (!fits)
    throw new Error(
      STACKED
        ? `no rung of the copy leaves the map its third of the plate at ${width}x${height} — ` +
          `${mapBandFloor.toFixed(0)}px of band is owed. A locator whose map is a caption's ` +
          `illustration is not a locator.`
        : `the panel's copy does not fit its column in this direction, at any share.`,
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
  /** BESIDE: fill the box and crop, because the box is as tall as the plate and the ground given up
   *  is sea. STACKED: FIT inside the band instead. The box is only as tall as the copy left it, so
   *  filling it would draw a 276px slice of a 1000px camera — a strip of a locator is not a
   *  locator. A whole map that is smaller still says where. */
  const fill = STACKED
    ? Math.min(mapBox.width, mapBox.height * aspect)
    : Math.max(mapBox.width, mapBox.height * aspect);
  const mapW = fill;
  const mapH = fill / aspect;
  /** STACKED: centred in its band on both axes, because it is fit rather than filled and a band
   *  wider than the map would otherwise leave the whole right half of the page empty. */
  const mapX = STACKED ? mapBox.x + (mapBox.width - mapW) / 2 : mapBox.x;
  const mapY = mapBox.y + (mapBox.height - mapH) / 2;
  /** WHERE THE GROUND ACTUALLY IS — the box and the drawn camera intersected. Beside, the camera is
   *  wider than its box and this is the box; stacked, the camera is smaller and this is the camera.
   *  It is what a place name has to stay inside: a label inside the BOX but outside the MAP sits on
   *  the plate's own ground, not on any geography. */
  const mapRect = {
    x: Math.max(mapBox.x, mapX),
    y: Math.max(mapBox.y, mapY),
    right: Math.min(mapBox.x + mapBox.width, mapX + mapW),
    bottom: Math.min(mapBox.y + mapBox.height, mapY + mapH),
  };

  /** EVERY LABEL ON THIS MAP IS PLACED BY THE SAME RULE: it may be pushed, it may not be dropped,
   *  and it may not sit on another. Boxes are kept as they are placed and each new label takes the
   *  first offset that clears them all — right of its dot, then left, then above, then below, which
   *  is the order an atlas tries. */
  const taken: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
  const clear = (b: any) =>
    taken.every(
      (t) =>
        b.x1 + 3 < t.x0 ||
        t.x1 + 3 < b.x0 ||
        b.y1 + 3 < t.y0 ||
        t.y1 + 3 < b.y0,
    );
  const boxAt = (
    text: string,
    r: any,
    x: number,
    y: number,
    anchor: "start" | "middle" | "end",
  ) => {
    const w = widthOf(set(text, r), r);
    const band = bandOf(r);
    const x0 = anchor === "start" ? x : anchor === "end" ? x - w : x - w / 2;
    return { x0, x1: x0 + w, y0: y - band.ascent, y1: y + band.descent };
  };
  const inFrame = (b: any) =>
    b.x0 >= mapRect.x + 2 &&
    b.x1 <= mapRect.right - 2 &&
    b.y0 >= mapRect.y + 2 &&
    b.y1 <= mapRect.bottom - 2;

  type Placed = {
    text: string;
    x: number;
    y: number;
    anchor: "start" | "end";
    reg: any;
    kind: string;
  };
  const placed: Placed[] = [];
  const notPlaced: string[] = [];

  /** A SETTLEMENT'S DOT IS A MARK, AND NO NAME OF THE SAME CLASS MAY SIT BESIDE ONE IT DOES NOT
   *  NAME. The arbiter kept label boxes and nothing else, so a dot whose own name had gone to its
   *  left was free to end up two pixels from the start of somebody else's: measured at 540x960,
   *  Dnipro's ring sat against the « Z » of « Zaporijjia » and read as the station's own dot.
   *
   *  It binds the SUBJECT and the SETTLEMENTS, not the areas and not the water. A country name is
   *  uppercased, tracked and muted — a different class, which is the whole point of
   *  `three-classes-of-place-three-treatments` — and a city dot inside a country is what a reader
   *  expects to see there. Binding it too cost « UKRAINE », the country the story is in, at two
   *  directions out of three.
   *
   *  Only where the plate is stacked: at 960px the camera is twice as wide and the landscape plate
   *  was accepted with the placements it has. */
  const PLACE_DOT = 2.4;
  const dotBoxes = STACKED
    ? places.map((p) => {
        const cx = mapX + p.x * mapW;
        const cy = mapY + p.y * mapW;
        return {
          x0: cx - PLACE_DOT,
          x1: cx + PLACE_DOT,
          y0: cy - PLACE_DOT,
          y1: cy + PLACE_DOT,
        };
      })
    : [];
  const clearOfDots = (b: any) =>
    dotBoxes.every(
      (t) => b.x1 + 3 < t.x0 || t.x1 + 3 < b.x0 || b.y1 + 3 < t.y0 || t.y1 + 3 < b.y0,
    );

  const put = (
    text: string,
    r: any,
    px: number,
    py: number,
    kind: string,
    dot: number,
  ) => {
    /** A settlement clears every settlement's dot, its own included — the offsets put it more than
     *  the clearance away from that one, so a name is never blocked by the thing it names. */
    const dotsToo = kind === "place";
    const cx = mapX + px * mapW;
    const cy = mapY + py * mapW;
    const band = bandOf(r);
    const offsets: Array<[number, number, "start" | "end"]> = [
      [dot + 4, band.ascent * 0.35, "start"],
      [-dot - 4, band.ascent * 0.35, "end"],
      [0, -dot - 4, "start"],
      [0, dot + band.ascent + 4, "start"],
      [dot + 4, -dot - 2, "start"],
      [-dot - 4, dot + band.ascent + 2, "end"],
    ];
    for (const [dx, dy, anchor] of offsets) {
      const x = cx + dx;
      const y = cy + dy;
      const b = boxAt(text, r, x, y, anchor === "start" ? "start" : "end");
      if (inFrame(b) && clear(b) && (!dotsToo || clearOfDots(b))) {
        taken.push(b);
        placed.push({ text, x, y, anchor, reg: r, kind });
        return true;
      }
    }
    notPlaced.push(text);
    return false;
  };

  /** THE SUBJECT FIRST, because it is the one label that may not be pushed anywhere.
   *
   *  IT MAY STILL CHANGE SIDES. The block was anchored `start` right of the dot, unconditionally
   *  and without ever asking whether it landed on the plate: measured at 540x540 and 540x960, the
   *  station sits near the camera's right edge and « Zaporijjia » ran from 505 to 565 on a 540px
   *  frame, « 6 000 MW installés » from 505 to 617. Flipping a label to the other side of its own
   *  dot is not pushing it anywhere — it stays on the thing it names, which is the rule this
   *  comment was about — and it is the first thing an atlas tries at a margin. The four corners are
   *  tried in the order an atlas tries them, and if none is inside, the least-bad one is kept: the
   *  subject is drawn whatever happens, and the frame guard is left to say so. */
  const subjectDot = 5;
  const subjectBlock = (() => {
    const cx = mapX + subject.x * mapW;
    const cy = mapY + subject.y * mapW;
    const band = bandOf(annot);
    const rise = (subject.lines.length - 1) * annotLead;
    const corners: Array<{
      x: number;
      lastBaseline: number;
      anchor: "start" | "end";
    }> = [
      { x: cx + subjectDot + 6, lastBaseline: cy - subjectDot - 6, anchor: "start" },
      { x: cx - subjectDot - 6, lastBaseline: cy - subjectDot - 6, anchor: "end" },
      {
        x: cx + subjectDot + 6,
        lastBaseline: cy + subjectDot + 6 + band.ascent + rise,
        anchor: "start",
      },
      {
        x: cx - subjectDot - 6,
        lastBaseline: cy + subjectDot + 6 + band.ascent + rise,
        anchor: "end",
      },
    ];
    /** AND IT DOES NOT AVOID THE SETTLEMENT DOTS, although the settlements avoid each other's.
     *  MEASURED at 540x960 and 540x540: Dnipro's ring lands against the « Z » of « Zaporijjia », and
     *  a reader who sees « Dnipro ○Zaporijjia » gives the station the wrong dot — so this was tried.
     *  Every corner that clears that ring, raised or flipped, lands on the seat « UKRAINE » wants,
     *  and the area names are placed after the subject: it cost the country the story is in, at two
     *  directions out of three, at both sizes. SCMP's own rule for this family is that the plate
     *  names the country the story is in. A crowded dot is the cheaper of the two losses, and it is
     *  recorded here rather than left to be rediscovered. */
    const boxesFor = (c: (typeof corners)[number]) =>
      subject.lines.map((l, i) =>
        boxAt(l, annot, c.x, c.lastBaseline - (subject.lines.length - 1 - i) * annotLead, c.anchor),
      );
    /** THE SUBJECT'S OWN FRAME IS WIDER THAN THE CAMERA WHERE THE PLATE IS STACKED. Its sentence
     *  is 130px on a 266px camera and the station sits past the middle of it, so neither side of
     *  the dot holds it: measured at 540x540, « 6 000 MW installés » lost its last letter to the
     *  camera's clip. Beside the camera there is bare plate — 81px of it either side — and a
     *  callout that runs onto the margin is what an atlas does at a coast. The camera's own edge
     *  still binds every OTHER label, which must stay on the ground it names. */
    const bound = STACKED
      ? {
          x: PAD + 2,
          right: width - PAD - 2,
          y: mapRect.y + 2,
          bottom: mapRect.bottom - 2,
        }
      : {
          x: mapRect.x + 2,
          right: mapRect.right - 2,
          y: mapRect.y + 2,
          bottom: mapRect.bottom - 2,
        };
    const inBound = (b: any) =>
      b.x0 >= bound.x && b.x1 <= bound.right && b.y0 >= bound.y && b.y1 <= bound.bottom;
    /** And when no corner is inside, the LEAST-BAD one is kept rather than the first — a label that
     *  overflows by 8px on one side is not the same plate as one that overflows by 80 on the other. */
    const overflowOf = (c: (typeof corners)[number]) =>
      boxesFor(c).reduce(
        (worst, b) =>
          Math.max(
            worst,
            bound.x - b.x0,
            b.x1 - bound.right,
            bound.y - b.y0,
            b.y1 - bound.bottom,
          ),
        0,
      );
    const chosen =
      corners.find((c) => boxesFor(c).every((b) => inBound(b) && clear(b))) ??
      corners.find((c) => boxesFor(c).every((b) => inBound(b))) ??
      corners.reduce((a, b) => (overflowOf(b) < overflowOf(a) ? b : a));
    return { ...chosen, boxes: boxesFor(chosen) };
  })();
  for (const b of subjectBlock.boxes) taken.push(b);
  // Then the countries, then the settlements, then the water — largest thing first, because a
  // country name pushed off its own country is worse than a city name pushed off its own dot.
  for (const iso of areas) {
    const sh = shapes.find((s) => s.iso === iso);
    if (!sh?.seat) continue;
    put(sh.name, areaReg, sh.seat.x, sh.seat.y, "area", 0);
  }
  for (const p of places) put(p.name, placeReg, p.x, p.y, "place", 2.4);
  for (const w of waters) {
    let done = false;
    for (const form of w.forms)
      if (put(form, waterReg, w.x, w.y, "water", 0)) {
        done = true;
        break;
      }
    if (!done) notPlaced.push(w.forms[0]);
  }

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · ${STACKED ? "stacked" : "beside"} · panel ${panel}px · map ${mapW.toFixed(0)} x ${mapH.toFixed(0)}`,
  );
  onLadder?.(
    `places: ${placed.filter((p) => p.kind === "area").length} areas, ` +
      `${placed.filter((p) => p.kind === "place").length} settlements, ` +
      `${placed.filter((p) => p.kind === "water").length} waters placed` +
      (notPlaced.length
        ? ` · no room for: ${notPlaced.join(", ")}`
        : " · none dropped"),
  );

  /** The subject's sentence, built once and drawn on one side or the other of the camera's clip. */
  const subjectText = subject.lines.map((l, i) => (
    <text
      key={`subj${i}`}
      x={subjectBlock.x}
      y={subjectBlock.lastBaseline - (subject.lines.length - 1 - i) * annotLead}
      textAnchor={subjectBlock.anchor === "end" ? "end" : undefined}
      {...line(annot)}
      fill={subjectInk}
      fontWeight={i === 0 ? 700 : annot.fontWeight}
    >
      {l}
    </text>
  ));

  const inkFor = (kind: string) =>
    kind === "area"
      ? mutedInk
      : kind === "water"
        ? waterInk
        : adjustToContrast(ink, land, TEXT_CONTRAST_MIN);

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
        {/* THE CAMERA IS CLIPPED TO THE GROUND IT ACTUALLY SHOWS. Beside, the box and the drawn
            camera are the same rectangle and this is the box, unchanged. Stacked, the camera is fit
            inside a wider band, and clipping to the BOX let the country outlines — which are vector
            and know nothing about the plate's edges — spill 80px either side of the basemap onto
            bare plate: measured at 540x540, Ukraine and Russia were drawn in land tint where there
            was no coastline under them. */}
        <clipPath id="camera">
          <rect
            x={mapRect.x}
            y={mapRect.y}
            width={mapRect.right - mapRect.x}
            height={mapRect.bottom - mapRect.y}
          />
        </clipPath>
      </defs>

      <g clipPath="url(#camera)">
        {/* MapTiler's geography, baked once per filed direction in that direction's own tints. A
            locator is the map family that most needs a real basemap: its whole job is to say WHERE,
            and a reader who does not recognise the coastline has been told nothing. */}
        {/* THE PLATE IS LAID ON THE SAME CAMERA THE VECTOR SHAPES USE. Beside, the box IS the
            camera's visible part and the two readings agree to a pixel, so that is what landscape
            keeps. Stacked, the camera is FIT inside a wider band: laid into the box the plate
            would be stretched to a band it does not cover, and the coastline would leave the
            country outlines drawn on top of it. */}
        <rect
          x={STACKED ? mapX : mapBox.x}
          y={STACKED ? mapY : mapBox.y}
          width={STACKED ? mapW : mapBox.width}
          height={STACKED ? mapH : mapBox.height}
          fill={water}
        />
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
            strokeWidth={0.7}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* A DOT WHOSE NAME COULD NOT BE PLACED IS NOT DRAWN. Every settlement got a dot whether or
            not its label found room, and on a 266px camera that left four anonymous rings on the
            ground — measured at 540x540, Rostov's landed inside « RUSSIE », between the two S's. An
            unnamed dot on a locator tells a reader nothing and takes ink from a name that does;
            SCMP's rule for this family is that a locator carries no city it does not need. */}
        {places
          .filter((p) => placed.some((q) => q.kind === "place" && q.text === p.name))
          .map((p) => (
            <circle
              key={`dot-${p.name}`}
              cx={mapX + p.x * mapW}
              cy={mapY + p.y * mapW}
              r={PLACE_DOT}
              fill="none"
              stroke={adjustToContrast(ink, land, TEXT_CONTRAST_MIN)}
              strokeWidth={1}
            />
          ))}

        {placed.map((p, i) => (
          <text
            key={`${p.kind}-${i}`}
            x={p.x}
            y={p.y}
            textAnchor={p.anchor}
            {...line(p.reg)}
            fill={inkFor(p.kind)}
          >
            {set(p.text, p.reg)}
          </text>
        ))}

        {/* THE FEATURE THE STORY IS ABOUT — the accent, a ring, and its own sentence beside it. */}
        <g>
          <circle
            cx={mapX + subject.x * mapW}
            cy={mapY + subject.y * mapW}
            r={subjectDot}
            fill={accentInk}
          />
          <circle
            cx={mapX + subject.x * mapW}
            cy={mapY + subject.y * mapW}
            r={subjectDot + 4}
            fill="none"
            stroke={accentInk}
            strokeWidth={direction.stroke.rule * 1.4}
          />
          {!STACKED && subjectText}
        </g>
      </g>

      {/* AND WHERE THE PLATE IS STACKED ITS SENTENCE IS DRAWN OUTSIDE THE CAMERA'S CLIP. The dot
          and the ring belong to the ground and are cut with it; the sentence is a callout, and
          where the camera is fit inside a wider band the margin beside it is the only place a 130px
          sentence can go on a 266px map. Landscape keeps it inside the clip, where it was accepted:
          moving it out changed nothing a reader could name and still moved 145x36px of antialiased
          ink, and an accepted plate is accepted at the pixel. */}
      {STACKED && subjectText}
    </svg>
  );
}
