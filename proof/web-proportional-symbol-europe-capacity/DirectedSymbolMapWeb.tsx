/**
 * EUROPE'S LOW-CARBON CAPACITY AS PROPORTIONAL SYMBOLS — one circle per country, its AREA the
 * installed capacity — drawn through the design base and delivered as an interactive page.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE GESTURE, AND WHY IT IS THIS TYPE'S AND NOT A ZOOM.
 *
 * A zoom and a pan were available and are refused. They cost the framing `camera.ts` argues for,
 * they answer a question about the CAMERA rather than about the data, and they are the one gesture
 * all eight map types would reach for — the owner's fifth standing arbitrage is that a type gets its
 * own gesture, not the reflex one. Not a single `cx`/`cy` on this page changes in any state.
 *
 * WHAT A PROPORTIONAL SYMBOL MAP HIDES IS THE EXPONENT OF ITS OWN SIZE SCALE. The ranking is right
 * under every law; the biggest circle is over the biggest country under every law; and the SPREAD
 * between the circles — the only thing the map is for — is a free parameter the author set in
 * silence. `map-beat/references/types/proportional-symbol.md` calls a radius-proportional scale "not
 * a style preference… a mechanically wrong scale, and the difference between an honest bubble map
 * and a misleading one", and a reader looking at the finished picture has no way whatever to tell
 * which one they were given. A symbol map has no axis; the only instrument on the page is a size
 * legend the same exponent drew.
 *
 * So the control is the exponent, and the vocabulary is this beat's own new one:
 * `skills/map-web/assets/area-scale.ts`. Three laws over the same 41 circles at the same 41 centres,
 * with the biggest circle pinned at the same radius in all three, so the ONLY cue that changes is
 * the spread. The sentence each law reveals prints two derived ratios and a derived count — the area
 * ratio the eye is SHOWN between France and Greece, the ratio of the capacities themselves, and how
 * many of the 41 countries that law draws under the legibility floor. None of those three numbers is
 * typed by hand; the vocabulary derives them from the frozen file and refuses a sentence that does
 * not contain them.
 *
 * WHAT THE READER SEES AND A STILL CANNOT SHOW. Under the radius law the Royaume-Uni's circle loses
 * a third of its radius while the "47" printed at its centre does not move and does not change. The
 * distortion and the datum are in one glance, in one image, and the reader is the one who asked for
 * it.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE OTHER THREE TREATMENTS, KEPT.
 *
 * `a-radius-is-not-read-by-eye` — the RESTING law is the area law and the vocabulary refuses any
 * other as a default. The key gives three named magnitudes and never a continuous ramp, and those
 * three swatches re-scale with the marks, inside boxes sized for the largest law so their words
 * never travel.
 *
 * `the-basemap-gives-up-its-contrast` — the plate is a quiet step off the ground, so every symbol
 * reads against it.
 *
 * `an-overlap-accumulates-rather-than-occluding` — the symbols are translucent and painted largest
 * first, so a small one is never buried and an overlap reads as an overlap. That translucency is
 * why the mark that answers a pointer is measured on the COMPOSITE below and not on its own fill:
 * an opacity laid over a calibrated colour has already shipped 1,75:1 twice in this tree.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { controlChromeCss } from "../../skills/chart-web/assets/control-chrome.ts";
import {
  areaScaleChromeSpec,
  areaScaleCss,
  areaScaleNotesForMarkup,
  areaScaleOptionsForMarkup,
  keyBoxRadius,
  keyRadiiUnder,
  radiiUnder,
  type AreaScaleDeclaration,
} from "../../skills/map-web/assets/area-scale.ts";

/** One country's mark. The RADIUS IS NOT HERE: it is derived from the scale declaration below, so
 *  the size the page draws and the size the stylesheet re-scales cannot come from two places. */
export type Symbol_ = {
  key: string;
  name: string;
  /** The country's own capacity, in the beat's own words — printed at the mark's centre, in every
   *  state, unchanged. */
  figure: string;
  /** Whether this country's name and figure are printed on the map. The BEAT decides, from its own
   *  claim, and never this component from a radius: see the label block below. */
  labelled: boolean;
  cx: number;
  cy: number;
  detail: string;
};
/** One legend magnitude's words. Its radius, too, comes from the declaration. */
export type KeySize = { key: string; label: string };

const SCOPE = ".chart-figure";
/** `chart-stack-` on purpose — the format's discovery contract, see `area-scale.ts`'s header. */
const STACK_ID_PREFIX = "chart-stack";
/** How long the field takes to re-size. Long enough to read as one field changing law rather than
 *  as a cut, short enough that a reader comparing two laws is not waiting on it. Emitted inside
 *  `@media (prefers-reduced-motion: no-preference)` by `areaScaleCss`, never outside it. */
