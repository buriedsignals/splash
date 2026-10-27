/**
 * The web family component of the point / line / field maps (Geo F8): every type of the family as a variant of one
 * page, its staging the story's own `gestures`. ONE PICTURE PER STATE, as the bar gesture page draws one plate per
 * state: the page lands on the RESTING picture (every gesture that rests together), and each further gesture — a
 * filter, a compare, a zoom — is one reader control owning a picture of its own, drawn whole at build time and
 * revealed by its radio (`:checked` / `:has()`, no script). A zoom is a picture standing at the close-up camera box,
 * its factor printed; a filter is the resting picture with the others stepped back; a compare names both marks and
 * rings the second.
 *
 * THE BASEMAP IS THE STATIC KIT'S BAKED PLATE, not a live MapLibre map: the marks are the static plate's own projected
 * geometry, drawn as SVG over it (GestureGeoPointMap.tsx). The words sit on the page as HTML at a fixed CSS size, so
 * the picture stretches with its column while the type does not. Every mark answers a pointer, a tap or a key
 * (`ask-a-mark`) with what the picture prints nowhere.
 */

import {
  adjustToContrast,
  assertLegible,
  contrast,
  mix,
  NON_TEXT_CONTRAST_MIN,
  TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { figureVars, webRegisters } from "#shared/design-base/web.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import {
  boxOf,
  GeoPointMarks,
  wordsOf,
  type Geometry,
  type Roles,
} from "./GestureGeoPointMap.tsx";
const { controlChromeCss } = await import(
  skillScriptFrom(
    import.meta.dirname,
    "chart-web",
    "assets",
    "control-chrome.ts",
  )
);

const SCOPE = ".chart-figure";

export type WebPicture = {
  roles: Roles;
  focus: string[] | null;
  factor: number | null;
  notes: { marks: string[]; text: string; kind: string }[];
  named: string[];
};
export type WebControl = {
  legend: string;
  chip: string;
  announce: string;
  note: string;
  picture: WebPicture;
};

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

