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
}: {
  /** The baked MapTiler basemap for THIS direction, already a data URI. */
  plate: string;
  shapes: Shape[];
  symbols: Symbol[];
  keyCircles: KeyCircle[];
  aspect: number;
  dotIs: string;
  subjectNote: string;
  limitNote: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  treatments: string[];
  onLadder?: (note: string) => void;
}) {
  const { width, height } = FRAME;
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
  const panelFor = (share: number) => Math.round((width - PAD * 2) * share);

  const layoutFor = (panel: number, t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), panel, display);
    const standfirstLines = wrap(set(limits[l], body), panel, body);
    const readingLines =
      r < 0 ? [] : wrap(set(reading[r], annot), panel, annot);
    const sourceLines = wrap(set(source, body), panel, body);
    /** THE LIMIT NOTE WRAPS TOO. It was drawn as one unwrapped run and ran straight under the map —
     *  and no guard saw it, because the overlap and frame guards measure the PLATE's frame and this
     *  text was well inside that. A panel is a frame too, and every run in it is measured against
     *  the panel's own width. */
    const limitLines = wrap(set(limitNote, axis), panel, axis);
    /** EVERY RUN IN THE PANEL IS WRAPPED AGAINST THE PANEL. The key's two lines were drawn
     *  unwrapped and `nocturne`, whose annot register is tracked capitals, ran the first one under
     *  the map. There is no such thing as a line short enough to skip this: how wide a string is
     *  depends on the direction, and a direction is exactly what changes between plates. */
    const swatchInset = 18;
    const dotLines = wrap(set(dotIs, annot), panel - swatchInset, annot);
    const subjectLines = wrap(set(subjectNote, annot), panel - swatchInset, annot);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop =
      eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
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
    const keyCircleH =
      keyCircles[0].r * (width - PAD * 2 - panel - GUTTER) * 2 +
      keyCircles.length * (axisBand.ascent + axisBand.descent + 3);
    const limitTop =
      keyTop + keyCircleH + annotBand.ascent + 10 + (dotLines.length + subjectLines.length) * annotLead;
    const limitLead = axisBand.ascent + axisBand.descent + 2;
    const readingTop =
      limitTop + limitLines.length * limitLead + annotBand.ascent + gapOf(annot, 0.4286);
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const footTop =
      readingTop + Math.max(0, readingLines.length - 1) * annotLead;
    return {
      titleLines,
      standfirstLines,
      dotLines,
      subjectLines,
      swatchInset,
      limitLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      keyTop,
      keyCircleH,
      limitTop,
      limitLead,
      readingTop,
      sourceTop,
      spare: sourceTop - bodyLead * 0.9 - footTop,
    };
  };

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
  let fits: {
    rung: (typeof rungs)[number];
    layout: ReturnType<typeof layoutFor>;
  } | null = null;
  for (const rung of rungs) {
    const l = layoutFor(
      panelFor(rung.share),
      rung.title,
      rung.limit,
      rung.reading,
    );
    if (l.spare >= 0) {
      fits = { rung, layout: l };
      break;
    }
  }
  if (!fits)
    throw new Error(
      `the panel's copy does not fit its column in this direction, at any share. Give the beat ` +
        `shorter forms — do not shrink the map, which is the subject.`,
    );
  const layout = fits.layout;
  const panel = panelFor(fits.rung.share);
  const mapBox = {
    x: PAD + panel + GUTTER,
    y: PAD,
    width: width - PAD * 2 - panel - GUTTER,
    height: height - PAD * 2,
  };
  /** FILL THE BOX AND CROP, never letterbox — the map is the subject. The crop is anchored west,
   *  because the ground it gives up is the far east and the field it must not lose is Iberia. */
  const fill = Math.max(mapBox.width, mapBox.height * aspect);
  const mapW = fill;
  const mapH = fill / aspect;
  const mapX = mapBox.x;
  const mapY = mapBox.y + (mapBox.height - mapH) / 2;
  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · panel ${panel}px · map ${mapW.toFixed(0)} x ${mapH.toFixed(0)} · ${symbols.length} circles`,
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
            x={PAD}
            y={keyTextTop + i * annotLead}
            {...line(annot)}
            fill={mutedInk}
          >
            {l}
          </text>
        ))}
        {layout.subjectLines.map((l, i) => (
          <text
            key={`sub${i}`}
            x={PAD}
            y={keyTextTop + (layout.dotLines.length + i) * annotLead}
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
            x={PAD}
            y={
              keyTextTop +
              4 +
              (layout.dotLines.length + layout.subjectLines.length) * annotLead +
              i * layout.limitLead
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
        {/* MapTiler's geography, baked once per filed direction in that direction's own tints. The
            rect under it is a backstop for a short bake, never a second basemap. */}
        <rect
          x={mapBox.x}
          y={mapBox.y}
          width={mapBox.width}
          height={mapBox.height}
          fill={water}
        />
        <image
          href={plate}
          x={mapBox.x}
          y={mapBox.y}
          width={mapBox.width}
          height={mapBox.height}
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
