/**
 * Europe's low-carbon electricity share by country, drawn as a choropleth THROUGH the design base and
 * delivered as an interactive page.
 *
 * THIS MAP DRAWS ITS OWN GEOMETRY, so it goes through the CHART format's machinery, exactly as its
 * static sibling goes through `chart-beat`'s rasteriser rather than `map-beat`'s. `map-web` exists
 * for a tiled basemap and its live-plan interaction; a projected vector map with no tiles has no use
 * for either, and pulling one in would add a third-party host to a page that needs none.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE GESTURE, AND WHY IT IS THIS TYPE'S AND NO NEIGHBOUR'S.
 *
 * What a choropleth hides is not a value — every value is one pointer away, here and on any
 * competent page of this type. What it hides is that the PARTITION was a choice. The map turns forty
 * numbers into four colours, and the reader is shown the result of a decision without ever being
 * shown the decision. On this file the darkest band holds SEVEN countries under the stated threshold
 * the headline names, TEN under quantiles, and THIRTEEN under equal intervals and Fisher-Jenks
 * alike. Two of those three are the default of an ordinary mapping tool. The seven belongs to the
 * SENTENCE; the map shows seven only because somebody cut at 94.
 *
 * So the reader picks the RULE, and the whole map re-shades under it, the legend's bounds rewrite in
 * place with the count of countries each class then holds, and a derived sentence says how many
 * countries enter the darkest band and how many of the forty changed class at all.
 * `../../skills/map-web/assets/classing.ts`, written for this beat.
 *
 * IT IS NOT A ZOOM AND NOT A PAN. Both would cost the framing `camera.ts` argues for, which is the
 * whole reason this beat is in an equal-area projection in the first place. Nothing here touches the
 * camera.
 *
 * AND NOTHING MOVES. Not a country, not a label, not a word of the title, the standfirst, the claim
 * note or the source. A map mark's position is DATA, so the owner's first arbitration is harder here
 * than on a chart, and it is held structurally rather than carefully: the vocabulary has nowhere to
 * declare a position and emits nothing but a fill. The legend's bounds ARE text that changes, and
 * they change inside a fixed grid cell, so a chip is as wide as the longest of its four labels and
 * the rank never reflows.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * `the-key-names-its-classes-in-their-own-colours` — the key is the classes, in their own swatches,
 * with their own bounds in per cent AND their own population, under whichever rule is in force.
 * `the-ramp-is-monotone-in-lightness` — the classes step in one direction only, so the order
 * survives a monochrome print and a colour-vision deficiency. FOUR classes and not five: see the
 * ramp below, which is walked in contrast against the LAND the plate actually paints and refuses a
 * rung a reader could not tell from its neighbour.
 * `a-missing-cell-is-drawn-as-missing` — a country the file has no reading for is drawn hollow and
 * named as missing, never left in the lowest class, and never handed to a classing rule as a number
 * it is not. The lowest class is a country at 10,7 %; a country with no data is neither.
 *
 * THE SHAPE IS WHAT ANSWERS A POINTER, NEVER A DOT ON TOP OF IT. Each `.pt` names the country it
 * speaks for (`data-mark-ref` -> `data-mark`) and the country takes `--mark-active`, searched off
 * ITS OWN fill until a measured separation is cleared — per class, per direction, refused rather
 * than dosed. And because the fill travels with the rule, so does `--mark-active`: the classing
 * stylesheet sets both in the same declaration, so the darkening is measured against the colour the
 * shape is ACTUALLY wearing rather than against the one it wore in the state the author tested.
 *
 * WHAT THE ANSWER SAYS, AND THE ONE THING IT NO LONGER SAYS. The answer carries the exact share, the
 * low-carbon TWh out of the total, the rank among the forty, and whether the country keeps the same
 * class under all four rules. It no longer names the class it is in: `interaction.mjs` reads
 * `data-detail` once, so a baked string naming "palier 70–94 %" would be a lie under three rules out
 * of four. The colour says the class; the pointer says the number the class hides; and the two
 * readings no longer overlap.
 */