export function GestureGeoPointWeb({
  variant,
  geometry: G,
  resting,
  controls,
  restLabel,
  restNotes,
  title,
  eyebrow,
  caveat,
  source,
  unit,
  alt,
  direction,
  ground,
  accent,
  ink,
  muted,
  land,
}: {
  variant: string;
  geometry: Geometry;
  resting: WebPicture;
  controls: WebControl[];
  restLabel: string;
  restNotes: string[];
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  unit: string;
  alt: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  land: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });
  assertLegible(accent, land, {
    role: "mark",
    where: `${direction.id ?? "this direction"}'s accent on the land`,
  });
  const accentInk =
    contrast(accent, land) >= TEXT_CONTRAST_MIN
      ? accent
      : (adjustToContrast(accent, land, TEXT_CONTRAST_MIN) ?? accent);
  const labelInk = adjustToContrast(ink, land, TEXT_CONTRAST_MIN) ?? ink;
  let neutral = mix(land, ink, 0.45);
  neutral = adjustToContrast(neutral, land, NON_TEXT_CONTRAST_MIN) ?? neutral;
  // A ring is a mark, not a word: a dark grey held to the non-text floor on the land, never the full ink.
  const ring = adjustToContrast(mix(land, ink, 0.62), land, NON_TEXT_CONTRAST_MIN) ?? mix(land, ink, 0.62);
  const inks = { accent, neutral, ring, ground, water: land };
  const keyOf = new Map(G.marks.map((m, i) => [m.name, `m${i + 1}`]));
  const aspect = G.whole.w / G.whole.h;

  const pictures = [resting, ...controls.map((c) => c.picture)];
  const css = [
    `${SCOPE} [data-plate]:not([data-plate="0"]) { display: none; }`,
    `${SCOPE} .chart-plot { overflow: hidden; }`,
    `${SCOPE} .chart-plot .gesture-layer { position: relative; pointer-events: none; }`,
    `${SCOPE} .geo-word { position: absolute; white-space: nowrap; transform: translate(7px, -50%); text-shadow: 0 0 3px ${land}, 0 0 3px ${land}, 0 0 2px ${land}; }`,
    `${SCOPE} .gesture-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 0 28px; margin-top: 4px; }`,
    `${SCOPE} .gesture-controls > fieldset { flex: 0 1 auto; max-width: 100%; }`,
    `${SCOPE} .gesture-notes { display: grid; }`,
    `${SCOPE} .gesture-notes > div { grid-area: 1 / 1; align-self: start; }`,
    `${SCOPE} .gw-note { visibility: hidden; }`,
    ...controls.flatMap((_, k) => {
      const on = `${SCOPE}:has(#gesture-${k + 1}-on:checked)`;
      return [
        `${on} [data-plate] { display: none; }`,
        `${on} [data-plate="${k + 1}"] { display: block; }`,
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

  const drawPicture = (p: WebPicture, id: number) => {
    // A zoom is drawn INSIDE one viewBox (the whole camera): one plot cell carries one ratio, so the close-up box
    // is scaled up to fill it, and every hit point is written where its mark lands after that scale.
    const box = boxOf(G, p.focus, p.factor);
    const W0 = G.whole;
    const k = W0.w / box.w;
    const tx = (x: number) => W0.x + (x - box.x) * k;
    const ty = (y: number) => W0.y + (y - box.y) * k;
    const inBox = (x: number, y: number) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
    const hidden = new Set(p.roles.hidden);
    const asked = G.marks.filter((m) => !hidden.has(m.name) && inBox(m.x, m.y));
    const words = wordsOf(G, p.roles, p.notes, p.named).filter((w) => inBox(w.x, w.y));
    return [
      <svg
        key={`s${id}`}
        role="group"
        aria-label={title}
        xmlns="http://www.w3.org/2000/svg"
        className="chart"
        data-hit="cell"
        data-plate={id}
        viewBox={`${W0.x} ${W0.y} ${W0.w} ${W0.h}`}
        preserveAspectRatio="none"
      >
        <desc>{alt}</desc>
        <g transform={`translate(${W0.x} ${W0.y}) scale(${k}) translate(${-box.x} ${-box.y})`}>
          <GeoPointMarks G={G} roles={p.roles} inks={inks} keyOf={(n) => `p${id}-${keyOf.get(n)}`} />
        </g>
        {asked.map((m) => (
          <circle
            key={m.name}
            className="pt"
            cx={tx(m.x)}
            cy={ty(m.y)}
            r={Math.max(2, (m.r ?? 2) * 0.8 * k)}
            fill="transparent"
            stroke="none"
            tabIndex={0}
            role="img"
            data-mark-ref={`p${id}-${keyOf.get(m.name)}`}
            aria-label={m.detail}
            data-detail={m.detail}
          />
        ))}
        <rect className="hit-area" x={W0.x} y={W0.y} width={W0.w} height={W0.h} fill="transparent" pointerEvents="all" />
      </svg>,
      <div
        className={id === 0 ? "overlay" : "gesture-layer"}
        aria-hidden="true"
        data-plate={id}
        key={`l${id}`}
      >
        {words.map((w, i) => (
          <span
            key={i}
            className="geo-word"
            style={{
              ...(w.kind === "area"
                ? regs.axis
                : w.kind === "note" || w.kind === "name"
                  ? regs.value
                  : regs.annot),
              fontStyle: w.kind === "water" ? "italic" : undefined,
              color: w.accent ? accentInk : labelInk,
              left: pct(w.x - box.x, box.w),
              // A word in the right part of the picture reads leftward from its mark, so it stays inside.
              transform: (w.x - box.x) / box.w > 0.6 ? "translate(calc(-100% - 7px), -50%)" : undefined,
              top: pct(w.y - box.y, box.h),
            }}
          >
            {w.text}
          </span>
        ))}
      </div>,
    ];
  };

  return (
    <figure
      className="chart-figure"
      data-variant={variant}
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
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
          <p
            className="chart-rest-notes"
            style={{ ...regs.body, margin: "4px 0 0" }}
          >
            {restNotes.join(" · ")}
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
      {unit ? (
        <p className="chart-unit" style={{ ...regs.axis, margin: "4px 0 2px" }}>
          {unit}
        </p>
      ) : null}
      <div
        className="chart-plot"
        style={{
          ["--x-axis-h" as string]: "0px",
          ["--y-gutter" as string]: "0px",
          aspectRatio: `${G.whole.w} / ${G.whole.h}`,
        }}
      >
        {pictures.flatMap((p, id) => drawPicture(p, id))}
      </div>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>
    </figure>
  );
}
