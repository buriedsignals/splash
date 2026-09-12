/**
 * Europe's low-carbon power stations, one dot each, drawn THROUGH the design base. The first
 * `dot density` component in this tree, and the second map beat.
 *
 * `the-dots-resolution-is-what-the-data-supports` (La Nación, ProPublica) — every dot sits at the
 * latitude and longitude the source recorded for that station. That rule is why this beat exists at
 * all: the first attempt was one dot per terawatt-hour scattered inside a country's outline, which
 * draws a texture the source cannot support — every cluster an artefact of the random number
 * generator, every hole one too.
 *
 * `a-quantity-is-made-countable-by-drawing-its-units` (ProPublica, Ferdio) — one dot is one station.
 * A real thing, in its real place.
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
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";
import { matchConvention } from "../../skills/palette/scripts/palette.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Shape = { iso: string; d: string };
export type Dot = { x: number; y: number; subject: boolean };

export function DirectedDotDensity({
  plate,
  shapes,
  dots,
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
  dots: Dot[];
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
  const titleLead = display.fontSize * 1.22;
  const bodyLead = body.fontSize * 1.45;
  const annotLead = annot.fontSize * 1.4;
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
      eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
    const limitsTop =
      titleTop + titleLines.length * titleLead + body.fontSize * 0.8;
    const keyTop =
      limitsTop +
      standfirstLines.length * bodyLead +
      annot.fontSize * 1.2 +
      annotBand.ascent;
    const limitTop = keyTop + (dotLines.length + subjectLines.length) * annotLead;
    const limitLead = axisBand.ascent + axisBand.descent + 2;
    const readingTop =
      limitTop + limitLines.length * limitLead + annotBand.ascent + annot.fontSize * 0.6;
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
      ` · panel ${panel}px · map ${mapW.toFixed(0)} x ${mapH.toFixed(0)} · ${dots.length} dots`,
  );

  /** THE DOT'S SIZE IS A MEASUREMENT, NOT A TASTE. At this camera a station is a point, and the
   *  radius is set so the densest region reads as texture rather than as ink: half a pixel of the
   *  drawn map per dot, floored so a lone station in Iceland is still visible. */
  const r = Math.max(1.1, mapW / 900);

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

      {/* WHAT ONE DOT IS, ON THE PLATE — the one thing the encoding cannot say for itself. */}
      <g>
        <circle cx={PAD + r + 1} cy={layout.keyTop - annotBand.ascent * 0.35} r={r} fill={dotInk} />
        {layout.dotLines.map((l, i) => (
          <text
            key={`d${i}`}
            x={PAD + layout.swatchInset}
            y={layout.keyTop + i * annotLead}
            {...line(annot)}
            fill={mutedInk}
          >
            {l}
          </text>
        ))}
        <circle
          cx={PAD + r + 1}
          cy={layout.keyTop + layout.dotLines.length * annotLead - annotBand.ascent * 0.35}
          r={r}
          fill={subjectInk}
        />
        <circle
          cx={PAD + r + 1}
          cy={layout.keyTop + layout.dotLines.length * annotLead - annotBand.ascent * 0.35}
          r={r + 2.4}
          fill="none"
          stroke={subjectInk}
          strokeWidth={direction.stroke.hairline}
        />
        {layout.subjectLines.map((l, i) => (
          <text
            key={`sub${i}`}
            x={PAD + layout.swatchInset}
            y={layout.keyTop + (layout.dotLines.length + i) * annotLead}
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
            y={layout.limitTop + i * layout.limitLead}
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
        {/* THE BASEMAP IS MAPTILER'S GEOGRAPHY IN THIS DIRECTION'S OWN TINTS, baked by `bake.mjs`
            once per filed direction. The rect underneath is a backstop: the image is opaque and
            covers the box exactly, so a short bake would show the plate's own water rather than
            white paper. */}
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

        {/* THE FIELD. Every dot at the latitude and longitude its source recorded — the rule this
            beat exists for. Drawn at partial opacity so a cluster reads as density rather than as a
            blot, which is what makes the count legible. */}
        <g opacity={0.55}>
          {dots
            .filter((d) => !d.subject)
            .map((d, i) => (
              <circle
                key={i}
                cx={mapX + d.x * mapW}
                cy={mapY + d.y * mapW}
                r={r}
                fill={dotInk}
              />
            ))}
        </g>

        {/* THE SUBJECT, RINGED — not recoloured, because a second hue on a plate whose reading is
            one field's density would be a second encoding in the same channel. */}
        {on("the-subject-is-ringed-not-recoloured") &&
          dots
            .filter((d) => d.subject)
            .map((d, i) => (
              <g key={`s${i}`}>
                <circle
                  cx={mapX + d.x * mapW}
                  cy={mapY + d.y * mapW}
                  r={r + 2.6}
                  fill="none"
                  stroke={subjectInk}
                  strokeWidth={direction.stroke.hairline * 1.6}
                />
                <circle
                  cx={mapX + d.x * mapW}
                  cy={mapY + d.y * mapW}
                  r={r}
                  fill={subjectInk}
                />
              </g>
            ))}
      </g>
    </svg>
  );
}
