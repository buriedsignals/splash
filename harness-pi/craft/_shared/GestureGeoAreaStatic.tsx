/**
 * The AREA maps' gesture plate — choropleth, tile cartogram, hex cartogram, dot density — as one component with a
 * `variant`. The furniture is forked from static/hex-grid…/DirectedHexGrid.tsx (eyebrow, title ladder, standfirst,
 * key in the data's units, reading, credit; ink and muted derived from the ground; one accent), the geometry from
 * ./gesture-geo-area-shapes.mjs. What the per-type plates stage by fixed fields (a subject ringed, a list named, a
 * callout), this one draws from the gesture scheduler's declaration (./gesture-geo-area-static.mjs composeGeoStatic):
 *
 *   accent   the subject's cell ringed in the accent (ringed, never recoloured — the class colour is the encoding)
 *   rings    other places ringed in ink (a highlight on a non-subject place, a compare's second place)
 *   named    places named with their value at their seat
 *   stepBack places a filter does not keep: their class fill is washed toward the ground, nothing moves
 *   floor    a reference: every cell at or above that class floor outlined in ink, the floor marked on the key
 *   notes    every gesture's note, in story order, set in the annotation register above the key
 *
 * `GeoAreaBand` (the map itself, cells keyed by data-geo-key) and `geoPalette` are shared with the web, scrolly and
 * video components, so a place looks the same in every format.
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
import { applyCase } from "#shared/chart-beat/registers.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import { layoutCells } from "./gesture-geo-area-shapes.mjs";
import { classIndex } from "./gesture-family-geo.mjs";

const FRAME = { width: 960, height: 540 };

export type GeoRow = { key: string; name: string; value: number | null };
export type GeoState = {
  accent: string | null;
  rings: string[];
  named: string[];
  stepBack: string[];
  floor: number | null;
  notes: Array<{ key?: string; keys?: string[]; text: string; kind: string }>;
  classesShown?: number;
};

/** The colours every format draws the classes, the washed step-back, no data and the land in. */
export function geoPalette(direction: any, classCount: number) {
  const { ink, muted, grid } = deriveFurniture(direction.ground);
  const floorAgainstGround = (colour: string, what: string) => {
    if (contrast(colour, direction.ground) >= NON_TEXT_CONTRAST_MIN)
      return colour;
    const lifted = adjustToContrast(
      colour,
      direction.ground,
      NON_TEXT_CONTRAST_MIN,
    );
    if (!lifted)
      throw new Error(
        `${what} cannot be told from the ground it sits on in this direction's colours.`,
      );
    return lifted;
  };
  const low = floorAgainstGround(
    mix(direction.accent, direction.ground, 0.88),
    "the lowest class of the ramp",
  );
  const high = mix(direction.accent, ink, 0.3);
  const classFill = (i: number) =>
    mix(low, high, classCount > 1 ? i / (classCount - 1) : 0.5);
  // A stepped-back place keeps a trace of its class (nothing about its value is hidden) at a wash toward the ground.
  const backFill = (i: number) => mix(classFill(i), direction.ground, 0.72);
  const missingFill = floorAgainstGround(
    mix(direction.ground, ink, 0.16),
    "the fill of a place with no data",
  );
  const landFill = mix(direction.ground, ink, 0.07);
  const accentInk = adjustToContrast(
    direction.accent,
    direction.ground,
    TEXT_CONTRAST_MIN,
  );
  const mutedInk = adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN);
  return {
    ink,
    muted,
    grid,
    low,
    high,
    classFill,
    backFill,
    missingFill,
    landFill,
    accentInk,
    mutedInk,
  };
}

/**
 * The map band: land, cells (keyed by data-geo-key, each with its class), dots, rings, the floor outline and the
 * named labels. Every element a later state changes carries data attributes, so the web page's CSS and the scrolly
 * drive restyle the same SVG without redrawing it. `state` is the picture shown with no script.
 */
