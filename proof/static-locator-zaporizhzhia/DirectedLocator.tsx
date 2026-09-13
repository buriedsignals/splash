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
}: {
  /** The baked MapTiler basemap for THIS direction, already a data URI. */
  plate: string;
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

  const land = mix(direction.ground, ink, 0.05);
  const coast = mix(direction.ground, ink, 0.2);
  const border = mix(direction.ground, ink, 0.12);
  const waterHue = matchConvention("water")!.accent;
  const water = mix(direction.ground, waterHue, 0.16);
  const waterInk = adjustToContrast(waterHue, water, TEXT_CONTRAST_MIN);
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
      `the panel's copy does not fit its column in this direction, at any share.`,
    );
  const layout = fits.layout;
  const panel = panelFor(fits.rung.share);
  const mapBox = {
    x: PAD + panel + GUTTER,
    y: PAD,
    width: width - PAD * 2 - panel - GUTTER,
    height: height - PAD * 2,
  };
  const fill = Math.max(mapBox.width, mapBox.height * aspect);
  const mapW = fill;
  const mapH = fill / aspect;
  const mapX = mapBox.x;
  const mapY = mapBox.y + (mapBox.height - mapH) / 2;
  const visible = {
    x1: mapBox.width / mapW,
    y0: (mapBox.y - mapY) / mapW,
    y1: (mapBox.y + mapBox.height - mapY) / mapW,
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
    b.x0 >= mapBox.x + 2 &&
    b.x1 <= mapBox.x + mapBox.width - 2 &&
    b.y0 >= mapBox.y + 2 &&
    b.y1 <= mapBox.y + mapBox.height - 2;

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

  const put = (
    text: string,
    r: any,
    px: number,
    py: number,
    kind: string,
    dot: number,
  ) => {
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
      if (inFrame(b) && clear(b)) {
        taken.push(b);
        placed.push({ text, x, y, anchor, reg: r, kind });
        return true;
      }
    }
    notPlaced.push(text);
    return false;
  };

  // THE SUBJECT FIRST, because it is the one label that may not be pushed anywhere.
  const subjectDot = 5;
  {
    const cx = mapX + subject.x * mapW;
    const cy = mapY + subject.y * mapW;
    let y = cy - subjectDot - 6 - (subject.lines.length - 1) * annotLead;
    for (const l of subject.lines) {
      taken.push(boxAt(l, annot, cx + subjectDot + 6, y, "start"));
      y += annotLead;
    }
  }
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
      ` · panel ${panel}px · map ${mapW.toFixed(0)} x ${mapH.toFixed(0)}`,
  );
  onLadder?.(
    `places: ${placed.filter((p) => p.kind === "area").length} areas, ` +
      `${placed.filter((p) => p.kind === "place").length} settlements, ` +
      `${placed.filter((p) => p.kind === "water").length} waters placed` +
      (notPlaced.length
        ? ` · no room for: ${notPlaced.join(", ")}`
        : " · none dropped"),
  );

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
        {/* MapTiler's geography, baked once per filed direction in that direction's own tints. A
            locator is the map family that most needs a real basemap: its whole job is to say WHERE,
            and a reader who does not recognise the coastline has been told nothing. */}
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
            strokeWidth={0.7}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {places.map((p) => (
          <circle
            key={`dot-${p.name}`}
            cx={mapX + p.x * mapW}
            cy={mapY + p.y * mapW}
            r={2.4}
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
          {subject.lines.map((l, i) => (
            <text
              key={`subj${i}`}
              x={mapX + subject.x * mapW + subjectDot + 6}
              y={
                mapY +
                subject.y * mapW -
                subjectDot -
                6 -
                (subject.lines.length - 1 - i) * annotLead
              }
              {...line(annot)}
              fill={accentInk}
              fontWeight={i === 0 ? 700 : annot.fontWeight}
            >
              {l}
            </text>
          ))}
        </g>
      </g>
    </svg>
  );
}
