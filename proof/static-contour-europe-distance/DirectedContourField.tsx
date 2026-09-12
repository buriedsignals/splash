/**
 * Europe as a continuous field — distance to the sea — drawn THROUGH the design base. The first
 * `contour / isoline` component in this tree, and the sixth map beat.
 *
 * WHAT AN ISOLINE MAP IS, AND WHAT IT COSTS.
 * Every other map beat here draws things: a country, a station, a tile. This one draws a QUANTITY
 * THAT EXISTS EVERYWHERE, and the line is the only mark it has. That buys a reading no counting map
 * can give — between two lines the value changes continuously, so a reader can put a number on a
 * place the data never names. It costs completeness: a field with a hole in it does not degrade, it
 * lies, because the hole is filled by interpolation from whatever is around it. That is why this
 * beat's field is geometry rather than records, and `render-directions.mjs` says so with numbers.
 *
 * `the-key-prints-its-breaks-in-the-data-s-units` (FT, ProPublica) — met in the strongest form the
 * base has seen: **each line carries its own break, in kilometres, on itself**. There is no key to
 * look away to, which is the whole argument for labelling a contour rather than legending it.
 *
 * `the-basemap-gives-up-its-contrast` (La Nación, ProPublica) — the land is one step off the ground
 * and NO border is stroked at all, not even a coastline: a border is not part of this measurement,
 * and a line that is not part of the measurement competes with the lines that are. The coast draws
 * itself, as the edge between the land tint and the bare ground — which is also the field's zero.
 *
 * `water-is-a-tint-not-a-grey` IS offered here and is DECLINED, with the reason written in
 * `PALETTE.md`: on this plate the measured quantity is distance from the water, so a blue sea and a
 * ramp measuring distance from it would be one channel carrying two things. The sea is the bare
 * ground instead, and the coastline — the field's own zero — is the edge between ground and land.
 *
 * `three-classes-of-place-three-treatments` (Toxmap, SCMP) is NOT applicable and is not faked: this
 * plate has one class of place. The single reference this form has in the base is Toxmap, one
 * publication — below the floor of two — so the beat files no family rule of its own.
 */

