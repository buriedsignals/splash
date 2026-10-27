/**
 * THE STILL PLATE every keyed family's static kit draws: eyebrow, the journalist's takeaway as the headline, the
 * standfirst (its forms walked longest first until the plot keeps its room), the plot — the family's scene at the
 * plate's state, every gesture drawn at once — and the credit. Registers, inset and colours are the run's direction;
 * furniture is derived from its ground; one accent. The family component hands `sceneOf(box, measure, lead)`.
 */

import {
  adjustToContrast,
  deriveFurniture,
  measureText,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/render-still.mjs";
import {
  assertLegible,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import {
  EYEBROW_TO_DISPLAY,
  gapOf,
  leadOf,
  registerOf,
} from "#shared/design-base/register.mjs";
import {
  caseOf,
  KeyedLayer,
  type KeyedColours,
  type KeyedState,
  measurers,
  type Register,
  type Scene,
  textAttrs,
} from "./GestureKeyedPlate.tsx";

const REGS = ["display", "eyebrow", "body", "axis", "annot", "value"] as const;

/** The plate's colours from the direction: one accent, one neutral at the non-text floor, furniture from the ground. */
export function keyedColoursOf(direction: any): KeyedColours {
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  assertLegible(accent, ground, {
    role: "mark",
    where: `${direction.id ?? "this direction"}'s accent`,
  });
  const walk = (c: string, floor = NON_TEXT_CONTRAST_MIN) =>
    adjustToContrast(c, ground, floor) ?? c;
  return {
    ground,
    neutral: walk(mix(ground, ink, 0.42)),
    accent,
    track: mix(ground, ink, 0.07),
    grid: mix(ground, ink, 0.16),
    copy: walk(mix(ink, ground, 0.3)),
    rule: walk(muted),
    ring: walk(ink),
    text: {
      ink: walk(ink, TEXT_CONTRAST_MIN),
      muted: walk(muted, TEXT_CONTRAST_MIN),
      accent:
        contrast(accent, ground) >= TEXT_CONTRAST_MIN
          ? accent
          : walk(accent, TEXT_CONTRAST_MIN),
    },
  };
}

export function registersOf(direction: any) {
  return Object.fromEntries(
    REGS.map((n) => [n, registerOf(direction, n)]),
  ) as Record<string, Register & { lineHeight: number }>;
}

function wrap(text: string, max: number, width: (t: string) => number) {
  const lines: string[] = [];
  let line = "";
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && width(next) > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function GestureKeyedStatic({
  frame,
  direction,
  eyebrow,
  title,
  limits,
  source,
  alt,
  state,
  sceneOf,
  minPlot = 0.42,
}: {
  frame: { width: number; height: number };
  direction: any;
  eyebrow: string;
  title: string | string[];
  limits: string | string[];
  source: string;
  alt: string;
  state: KeyedState;
  sceneOf: (
    box: { width: number; height: number },
    measure: (t: string, r: string) => number,
    lead: (r: string) => number,
  ) => Scene;
  minPlot?: number;
}) {
  const { width, height } = frame;
  const regs = registersOf(direction);
  const colours = keyedColoursOf(direction);
  const { measure, lead } = measurers(regs, measureText);
  const PAD = Math.round(direction.pad ?? 40);
  const column = width - 2 * PAD;
  const titleLines = wrap([title].flat()[0], column, (t) =>
    measure(t, "display"),
  );
  const eyebrowY = PAD + regs.eyebrow.fontSize;
  const titleY =
    eyebrowY + gapOf(regs.eyebrow, EYEBROW_TO_DISPLAY) + regs.display.fontSize;
  const afterTitle =
    titleY +
    (titleLines.length - 1) * leadOf(regs.display) +
    gapOf(regs.body, 0.9);
  const sourceLines = wrap(source, column, (t) => measure(t, "body"));
  const sourceY = height - PAD - (sourceLines.length - 1) * leadOf(regs.body);
  const plotBottom = sourceY - leadOf(regs.body) * 1.6;
  // THE WORDS GIVE WAY BEFORE THE PLOT DOES: the standfirst's forms, longest first, until the plot keeps its share.
  const forms = [limits].flat().filter(Boolean);
  let limitLines: string[] = [];
  for (const form of [...forms, ""]) {
    limitLines = form ? wrap(form, column, (t) => measure(t, "body")) : [];
    const top =
      afterTitle +
      limitLines.length * leadOf(regs.body) +
      leadOf(regs.annot) * 1.6;
    if ((plotBottom - top) / height >= minPlot || form === "") break;
  }
  const limitsY = afterTitle + regs.body.fontSize * 0.2;
  const probe = sceneOf({ width: column, height: 100 }, measure, lead);
  const plotTop =
    afterTitle +
    limitLines.length * leadOf(regs.body) +
    leadOf(regs.annot) * 1.1 +
    (probe.topRoom ?? 0);
  const scene = sceneOf(
    { width: column, height: Math.max(60, plotBottom - plotTop) },
    measure,
    lead,
  );
  const fillOf = (r: string) =>
    ((regs as any)[r].fill as string) ?? colours.text.ink;
  const ink = (c: string) =>
    adjustToContrast(c, direction.ground, TEXT_CONTRAST_MIN) ?? c;

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
      <text
        x={PAD}
        y={eyebrowY}
        {...textAttrs(regs.eyebrow, ink(fillOf("eyebrow")))}
      >
        {caseOf(eyebrow, regs.eyebrow.transform)}
      </text>
      {titleLines.map((l, i) => (
        <text
          key={`h${i}`}
          x={PAD}
          y={titleY + i * leadOf(regs.display)}
          {...textAttrs(regs.display, ink(fillOf("display")))}
        >
          {caseOf(l, regs.display.transform)}
        </text>
      ))}
      {limitLines.map((l, i) => (
        <text
          key={`s${i}`}
          x={PAD}
          y={limitsY + i * leadOf(regs.body)}
          {...textAttrs(regs.body, ink(fillOf("body")))}
        >
          {caseOf(l, regs.body.transform)}
        </text>
      ))}
      <KeyedLayer
        scene={scene}
        state={state}
        colours={colours}
        regs={regs}
        x={PAD}
        y={plotTop}
      />
      {sourceLines.map((l, i) => (
        <text
          key={`c${i}`}
          x={PAD}
          y={sourceY + i * leadOf(regs.body)}
          {...textAttrs(regs.body, ink(fillOf("body")))}
        >
          {caseOf(l, regs.body.transform)}
        </text>
      ))}
    </svg>
  );
}
