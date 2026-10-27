/**
 * A keyed family's gesture beat as an interactive page (interval, multiples, flow, profile — the family hands its
 * scene). ONE PLATE PER STATE, as `GestureBarWeb` draws them and for its reason (`interaction.mjs` resolves a pointer
 * off hit points read once at init): the page the reader lands on is the RESTING plate — every gesture that rests
 * (highlight, name, annotate, reference, reveal, pull-back) drawn at once — and each further gesture (filter, compare,
 * bracket) is one reader control owning one plate of its own, the resting picture plus that gesture, revealed by its
 * radio (`:checked` / `:has()`, no script). With JavaScript off nothing differs: radios and the stylesheet are the
 * mechanism. Every plate letterboxes one viewBox (`xMidYMid meet`), so its words sit on the drawing they name.
 */

import { contrast, mix } from "#shared/chart-beat/colour.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { figureVars, webRegisters } from "#shared/design-base/web.mjs";
import {
  KeyedLayer,
  type KeyedColours,
  type KeyedState,
  type Register,
  type Scene,
} from "./GestureKeyedPlate.tsx";

const { controlChromeCss } = await import(
  skillScriptFrom(
    import.meta.dirname,
    "chart-web",
    "assets",
    "control-chrome.ts",
  )
);

const SCOPE = ".chart-figure";
const ACTIVE_STEP = 0.3;

export type KeyedControl = {
  index: number;
  do: string;
  atom: string;
  legend: string;
  chip: string;
  note: string;
  announce: string;
  state: KeyedState;
};

export function GestureKeyedWeb({
  scene,
  resting,
  controls,
  colours,
  svgRegs,
  restLabel,
  restNotes,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  direction,
}: {
  scene: Scene;
  resting: KeyedState;
  controls: KeyedControl[];
  colours: KeyedColours;
  svgRegs: Record<string, Register>;
  restLabel: string;
  restNotes: string[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  direction: any;
}) {
  const ink = colours.text.ink;
  const regs = webRegisters(direction, {
    ink: { ink, muted: colours.text.muted, accent: direction.accent },
  });
  const W = scene.width;
  const H = scene.height;
  // The pointer's step toward the ink, held to the step the bar kit holds (1.12:1), on both fills a mark can carry.
  const activeOf = (fill: string) => {
    let t = ACTIVE_STEP;
    let lifted = mix(fill, ink, t);
    while (contrast(lifted, fill) < 1.12 && t < 0.9)
      lifted = mix(fill, ink, (t += 0.1));
    return lifted;
  };
  const plates = [
    { id: 0, state: resting },
    ...controls.map((c, k) => ({ id: k + 1, state: c.state })),
  ];
  const css = [
    `${SCOPE} [data-plate]:not([data-plate="0"]) { display: none; }`,
    `${SCOPE} .chart-plot { --y-gutter: 0px; }`,
    `${SCOPE} [data-mark].mark-active { fill: var(--mark-active); }`,
    `${SCOPE} [data-mark-edge].mark-active { stroke: var(--mark-active); }`,
    `${SCOPE} .gesture-controls { flex: 0 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 0 28px; margin-top: 4px; }`,
    `${SCOPE} .gesture-controls > fieldset { flex: 0 1 auto; max-width: 100%; }`,
    `${SCOPE} .gesture-notes { flex: 0 0 auto; display: grid; }`,
    `${SCOPE} .gesture-notes > div { grid-area: 1 / 1; align-self: start; }`,
    `${SCOPE} .gw-note { visibility: hidden; }`,
    `${SCOPE} .chart-rest-notes { margin: 4px 0 0; }`,
    ...controls.flatMap((_, k) => {
      const on = `${SCOPE}:has(#gesture-${k + 1}-on:checked)`;
      return [
        `${on} [data-plate] { display: none; }`,
        `${on} [data-plate="${k + 1}"] { display: block; }`,
        `${on} .gw-note { visibility: hidden; }`,
        `${on} [data-gesture-${k + 1}-note="on"] { visibility: visible; }`,
      ];
    }),
    ...controls.map((_, k) =>
      controlChromeCss({
        scope: SCOPE,
        name: `gesture-${k + 1}`,
        margin: "2px 0 0",
      }),
    ),
  ].join("\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: colours.ground,
        ["--accent" as string]: colours.accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: colours.text.muted,
        ["--grid" as string]: colours.grid,
        ...figureVars(regs),
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="chart-header">
        <p
          className="chart-eyebrow"
          style={{ ...regs.eyebrow, margin: "0 0 6px" }}
        >
          {eyebrow}
        </p>
        <h2
          className="chart-title"
          style={{ ...regs.display, margin: "0 0 6px" }}
        >
          {title}
        </h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>
          {caveat}
        </p>
        {restNotes.length ? (
          <p className="chart-rest-notes" style={{ ...regs.body }}>
            {restNotes.map((n, i) => (
              <span key={i}>
                {i ? " · " : ""}
                {n}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <div className="gesture-controls">
        {controls.map((c, k) => (
          <fieldset className={`chart-gesture-${k + 1}`} key={k}>
            <legend>{c.legend}</legend>
            <div className="options">
              <label>
                <input
                  id={`gesture-${k + 1}-rest`}
                  type="radio"
                  name={`gesture-${k + 1}`}
                  value="rest"
                  aria-label={restLabel}
                  defaultChecked
                />
                {restLabel}
              </label>
              <label>
                <input
                  id={`gesture-${k + 1}-on`}
                  type="radio"
                  name={`gesture-${k + 1}`}
                  value="on"
                  aria-label={c.announce}
                />
                {c.chip}
              </label>
            </div>
          </fieldset>
        ))}
      </div>

      <div className="gesture-notes">
        {controls.map((c, k) => (
          <div className={`gesture-${k + 1}-notes`} role="status" key={k}>
            <p
              {...{ [`data-gesture-${k + 1}-note`]: "on" }}
              className="gw-note"
              style={{ ...regs.body, margin: 0 }}
            >
              {c.note}
            </p>
          </div>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${W} / ${H}`,
          margin: "10px 0 0",
        }}
      >
        <div className="y-axis" />
        {plates.map((p) => (
          <svg
            key={p.id}
            role="group"
            aria-label={title}
            xmlns="http://www.w3.org/2000/svg"
            className="chart"
            data-hit="cell"
            data-plate={p.id}
            viewBox={`${-4} ${-4 - (scene.topRoom ?? 0)} ${W + 8} ${H + 8 + (scene.topRoom ?? 0)}`}
            preserveAspectRatio="xMidYMid meet"
          >
            <desc>{alt}</desc>
            <rect
              x={-4}
              y={-4 - (scene.topRoom ?? 0)}
              width={W + 8}
              height={H + 8 + (scene.topRoom ?? 0)}
              fill={colours.ground}
            />
            <KeyedLayer
              scene={scene}
              state={p.state}
              colours={colours}
              regs={svgRegs}
              hits
              plate={p.id}
              active={activeOf}
            />
            <rect
              className="hit-area"
              x={-4}
              y={-4 - (scene.topRoom ?? 0)}
              width={W + 8}
              height={H + 8 + (scene.topRoom ?? 0)}
              fill="transparent"
              pointerEvents="all"
            />
          </svg>
        ))}
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