export function GeoAreaBand({
  variant,
  layout,
  breaks,
  format,
  state,
  direction,
  palette,
  axis,
  annot,
  showCodes,
}: {
  variant: string;
  layout: ReturnType<typeof layoutCells>;
  breaks: number[];
  format: (v: number) => string;
  state: GeoState;
  direction: any;
  palette: ReturnType<typeof geoPalette>;
  axis: any;
  annot: any;
  showCodes: boolean;
}) {
  const { classFill, backFill, missingFill, landFill, accentInk, ink } =
    palette;
  const back = new Set(state.stepBack);
  const shown = state.classesShown ?? breaks.length + 1;
  const klass = (v: number | null) =>
    v === null ? null : classIndex(v, breaks);
  const line = (r: any) => ({
    fontFamily: r.fontFamily,
    fontSize: r.fontSize,
    fontWeight: r.fontWeight,
    letterSpacing: r.letterSpacing,
  });
  const band = measureTextBand("Hxpg1,", {
    fontSize: axis.fontSize,
    fontWeight: axis.fontWeight,
    fontFamily: axis.fontFamily,
  });
  const legibleOn = (fill: string) =>
    contrast(ink, fill) >= contrast(direction.ground, fill)
      ? ink
      : direction.ground;
  const fillOf = (v: number | null, key: string) => {
    const c = klass(v);
    if (c === null) return missingFill;
    if (c >= shown) return landFill;
    return back.has(key) ? backFill(c) : classFill(c);
  };
  const isDots = variant === "dot-density";
  const isShapes = variant === "choropleth" || isDots;
  const rule = Math.max(direction.stroke.rule, 1.2);
  const ringR = (size: number) => Math.max(9, Math.min(26, size * 0.32));
  const floorKeys =
    state.floor === null
      ? []
      : layout.cells
          .filter((c) => c.value !== null && klass(c.value)! >= state.floor!)
          .map((c) => c.key);
  const ringed = [
    ...state.rings.map((k) => ({ k, colour: ink })),
    ...(state.accent ? [{ k: state.accent, colour: accentInk }] : []),
  ];
  const cellOf = (k: string) => layout.cells.find((c) => c.key === k);
  // A grid cell holds its value under its code only when it is tall enough for two lines.
  const valued = (c: { key: string; value: number | null; size: number }) => state.named.includes(c.key) && c.value !== null && c.size >= band.ascent * 3.4;

  return (
    <g data-geo-band={variant}>
      {layout.land.map((l, i) => (
        <path
          key={`l${i}`}
          d={l.d}
          fill={landFill}
          stroke={direction.ground}
          strokeWidth={0.6}
        />
      ))}
      {!isDots &&
        layout.cells.map((c) => {
          const fill = fillOf(c.value, c.key);
          return (
            <g
              key={c.key}
              data-geo-key={c.key}
              data-geo-class={klass(c.value) ?? "none"}
            >
              <path d={c.d} fill={c.value === null && !isShapes ? direction.ground : fill} stroke={c.value === null && !isShapes ? palette.mutedInk : direction.ground} strokeWidth={isShapes ? 0.7 : rule} />
              {showCodes && (
                <text
                  x={c.seat.x}
                  y={c.seat.y + (band.ascent - band.descent) / 2 - (valued(c) ? band.ascent * 0.7 : 0)}
                  textAnchor="middle"
                  {...line(axis)}
                  fill={legibleOn(fill)}
                  fontWeight={c.key === state.accent ? 700 : axis.fontWeight}
                >
                  {applyCase(c.key, axis.transform)}
                </text>
              )}
              {/* A named cell prints its value under its code, inside its own cell. */}
              {showCodes && valued(c) && (
                <text
                  data-geo-name={c.key}
                  x={c.seat.x}
                  y={c.seat.y + (band.ascent - band.descent) / 2 + band.ascent * 0.85}
                  textAnchor="middle"
                  {...line(axis)}
                  fill={legibleOn(fill)}
                  fontWeight={700}
                >
                  {format(c.value as number)}
                </text>
              )}
            </g>
          );
        })}
      {isDots &&
        layout.dots.map((d, i) => {
          const gi = layout.cells.findIndex((c) => c.key === d.key);
          const subject = d.key === state.accent;
          const stepped = back.has(d.key);
          return (
            <circle
              key={`d${i}`}
              data-geo-dot={d.key}
              cx={d.x.toFixed(1)}
              cy={d.y.toFixed(1)}
              r={subject ? 1.6 : 1.1}
              fill={
                stepped
                  ? mix(palette.muted, direction.ground, 0.6)
                  : subject
                    ? ink
                    : mix(palette.muted, direction.ground, gi < 0 ? 0.4 : 0.15)
              }
            />
          );
        })}
      {isDots &&
        state.accent &&
        layout.dots
          .filter((d) => d.key === state.accent)
          .map((d, i) => (
            <circle
              key={`ra${i}`}
              cx={d.x.toFixed(1)}
              cy={d.y.toFixed(1)}
              r={4.2}
              fill="none"
              stroke={accentInk}
              strokeWidth={1.3}
            />
          ))}
      {isDots &&
        state.rings.flatMap((k) =>
          layout.dots
            .filter((d) => d.key === k)
            .map((d, i) => (
              <circle
                key={`rr${k}${i}`}
                cx={d.x.toFixed(1)}
                cy={d.y.toFixed(1)}
                r={3.6}
                fill="none"
                stroke={ink}
                strokeWidth={0.9}
              />
            )),
        )}
      {/* A reference is a class floor: every place at or above it outlined in ink. */}
      {!isDots &&
        floorKeys.map((k) => {
          const c = cellOf(k)!;
          return (
            <path
              key={`f${k}`}
              data-geo-floor={k}
              d={c.d}
              fill="none"
              stroke={ink}
              strokeWidth={rule * 1.3}
            />
          );
        })}
      {!isDots &&
        ringed.map(({ k, colour }) => {
          const c = cellOf(k);
          if (!c) return null;
          // The subject's ring is struck over a halo in the ground, so the accent reads on any class it sits on; an
          // ink ring (a compared place) is thinner, so the subject stays the strongest mark.
          const subject = colour !== ink;
          const w = subject ? rule * 2 : rule * 1.2;
          const shape = (stroke: string, width: number, key: string) =>
            isShapes ? (
              <circle key={key} data-geo-ring={k} cx={c.seat.x} cy={c.seat.y} r={ringR(c.size)} fill="none" stroke={stroke} strokeWidth={width} />
            ) : (
              <path key={key} data-geo-ring={k} d={c.d} fill="none" stroke={stroke} strokeWidth={width} strokeLinejoin="round" />
            );
          return (
            <g key={`ring${k}`}>
              {subject && shape(direction.ground, w + rule * 2.4, `h${k}`)}
              {shape(colour, w, `r${k}`)}
            </g>
          );
        })}
      {/* Named places: the name and the value at the seat, haloed in the ground. Grids already print the code. */}
      {state.named.map((k) => {
        const c = cellOf(k);
        if (!c || c.value === null || !isShapes || isDots) return null;
        const below = isShapes
          ? ringR(c.size) + annot.fontSize
          : (c.size || 20) * 0.5 + annot.fontSize;
        const text = isDots
          ? `${c.name} ${format(c.value)}`
          : isShapes
            ? `${c.name} ${format(c.value)}`
            : format(c.value);
        return (
          <text
            key={`n${k}`}
            data-geo-name={k}
            x={c.seat.x}
            y={c.seat.y + (isDots ? -14 : below)}
            textAnchor="middle"
            {...line(annot)}
            fontWeight={700}
            fill={ink}
            stroke={direction.ground}
            strokeWidth={3}
            paintOrder="stroke"
          >
            {applyCase(text, annot.transform)}
          </text>
        );
      })}
    </g>
  );
}

