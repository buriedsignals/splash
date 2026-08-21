// One horizontal bar per district: incidents per 100,000 residents, zero baseline, sorted
// descending. Written fresh from the chart-beat seed's shape (pure geometry, furniture derived
// from the ground, direct annotation, one accent) -- not imported from the seed.
import { deriveFurniture, measureText, FONT_FAMILY } from "../../../../shared/chart-beat/render-still.mjs";

type District = {
  name: string;
  rate: number; // incidents per 100,000 residents
  incidents: number; // raw count, carried only to annotate Centro's caveat
};

const WIDTH = 900;
const HEIGHT = 560;
const PAD = 40;
const TITLE = { fontSize: 26, fontWeight: 700, lead: 34 };
const NOTE = { fontSize: 15, fontWeight: 400, lead: 20 };
const SOURCE = { fontSize: 14, fontWeight: 400, lead: 18 };
const LABEL = { fontSize: 15, fontWeight: 600 };
const CAVEAT = { fontSize: 14, fontWeight: 400, lead: 18 };
const BAR_GAP_RATIO = 0.28; // between a fifth and a third of the band width, per the type sheet
const HEADER_TO_PLOT = 26;
const PLOT_TO_CAVEAT = 20;
const CAVEAT_TO_SOURCE = 16;

/** Pure geometry: district + rate to a bar's x-length and a band's y-position. Knows no colour. */
export function barGeometry(
  districts: District[],
  { plotWidth, plotHeight }: { plotWidth: number; plotHeight: number },
) {
  const maxRate = Math.max(...districts.map((d) => d.rate));
  const bandHeight = plotHeight / districts.length;
  const barHeight = bandHeight * (1 - BAR_GAP_RATIO);
  return districts.map((d, i) => ({
    ...d,
    barWidth: (d.rate / maxRate) * plotWidth,
    y: i * bandHeight + (bandHeight - barHeight) / 2,
    barHeight,
  }));
}

/** Wrap on the measured width of the real string, never on a character count. */
function wrap(text: string, maxWidth: number, font: { fontSize: number; fontWeight: number }): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const trial = line ? `${line} ${word}` : word;
    if (line && measureText(trial, font) > maxWidth) {
      lines.push(line);
      line = word;
    } else line = trial;
  }
  return line ? [...lines, line] : lines;
}

export function RateNotCount({
  districts,
  title,
  limits,
  caveat,
  source,
  alt,
  ground,
  accent,
  subject,
}: {
  districts: District[];
  title: string;
  limits: string;
  caveat: string;
  source: string;
  alt: string;
  ground: string;
  accent: string;
  subject: string;
}) {
  const { ink, muted, grid } = deriveFurniture(ground);
  const sorted = [...districts].sort((a, b) => b.rate - a.rate);

  const titleBaseline = PAD + TITLE.fontSize;
  const limitsBaseline = titleBaseline + TITLE.lead;

  // The end-value label is measured from the widest one that will actually be drawn -- the
  // highest rate, one decimal place, with its unit.
  const valueLabels = sorted.map((d) => `${d.rate.toFixed(1)} / 100k`);
  const rightGutter = 12 + Math.max(...valueLabels.map((l) => measureText(l, LABEL)));
  const leftGutter = 12 + Math.max(...sorted.map((d) => measureText(d.name, LABEL)));

  const caveatLines = wrap(caveat, WIDTH - PAD * 2, CAVEAT);
  const sourceLines = wrap(source, WIDTH - PAD * 2, SOURCE);
  const footBlockHeight =
    caveatLines.length * CAVEAT.lead + PLOT_TO_CAVEAT + CAVEAT_TO_SOURCE + sourceLines.length * SOURCE.lead;

  const plot = {
    left: PAD + leftGutter,
    top: limitsBaseline + HEADER_TO_PLOT,
    right: WIDTH - PAD - rightGutter,
    bottom: HEIGHT - PAD - footBlockHeight,
  };
  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;

  const bars = barGeometry(sorted, { plotWidth, plotHeight });

  const caveatTop = plot.bottom + PLOT_TO_CAVEAT;
  const sourceTop = caveatTop + caveatLines.length * CAVEAT.lead + CAVEAT_TO_SOURCE;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      fontFamily={FONT_FAMILY}
    >
      <desc>{alt}</desc>
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={ground} />

      <text x={PAD} y={titleBaseline} fill={ink} fontSize={TITLE.fontSize} fontWeight={TITLE.fontWeight}>
        {title}
      </text>
      <text x={PAD} y={limitsBaseline} fill={muted} fontSize={NOTE.fontSize} fontWeight={NOTE.fontWeight}>
        {limits}
      </text>

      {/* zero baseline -- the bars' own axis, drawn once */}
      <line x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.bottom} stroke={grid} strokeWidth={1} />

      {bars.map((bar) => {
        const isSubject = bar.name === subject;
        const barY = plot.top + bar.y;
        const barCenterY = barY + bar.barHeight / 2;
        const fill = isSubject ? accent : muted;
        return (
          <g key={bar.name}>
            <text
              x={plot.left - 12}
              y={barCenterY + LABEL.fontSize * 0.35}
              textAnchor="end"
              fill={ink}
              fontSize={LABEL.fontSize}
              fontWeight={LABEL.fontWeight}
            >
              {bar.name}
            </text>
            <rect x={plot.left} y={barY} width={bar.barWidth} height={bar.barHeight} fill={fill} />
            <text
              x={plot.left + bar.barWidth + 12}
              y={barCenterY + LABEL.fontSize * 0.35}
              fill={ink}
              fontSize={LABEL.fontSize}
              fontWeight={LABEL.fontWeight}
            >
              {bar.rate.toFixed(1)} / 100k
            </text>
          </g>
        );
      })}

      {caveatLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={caveatTop + i * CAVEAT.lead + CAVEAT.fontSize}
          fill={muted}
          fontSize={CAVEAT.fontSize}
          fontWeight={CAVEAT.fontWeight}
        >
          {line}
        </text>
      ))}

      {sourceLines.map((line, i) => (
        <text
          key={line}
          x={PAD}
          y={sourceTop + i * SOURCE.lead + SOURCE.fontSize}
          fill={muted}
          fontSize={SOURCE.fontSize}
          fontWeight={SOURCE.fontWeight}
        >
          {line}
        </text>
      ))}
    </svg>
  );
}
