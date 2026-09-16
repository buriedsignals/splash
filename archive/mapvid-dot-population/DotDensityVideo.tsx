/**
 * The video format of "five countries hold more than half of this map's people" — 12.67s, 30fps,
 * 1080 × 1440.
 *
 * Same plate, same seeded scatter and the same dot value as the static sibling
 * (`proof/mapmore-dot-population`). What this file adds is the one thing a still cannot have: an
 * ORDER, and a meter that reads it. The static beat states the share in a sentence and asks the
 * reader to take the arithmetic on trust; here the countries arrive largest first, each given the
 * same slice of the clock, and the reader watches the meter pass the half-way line at the fifth of
 * forty-two — after which seven eighths of the remaining time add less than the first eighth did.
 *
 * Every window below derives from `timing.ts`; there is no frame literal in this file, and no
 * colour literal either — ground, accent, ink and muted arrive as props, derived in node from the
 * beat's own `PALETTE.md`.
 *
 * WHY THE FIVE ARE NOT RECOLOURED. The static sibling refuses to colour its five subjects
 * differently, because its claim is about which clusters are BIGGEST and recolouring them would beg
 * that question. The same refusal holds here for the same reason: the five are picked out by direct
 * labels, at the end, on a map where every dot has always been the one accent. What carries the
 * argument instead is the meter — a second, explicitly quantitative channel — and the ORDER, which
 * is the property colour cannot encode and motion can.
 */

import { Fragment } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { DOT_TIMING, progressOf, type BeatTiming } from "./timing";

const FRAME = { width: 1080, height: 1440 };
const PAD = 72;
const MAP = { width: 936, height: 827 };
const MAP_X = (FRAME.width - MAP.width) / 2;
/** The plate's top edge. It came DOWN by 50px when the credit left the header for the frame's
 *  bottom margin: the header gave back the row the source used to occupy, and the bottom stack
 *  needed that room to hold the credit as well as the caveat. The same move the seed made
 *  (map-beat/assets/Co2MapVideo.tsx, MAP_Y 300 -> 250), for the same reason, and the beat's
 *  own fit guard is what said so — it threw, by name, with the numbers in the message. */
const MAP_Y = 195;

const TITLE = { fontSize: 34, fontWeight: 700, lead: 43 };
const SOURCE = { fontSize: 18, fontWeight: 400, lead: 23 };
const DOT_KEY = { fontSize: 17, fontWeight: 700 };
const METER_LABEL = { fontSize: 16, fontWeight: 400 };
const METER_READOUT = { fontSize: 19, fontWeight: 700 };
const NOTE = { fontSize: 17, fontWeight: 400, lead: 22 };
const CONCLUSION = { fontSize: 26, fontWeight: 700, lead: 33 };
const COUNTRY_LABEL = { fontSize: 17, fontWeight: 700 };

const METER = { x: PAD, width: FRAME.width - PAD * 2, height: 30 };

const FONT_FAMILY = "Helvetica, Arial, sans-serif";

// The canvas substrate, deliberately NOT the resvg one every `render-still.mjs` carries: this
// component renders in a browser, where the real text metrics live. Duplicated per video beat
// rather than imported, exactly as the other video beats duplicate it.
let measuringContext: CanvasRenderingContext2D | null | undefined;
export function measureText(
  text: string,
  { fontSize, fontWeight = 400 }: { fontSize: number; fontWeight?: number },
): number {
  if (!text) return 0;
  if (measuringContext === undefined)
    measuringContext =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  if (!measuringContext) return text.length * fontSize * 0.5;
  measuringContext.font = `${fontWeight} ${fontSize}px ${FONT_FAMILY}`;
  return measuringContext.measureText(text).width;
}

export function wrap(
  text: string,
  maxWidth: number,
  font: { fontSize: number; fontWeight: number },
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const trial = current ? `${current} ${word}` : word;
    if (current && measureText(trial, font) > maxWidth) {
      lines.push(current);
      current = word;
    } else current = trial;
  }
  return current ? [...lines, current] : lines;
}

