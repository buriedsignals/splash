// SCAFFOLD: scaffolded --from proof/scrolly-cartogram-europe-lowcarbon — this file is that beat's own code, renamed for this one. The
// header comment below, and every region marked SCAFFOLD:, describe proof/scrolly-cartogram-europe-lowcarbon's own subject; rewrite them
// for this beat's. Read proof/scrolly-cartogram-europe-lowcarbon/BRIEF.md alongside this code before changing the choreography.
/**
 * Europe's low-carbon electricity, drawn THROUGH the design base as a map that becomes a cartogram under
 * the reader's scroll. The `cartogram` type in the scrolly format, on a LIVE MAPTILER MAP while the form
 * shows geography, the tiles outside it once it leaves (addendum 2026-09-15 §5): the country mean against
 * the area-weighted mean, told with the gesture its claim is about — every country starts as its territory,
 * live, and ends as one equal tile.
 *
 * THE STATIC PLATE'S RULES ARE THE FLOOR: one ramp between the direction's own poles in five classes with
 * breaks in %; the lowest class and every tile floored against the ground; the country with no reading
 * hollow with a dashed edge, outside the ramp; every tile carries its own name; the layout is designed,
 * not derived, and said to be.
 *
 * ONE COORDINATE SPACE. The map's camera and the SVG's tile grid share the same frame (`plan.mjs`'s
 * `cartogramGeometry`, projected with the live map's own camera) — a country's shape lies exactly where the
 * map already draws it. Each country is a group holding its shape and a rect drawn in the shape's own box;
 * `cartogram-drive.mjs` fades the group in over the map (the handover), then moves it onto its tile, fading
 * the shape into the rect. Names are HTML, placed on the tiles in the reader's pixels. UNDER THE LIVE MAP,
 * ONE FROZEN IMAGE PER CARD (`live-map-cards.mjs`); what is rendered here is the last card's picture, which
 * is what a reader without a script gets.
 */

import type { CSSProperties } from "react";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The Splash repo root — the nearest ancestor whose package.json declares the "#shared/*" import — found by
 *  walking up rather than counting levels, so this runner works unchanged from proof/<beat>/ or a story's own
 *  stories/<slug>/beats/<id>/. */
function splashRoot(startDir) {
  const looked = [];
  for (let dir = startDir; ; ) {
    looked.push(dir);
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      try {
        if (JSON.parse(readFileSync(manifest, "utf8"))?.imports?.["#shared/*"]) return dir;
      } catch {
        // an unparsable package.json is not this function's business — keep walking
      }
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`no Splash root above ${startDir} — looked in:\n  ${looked.join("\n  ")}`);
    dir = parent;
  }
}

const ROOT = splashRoot(HERE);
const { CardImages, noScriptCss, shapeSelectionCss } = await import(join(ROOT, "skills", "scrolly", "scripts", "live-map-cards.mjs"));


export type Country = {
  iso: string;
  path: string;
  box: { x: number; y: number; w: number; h: number };
  tile: { x: number; y: number; w: number; h: number };
  value: number | null;
  classIndex: number | null;
  /** electricity produced, TWh */
  twh: number;
};
type Style = Record<string, string | number>;
type Colours = {
  ground: string;
  sea: string;
  land: string;
  neutral: string;
  classFills: string[];
  text: { ink: string; muted: string; accent: string };
};

