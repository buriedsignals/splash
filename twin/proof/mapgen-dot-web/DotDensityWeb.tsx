/**
 * The WEB genre of a dot-density map: the same 42-country population file `proof/mapmore-dot-population`
 * draws as a still, in the one genre a still cannot be — a map a reader can INTERROGATE.
 *
 * WHY THIS TYPE EARNS THE WEB GENRE. A dot map's weakness is exactly the thing this genre fixes. It
 * turns a value into TEXTURE: a reader sees where the mass is and cannot read a single number off it,
 * because no dot is labelled and no country can be. The still's answer is a dot-value key ("1 dot =
 * N people") and five direct labels, which is as far as fixed ink goes. Here, hovering or focusing
 * any country gives its exact population and its own dot count, and the table below carries all 42
 * at once. The picture still states the claim without any interaction — the five clouds the title
 * names are labelled on the map — and the interaction supplies the precision the texture cannot.
 *
 * THE SPLIT THAT MAKES THIS RESPONSIVE (`twin-map-web/references/map-web-discipline.md`, "Full
 * width, genuinely" and "Text is HTML, not SVG"): the SVG carries ONLY geometry — the baked plate
 * `<image>`, the country outlines and the dots — and every word plus every control is HTML over it,
 * positioned by PERCENTAGE so it tracks the geometry, at a font size fixed in CSS pixels so type
 * never grows or shrinks with the container. The plate keeps its baked aspect at every width, scaled
 * uniformly and never stretched.
 *
 * THE ONE CONTROL, and the test it had to pass. 42 pointer targets on a continental map is the
 * density case `map-web-discipline.md`'s "Pan and zoom" describes: measured at 375px wide, most
 * countries' 28px targets overlap a neighbour's. So this beat ships the bounded zoom — one checkbox,
 * one fixed multiplier a reader cannot exceed, pure CSS (`:has()`), no live tiles and no script. The
 * unzoomed default is not a preview: it is the whole claim, at the same completeness a beat with no
 * control at all would ship.
 */

import { Fragment } from "react";
import { readingOrder, en, type Pt } from "./geo-dot";

// ===== CONFIG — this beat's own story =====
/** The five countries the claim names, in the order the claim names them. `render-web.mjs` asserts
 *  against the data that these are the five largest AND that they hold more than half the mapped
 *  population before anything is drawn, so this list can never quietly name the wrong five. */
export const NAMED = ["DEU", "GBR", "FRA", "ITA", "ESP"];
// ==========================================

// ===== Genre mechanics =====
/** One dot's radius, as a FRACTION of the bake's own frame width — not a pixel count, because the
 *  SVG scales with the container and a fixed pixel radius would be one size at one width only.
 *  Measured rather than inherited: the still sibling's 1.15px radius on its own 860px frame became a
 *  0.77px speckle here, because this plate is baked at 1000px and drawn at 666 in a 1600px window.
 *  0.002 of the frame is 2px baked, ~1.3px drawn at 1600 and ~0.6px at 375 — a texture at the sizes
 *  a reader actually sees rather than at the size the plate was baked at. */
const DOT_RADIUS_FRACTION = 0.002;
/** The per-country hit target's diameter, in real CSS pixels — an HTML `<button>`, never an SVG
 *  shape sized in frame units, which would shrink to a few physical pixels at 375px wide. */
const HIT_TARGET_PX = 28;
/** The one bounded zoom step. A reader cannot go past it, so the plate never degrades into blur, and
 *  it is a fixed multiplier rather than a gesture with no ceiling. 2.2x is the measured choice: at
 *  375px wide it takes the drawn map from ~290px to ~640px, which is what separates the Benelux
 *  targets from each other rather than merely making the map bigger. */
export const ZOOM_SCALE = 2.2;
// ===========================

/** One country's own detail string: the ONE implementation the hit target's `aria-label`,
 *  `data-detail` and native `title` all draw from, so a hovering reader and a screen-reader user are
 *  never told two different things about the same cloud. The DOT COUNT is included beside the
 *  population on purpose — it is the bridge between the texture a reader sees and the number the
 *  legend states. */