import {
  deriveFurniture,
  measureText,
  measureTextBand,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import { mix, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { resolveRegister, applyCase } from "#shared/chart-beat/registers.mjs";

/** 960 x 540 at scale 2 is the `landscape` this beat pins — 1920 x 1080. */
const FRAME = { width: 960, height: 540 };

type RegisterName = "display" | "eyebrow" | "body" | "axis" | "annot" | "value";

export type Shape = { iso: string; study: boolean; d: string };
export type Contour = { level: number; lines: number[][][] };
export type Summit = { x: number; y: number; label: string };

type Box = { x0: number; y0: number; x1: number; y1: number };

export function DirectedContourField({
  plate,
  shapes,
  contourSets,
  summit,
  aspect,
  unit,
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
  contourSets: Contour[][];
  summit: Summit;
  aspect: number;
  unit: string;
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
  const inkOf = { ink, muted, accent: direction.accent } as Record<string, string>;
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

  const set = (text: string, r: { transform: string }) => applyCase(text, r.transform);
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
      w = measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
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
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  const annotBand = bandOf(annot);
  const axisBand = bandOf(axis);

  /** THE SEA IS THE BARE GROUND AND THE LAND IS ONE STEP OFF IT. `PALETTE.md` records why the water
   *  convention is declined here and nowhere else: the quantity on this plate IS distance from the
   *  water, so a blue sea and a ramp that measures distance from it would share one channel. */
  const land = mix(direction.ground, ink, 0.085);
  const outside = mix(direction.ground, ink, 0.03);

  /** A CONTOUR IS MEASURED AGAINST THE LAND IT IS DRAWN ON, not against the plate's ground. The land
   *  is a frame the plate's guards cannot see: every contrast test this tree owns compares a mark to
   *  `direction.ground`, and every one of these lines sits on a tint that is not it. */
  const levelInk = (i: number, n: number) => {
    const raw = mix(mix(direction.ground, ink, 0.35), direction.accent, n > 1 ? i / (n - 1) : 1);
    if (contrast(raw, land) >= NON_TEXT_CONTRAST_MIN) return raw;
    const lifted = adjustToContrast(raw, land, NON_TEXT_CONTRAST_MIN);
    if (!lifted)
      throw new Error(
        `the ${i + 1}th contour tone cannot be told from the land it is drawn on: nothing between it ` +
          `and the direction's poles clears ${NON_TEXT_CONTRAST_MIN}:1 against ${land}.`,
      );
    return lifted;
  };

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
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), panel, annot);
    const sourceLines = wrap(set(source, body), panel, body);
    /** EVERY RUN IN THE PANEL IS WRAPPED AGAINST THE PANEL. A panel is a frame too, and the plate's
     *  guards measure the plate's frame — three beats before this one shipped a note under the map. */
    const unitLines = wrap(set(unit, annot), panel, annot);
    const limitLines = wrap(set(limitNote, axis), panel, axis);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop = eyebrowBaseline + eyebrowReg.fontSize * 0.9 + display.fontSize;
    const limitsTop = titleTop + titleLines.length * titleLead + body.fontSize * 0.8;
    const unitTop =
      limitsTop + standfirstLines.length * bodyLead + annot.fontSize * 1.2 + annotBand.ascent;
    const limitTop = unitTop + unitLines.length * annotLead;
    const limitLead = axisBand.ascent + axisBand.descent + 2;
    const readingTop =
      limitTop + limitLines.length * limitLead + annotBand.ascent + annot.fontSize * 0.6;
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const footTop = readingTop + Math.max(0, readingLines.length - 1) * annotLead;
    return {
      titleLines,
      standfirstLines,
      unitLines,
      limitLines,
      readingLines,
      sourceLines,
      eyebrowBaseline,
      titleTop,
      limitsTop,
      unitTop,
      limitTop,
      limitLead,
      readingTop,
      sourceTop,
      spare: sourceTop - bodyLead * 0.9 - footTop,
    };
  };

  const rungs: Array<{ share: number; title: number; limit: number; reading: number }> = [];
  for (const share of SHARES)
    for (let t = 0; t < title.length; t++)
      for (let l = 0; l < limits.length; l++) {
        for (let r = 0; r < reading.length; r++) rungs.push({ share, title: t, limit: l, reading: r });
        rungs.push({ share, title: t, limit: l, reading: -1 });
      }
  let fits: { rung: (typeof rungs)[number]; layout: ReturnType<typeof layoutFor> } | null = null;
  for (const rung of rungs) {
    const l = layoutFor(panelFor(rung.share), rung.title, rung.limit, rung.reading);
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
  const at = ([x, y]: number[]) => [mapX + (x / 1000) * mapW, mapY + (y / 1000) * mapW];

  /** THE LADDER IS THE LEVEL SET, AND ITS FLOOR IS THAT EVERY DRAWN LINE CARRIES ITS OWN NUMBER.
   *  A contour without its value is a decoration: the reader can see that something changes and
   *  cannot say what. So a line too short to hold its label is not drawn — and a SET in which any
   *  drawn line cannot be given a label that clears the ones already placed is refused whole, and
   *  the beat steps to a coarser set rather than shipping an unlabelled line. */
  const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const inMap = (b: Box) =>
    b.x0 >= mapBox.x + 2 &&
    b.x1 <= mapBox.x + mapBox.width - 2 &&
    b.y0 >= mapBox.y + 2 &&
    b.y1 <= mapBox.y + mapBox.height - 2;

  type Placed = { level: number; label: string; x: number; y: number; box: Box };
  const placeSet = (set_: Contour[]) => {
    /** Every line of the set is measured first, so a label can be tested against the lines it does
     *  NOT belong to. A number that breaks its own line reads as that line's value; the same number
     *  laid across the next line up reads as that one's, and the map says something false. */
    type Drawn = { level: number; li: number; points: number[][]; label: string; w: number };
    const kept: Drawn[] = [];
    let dropped = 0;
    const h = axisBand.ascent + axisBand.descent;
    for (let li = 0; li < set_.length; li++) {
      const c = set_[li];
      const label = `${c.level} km`;
      const w = widthOf(set(label, axis), axis);
      for (const raw of c.lines) {
        const points = raw.map(at);
        let length = 0;
        for (let i = 1; i < points.length; i++)
          length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
        /** A LINE THAT ITS OWN LABEL WOULD COVER IS NOT A CONTOUR A READER CAN USE. The floor is the
         *  label, so it moves with the direction — a tracked capital face buys fewer lines than a
         *  compact one, which is a real cost of that face and not a defect. */
        if (length < w * 2.2) {
          dropped++;
          continue;
        }
        kept.push({ level: c.level, li, points, label, w });
      }
    }

    /** THE SUMMIT GOES DOWN FIRST AND MAY NOT MOVE FAR. It is the one number on this plate the
     *  headline names, so every contour label is placed around it rather than it around them. */
    const sx = mapX + (summit.x / 1000) * mapW;
    const sy = mapY + (summit.y / 1000) * mapW;
    const sw = widthOf(set(summit.label, axis), axis);
    const OFFSETS = [
      [sw / 2 + 9, 0],
      [-sw / 2 - 9, 0],
      [0, -h - 3],
      [0, h + 3],
      [sw / 2 + 9, -h - 3],
      [-sw / 2 - 9, h + 3],
    ];
    let summitSeat: Placed | null = null;
    for (const [dx, dy] of OFFSETS) {
      const x = sx + dx;
      const y = sy + dy;
      const box = { x0: x - sw / 2 - 3, y0: y - h / 2 - 2, x1: x + sw / 2 + 3, y1: y + h / 2 + 2 };
      if (!inMap(box)) continue;
      summitSeat = { level: -1, label: summit.label, x, y, box };
      break;
    }
    if (!summitSeat)
      throw new Error(
        `the deepest point of the field has no room for its own number inside the camera; the ` +
          `headline names that number and the map would not carry it.`,
      );
    const placed: Placed[] = [summitSeat];
    for (const d of kept) {
      const others = kept.filter((k) => k.level !== d.level);
      const candidates: Array<{ i: number; flat: number }> = [];
      for (let i = 4; i < d.points.length - 4; i += 2) {
        const dx = d.points[i + 4][0] - d.points[i - 4][0];
        const dy = d.points[i + 4][1] - d.points[i - 4][1];
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;
        candidates.push({ i, flat: Math.abs(dx) / len });
      }
      candidates.sort((a, b) => b.flat - a.flat);
      const clear: Placed[] = [];
      for (const cand of candidates) {
        if (clear.length >= 40) break;
        const [x, y] = d.points[cand.i];
        const box = { x0: x - d.w / 2 - 3, y0: y - h / 2 - 2, x1: x + d.w / 2 + 3, y1: y + h / 2 + 2 };
        if (!inMap(box)) continue;
        if (placed.some((p) => overlaps(p.box, box))) continue;
        if (
          others.some((o) => {
            for (let i = 0; i < o.points.length; i += 2) {
              const [px, py] = o.points[i];
              if (px > box.x0 && px < box.x1 && py > box.y0 && py < box.y1) return true;
            }
            return false;
          })
        )
          continue;
        clear.push({ level: d.level, label: d.label, x, y, box });
      }
      if (!clear.length) return null;
      /** Among the seats that are clear, the one FARTHEST from every number already placed. Taking
       *  the first clear seat put a `500 km` beside a `100 km` from a different family, and two
       *  numbers side by side on a contour map read as one ladder. */
      let best = clear[0];
      let bestGap = -1;
      for (const seat of clear) {
        let gap = Infinity;
        for (const p of placed) gap = Math.min(gap, Math.hypot(p.x - seat.x, p.y - seat.y));
        if (gap > bestGap) {
          bestGap = gap;
          best = seat;
        }
      }
      placed.push(best);
    }
    const drawn = kept.map((d) => ({
      level: d.level,
      points: d.points,
      ink: levelInk(d.li, set_.length),
      weight: direction.stroke.hairline * (0.85 + (d.li / Math.max(1, set_.length - 1)) * 0.9),
    }));
    const tally = set_
      .map((c) => {
        const k = kept.filter((d) => d.level === c.level).length;
        return `${c.level}:${k}/${c.lines.length}`;
      })
      .join(" ");
    return { placed, drawn, dropped, tally };
  };

  let chosen: ReturnType<typeof placeSet> = null;
  let chosenIndex = -1;
  for (let i = 0; i < contourSets.length; i++) {
    const attempt = placeSet(contourSets[i]);
    if (attempt) {
      chosen = attempt;
      chosenIndex = i;
      break;
    }
  }
  if (!chosen)
    throw new Error(
      `no filed set of levels can be drawn with every line carrying its own number in this ` +
        `direction: the labels of the coarsest set still collide. A contour that does not say what ` +
        `it is worth is a decoration.`,
    );

  onLadder?.(
    `ladder: headline ${fits.rung.title + 1}, standfirst ${fits.rung.limit + 1}, reading ` +
      (fits.rung.reading < 0 ? "dropped" : `form ${fits.rung.reading + 1}`) +
      ` · levels drawn/found ${chosen.tally} · ${chosen.dropped} too short for their own label · ` +
      `panel ${panel}px`,
  );

  /** The drawn line is thinned to the plate's own resolution: a vertex closer than a third of a
   *  pixel to the last one is a vertex nobody can see and a byte in every delivered file. */
  const pathOf = (pts: number[][]) => {
    const out: number[][] = [pts[0]];
    for (const p of pts.slice(1)) {
      const q = out[out.length - 1];
      if (Math.abs(p[0] - q[0]) > 0.33 || Math.abs(p[1] - q[1]) > 0.33) out.push(p);
    }
    if (out.length < 2) out.push(pts[pts.length - 1]);
    return `M ${out.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")}`;
  };

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
        <text key={l + i} x={PAD} y={layout.titleTop + i * titleLead} {...line(display)}>
          {l}
        </text>
      ))}
      {layout.standfirstLines.map((l, i) => (
        <text key={l + i} x={PAD} y={layout.limitsTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}

      {/* WHAT THE LINES MEASURE, IN WORDS — the one thing the encoding cannot say for itself, since
          every line says only its own number. */}
      {layout.unitLines.map((l, i) => (
        <text
          key={`u${i}`}
          x={PAD}
          y={layout.unitTop + i * annotLead}
          {...line(annot)}
          fill={mutedInk}
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
        {/* MapTiler's geography, baked once per filed direction in that direction's own tints. The
            study-area fills still go over it: the plate says where the land is, the fills say which
            land this beat measured. */}
        <image
          href={plate}
          x={mapX}
          y={mapY}
          width={mapW}
          height={mapW / aspect}
          preserveAspectRatio="none"
        />
        {/* THE BASEMAP GIVES UP ITS CONTRAST. Land outside the study area is fainter still: the
            measurement stops there, and a reader should see that it stops rather than read the
            silence as a value. No borders are drawn — a border is not part of this field. */}
        {shapes.map((s) => (
          <path
            key={s.iso}
            d={s.d}
            transform={`translate(${mapX} ${mapY}) scale(${mapW / 1000})`}
            fill={s.study ? land : outside}
          />
        ))}

        {/* THE FIELD. Each line joins the points at one distance from the sea. It is not gated on a
            treatment: the contours are this beat's encoding, and an encoding is not optional. */}
        {chosen.drawn.map((d, i) => (
          <path
            key={`c${i}`}
            d={pathOf(d.points)}
            fill="none"
            stroke={d.ink}
            strokeWidth={d.weight}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* THE SUMMIT OF THE FIELD, spot-marked the way a topographic map marks a peak. */}
        <g>
          <circle
            cx={mapX + (summit.x / 1000) * mapW}
            cy={mapY + (summit.y / 1000) * mapW}
            r={2.6}
            fill={direction.accent}
          />
          <circle
            cx={mapX + (summit.x / 1000) * mapW}
            cy={mapY + (summit.y / 1000) * mapW}
            r={5.2}
            fill="none"
            stroke={direction.accent}
            strokeWidth={direction.stroke.hairline}
          />
        </g>

        {/* EACH LINE CARRIES ITS OWN BREAK, IN THE DATA'S UNITS, ON ITSELF. The halo is the land it
            sits on, so the line reads as broken for its own number rather than crossed out by it. */}
        {chosen.placed.map((p, i) => (
          <g key={`l${i}`}>
            <text
              x={p.x}
              y={p.y + axisBand.ascent / 2}
              textAnchor="middle"
              {...line(axis)}
              fill="none"
              stroke={land}
              strokeWidth={3.4}
              strokeLinejoin="round"
            >
              {set(p.label, axis)}
            </text>
            <text
              x={p.x}
              y={p.y + axisBand.ascent / 2}
              textAnchor="middle"
              {...line(axis)}
              fill={adjustToContrast(ink, land, TEXT_CONTRAST_MIN)}
            >
              {set(p.label, axis)}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