export function DirectedEuropeHydroScrolly({
  plan,
  fallbacks,
  reference,
  countries,
  width,
  height,
  breaks,
  unit,
  missingLabel,
  subject,
  subjectNote,
  byArea,
  byCountry,
  byProduction,
  missingNote,
  alt,
  regs,
  colours,
}: {
  plan: Record<string, unknown>;
  fallbacks: Record<"wide" | "tall", { x1: string; x2: string }>[];
  reference: { width: number; height: number };
  countries: Country[];
  width: number;
  height: number;
  breaks: string[];
  unit: string;
  missingLabel: string;
  subject: string;
  subjectNote: string;
  byArea: { template: string; value: number };
  byCountry: { template: string; value: number };
  byProduction: { template: string; value: number };
  missingNote: string;
  alt: string;
  regs: Record<
    "display" | "eyebrow" | "body" | "axis" | "annot" | "value",
    Style
  >;
  colours: Colours;
}) {
  const { ground } = colours;
  const { ink: inkOnGround, muted: mutedInk, accent: accentInk } = colours.text;
  const classCount = breaks.length + 1;
  const classFill = (i: number) => colours.classFills[i];
  const abs = (extra: CSSProperties): CSSProperties => ({
    position: "absolute",
    ...extra,
  });
  const chip: CSSProperties = {
    background: ground,
    padding: "1px 5px",
    whiteSpace: "nowrap",
  };
  if (!countries.some((c) => c.iso === subject))
    throw new Error(`the subject ${subject} has no tile`);

  const scope = '[data-part="symbols"]';
  const shapeCss = shapeSelectionCss(scope, reference);
  // Without a script the fallback images stop at the map (only two are ever baked — see `render-directions-
  // scrolly.mjs`); the SVG tiles are forced to their SSR'd resting position (box already mapped fully onto
  // tile) and shown over them instead, so a no-script reader still gets the cartogram, not the map.
  const noScript =
    noScriptCss(scope, fallbacks.length - 1, ['[data-part="key"]']) +
    `${scope} [data-part="count-panel"]{opacity:0!important}` +
    `${scope} [data-country]{opacity:1!important}${scope} [data-part="tile"]{opacity:1!important}`;

  // SCAFFOLD: the JSX below is proof/scrolly-cartogram-europe-lowcarbon's own key/counter/notes around the live map. Adapt the words and

  // swatches to this beat's own subject, keeping the data-part contract the driver and CSS rely on.

  return (
    <div
      data-part="symbols"
      role="img"
      aria-label={alt}
      data-cartogram={JSON.stringify({
        cards: fallbacks.length,
        width,
        height,
        subject,
        countries: countries.map(({ iso, box, tile, classIndex, twh }) => ({
          iso,
          box,
          tile,
          classIndex,
          twh: Math.round(twh * 10) / 10,
        })),
        ink: { dark: inkOnGround, light: ground, muted: mutedInk },
      })}
      style={{
        position: "absolute",
        inset: 0,
        background: ground,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        rowGap: "10px",
        // The page's own side gutter — the header's — so the map's edges line up with the title's.
        padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))`,
      }}
    >
      <noscript
        style={{ display: "none" }}
        dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }}
      />
      <style dangerouslySetInnerHTML={{ __html: shapeCss }} />
      <div
        data-part="count-panel"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 24px",
          justifyContent: "flex-end",
        }}
      >
        {[
          { part: "by-area", counter: byArea },
          { part: "by-production", counter: byProduction },
          { part: "by-country", counter: byCountry },
        ].map(({ part, counter }) => (
          <span
            key={part}
            data-part={part}
            data-template={counter.template}
            data-value={counter.value}
            style={{
              ...regs.value,
              color: part === "by-country" ? accentInk : inkOnGround,
              whiteSpace: "nowrap",
            }}
          >
            {counter.template.replace(
              "{n}",
              counter.value.toFixed(1),
            )}
          </span>
        ))}
      </div>

      {/* THE MAP FILLS ITS OWN ROW, gutter to gutter (`cartogram-drive.mjs`, `fitViewBox`). The live map
          sits under the SVG countries; a frozen image per card sits under both, for a reader without a
          script or a key. */}
      <div
        data-part="stage"
        style={{ position: "relative", minHeight: 0, overflow: "hidden" }}
      >
        <CardImages fallbacks={fallbacks} first={0} />
        <div
          data-part="live"
          style={{ position: "absolute", inset: 0, opacity: 0 }}
        />
        <script
          type="application/json"
          data-part="plan"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(plan).replace(/</g, "\\u003c"),
          }}
        />
        <svg
          data-part="field"
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={abs({ inset: 0, width: "100%", height: "100%" })}
        >
          <defs>
            <clipPath id="cartogram-window">
              <rect
                x={-890}
                y={-490}
                width={width + 1780}
                height={height + 980}
              />
            </clipPath>
          </defs>
          <g clipPath="url(#cartogram-window)">
            {countries.map((c) => {
              const missing = c.value === null;
              const fill = missing
                ? colours.neutral
                : classFill(c.classIndex ?? 0);
              // The rect is drawn in the shape's own box; at the end of the morph that box IS the tile.
              return (
                <g
                  key={c.iso}
                  data-country={c.iso}
                  transform={`translate(${c.tile.x - c.box.x * (c.tile.w / c.box.w)} ${c.tile.y - c.box.y * (c.tile.h / c.box.h)}) scale(${c.tile.w / c.box.w} ${c.tile.h / c.box.h})`}
                  style={{ opacity: 0 }}
                >
                  <path
                    data-part="shape"
                    d={c.path}
                    fill={fill}
                    stroke={missing ? mutedInk : ground}
                    strokeWidth={missing ? 1 : 0.6}
                    strokeDasharray={missing ? "3 2" : undefined}
                    vectorEffect="non-scaling-stroke"
                    style={{ opacity: 0 }}
                  />
                  <rect
                    data-part="tile"
                    x={c.box.x}
                    y={c.box.y}
                    width={c.box.w}
                    height={c.box.h}
                    fill={fill}
                    stroke={missing ? mutedInk : "none"}
                    strokeWidth={missing ? 1 : 0}
                    strokeDasharray={missing ? "4 3" : undefined}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </g>
        </svg>

        {countries.map((c) => (
          <span
            key={`n${c.iso}`}
            data-name={c.iso}
            style={abs({
              ...regs.axis,
              left: 0,
              top: 0,
              transform: "translate(-50%, -50%)",
              whiteSpace: "nowrap",
              opacity: 0,
              color:
                c.value === null
                  ? mutedInk
                  : (c.classIndex ?? 0) >= classCount / 2
                    ? ground
                    : inkOnGround,
            })}
          >
            {c.iso}
          </span>
        ))}
        <span
          data-part="subject-note"
          style={abs({
            ...regs.annot,
            ...chip,
            color: inkOnGround,
            left: 0,
            top: 0,
            opacity: 0,
          })}
        >
          {subjectNote}
        </span>
        <span
          data-part="missing-note"
          style={abs({
            ...regs.annot,
            ...chip,
            color: inkOnGround,
            left: 0,
            top: 0,
            opacity: 0,
          })}
        >
          {missingNote}
        </span>
        {/* The three means on one rule, 0 to 100 %: laid over the tiles on the card that compares them. */}
        <div
          data-part="rule"
          style={abs({ left: 0, top: 0, width: "100%", opacity: 0 })}
        >
          <div
            style={{
              position: "relative",
              margin: "0 auto",
              width: "min(560px, 86%)",
              height: "96px",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "47px",
                height: "2px",
                background: mutedInk,
              }}
            />
            {[0, 50, 100].map((t) => (
              <span
                key={t}
                style={{
                  ...regs.axis,
                  position: "absolute",
                  left: `${t}%`,
                  top: "54px",
                  transform: "translateX(-50%)",
                  color: mutedInk,
                  whiteSpace: "nowrap",
                  opacity: 0.9,
                }}
              >
                {t}
              </span>
            ))}
            {[
              { counter: byArea, above: true, colour: inkOnGround },
              { counter: byProduction, above: false, colour: inkOnGround },
              { counter: byCountry, above: true, colour: accentInk },
            ].map(({ counter, above, colour }) => (
              <div key={counter.template}>
                <div
                  style={{
                    position: "absolute",
                    left: `${counter.value}%`,
                    top: "38px",
                    width: "3px",
                    height: "20px",
                    transform: "translateX(-50%)",
                    background: colour,
                  }}
                />
                <span
                  style={{
                    ...regs.value,
                    ...chip,
                    position: "absolute",
                    left: `${counter.value}%`,
                    top: above ? "34px" : "74px",
                    transform: above
                      ? `translate(${counter.value > 62 ? "-15%" : "-85%"}, -100%)`
                      : "translateX(-50%)",
                    color: colour,
                  }}
                >
                  {counter.template.replace(
                    "{n}",
                    counter.value.toFixed(1),
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        data-part="key"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: "6px 16px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${classCount}, 34px)`,
            gap: "2px",
            paddingBottom: "1.5em",
            position: "relative",
          }}
        >
          {Array.from({ length: classCount }, (_, i) => (
            <div
              key={`c${i}`}
              data-class-swatch={i}
              style={{
                position: "relative",
                height: "12px",
                background: classFill(i),
              }}
            >
              {i < breaks.length && (
                <span
                  style={{
                    ...regs.axis,
                    color: mutedInk,
                    position: "absolute",
                    left: "100%",
                    top: "14px",
                    transform: "translateX(-50%)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {breaks[i]}
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gap: "4px" }}>
          <span style={{ ...regs.axis, color: mutedInk }}>{unit}</span>
          <span
            style={{
              ...regs.axis,
              color: mutedInk,
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "34px",
                height: "12px",
                border: `1px dashed ${mutedInk}`,
              }}
            />
            {missingLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