export function countryDetail(country: {
  name: string;
  population: number;
  dots: number;
}): string {
  return `${country.name} — ${en(country.population, 0)} people, ${en(country.dots, 0)} dots`;
}

export type DotCountry = {
  key: string;
  name: string;
  population: number;
  parts: Pt[][][];
  dots: Pt[];
  anchor: Pt;
};

export function DotDensityWeb({
  geometry,
  plate,
  countries,
  dotValue,
  totalPopulation,
  totalDots,
  title,
  source,
  basemapCredit,
  legendCaption,
  caveat,
  alt,
  ground,
  accent,
  ink,
  muted,
  landFill,
  zoomable = true,
}: {
  geometry: { frame: { width: number; height: number } };
  plate: string;
  countries: DotCountry[];
  dotValue: number;
  totalPopulation: number;
  totalDots: number;
  title: string;
  source: string;
  basemapCredit: string;
  legendCaption: string;
  caveat: string;
  alt: string;
  ground: string;
  accent: string;
  /** Derived from `ground` by `deriveFurniture` in the node runner that calls this component. */
  ink: string;
  muted: string;
  /** A light neutral land fill, derived from ground and ink by the runner. */
  landFill: string;
  zoomable?: boolean;
}) {
  const { frame } = geometry;
  if (countries.length < 2)
    throw new Error(
      `a dot map needs at least two regions, got ${countries.length}`,
    );
  const dotRadius = frame.width * DOT_RADIUS_FRACTION;
  // Smallest population first, so the largest clouds' targets end up on top: where two countries'
  // 28px targets overlap, the one the claim is about is never the one that is covered.
  const targets = [...countries].sort((a, b) => a.population - b.population);
  const named = countries.filter((c) => NAMED.includes(c.key));

  return (
    <div className="map-web">
      <p className="mw-title">{title}</p>
      <p className="mw-source">{`${source} · ${basemapCredit}`}</p>

      {zoomable && (
        <label className="mw-zoom-toggle-label" htmlFor="mw-zoom-toggle">
          <input
            type="checkbox"
            id="mw-zoom-toggle"
            className="mw-zoom-toggle"
          />
          {` Zoom in (${en(ZOOM_SCALE)}×, bounded) — then scroll or use the arrow keys to pan`}
        </label>
      )}

      <div className="mw-stage">
        <div
          className="mw-viewport"
          style={{ aspectRatio: `${frame.width} / ${frame.height}` }}
          {...(zoomable
            ? {
                tabIndex: 0,
                "aria-label":
                  "Pannable map area — scroll or use the arrow keys to pan when zoomed in.",
              }
            : {})}
        >
          <div className="mw-zoomable">
            {/* Geometry only: the plate, the study countries' own outlines, and the dots. No text —
                see this file's own header note. */}
            <svg
              className="map"
              viewBox={`0 0 ${frame.width} ${frame.height}`}
              preserveAspectRatio="xMidYMid meet"
              role="group"
              aria-label={alt}
            >
              <defs>
                <clipPath id="plate-clip">
                  <rect x={0} y={0} width={frame.width} height={frame.height} />
                </clipPath>
              </defs>
              <g clipPath="url(#plate-clip)">
                <image
                  href={plate}
                  x={0}
                  y={0}
                  width={frame.width}
                  height={frame.height}
                />

                {/* Every study country gets a light fill and outline, so a reader sees the region
                    even where its own dot count is too small to read as texture — a dot map is about
                    distribution WITHIN a region, which needs the region's edge to be visible. */}
                {countries.map((c) => (
                  <path
                    key={c.key}
                    d={ringPath(c.parts)}
                    fill={landFill}
                    stroke={muted}
                    strokeWidth={frame.width * 0.0006}
                  />
                ))}

                {/* One dot colour for every dot: this is a univariate map, so a second hue would
                    invent a second variable. */}
                {countries.map((c) => (
                  <Fragment key={c.key}>
                    {c.dots.map((p, i) => (
                      <circle
                        key={i}
                        cx={p[0]}
                        cy={p[1]}
                        r={dotRadius}
                        fill={accent}
                      />
                    ))}
                  </Fragment>
                ))}
              </g>
            </svg>

            {/* The five clouds the claim names, labelled directly on their own dots — HTML,
                positioned by percentage, sized in fixed CSS pixels. Drawn unconditionally: they are
                the claim, not an interaction result, and no control on this page can remove them. */}
            {named.map((c) => (
              <span
                key={c.key}
                className="point-label subject"
                style={{
                  left: `${(c.anchor[0] / frame.width) * 100}%`,
                  top: `${(c.anchor[1] / frame.height) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                {c.name}
              </span>
            ))}

            {/* The interaction layer: one HTML <button> per country, at its own cloud's anchor.
                `title` gives a native tooltip with no script at all; `aria-label`/`data-detail` are
                baked into the markup rather than assembled by the inline script, so the no-JS page is
                still keyboard-reachable and still announces the value. */}
            {targets.map((c) => (
              <button
                key={c.key}
                type="button"
                className="pt"
                style={{
                  left: `${(c.anchor[0] / frame.width) * 100}%`,
                  top: `${(c.anchor[1] / frame.height) * 100}%`,
                }}
                aria-label={countryDetail({
                  name: c.name,
                  population: c.population,
                  dots: c.dots.length,
                })}
                title={countryDetail({
                  name: c.name,
                  population: c.population,
                  dots: c.dots.length,
                })}
                data-key={c.key}
                data-detail={countryDetail({
                  name: c.name,
                  population: c.population,
                  dots: c.dots.length,
                })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* The dot-value key, at headline weight rather than as a footer line: it is the ONE piece of
          text that turns a texture back into a measurement, and a dot map without it is an
          impression. */}
      <div className="mw-legend">
        <p className="mw-legend-caption">{legendCaption}</p>
        <div className="mw-legend-marks">
          <div className="mw-legend-item">
            <svg width={18} height={18} aria-hidden="true">
              <circle cx={9} cy={9} r={2.4} fill={accent} />
            </svg>
            <span className="mw-legend-value">{`1 dot = ${en(dotValue, 0)} people`}</span>
          </div>
          <div className="mw-legend-item">
            <span className="mw-legend-value">
              {`${en(totalDots, 0)} dots drawn for ${en(totalPopulation, 0)} people`}
            </span>
          </div>
        </div>
      </div>

      <p className="mw-caveat">{caveat}</p>
    </div>
  );
}

/** Every part of a shape as one path: `rings[0]` is the outer boundary, `rings[1..]` are holes, and
 *  the even-odd default of a single `d` with several subpaths cuts them back out. */
function ringPath(parts: Pt[][][]): string {
  return parts
    .flat()
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
 * The accessibility answer, and on THIS beat it is not optional.
 *
 * A map is a spatial medium and a screen-reader user has no spatial access to it; a hover tooltip is
 * not an answer, because it requires knowing where to point before you can ask. The genre makes this
 * table opt-in per beat and this beat opts IN. A dot map is the strongest case for it in the whole
 * genre: the encoding IS texture, so there is no legend entry, no axis and no label from which a
 * reader without spatial access could recover a single country's population. Without the table they
 * would have the dot value and nothing to apply it to.
 *
 * It also carries the distinction the picture cannot make: dots are scattered uniformly inside each
 * country, so how TIGHTLY a cloud fills its country is population per unit area — a different
 * quantity from the population the title is about. The table's own columns keep the two apart.
 */
export function CountryTable({
  countries,
  ink,
  muted,
}: {
  countries: DotCountry[];
  ink: string;
  muted: string;
}) {
  const rows = readingOrder(countries);
  return (
    <table className="region-table" style={{ color: ink, borderColor: muted }}>
      <caption>
        Every reading behind the map above, most populous first — the exact
        figures a field of dots cannot state.
      </caption>
      <thead>
        <tr>
          <th scope="col">Country</th>
          <th scope="col">Population</th>
          <th scope="col">Dots drawn</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.key} className={NAMED.includes(c.key) ? "subject" : undefined}>
            <th scope="row">{c.name}</th>
            <td>{en(c.population, 0)}</td>
            <td>{en(c.dots.length, 0)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