function whole(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function percent(share: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(share);
}

function ringPath(rings: [number, number][][]): string {
  return rings
    .filter((ring) => ring.length >= 3)
    .map(
      (ring) =>
        "M" +
        ring.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") +
        "Z",
    )
    .join("");
}

/**
 * How far country `index` of `count` has arrived, given the reveal's own progress.
 *
 * Windows do NOT overlap: each country owns its slice outright, so the meter is monotone and the
 * count of countries drawn is never ambiguous. A country arrives over the first 80% of its own
 * slice and then rests, which keeps 42 slices from strobing without letting two of them run at
 * once.
 */
export function arrivalProgress(
  index: number,
  count: number,
  reveal: number,
): number {
  if (count <= 0) return 0;
  const slice = 1 / count;
  const start = index * slice;
  return Math.max(0, Math.min(1, (reveal - start) / (slice * 0.8)));
}

export type CountryDrawn = {
  key: string;
  name: string;
  population: number;
  /** This country's share of the whole map's population, precomputed in node. */
  share: number;
  /** Its own land outline, in plate pixels — drawn from `reference`, before any of its dots. */
  parts: [number, number][][];
  /** Its seeded scatter, in plate pixels. Dots are revealed in list order, never re-randomised. */
  points: [number, number][];
  /** Where this country's own label sits, if it is one of the named few. */
  anchor: [number, number] | null;
};

export type DotDensityVideoProps = {
  geometry: { frame: { width: number; height: number } };
  plate: string;
  /** Descending by population — the order they arrive in, decided in node by sorting the file. */
  countries: CountryDrawn[];
  /** How many of the leading countries the claim is about. Derived: the smallest set past half. */
  namedCount: number;
  dotValue: number;
  totalDots: number;
  totalPopulation: number;
  landFill: string;
  title: string;
  source: string;
  basemapCredit: string;
  dotKey: string;
  meterCaption: string;
  halfLabel: string;
  conclusion: string;
  caveat: string;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  alt: string;
  timing?: BeatTiming;
};

export function DotDensityVideo({
  geometry,
  plate,
  countries,
  namedCount,
  totalPopulation,
  landFill,
  title,
  source,
  basemapCredit,
  dotKey,
  meterCaption,
  halfLabel,
  conclusion,
  caveat,
  ground,
  accent,
  ink,
  muted,
  timing = DOT_TIMING,
}: DotDensityVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = MAP.width / geometry.frame.width;

  // ── Layout. Identical at every frame: the build changes what is VISIBLE, never where it sits.
  const titleLines = wrap(title, FRAME.width - PAD * 2, TITLE);
  const sourceLines = wrap(
    `${source} · ${basemapCredit}`,
    FRAME.width - PAD * 2,
    SOURCE,
  );
  const caveatLines = wrap(caveat, FRAME.width - PAD * 2, NOTE);
  const conclusionLines = wrap(conclusion, FRAME.width - PAD * 2, CONCLUSION);

  const titleTop = PAD + TITLE.fontSize;
  // THE SOURCE IS THE LAST LINE BEFORE THE BOTTOM MARGIN — the credit sits at the bottom of the
  // visual, the same place on every graphic this project ships, and it carries the basemap credit
  // with it, unsplit. It used to hang directly under the title. The bottom stack is laid out
  // UPWARD from `FRAME.height - PAD`; the plate is fixed at MAP_Y and does not move. See
  // map-beat/assets/Co2MapVideo.tsx, which this is copied from.
  const sourceBottom = FRAME.height - PAD;
  const sourceTop = sourceBottom - (sourceLines.length - 1) * SOURCE.lead;
  const caveatBottom = sourceTop - SOURCE.fontSize - 12;
  const caveatTop = caveatBottom - (caveatLines.length - 1) * NOTE.lead;
  // RE-POINTED when the source moved to the bottom: a comparison against `sourceBottom` cannot go
  // red once the source sits on the frame's floor. The TITLE block is what the plate can now
  // actually collide with.
  const titleBottom = titleTop + (titleLines.length - 1) * TITLE.lead;
  if (titleBottom > MAP_Y - 16)
    throw new Error(
      `the header does not fit: the title ends at ${titleBottom} and the map starts at ${MAP_Y}. Shorten the title, or move the map down.`,
    );

  const dotKeyY = MAP_Y + MAP.height + 38;
  const meterY = dotKeyY + 12;
  const meterLabelY = meterY + METER.height + 19;
  const readoutY = meterLabelY + 22;
  const conclusionTop = readoutY + 40;
  const conclusionBottom =
    conclusionTop + (conclusionLines.length - 1) * CONCLUSION.lead;
  if (conclusionBottom > caveatTop - NOTE.fontSize - 14)
    throw new Error(
      `the column does not fit: the conclusion ends at ${conclusionBottom} and the caveat starts at ${caveatTop}. Shorten one of them.`,
    );

  // ── The edit. Every window read off the contract.
  const establish = progressOf(frame, timing.establish);
  const reference = progressOf(frame, timing.reference);
  const reveal = progressOf(frame, timing.reveal);
  const conclusionProgress = progressOf(frame, timing.conclusion);

  // Title, source and caveat are drawn at full opacity from frame 0 — frame 0 is the poster frame a
  // CMS pulls as the thumbnail, and 19 mp4s in this repository once shipped a blank white one by
  // gating everything on `establish`, whose progress at frame 0 is exactly 0. The plate, the land
  // and the meter are furniture and do fade: they are the frame the argument is read in.
  const furniture = interpolate(establish, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const referenceOpacity = interpolate(reference, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const conclusionOpacity = interpolate(conclusionProgress, [0, 1], [0, 1], {
    easing: Easing.out(Easing.cubic),
  });
  const labelSpring = spring({
    frame: frame - timing.subject.start,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.7 },
  });

  // ── What is drawn, and the meter that reads it. One quantity, two channels: the dots on the map
  // and the bar under it are the same number, so a reader can never see them disagree.
  const arrived = countries.map((_, index) =>
    arrivalProgress(index, countries.length, reveal),
  );
  const shareDrawn = countries.reduce(
    (sum, country, index) => sum + country.share * arrived[index]!,
    0,
  );
  const countriesDrawn = arrived.filter((value) => value >= 1).length;
  const halfX = METER.x + METER.width / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: ground, fontFamily: FONT_FAMILY }}>
      {/* The plate is an IMAGE, not a map. Remotion's <Img> holds the frame until it has decoded. */}
      <Img
        src={plate}
        style={{
          position: "absolute",
          left: MAP_X,
          top: MAP_Y,
          width: MAP.width,
          height: MAP.height,
          opacity: furniture,
        }}
      />
      <svg
        width={FRAME.width}
        height={FRAME.height}
        viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <defs>
          <clipPath id="dot-plate-clip">
            <rect x={MAP_X} y={MAP_Y} width={MAP.width} height={MAP.height} />
          </clipPath>
        </defs>

        <g clipPath="url(#dot-plate-clip)">
          <g transform={`translate(${MAP_X},${MAP_Y}) scale(${scale})`}>
            {/* Every study country's own land, from `reference` — BEFORE any of them has a dot.
                This is what keeps an empty country from reading as "nobody lives here": the shape
                is on screen, visibly waiting its turn, from before the first dot exists. */}
            {countries.map((country) => (
              <path
                key={country.key}
                d={ringPath(country.parts.flat() as [number, number][][])}
                fill={landFill}
                stroke={muted}
                strokeWidth={0.6 / scale}
                opacity={referenceOpacity}
              />
            ))}

            {/* One dot colour for every dot — this is a univariate map, and the five the claim
                names are NOT recoloured (see this file's header). A country's dots appear in list
                order, a prefix of its own frozen scatter, so the same dot is always in the same
                place and nothing is re-randomised between frames. */}
            {countries.map((country, index) => {
              const shown = Math.round(country.points.length * arrived[index]!);
              if (shown <= 0) return null;
              return (
                <Fragment key={country.key}>
                  {country.points.slice(0, shown).map((point, i) => (
                    <circle
                      key={i}
                      cx={point[0]}
                      cy={point[1]}
                      r={1.15 / scale}
                      fill={accent}
                    />
                  ))}
                </Fragment>
              );
            })}
          </g>

          {/* The named few, labelled on their own clusters once the whole map is drawn. */}
          {labelSpring > 0
            ? countries.slice(0, namedCount).map((country) => {
                if (!country.anchor) return null;
                const width = measureText(country.name, COUNTRY_LABEL);
                const x = MAP_X + country.anchor[0] * scale;
                const y = MAP_Y + country.anchor[1] * scale;
                return (
                  <g key={country.key} opacity={labelSpring}>
                    <rect
                      x={x - width / 2 - 5}
                      y={y - 15}
                      width={width + 10}
                      height={18}
                      rx={3}
                      fill={ground}
                      opacity={0.86}
                    />
                    <text
                      x={x}
                      y={y - 2}
                      fill={ink}
                      fontSize={COUNTRY_LABEL.fontSize}
                      fontWeight={COUNTRY_LABEL.fontWeight}
                      textAnchor="middle"
                    >
                      {country.name}
                    </text>
                  </g>
                );
              })
            : null}
        </g>

        {/* ── Furniture that never fades: the poster frame carries all of it ────────────────── */}
        <g>
          {titleLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={titleTop + i * TITLE.lead}
              fill={ink}
              fontSize={TITLE.fontSize}
              fontWeight={TITLE.fontWeight}
            >
              {line}
            </text>
          ))}
          {sourceLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={sourceTop + i * SOURCE.lead}
              fill={muted}
              fontSize={SOURCE.fontSize}
            >
              {line}
            </text>
          ))}
          {caveatLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={caveatTop + i * NOTE.lead}
              fill={muted}
              fontSize={NOTE.fontSize}
            >
              {line}
            </text>
          ))}
        </g>

        {/* ── The dot value, and the meter: the reference the whole argument is measured against,
              laid down before a single dot arrives. The dot key is headline-level type, not a
              footnote — it is the one line that turns a texture back into a number. */}
        <g opacity={referenceOpacity}>
          <text
            x={PAD}
            y={dotKeyY}
            fill={ink}
            fontSize={DOT_KEY.fontSize}
            fontWeight={DOT_KEY.fontWeight}
          >
            {dotKey}
          </text>
          <rect
            x={METER.x}
            y={meterY}
            width={METER.width}
            height={METER.height}
            fill="none"
            stroke={muted}
            strokeWidth={1}
          />
          <line
            x1={halfX}
            y1={meterY - 6}
            x2={halfX}
            y2={meterY + METER.height + 6}
            stroke={ink}
            strokeWidth={1.6}
          />
          <text
            x={halfX + 8}
            y={meterLabelY}
            fill={ink}
            fontSize={METER_LABEL.fontSize}
          >
            {halfLabel}
          </text>
          <text
            x={METER.x}
            y={meterLabelY}
            fill={muted}
            fontSize={METER_LABEL.fontSize}
          >
            {meterCaption}
          </text>
        </g>

        {/* The bar itself. Its width IS the share of the map's population drawn on the map above —
            one quantity in two channels, so the two can never disagree. */}
        <rect
          x={METER.x}
          y={meterY}
          width={METER.width * shareDrawn}
          height={METER.height}
          fill={accent}
          opacity={referenceOpacity}
        />

        <g opacity={referenceOpacity}>
          <text
            x={METER.x}
            y={readoutY}
            fill={ink}
            fontSize={METER_READOUT.fontSize}
            fontWeight={METER_READOUT.fontWeight}
          >
            {`${whole(countriesDrawn)} of ${whole(countries.length)} countries drawn`}
          </text>
          <text
            x={METER.x + METER.width}
            y={readoutY}
            textAnchor="end"
            fill={ink}
            fontSize={METER_READOUT.fontSize}
            fontWeight={METER_READOUT.fontWeight}
          >
            {`${percent(shareDrawn)} of ${whole(totalPopulation)} people`}
          </text>
        </g>

        {/* ── The conclusion ───────────────────────────────────────────────────────────────── */}
        <g opacity={conclusionOpacity}>
          {conclusionLines.map((line, i) => (
            <text
              key={line}
              x={PAD}
              y={conclusionTop + i * CONCLUSION.lead}
              fill={accent}
              fontSize={CONCLUSION.fontSize}
              fontWeight={CONCLUSION.fontWeight}
            >
              {line}
            </text>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
}