import { mix, adjustToContrast, contrast, TEXT_CONTRAST_MIN, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { controlChromeCss } from "../../skills/chart-web/assets/control-chrome.ts";
import {
  assertClassingDeclaration,
  buildClassingIndex,
  classingAttrs,
  classingBoundsForMarkup,
  classingCss,
  classingKeyCss,
  classingNotesForMarkup,
  classingOptionsForMarkup,
  type ClassingDeclaration,
  type ClassingReading,
} from "../../skills/map-web/assets/classing.ts";

/** The scope every generated rule is written inside. */
const SCOPE = ".chart-figure";
/** The prefix every radio id carries. `chart-stack-` is the FORMAT'S DISCOVERY CONTRACT for a
 *  control that changes the picture and owes the reader a sentence, not a copy-paste slip: see
 *  `classing.ts`, "IT EMITS `data-stack-note`". */
const CLASSING_ID_PREFIX = "chart-stack";
/** How long a country takes to cross from one class's colour to the next, in ms. Honoured only
 *  under `no-preference` — the travel is the reading, so a reader who asked for no motion gets the
 *  new partition instantly rather than not at all. */
const CHANGE_MS = 260;
/** How far apart two neighbouring classes have to stand before a reader can tell them apart.
 *  Refused, not hoped for. */
const RAMP_STEP_MIN = 1.2;
/** How much darker than its own fill a pointed-at country has to be before it counts as answering.
 *  A DOSE IS SEARCHED, NEVER SET: a fixed dose was refused at 1,104:1 on nocturne, one beat over. */
const MARK_SEPARATION = 1.4;

export type Shape = {
  code: string;
  name: string;
  path: string;
  /** The hit target's own seat: a point INSIDE the country, not its centroid. A centroid can land
   *  outside a concave or islanded shape, which is exactly the kind of thing nobody notices until a
   *  pointer answers with the wrong country. */
  cx: number;
  cy: number;
  detail: string;
  /** False for a country the file has no reading for: drawn hollow, in no rule's partition. */
  classed: boolean;
};

export function DirectedChoroplethWeb({
  plate,
  plateLand,
  shapes,
  readings,
  classing,
  missingLabel,
  aspect,
  size,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  claimNote,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  shapes: Shape[];
  readings: ClassingReading[];
  classing: ClassingDeclaration;
  missingLabel: string;
  /** The baked MapTiler basemap for THIS direction, already a data URI. */
  plate: string;
  /** The LAND colour that plate was baked in — the colour the page actually paints behind every
   *  country, and therefore the only honest thing to measure the lightest class against. */
  plateLand: string;
  aspect: number;
  size: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  claimNote: string;
  direction: any;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
  grid: string;
}) {
  const regs = webRegisters(direction, { ink: { ink, muted, accent } });

  const width = aspect >= 1 ? size : size * aspect;
  const height = aspect >= 1 ? size / aspect : size;

  const tones = classing.classes;

  /**
   * THE RAMP, ANCHORED ON THE LAND AND NOT ON THE PAGE.
   *
   * A class here is painted over the baked basemap, not over the paper: what sits behind a country
   * is `plateLand`, a step off the direction's ground toward its ink. Measuring the lightest class
   * against the GROUND — which is what this beat did before — reported 3,02:1 in creme while the
   * colour a reader actually sees it on gave 2,58:1, under the non-text floor. That is the trap this
   * brief names by hand: measure against the colour the page really paints.
   *
   * So the lightest class is the lightest tint of the accent that stands `NON_TEXT_CONTRAST_MIN`
   * off the LAND, and the rest are walked geometrically in contrast-against-ground from there up to
   * the accent itself, which is the darkest class. Monotone in lightness by construction.
   *
   * AND IT CARRIES FOUR RUNGS, NOT FIVE, WHICH IS A MEASUREMENT AND NOT A TASTE. On five rungs the
   * neighbouring steps measured 1,165 / 1,170 / 1,169 / 1,183:1 in creme and 1,187 / 1,191 / 1,195
   * in rapport — under the 1,2:1 this beat asks of two classes a reader has to tell apart on a map
   * where the two shapes may be a thousand kilometres apart. One hue between the accent's own
   * contrast and a floor set by the basemap carries only so many levels. `types/choropleth.md` allows
   * five as "a reasonable default", not as a requirement, and the refusal below is what turns that
   * into a decision this page can defend.
   */
  const floor = (() => {
    for (let step = 0; step <= 400; step += 1) {
      const candidate = mix(ground, accent, step / 400);
      if (contrast(candidate, plateLand) >= NON_TEXT_CONTRAST_MIN) return candidate;
    }
    throw new Error(
      `no tint of the accent ${accent} stands ${NON_TEXT_CONTRAST_MIN}:1 off the land ${plateLand} ` +
        `the plate is baked in — the lightest class would be indistinguishable from a country ` +
        `outside the study, which is the one thing a choropleth may never let happen`,
    );
  })();
  const lo = contrast(floor, ground);
  const hi = contrast(accent, ground);
  const ramp = Array.from({ length: tones }, (_, i) => {
    const target = lo * Math.pow(hi / lo, i / (tones - 1));
    for (let step = 0; step <= 400; step += 1) {
      const candidate = mix(ground, accent, step / 400);
      if (contrast(candidate, ground) >= target) return candidate;
    }
    return accent;
  });
  for (let i = 1; i < ramp.length; i += 1) {
    const separation = contrast(ramp[i], ramp[i - 1]);
    if (separation < RAMP_STEP_MIN)
      throw new Error(
        `classes ${i} and ${i + 1} are ${ramp[i - 1]} and ${ramp[i]}, which stand ` +
          `${separation.toFixed(3)}:1 apart — under the ${RAMP_STEP_MIN}:1 this beat asks of two ` +
          `classes a reader has to tell apart across a map. One hue between ${hi.toFixed(2)}:1 and a ` +
          `floor of ${lo.toFixed(2)}:1 set by the basemap's own land carries only so many levels; ` +
          `past four, name rather than shade.`,
      );
  }

  /**
   * WHAT A POINTED-AT COUNTRY BECOMES, SEARCHED OFF ITS OWN FILL.
   *
   * Not a fixed dose and not a filter: a `brightness()` lightens on a light ground and on a dark one
   * alike, and a fixed mix measured 1,104:1 on nocturne one beat over. The dose is walked up until
   * the result stands `MARK_SEPARATION` from the fill it replaces AND still clears the non-text
   * floor against the land it sits on — refused rather than approximated.
   */
  const activeFor = (fill: string) => {
    for (let dose = 0.06; dose <= 0.94; dose += 0.02) {
      const candidate = mix(fill, ink, dose);
      if (
        contrast(candidate, fill) >= MARK_SEPARATION &&
        contrast(candidate, plateLand) >= NON_TEXT_CONTRAST_MIN
      )
        return candidate;
    }
    throw new Error(
      `no dose of ink separates a pointed-at country from its own fill ${fill} by ` +
        `${MARK_SEPARATION}:1 while staying ${NON_TEXT_CONTRAST_MIN}:1 above the land ${plateLand}. ` +
        `A country that answers by becoming a colour the reader cannot tell from the one beside it ` +
        `has not answered.`,
    );
  };
  const activeRamp = ramp.map(activeFor);

  const edge = adjustToContrast(mix(ground, ink, 0.35), plateLand, 1.6) ?? mix(ground, ink, 0.35);

  assertClassingDeclaration(classing, readings);
  const index = buildClassingIndex(classing, readings);
  const options = classingOptionsForMarkup(classing, CLASSING_ID_PREFIX);
  const notes = classingNotesForMarkup(classing);
  const bounds = classingBoundsForMarkup(classing);

  const css = [
    controlChromeCss({
      scope: SCOPE,
      name: "classing",
      notes: {
        // NO RESERVE, BECAUSE THE SENTENCES THEMSELVES HOLD THE ROW. `classing.ts` hides an unchosen
        // sentence with `visibility` rather than with `display`, so all three still size the stacked
        // grid cell and the row is exactly as tall as the longest of them AT THE READER'S OWN WIDTH.
        // A reserve would have to cover the 375 px case — measured at 4,2em — and would then leave
        // 55 px of empty page between the control and the map at 1280 px.
        reserve: null,
        stacked: true,
      },
      extra: classingKeyCss({ scope: SCOPE }),
    }),
    classingCss(classing, {
      scope: SCOPE,
      idPrefix: CLASSING_ID_PREFIX,
      fillOf: (klass) => ramp[klass],
      activeOf: (klass) => activeRamp[klass],
      changeMs: CHANGE_MS,
    }),
    // The answer is four readings long and the format's box is 220 px wide.
    `#tooltip { max-width: 320px; }`,
  ].join("\n\n");

  return (
    <figure
      className="chart-figure"
      style={{
        ["--ground" as string]: ground,
        ["--accent" as string]: accent,
        ["--ink" as string]: ink,
        ["--muted" as string]: muted,
        ["--grid" as string]: grid,
        ...figureVars(regs),
      }}
    >
      {/* This beat's own stylesheet, carried inside the figure it styles. The format's shared
          `buildCss` emits the chrome for a FILTER, which this beat does not declare and must not:
          nothing ever leaves this picture. Forty-one countries are drawn in every state, and a
          choropleth with a country silently absent is the failure its own reference sheet warns
          about by name. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE KEY NAMES ITS CLASSES IN THEIR OWN COLOURS, says how many countries each holds under the
          rule in force, and says what a hollow shape means. Every rule's label for a class sits in
          one grid cell, so the chip is as wide as the longest of the four and the rank cannot reflow
          when the reader changes rule. */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0 12px", margin: "8px 0 4px", flex: "0 0 auto" }}>
        {bounds.map((variants, klass) => (
          <span key={klass} style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 14, height: 14, background: ramp[klass], display: "inline-block", border: `1px solid ${edge}` }} />
            <span className="classing-bounds">
              {variants.map((variant) => (
                <span key={variant.slug} data-classing-bound={variant.slug}>{variant.text}</span>
              ))}
            </span>
          </span>
        ))}
        <span style={{ ...regs.axis, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 14, height: 14, background: "transparent", display: "inline-block", border: `1px dashed ${edge}` }} />
          {missingLabel}
        </span>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the rule's full name where the pill carries its short one. Each
          accessible name CONTAINS its visible one — `assertClassingDeclaration` refuses the
          declaration otherwise, because a name that does not is the WCAG 2.5.3 failure. */}
      <fieldset className="chart-classing">
        <legend>{classing.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={CLASSING_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* WHAT THE CHOSEN RULE DOES TO THE READING. Its row is reserved whether or not a rule other
          than the plate's is chosen, so choosing one never moves the map underneath it, and every
          sentence sits in one grid cell so the row is always as tall as the longest of them. The
          plate's own rule gets none: the untouched map is the claim, not a comparison. */}
      <div className="classing-notes" role="status">
        {notes.map((note) => (
          <p data-stack-note={note.slug} key={note.slug} style={{ ...regs.annot, margin: 0 }}>{note.text}</p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="y-axis" />
        <svg
          role="group"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          data-hit="cell"
          viewBox={`0 0 ${width} ${height}`}
          // A MAP CANNOT STRETCH. `preserveAspectRatio="none"` is right when the geometry carries a
          // reading that survives a shear; a coastline does not, and an equal-area projection
          // stretched on one axis is no longer equal-area.
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          {/* THE BASEMAP IS MAPTILER'S GEOGRAPHY, baked once per filed direction in that direction's
              own tints, and stretched to the frame it was baked for — the plot box carries the
              plate's own aspect, so `none` here is an identity, not a shear. The country shapes draw
              over it: the plate carries the coastline and the sea, the shapes carry the classes. */}
          <image href={plate} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />

          {shapes.map((s) => (
            <path
              key={s.code}
              d={s.path}
              data-mark={s.code}
              {...classingAttrs(index, s.classed ? classing : null, s.code)}
              // The presentation attribute is what a reader with NO stylesheet at all sees, and it is
              // the plate's own rule. Every CSS rule outranks it, which is exactly the layering the
              // classing needs: the attribute is the floor, the generated rules are the control.
              fill={s.classed ? ramp[index.get(s.code)![0]] : "none"}
              stroke={edge}
              strokeWidth={s.classed ? 0.5 : 0.8}
              strokeDasharray={s.classed ? undefined : "2 2"}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {shapes.map((s) => (
            <circle
              key={`hit-${s.code}`}
              className="pt"
              cx={s.cx}
              cy={s.cy}
              r={6}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={s.detail}
              data-detail={s.detail}
              data-mark-ref={s.code}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />
        </svg>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>{claimNote}</p>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