export function GestureGeoAreaStatic({
  variant,
  rows,
  shapes,
  grid,
  points,
  breaks,
  format,
  plate,
  unit,
  missingLabel,
  title,
  limits,
  reading,
  source,
  alt,
  eyebrow,
  direction,
  onLadder,
  frame,
}: {
  variant: string;
  rows: GeoRow[];
  shapes?: any;
  grid?: string[];
  points?: Array<{ lon: number; lat: number; key: string }>;
  breaks: number[];
  format: (v: number) => string;
  plate: GeoState;
  unit: string;
  missingLabel: string;
  title: string[];
  limits: string[];
  reading: string[];
  source: string;
  alt: string;
  eyebrow: string;
  direction: any;
  onLadder?: (note: string) => void;
  frame?: { width: number; height: number };
}) {
  const { width, height } = frame ?? FRAME;
  const PAD = direction.pad;
  const reg = (name: string) => registerOf(direction, name);
  const display = reg("display");
  const eyebrowReg = reg("eyebrow");
  const body = reg("body");
  const axis = reg("axis");
  const annot = reg("annot");
  const set = (text: string, r: { transform: string }) => applyCase(text, r.transform);
  const sizeOf = (r: any) => ({ fontSize: r.fontSize, fontWeight: r.fontWeight, fontFamily: r.fontFamily });
  const widthOf = (text: string, r: any) => measureText(text, sizeOf(r)) + Number(r.letterSpacing ?? 0) * Math.max(0, text.length - 1);
  const bandOf = (r: any) => measureTextBand("Hxpg1,", sizeOf(r));
  const wrap = (text: string, maxWidth: number, r: any): string[] => {
    const out: string[] = [];
    let current = "";
    for (const word of String(text).split(/\s+/)) {
      const trial = current ? `${current} ${word}` : word;
      if (current && widthOf(trial, r) > maxWidth) {
        out.push(current);
        current = word;
      } else current = trial;
    }
    if (current) out.push(current);
    return out;
  };
  const line = (r: any) => ({ fontFamily: r.fontFamily, fontSize: r.fontSize, fontWeight: r.fontWeight, fontStyle: r.fontStyle, letterSpacing: r.letterSpacing, fill: r.fill });

  const isDots = variant === "dot-density";
  const grids = variant === "cartogram-area-distortion-and-tile-cartogram" || variant === "hex-grid-spatial-binning-and-hex-cartogram";
  const classCount = breaks.length + 1;
  const palette = geoPalette(direction, classCount);
  const { classFill, missingFill, mutedInk, ink } = palette;
  const column = width - PAD * 2;
  const titleLead = leadOf(display);
  const bodyLead = leadOf(body);
  const annotLead = leadOf(annot);
  const axisBand = bandOf(axis);
  const annotBand = bandOf(annot);
  const axisLead = axisBand.ascent + axisBand.descent + 3;
  const hasMissing = rows.some((r) => r.value === null);
  // A dot map's group has no place to be named at (its dots are everywhere): its name and count join the notes.
  const noteTexts = [
    ...plate.notes.map((n) => n.text),
    ...(variant === "dot-density"
      ? plate.named.filter((k) => !plate.notes.some((n) => n.key === k)).map((k) => {
          const r = rows.find((x) => x.key === k);
          return r && r.value !== null ? `${r.name} : ${format(r.value)}` : "";
        }).filter(Boolean)
      : []),
  ];
  const breakLabels = breaks.map((b) => set(format(b), axis));
  // A wide frame sets the words in a side column and gives the map the height; a tall one stacks them under it.
  const side = width / height > 1.25;
  const sideW = side ? Math.min(Math.max(260, column * 0.34), 380) : column;
  const GAP = 24;

  /** The words column (standfirst, notes, key, reading), top-down, for a rung; returns its lines and height. */
  const wordsFor = (l: number, r: number, w: number) => {
    const limitLines = l < 0 ? [] : wrap(set(limits[l], body), w, body);
    const noteLines = noteTexts.map((n) => wrap(set(n, annot), w, annot));
    const unitLines = wrap(set(unit, axis), w, axis);
    const readingLines = r < 0 ? [] : wrap(set(reading[r], annot), w, annot);
    const swatch = Math.max(30, ...breakLabels.map((b) => widthOf(b, axis) + 10));
    const perRow = Math.max(1, Math.floor(w / swatch));
    const keyRows = isDots ? 0 : Math.ceil(classCount / perRow);
    const missingRow = hasMissing && !isDots ? 1 : 0;
    const blocks = [
      limitLines.length ? limitLines.length * bodyLead + 10 : 0,
      noteLines.reduce((s, n) => s + n.length * annotLead + 6, 0) + (noteLines.length ? 8 : 0),
      unitLines.length * axisLead + keyRows * (axisBand.ascent * 2 + axisLead + 6) + missingRow * (axisLead + 6) + 10,
      readingLines.length ? readingLines.length * annotLead + 6 : 0,
    ];
    return { limitLines, noteLines, unitLines, readingLines, swatch, perRow, keyRows, height: blocks.reduce((a, b) => a + b, 0) };
  };

  const layoutFor = (t: number, l: number, r: number) => {
    const titleLines = wrap(set(title[t], display), column, display);
    const sourceLines = wrap(set(source, body), column, body);
    const eyebrowBaseline = PAD + eyebrowReg.fontSize;
    const titleTop = eyebrowBaseline + gapOf(eyebrowReg, EYEBROW_TO_DISPLAY) + display.fontSize;
    const titleBottom = titleTop + (titleLines.length - 1) * titleLead + display.fontSize * 0.3;
    const sourceTop = height - PAD - (sourceLines.length - 1) * bodyLead;
    const top = titleBottom + gapOf(body, 0.9) + body.fontSize;
    const floor = sourceTop - bodyLead * 1.4;
    const words = wordsFor(l, r, sideW);
    if (side) {
      const map = { x: PAD + sideW + GAP, y: top - body.fontSize * 0.6, width: column - sideW - GAP, height: floor - top + body.fontSize * 0.6 };
      return { titleLines, sourceLines, eyebrowBaseline, titleTop, sourceTop, words, wordsTop: top, map, fitsWords: top + words.height <= floor };
    }
    const wordsTop = floor - words.height + body.fontSize;
    const map = { x: PAD, y: top - body.fontSize * 0.6, width: column, height: wordsTop - top - 10 };
    return { titleLines, sourceLines, eyebrowBaseline, titleTop, sourceTop, words, wordsTop, map, fitsWords: map.height > 0 };
  };

  // The ladder, in the order a desk cuts: the reading line, then the standfirst's forms, then the standfirst; the
  // headline last. The notes are gestures and are never cut.
  const rungs: Array<{ t: number; l: number; r: number }> = [];
  for (let t = 0; t < title.length; t++)
    for (const l of [...limits.map((_, i) => i), -1]) {
      for (let r = 0; r < reading.length; r++) rungs.push({ t, l, r });
      rungs.push({ t, l, r: -1 });
    }
  const codeOwes = Math.max(...rows.map((r) => widthOf(set(r.key, axis), axis))) + 6;
  type Fit = { rung: (typeof rungs)[number]; layout: ReturnType<typeof layoutFor>; cells: ReturnType<typeof layoutCells> };
  let fits: Fit | null = null;
  let widest: Fit | null = null;
  let best = -Infinity;
  for (const rung of rungs) {
    const l = layoutFor(rung.t, rung.l, rung.r);
    if (!l.fitsWords || l.map.height <= 0) continue;
    const cells = layoutCells(variant, { rows, shapes, grid, points, box: l.map });
    const size = grids ? cells.cellSize ?? 0 : Math.min(l.map.height, l.map.width);
    if (size > best) {
      best = size;
      widest = { rung, layout: l, cells };
    }
    if (grids ? size >= codeOwes : l.map.height >= height * 0.45) {
      fits = { rung, layout: l, cells };
      break;
    }
  }
  // A shape map takes the widest band the copy leaves (the geography scales); a grid whose cells cannot hold their
  // own codes is a pattern, not a map, and is refused as the per-type kit refuses it.
  if (!fits && !grids && widest && best >= height * 0.22) fits = widest;
  if (!fits)
    throw new Error(
      grids
        ? `the widest cell this copy leaves is ${best.toFixed(1)}px and a cell that must hold its own code owes ${codeOwes.toFixed(1)}px: shorten the notes, the standfirst or the title`
        : `the map this copy leaves is ${best.toFixed(0)}px of ${height}px: shorten the notes, the standfirst or the title`,
    );
  const { layout, cells } = fits;
  const { words } = layout;
  onLadder?.(`ladder: headline ${fits.rung.t + 1}, standfirst ${fits.rung.l < 0 ? "dropped" : fits.rung.l + 1}, reading ${fits.rung.r < 0 ? "dropped" : fits.rung.r + 1} · ${cells.cells.length} places, map ${layout.map.width.toFixed(0)} x ${layout.map.height.toFixed(0)}px`);

  // The words column, block by block.
  const x0 = PAD;
  let y = layout.wordsTop;
  const nodes: any[] = [];
  words.limitLines.forEach((l, i) => nodes.push(<text key={`lim${i}`} x={x0} y={y + i * bodyLead} {...line(body)}>{l}</text>));
  if (words.limitLines.length) y += words.limitLines.length * bodyLead + 10;
  if (words.noteLines.length) y += 4;
  words.noteLines.forEach((n, j) => {
    n.forEach((l, i) => nodes.push(<text key={`note${j}-${i}`} x={x0} y={y + i * annotLead} {...line(annot)} fill={ink}>{l}</text>));
    y += n.length * annotLead + 6;
  });
  if (words.noteLines.length) y += 8;
  words.unitLines.forEach((l, i) => nodes.push(<text key={`u${i}`} x={x0} y={y + i * axisLead} {...line(axis)} fill={mutedInk}>{l}</text>));
  y += words.unitLines.length * axisLead;
  if (!isDots) {
    for (let k = 0; k < words.keyRows; k++) {
      const rowTop = y + 4 + k * (axisBand.ascent * 2 + axisLead + 6);
      for (let j = 0; j < words.perRow; j++) {
        const i = k * words.perRow + j;
        if (i >= classCount) break;
        const sx = x0 + j * words.swatch;
        nodes.push(<rect key={`k${i}`} x={sx} y={rowTop} width={words.swatch - 1} height={axisBand.ascent} fill={classFill(i)} />);
        if (i > 0) {
          const floor = plate.floor === i;
          nodes.push(
            <text key={`b${i}`} x={sx} y={rowTop + axisBand.ascent * 2 + 4} textAnchor="middle" {...line(axis)} fill={floor ? ink : mutedInk} fontWeight={floor ? 700 : axis.fontWeight}>
              {breakLabels[i - 1]}
            </text>,
          );
          if (floor) nodes.push(<rect key={`fl${i}`} x={sx - 1} y={rowTop - 4} width={2} height={axisBand.ascent + 8} fill={ink} />);
        }
      }
    }
    y += words.keyRows * (axisBand.ascent * 2 + axisLead + 6) + 4;
    if (hasMissing) {
      nodes.push(grids ? <rect key="miss" x={x0 + 0.5} y={y + 0.5} width={words.swatch - 2} height={axisBand.ascent - 1} fill={direction.ground} stroke={mutedInk} /> : <rect key="miss" x={x0} y={y} width={words.swatch - 1} height={axisBand.ascent} fill={missingFill} />);
      nodes.push(<text key="missl" x={x0 + words.swatch + 6} y={y + axisBand.ascent} {...line(axis)} fill={mutedInk}>{set(missingLabel, axis)}</text>);
      y += axisLead + 6;
    }
    y += 10;
  }
  words.readingLines.forEach((l, i) => nodes.push(<text key={`r${i}`} x={x0} y={y + i * annotLead + annotBand.ascent} {...line(annot)} fill={mutedInk}>{l}</text>));

  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={alt}>
      <rect x={0} y={0} width={width} height={height} fill={direction.ground} />
      <text x={PAD} y={layout.eyebrowBaseline} {...line(eyebrowReg)}>
        {set(eyebrow, eyebrowReg)}
      </text>
      {layout.titleLines.map((l, i) => (
        <text key={`t${i}`} x={PAD} y={layout.titleTop + i * titleLead} {...line(display)}>
          {l}
        </text>
      ))}
      <defs>
        <clipPath id="geo-band">
          <rect x={layout.map.x} y={layout.map.y} width={layout.map.width} height={layout.map.height} />
        </clipPath>
      </defs>
      <g clipPath="url(#geo-band)">
        <GeoAreaBand variant={variant} layout={cells} breaks={breaks} format={format} state={plate} direction={direction} palette={palette} axis={axis} annot={annot} showCodes={grids} />
      </g>
      {nodes}
      {layout.sourceLines.map((l, i) => (
        <text key={`s${i}`} x={PAD} y={layout.sourceTop + i * bodyLead} {...line(body)}>
          {l}
        </text>
      ))}
    </svg>
  );
}