const TRAVEL_MS = 380;
/** The smallest DEFAULT-law radius a circle may have and still be asked to hold two lines of 13px
 *  text. The beat names which countries are labelled (its claim names five); this is the check that
 *  its choice fits inside the ink, made here because this is where the type size lives. */
const LABEL_MIN_RADIUS = 22;

export function DirectedSymbolMapWeb({
  plate,
  symbols,
  keySizes,
  scale,
  land,
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
  symbols: Symbol_[];
  keySizes: KeySize[];
  /** The scale laws this beat hands the reader (`map-web/assets/area-scale.ts`). */
  scale: AreaScaleDeclaration;
  land: string;
  /** The baked MapTiler basemap for THIS direction, already a data URI. */
  plate: string;
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

  const landFill = mix(ground, ink, 0.1);
  const landEdge = mix(ground, ink, 0.24);
  const water = mix(ground, ink, 0.03);
  const symbolFill = adjustToContrast(accent, ground, NON_TEXT_CONTRAST_MIN) ?? accent;
  const label = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;

  /** How translucent a symbol is. The overlap treatment's whole substance, and the number every
   *  colour measurement on this page has to be taken THROUGH. */
  const SYMBOL_OPACITY = 0.5;

  // THE RING CARRIES THE FLOOR, THE WASH CARRIES THE OVERLAP. A 50 %-translucent accent over the
  // plate's own land measures 2,19:1 against it on creme — under the non-text floor — and that is
  // not a defect to be fixed by making the symbols opaque, because opaque symbols in a dense field
  // draw a stacking order nobody chose. What clears the floor is the 1px ring at full strength, and
  // it is asserted here rather than assumed: a direction whose accent stopped clearing the floor
  // against the plate would ship a field of marks whose only edge a reader cannot see.
  if (contrast(symbolFill, landFill) < NON_TEXT_CONTRAST_MIN)
    throw new Error(
      `the symbol's ring is ${symbolFill} on a basemap land of ${landFill}, ` +
        `${contrast(symbolFill, landFill).toFixed(3)}:1 — under the ${NON_TEXT_CONTRAST_MIN}:1 ` +
        "non-text floor. The wash is translucent on purpose (an overlap must read as an overlap), " +
        "so the ring is the only thing that makes a mark's edge visible against the plate.",
    );

  // WHAT THE MARK BECOMES UNDER THE POINTER, MEASURED ON THE COMPOSITE THE PAGE REALLY PAINTS.
  //
  // The owner refused a dot plastered over a mark three times, and refused a FIXED dose that
  // measured 1,104:1 on nocturne. So the circle itself answers, moved off its own fill by the
  // smallest step of the direction's own ink that clears a measured gap — and the gap is measured
  // after the 50 % opacity, because the opacity halves every difference and a dose chosen on the
  // bare fill would arrive at the reader worth half of what it was calibrated to.
  //
  // "Darken" is the wrong verb and nocturne is why: there `--ink` is `#FFFFFF`, so the step that
  // moves a mark away from its neighbours LIGHTENS it. Measured on the three filed directions:
  // creme 0,26 of the ink (composite 1,145:1 off rest, 2,507:1 off the land), rapport 0,28
  // (1,150:1 / 2,527:1), nocturne 0,40 (1,146:1 / 3,687:1). Every one of them ends FURTHER from the
  // plate than it started, which is asserted rather than hoped for.
  const restComposite = mix(landFill, symbolFill, SYMBOL_OPACITY);
  const markActive = (() => {
    for (let dose = 0.1; dose <= 0.95; dose += 0.02) {
      const moved = mix(symbolFill, ink, dose);
      const composite = mix(landFill, moved, SYMBOL_OPACITY);
      if (contrast(composite, restComposite) < 1.14) continue;
      if (contrast(composite, landFill) < contrast(restComposite, landFill))
        throw new Error(
          `the mark that answers the pointer would be painted ${composite} over a land of ` +
            `${landFill} — ${contrast(composite, landFill).toFixed(3)}:1, CLOSER to the basemap ` +
            `than the mark at rest (${contrast(restComposite, landFill).toFixed(3)}:1). The mark a ` +
            "reader is pointing at would be the least visible thing on the plate.",
        );
      return moved;
    }
    throw new Error(
      `no dose of ${ink} moves ${symbolFill} 1,14:1 off itself once the ${SYMBOL_OPACITY} opacity ` +
        "the overlap treatment needs has halved the difference — a reader could not see which " +
        "circle answered the pointer",
    );
  })();

  // ── THE SIZES, DERIVED ONCE FROM THE DECLARATION ────────────────────────────────────────────
  // The marks the page draws and the factors the stylesheet emits come from the same three
  // functions. Nothing on this page holds a second opinion about how big a circle is.
  const defaultLaw = scale.options[0];
  const radii = radiiUnder(scale, defaultLaw);
  const keyRadii = keyRadiiUnder(scale, defaultLaw);
  /** The swatch box every key row shares: the largest radius any magnitude takes under any law,
   *  plus the ring. Sized for the LARGEST law so a circle re-scaling never moves the word beside
   *  it, and shared across the three so the three words line up. */
  const keyBox = Math.max(...keySizes.map((k) => keyBoxRadius(scale, k.key))) + 1;

  // A LABELLED CIRCLE HAS TO BE ABLE TO HOLD ITS LABEL. The beat names the countries it prints on
  // the map, from its own claim rather than from a threshold; this is where that choice meets the
  // type size, so this is where it is refused. Two lines of 13px text need roughly 30 units of
  // height at this geometry's scale, and a circle under 22 units of radius has 44.
  for (const s of symbols)
    if (s.labelled && (radii.get(s.key) as number) < LABEL_MIN_RADIUS)
      throw new Error(
        `${s.name} is labelled on the map and its circle is ${(radii.get(s.key) as number).toFixed(1)} ` +
          `units of radius under the resting law, below the ${LABEL_MIN_RADIUS} two lines of 13px ` +
          "text need. A name printed outside the mark it names is the label placement this type's " +
          "own sheet puts first among its failures.",
      );

  const scaleOptions = areaScaleOptionsForMarkup(scale, STACK_ID_PREFIX);
  const scaleNotes = areaScaleNotesForMarkup(scale);
  const chrome = areaScaleChromeSpec();

  const css = [
    // THE CONTROL'S DRAWING IS NOT WRITTEN HERE AND NOT COPIED FROM A SIBLING. `control-chrome.ts`
    // is the one place a directed control is drawn — the wash, the ring and the darkened words that
    // replaced the black slab the owner refused three times, plus the two flex measurements he
    // arbitrated. The vocabulary supplies only what was ever its own: a class stem and a note
    // height measured on this page's own longest sentence.
    controlChromeCss({ scope: SCOPE, ...chrome }),
    areaScaleCss(scale, { scope: SCOPE, idPrefix: STACK_ID_PREFIX, travelMs: TRAVEL_MS }),
    // THE ANSWER, AS A GENERATED RULE. `--mark-active` is what the format's own stylesheet reads off
    // the mark; setting it inline on 41 circles would be 41 inline declarations beating every
    // generated rule on a page built out of generated rules.
    `${SCOPE} [data-mark] { --mark-active: ${markActive}; }`,
    // The answer is five readings long and the format's tooltip box is 220px wide.
    `#tooltip { max-width: min(430px, 100vw - 32px); }`,
    // THE KEY'S OWN BOX, over the map's bottom-left corner — ocean under this camera in all three
    // filed directions, which is why it may sit there at all. It is opaque in the GROUND rather
    // than translucent: a key drawn through the basemap it calibrates is a key read against a
    // different colour in each of its three rows.
    // Every swatch is sized off `--cell-w`, the plot's own measurement of the cell it shares, so a
    // circle in the key is the size a mark of that value is on the map beside it — at every window
    // size, with no breakpoint and no second opinion about scale anywhere on the page.
    `${SCOPE} .key-layer { position: relative; pointer-events: none; }`,
    `${SCOPE} .key { position: absolute; left: 2.5%; bottom: 3%; display: flex; flex-direction: column;` +
      ` align-items: flex-start; gap: 2px; padding: 5px 7px; background: ${ground};` +
      ` border: 1px solid ${grid}; border-radius: 3px; }`,
    `${SCOPE} .key-row { display: flex; align-items: center; gap: 5px; }`,
    // The swatch BOX is the largest law's, so the word beside it never travels when the law changes.
    `${SCOPE} .key-row svg { display: block; flex: 0 0 auto; }`,
    `${SCOPE} .key-word { white-space: nowrap; }`,
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
          nothing leaves this picture in any state, and a control that hid countries would be a
          filter wearing this one's pills. */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="chart-header">
        <p className="chart-eyebrow" style={{ ...regs.eyebrow, margin: "0 0 6px" }}>{eyebrow}</p>
        <h2 className="chart-title" style={{ ...regs.display, margin: "0 0 6px" }}>{title}</h2>
        <p className="chart-caveat" style={{ ...regs.body, margin: 0 }}>{caveat}</p>
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the reading a reader who is not looking at the map would otherwise
          only get from it. Each accessible name CONTAINS its visible one — `assertAreaScaleDeclaration`
          refuses the declaration otherwise (WCAG 2.5.3). */}
      <fieldset className={`chart-${chrome.name}`}>
        <legend>{scale.label}</legend>
        <div className="options">
          {scaleOptions.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={STACK_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE SENTENCE THE CONTROL OWES THE READER — the distortion as a number, for a reader who is
          not looking at the circles. Its row is reserved and its sentences are stacked in one grid
          cell, so choosing a law never moves the map underneath it. The default law reveals none: it
          is not a counterfactual, it is the claim the title states. */}
      <div className={`${chrome.name}-notes`} role="status">
        {scaleNotes.map((note) => (
          <p key={note.slug} data-stack-note={note.slug} style={{ ...regs.annot, margin: 0 }}>{note.text}</p>
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
          preserveAspectRatio="xMidYMid meet"
        >
          <desc>{alt}</desc>
          {/* THE CAMERA CLIPS. An SVG does not clip its own children, and this beat's shapes reach
              past the plate: Greenland's rings project west of the frame's own west edge. Without
              this, they were painted on the bare page beside the map — geography with no basemap
              under it, which reads as a second, smaller map nobody drew. Every mark now lives inside
              the rectangle the plate covers, or it does not appear. */}
          <defs>
            <clipPath id="camera">
              <rect x={0} y={0} width={width} height={height} />
            </clipPath>
          </defs>
          <g clipPath="url(#camera)">
          <rect x={0} y={0} width={width} height={height} fill={water} />
          {/* THE BASEMAP IS MAPTILER'S GEOGRAPHY, baked once per filed direction in that
              direction's own tints. The rect above is a backstop; the plate covers the box exactly,
              so `none` here is an identity and not a shear — the plot box carries the plate's own
              aspect, and the trunk now holds the plot CELL to that same ratio (this beat's cell
              measured 2,107 before that sweep: on a map an anisotropy is not a style defect, it is
              a false geography, and every circle on this page was an ellipse). */}
          <image href={plate} x={0} y={0} width={width} height={height} preserveAspectRatio="none" />
          <path d={land} fill={landFill} stroke={landEdge} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />

          {/* THE MARKS. Drawn ONCE, at the default law's radius, largest first so a small symbol is
              never buried under a large one. Every other state is a uniform `scale()` about each
              circle's own fill box: `cx`/`cy` never change, which is exactly what `interaction.mjs`
              needs (it resolves the pointed mark off centres read once at initialisation), and a
              uniform factor cannot turn a circle into an ellipse. `non-scaling-stroke` keeps the
              ring 1px under every factor, so it neither thickens as a circle grows nor disappears
              as one shrinks. */}
          {[...symbols]
            .sort((a, b) => (radii.get(b.key) as number) - (radii.get(a.key) as number))
            .map((s) => (
              <circle
                key={s.key}
                data-symbol={s.key}
                data-mark={s.key}
                cx={s.cx}
                cy={s.cy}
                r={radii.get(s.key)}
                fill={symbolFill}
                fillOpacity={SYMBOL_OPACITY}
                stroke={symbolFill}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}

          {/* THE HIT TARGETS, AND THEY DELIBERATELY DO NOT RE-SCALE.
              A `.pt` carrying `data-mark-ref` is invisible in every state (the format's own
              stylesheet) and names the circle that answers for it, so nothing is plastered over a
              mark — the owner's second standing arbitrage. Its radius stays the DEFAULT law's in
              every state, floored at 9 units, because the thing a reader aims at is not the thing
              this control distorts: shrinking the keyboard and touch target under the radius law
              would make the page hardest to operate in exactly the state it exists to criticise.
              The pointer never depends on it anyway — `data-hit="cell"` resolves to the nearest
              CENTRE, and no centre moves. */}
          {symbols.map((s) => (
            <circle
              key={`hit-${s.key}`}
              className="pt"
              data-mark-ref={s.key}
              cx={s.cx}
              cy={s.cy}
              r={Math.max(9, radii.get(s.key) as number)}
              fill="transparent"
              stroke="none"
              tabIndex={0}
              role="img"
              aria-label={s.detail}
              data-detail={s.detail}
            />
          ))}
          <rect className="hit-area" x={0} y={0} width={width} height={height} fill="transparent" pointerEvents="all" />

          {/* THE PRINTED FIGURE, AND IT IS THE ARGUMENT. Each country whose circle can hold two lines
              carries its own name and its own capacity at its own centre — in EVERY state, at the
              same place, in the same words. Under the radius law the Royaume-Uni's circle loses a
              third of its radius while the "47 GW" inside it does not budge: the distortion and the
              datum in one glance, which is the whole beat in one image. The two lines are `tspan`s
              anchored on the mark's own `cx`, so neither travels when the circle re-sizes.
              WHICH countries are labelled is the BEAT's decision and is the same set in every state,
              so no text ever appears or disappears as the reader changes law — the owner refused a
              label that moved under a control twice, and a label that came and went would be worse.
              A direct label is also this type's accessible path (`types/proportional-symbol.md`): a
              build that wires the names into the hover state alone has dropped a channel of the
              map's own data. */}
          {symbols
            .filter((s) => s.labelled)
            .map((s) => (
              <text
                pointerEvents="none"
                key={`l-${s.key}`}
                x={s.cx}
                y={s.cy}
                fill={label}
                fontFamily={String(regs.value.fontFamily)}
                fontSize={13}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                <tspan x={s.cx} dy="-0.35em" fontWeight={700}>{s.name}</tspan>
                <tspan x={s.cx} dy="1.15em">{s.figure}</tspan>
              </text>
            ))}
          </g>
        </svg>
        {/* THE KEY IS THREE NAMED MAGNITUDES, AND IT IS DRAWN AT THE MAP'S OWN SCALE — which
            means INSIDE THE CELL, not in a row above it. A `-layer` child of `.chart-plot` is the
            format's own mechanism for a box that shares the plot cell exactly: it takes `--cell-w`
            and `--cell-h`, centres in the track with the drawing, and inherits the plot's custom
            properties, which is the only place on this page the cell's real size is a number CSS
            can do arithmetic on.
            WHY THAT MATTERS ON THIS TYPE MORE THAN ANY OTHER. A swatch radius is a count of the
            map's OWN viewBox units, so drawing it at 1:1 CSS pixels is right only in a cell that
            renders 1:1 — and no cell ever does. Measured on the row this replaces: at 1280x860 the
            cell came to 570px for a ${width}-unit viewBox, so the 50 GW swatch was drawn at r=33px
            beside a France of 96 GW drawn at r=29px. THE KEY'S 50 GW CIRCLE WAS BIGGER THAN THE
            MAP'S 96 GW CIRCLE. A reader calibrating France against it would have read the biggest
            low-carbon fleet on the continent as under half of what it is — off the one instrument a
            symbol map has for turning an area back into a quantity. Sized off `--cell-w`, every
            swatch is the size the mark of that value actually has, at every window size.
            Three rows rather than three columns: the words do not scale with the cell (they are
            HTML at the register's own size, and a legend nobody can read is not a smaller legend),
            so a horizontal key is as wide as its words at every width and swamps a phone's cell. */}
        <div className="key-layer" aria-hidden="true">
          <div className="key">
            {keySizes.map((k) => {
              // ONE BOX FOR ALL THREE, and it is the LARGEST law's largest magnitude. Two things
              // ride on that: the words line up in a column instead of stepping in and out with
              // their own circle, and no word travels when the reader changes law — the circle
              // grows and shrinks inside a box that is the same in every state.
              // Its own HEIGHT, though, is its own largest law's: only the width has to be shared
              // for three words to line up, and giving every row the tallest row's box reserved
              // 156 units of key over a map that had 40 of them to spare.
              const boxH = keyBoxRadius(scale, k.key) + 1;
              return (
                <span key={k.key} className="key-row" style={regs.axis}>
                  <svg
                    viewBox={`0 0 ${keyBox * 2} ${boxH * 2}`}
                    style={{
                      width: `calc(var(--cell-w) * ${keyBox * 2} / ${width})`,
                      height: `calc(var(--cell-w) * ${boxH * 2} / ${width})`,
                    }}
                  >
                    <circle
                      data-key-symbol={k.key}
                      cx={keyBox}
                      cy={boxH}
                      r={keyRadii.get(k.key)}
                      fill={symbolFill}
                      fillOpacity={SYMBOL_OPACITY}
                      stroke={symbolFill}
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <span className="key-word">{k.label}</span>
                </span>
              );
            })}
          </div>
        </div>
        <div className="overlay" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>{claimNote}</p>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>{reading}</p>
      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>{source}</p>
    </figure>
  );
}
