/**
 * Every low-carbon power station the database lists in Europe, as a LIVE MapTiler map — every dot a
 * MapLibre circle over MapTiler's own tiles, with MapTiler's own zoom, pan, keyboard and hover.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED ON 2026-09-15, AND WHY IT IS ARCHITECTURE RATHER THAN STYLE.
 *
 * The owner, on the proportional-symbol beat: *"la map doit prendre toute la largeur quitte à
 * afficher plus de map. Regarde le pilote qu'on a produit dans scrolly, c'est presque la même sauf
 * qu'avec web on peut avoir des contrôles, zoom, déplacement et hover en plus directement dans
 * MapTiler."* And, on the projection: *"oui une carte MapLibre plate pas un globe."*
 *
 * This page used to draw 8 299 SVG circles over a baked plate. An SVG has a `viewBox`, so it has a
 * ratio, so how much width it may take is something somebody has to arbitrate — and every answer
 * that arbitration produced has now been refused. A live map has no viewBox: it fills its container
 * and shows the ground that container gives it. `proof/web-choropleth-europe-lowcarbon` is the
 * validated pattern and this beat copies its arrangement;
 * `../../skills/map-web/assets/live-dot-density.ts` carries what a DOT field adds to it.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE GESTURE, AND IT IS THIS TYPE'S OWN: THE READER CHOOSES WHAT ONE DOT IS WORTH.
 *
 * Every map type hides something, and no two hide the same thing. A choropleth hides that its class
 * bounds were a choice. A cartogram hides the geography it sacrificed. A proportional symbol hides
 * the scale of its areas. A dot-density map hides THE DOT VALUE — and on this type that is not a
 * rendering setting, it is the whole sentence. One dot stands for a fixed quantity in a fixed piece
 * of ground: change the quantity and the same frozen file reads as a crowd or as a scatter, with
 * nothing else touched.
 *
 * On this file that is not an abstract point, it is the claim itself. The database is a REGISTER OF
 * PLACES, so the obvious dot value is one dot per station — and under it the 72 nuclear stations are
 * 0,87 % of the ink, which is exactly what the headline says they are by count. Put one dot on a
 * fixed number of MEGAWATTS instead and the same 8 299 rows paint 35,7 % of the ink nuclear. The
 * reader does not have to take the second number on trust: they put the same file at both
 * resolutions and watch a fleet that was a rounding error become a third of the page.
 *
 * AND THE TWO RESOLUTIONS DEPOSIT THE SAME INK, WHICH IS DERIVED AND NOT ARRANGED. The megawatt
 * value is the file's own mean capacity per site (453 082 MW ÷ 8 299 = 54,6 MW), rounded to the
 * nearest legible step — so the two fields carry 8 299 and 9 062 dots, within 9 % of each other.
 * Nothing is added and nothing is removed between the two pictures: the SAME quantity of ink is
 * simply put somewhere else. That is the strongest form the argument can take, and it is the form a
 * still cannot take at all, because a still has one dot value.
 *
 * THE THIRD RULE IS THE CATALOGUE'S OWN TRAP, SHOWN RATHER THAN AVOIDED. `types/dot-density.md`:
 * *"pick it too large and a real concentration renders as a handful of sparse dots that reads as
 * empty."* At 500 MW a dot, 93 % of the sites leave the map. The opposite half of the trap — a value
 * so small the field closes into a blob — is MEASURED and not shipped: the runner prints the 45 308
 * dots a 10 MW value would need, every render, so the reason it is refused is a number.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE COST OF THE ARCHITECTURE, STATED RATHER THAN DISCOVERED.
 *
 * No stylesheet reaches a MapLibre circle layer, so the FIELD's half of the gesture is script: one
 * `setLayoutProperty` per rule over layers that are all mounted at load. What a reader with
 * JavaScript off keeps is the frozen photograph of this page's own live map, the "one dot = …" key
 * under all three rules, the per-treatment counts, and a 41-row table whose per-country dot counts
 * re-write with the rule in pure CSS. The gesture did not go away without script; it moved from the
 * picture to the key and the table, and the page says so.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * ONE DOT SIZE, EVERYWHERE, AND IT IS A CORRECTION.
 *
 * The SVG form of this beat drew the 72 nuclear dots at radius 3,4 and everything else at 1,7. On
 * this type the radius IS the dot value, so two radii is two dot values in one field, and the map is
 * then measured in two units at once. Worse, it manufactured the very visibility the claim says the
 * nuclear fleet does not have: the page asserted "0,9 % of the sites" while painting them at 3,4 %
 * of the ink. One radius, under every rule, for every treatment. The kinds are three COLOURS.
 *
 * AND THE RADIUS DOUBLES PER ZOOM LEVEL, because a dot stands for a fixed piece of GROUND — the rule
 * `shared/map-beat/mount.mjs` makes binding on this type. Its consequence is worth reading twice: a
 * ground-scaled field is SCALE-INVARIANT, so zooming changes what is in frame and never what the map
 * claims. A dot pinned to a pixel radius would assert a different density at every zoom level.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WEB MERCATOR, AND WHAT IT COSTS THIS SUBJECT — WHICH IS NOT WHAT IT COSTS THE CHOROPLETH.
 *
 * A dot has no area of its own to be inflated, and the headline is a COUNT and a SUM, so neither the
 * sentence nor the marks are touched. What Mercator inflates is the GROUND UNDER the dots, and a dot
 * map is read as ink per ground: the north is drawn larger, the same dots spread over more page, and
 * the north therefore LOOKS sparser than it is. The runner measures both halves on this beat's own
 * frozen shapes and prints them on every render; the caveat carries the first pair in the reader's
 * own words. `camera.ts` — Lambert azimuthal equal-area, EPSG:3035 — stays in the beat as the camera
 * that MEASURES, and the runner prints it beside the one that draws.
 *
 * `types/dot-density.md`'s accessibility trap is met head on: the "one dot = …" line is drawn in the
 * legend at the same size as the rest of the key, never as a footer line, because without it the map
 * is texture rather than data.
 */

import {
  mix,
  adjustToContrast,
  contrast,
  NON_TEXT_CONTRAST_MIN,
} from "#shared/chart-beat/colour.mjs";
import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { controlChromeCss } from "../../skills/chart-web/assets/control-chrome.ts";
import {
  dotValueCss,
  dotValueKeyLinesForMarkup,
  dotValueNotesForMarkup,
  dotValueOptionsForMarkup,
  liveDotDensityCss,
  type LiveDotDensityDeclaration,
} from "../../skills/map-web/assets/live-dot-density.ts";

/** The scope every generated rule is written inside. */
const SCOPE = ".chart-figure";
/** The prefix every radio id carries. `chart-stack-` is the FORMAT'S DISCOVERY CONTRACT for a
 *  control that changes the picture and owes the reader a sentence — see `interaction-plan.ts`,
 *  `stackOptionSlugs` — not a copy-paste slip. */
export const DOT_ID_PREFIX = "chart-stack";
/** How long a field takes to give way to the next resolution, in ms. The same number the live plan
 *  is given, so the key and the map cross together rather than on two clocks. */
export const CHANGE_MS = 260;
/** How far apart two treatments have to stand before a reader can tell them apart across a map.
 *  Refused, not hoped for. */
const TONE_STEP_MIN = 1.2;
/** How much a pointed-at dot has to move off its own colour before it counts as answering. A DOSE IS
 *  SEARCHED, NEVER SET: a fixed dose was refused at 1,104:1 on nocturne, one beat over. */
const MARK_SEPARATION = 1.4;

export type CountryRow = {
  /** ISO A2, the key the live map's own outline layer joins MapTiler's Countries tiles on. */
  code: string;
  name: string;
  sites: string;
  capacity: string;
  /** How many dots this country gets, one entry per rule, in the rules' own order. */
  dots: { slug: string; text: string }[];
  /** What a pointer answers for the row. */
  detail: string;
};

export type KindRow = {
  label: string;
  /** The count under each rule: the payoff of the gesture, read straight off the legend. */
  counts: { slug: string; text: string }[];
};

/**
 * THE THREE TREATMENTS, DERIVED ONCE AND READ BY BOTH HALVES OF THE PAGE.
 *
 * Exported because the RENDERER needs the same colours the markup is drawn in: the live plan's
 * per-treatment paint expressions are built from them, and a second derivation is exactly the "two
 * derivations of one partition" this family's guards exist to refuse.
 *
 * MEASURED AGAINST THE LAND THE PLATE IS BAKED IN, never against the paper. What sits behind a dot
 * is `plateLand`, a step off the direction's ground toward its ink; the lightest treatment measured
 * against the GROUND reads comfortably clear and against the colour a reader actually sees it on can
 * be under the floor. That is the trap the brief names by hand.
 *
 * AND THE TWO NEUTRALS ARE A SPREAD, NOT TWO INDEPENDENT FLOORS. Two colours walked independently up
 * to the same floor against the same background come out IDENTICAL by construction — measured at
 * 1,023:1 on one beat and 1,000:1 on another. So the lighter neutral is found at the floor and the
 * darker one is then walked away from IT.
 */
export function dotTones({
  ground,
  accent,
  ink,
  plateLand,
}: {
  ground: string;
  accent: string;
  ink: string;
  plateLand: string;
}): { tones: string[]; activeTones: string[] } {
  const STEPS = 400;
  /** The lightest step off the ground toward the ink that a reader can still see on the plate's own
   *  land. Everything quiet on this map sits at or above it. */
  const lightest = (() => {
    for (let step = 0; step <= STEPS; step += 1) {
      const candidate = mix(ground, ink, step / STEPS);
      if (contrast(candidate, plateLand) >= NON_TEXT_CONTRAST_MIN)
        return candidate;
    }
    throw new Error(
      `no step off the ground ${ground} toward the ink ${ink} stands ${NON_TEXT_CONTRAST_MIN}:1 off ` +
        `the land ${plateLand} the plate is baked in — the quiet treatments would be invisible on ` +
        `the basemap, which on a dot map is the whole picture`,
    );
  })();
  /** The named kind takes the accent, which on this page is what the argument is drawn in, and it is
   *  the HEAVIEST of the three: the rare kind the headline is about may not be the faintest thing on
   *  the map. */
  const named = adjustToContrast(accent, plateLand, NON_TEXT_CONTRAST_MIN) ?? accent;
  /** THE SECOND NEUTRAL IS PLACED ON A LADDER, NOT AT A FLOOR — and that is a defect this beat found
   *  by looking at its own render. Walked independently up to the same floor against the same land,
   *  two neutrals come out ADJACENT by construction: measured at 1,211:1 on creme and rapport and
   *  1,203:1 on nocturne, which is two greys six per cent apart and one treatment wearing two names.
   *  It is the same shape as the "two colours pinned independently to one floor come out identical"
   *  the brief records elsewhere at 1,023:1 and 1,000:1.
   *
   *  So the three treatments STEP EVENLY IN CONTRAST AGAINST THE LAND THEY SIT ON, between the
   *  lightest a reader can still see and the accent the argument is drawn in — a geometric middle,
   *  the same construction the choropleth's own ramp uses. Monotone in lightness, so the order
   *  survives a monochrome print and a colour-vision deficiency. */
  const lo = contrast(lightest, plateLand);
  const hi = contrast(named, plateLand);
  if (!(hi > lo * TONE_STEP_MIN))
    throw new Error(
      `the accent ${named} stands ${hi.toFixed(3)}:1 off the land and the lightest legible neutral ` +
        `${lightest} stands ${lo.toFixed(3)}:1. The named kind would be no heavier than the quiet ` +
        `ones, and there would be no ladder for a third treatment to sit on.`,
    );
  const target = Math.sqrt(lo * hi);
  const heavier = (() => {
    for (let step = 0; step <= STEPS; step += 1) {
      const candidate = mix(ground, ink, step / STEPS);
      if (contrast(candidate, plateLand) >= target) return candidate;
    }
    throw new Error(
      `no neutral reaches ${target.toFixed(3)}:1 against the land ${plateLand}, so the three ` +
        `treatments cannot be spread across the range this page already uses`,
    );
  })();
  const ladder = [lightest, heavier, named];
  for (let i = 1; i < ladder.length; i += 1) {
    const step = contrast(ladder[i], ladder[i - 1]);
    if (step < TONE_STEP_MIN)
      throw new Error(
        `treatments ${i} and ${i + 1} are ${ladder[i - 1]} and ${ladder[i]}, which stand ` +
          `${step.toFixed(3)}:1 apart — under the ${TONE_STEP_MIN}:1 this beat asks of two kinds a ` +
          `reader has to tell apart in a field of thousands of one-pixel dots. Under it the rare ` +
          `kind this beat is about is findable by hue alone, and a reader with a colour-vision ` +
          `deficiency reads a single field.`,
      );
  }

  /** WHAT A POINTED-AT DOT BECOMES, SEARCHED OFF ITS OWN COLOUR. Not a fixed dose and not a filter:
   *  `brightness()` lightens on a light ground and on a dark one alike, and a fixed mix measured
   *  1,104:1 on nocturne one beat over. The dose is walked until the result stands `MARK_SEPARATION`
   *  from the colour it replaces AND still clears the non-text floor against the land under it. */
  const activeFor = (tone: string) => {
    for (let dose = 0.06; dose <= 0.94; dose += 0.02) {
      for (const toward of [ink, ground]) {
        const candidate = mix(tone, toward, dose);
        if (
          contrast(candidate, tone) >= MARK_SEPARATION &&
          contrast(candidate, plateLand) >= NON_TEXT_CONTRAST_MIN
        )
          return candidate;
      }
    }
    throw new Error(
      `no dose separates a pointed-at dot from its own colour ${tone} by ${MARK_SEPARATION}:1 while ` +
        `staying ${NON_TEXT_CONTRAST_MIN}:1 above the land ${plateLand}. A dot that answers by ` +
        `becoming a colour the reader cannot tell from the one beside it has not answered.`,
    );
  };

  return { tones: ladder, activeTones: ladder.map(activeFor) };
}

export function DirectedDotMapWeb({
  plate,
  live,
  livePlan,
  liveScript,
  liveHint,
  maplibreCss,
  maplibreJs,
  kinds,
  rows,
  tableCaption,
  columns,
  controlLabel,
  keyLabel,
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
  /** The frozen photograph of this page's own live map, already a data URI. */
  plate: string;
  live: LiveDotDensityDeclaration;
  livePlan: Record<string, unknown>;
  liveScript: string;
  liveHint: string;
  maplibreCss: string;
  maplibreJs: string;
  kinds: KindRow[];
  rows: CountryRow[];
  tableCaption: string;
  columns: string[];
  controlLabel: string;
  keyLabel: string;
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

  const options = dotValueOptionsForMarkup(live, DOT_ID_PREFIX);
  const keyLines = dotValueKeyLinesForMarkup(live);
  const notes = dotValueNotesForMarkup(live);
  const edge =
    adjustToContrast(mix(ground, ink, 0.35), ground, 1.6) ??
    mix(ground, ink, 0.35);

  const css = [
    controlChromeCss({
      scope: SCOPE,
      name: "stack",
      notes: { reserve: null, stacked: true },
    }),
    dotValueCss(live, { scope: SCOPE, idPrefix: DOT_ID_PREFIX }),
    liveDotDensityCss({ scope: SCOPE }),
    // The answer is five readings long and the format's box is 220 px wide.
    `#tooltip { max-width: 340px; }`,
    // THE "ONE DOT = …" LINE IS THE KEY, NOT A FOOTNOTE. `types/dot-density.md`: it is the single
    // piece of text that turns an impression of density into a number, "and it deserves the same
    // legibility as the headline, not footer-line treatment". So it is the first thing in the key
    // row, it carries the accent's own weight, and it is never smaller than the treatments beside it.
    `${SCOPE} .dot-key { font-weight: 600; color: ${ink}; }`,
    // THE TABLE IS THE GESTURE WITHOUT SCRIPT, so it is a real table and not a grid of divs: a
    // screen reader is given rows and columns, and the dot count in each row re-writes with the rule
    // exactly as the field itself does.
    `${SCOPE} .mw-table { width: 100%; border-collapse: collapse; margin: 6px 0 0; }`,
    `${SCOPE} .mw-table th, ${SCOPE} .mw-table td { text-align: left; padding: 2px 10px 2px 0; border-bottom: 1px solid ${grid}; white-space: nowrap; }`,
    `${SCOPE} .mw-table td.num { text-align: right; }`,
    // A ROW HEADING IS STILL A HEADING to a screen reader, and still a plain cell to the eye: the
    // browser's own bold on `th` would make forty-one country names the heaviest ink on the page.
    // Named literally, because the font machine cannot resolve `inherit` into a weight to cut.
    `${SCOPE} .mw-table th.rowhead { font-weight: ${regs.axis.fontWeight}; }`,
    `${SCOPE} .mw-table .dot-variants { justify-items: end; }`,
    `${SCOPE} details.mw-readings { margin: 8px 0 0; }`,
    `${SCOPE} details.mw-readings > summary { cursor: pointer; }`,
    `${SCOPE} .mw-scroll { max-height: 40vh; overflow: auto; }`,
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
      {/* MapLibre's own stylesheet, INLINED rather than linked: a `<link>` would trade the payload
          for a SECOND third-party host, and the honest reading of the live-map ruling keeps the
          count at one — api.maptiler.com. */}
      <style dangerouslySetInnerHTML={{ __html: maplibreCss }} />
      {/* This beat's own stylesheet, carried inside the figure it styles. */}
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
      </div>

      {/* THE KEY. What one dot is worth comes FIRST and in the page's own ink, then the treatments
          with the count each one holds under the rule in force — which is where the reader watches
          72 become 3 236 without a single row of the file changing. Every rule's wording for a cell
          lives in that one cell, stacked, so the row is as wide as the longest of them and choosing
          a resolution can never reflow the key or move the map. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0 14px",
          margin: "8px 0 4px",
          flex: "0 0 auto",
        }}
      >
        <span
          style={{
            ...regs.axis,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span className="dot-key">{keyLabel}</span>
          <span className="dot-variants">
            {keyLines.map((line) => (
              <span
                key={line.slug}
                className="dot-key"
                data-dot-variant={line.slug}
              >
                {line.text}
              </span>
            ))}
          </span>
        </span>
        {kinds.map((kind, i) => (
          <span
            key={kind.label}
            style={{
              ...regs.axis,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {/* ONE SIZE, like every dot on the map: the key may not draw a mark the field does not
                draw. 4px rather than the field's own sub-pixel radius because a legend swatch is a
                SAMPLE OF THE COLOUR, not a sample of the size — the size is written in the line
                beside it, in dots, which is the only place a quantity belongs. */}
            <svg
              width={10}
              height={10}
              aria-hidden="true"
              style={{ display: "block" }}
            >
              <circle cx={5} cy={5} r={4} fill={live.tones[i]} />
            </svg>
            <span>{kind.label}</span>
            <span className="dot-variants">
              {kind.counts.map((count) => (
                <span key={count.slug} data-dot-variant={count.slug}>
                  {count.text}
                </span>
              ))}
            </span>
          </span>
        ))}
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the resolution's full name where the pill carries its short one. */}
      <fieldset className="chart-stack">
        <legend>{controlLabel}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={DOT_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* WHAT THE CHOSEN RESOLUTION DOES TO THE READING. Every sentence sits in one grid cell, so the
          row is always as tall as the longest of them and choosing a rule never moves the map. The
          rule the page opens on gets none: the untouched field is the claim, not a comparison. */}
      <div className="stack-notes" role="status">
        {notes.map((note) => (
          <p
            data-stack-note={note.slug}
            key={note.slug}
            style={{ ...regs.annot, margin: 0 }}
          >
            {note.text}
          </p>
        ))}
      </div>

      <div
        className="chart-plot"
        style={{
          ["--y-gutter" as string]: "0px",
          ["--x-axis-h" as string]: "0px",
          // The aspect-ratio is the box's BASIS, not its law: the format makes `.chart-plot` the one
          // shrinkable item under the figure's `max-height: 100dvh`, so this box takes the width it
          // is given and the height the window leaves. The two layers then COVER it; neither is
          // stretched.
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="y-axis" />
        {/* THE FALLBACK, AND IT IS A PHOTOGRAPH OF THIS PAGE'S OWN LIVE MAP. Not the basemap: the
            dots are MapLibre layers now, so a plate baked from the style alone would picture a map
            with the study rubbed out — the defect the owner found on the pattern. There is no second
            plan and no second mount to disagree with the first, because it IS the page. */}
        <svg
          role="img"
          aria-label={title}
          xmlns="http://www.w3.org/2000/svg"
          className="chart"
          viewBox={`0 0 ${width} ${height}`}
          // COVER, never stretch and never letterbox: `slice` is SVG's `object-fit: cover`.
          preserveAspectRatio="xMidYMid slice"
          data-plate=""
        >
          <desc>{alt}</desc>
          <image
            href={plate}
            x={0}
            y={0}
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        </svg>
        {/* THE LIVE MAP'S BOX — empty and invisible until MapLibre says it has drawn. It takes the
            plot's whole track rather than the cell, which IS the ruling: a live map has no viewBox
            to be bound by, so it fills the width the figure has. */}
        <div className="map-layer" aria-hidden="true" />
        <div className="x-axis" />
      </div>

      <p className="chart-reading" style={{ ...regs.annot, margin: "8px 0 0" }}>
        {claimNote}
      </p>
      {/* SHOWN ONLY WHEN THE LIVE MAP IS UP. With no script, no key or no tiles, a sentence about
          dragging a map that cannot be dragged is a dead control, and this arrangement exists
          precisely not to ship one. */}
      <p
        className="live-hint"
        hidden
        style={{ ...regs.annot, margin: "4px 0 0" }}
      >
        {liveHint}
      </p>
      <p className="chart-reading" style={{ ...regs.body, margin: "6px 0 0" }}>
        {reading}
      </p>

      {/* EVERY COUNTRY, AS TEXT, WITH AND WITHOUT SCRIPT — and the dot-value gesture with it. Each
          row's dot count carries all three resolutions in one cell, so the control re-writes the
          whole table in pure CSS even when the field cannot be repainted. A native `<details>`: it
          opens with the keyboard, it opens with no script, and it is the one control on this page
          that was never at risk. */}
      <details className="mw-readings">
        <summary style={{ ...regs.axis }}>{tableCaption}</summary>
        <div className="mw-scroll">
          <table className="mw-table" style={{ ...regs.axis }}>
            <thead>
              <tr>
                {columns.map((column, i) => (
                  <th
                    key={column}
                    scope="col"
                    className={i > 0 ? "num" : undefined}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.code}
                  data-mark={row.code}
                  data-detail={row.detail}
                >
                  <th scope="row" className="rowhead">
                    {row.name}
                  </th>
                  <td className="num">{row.sites}</td>
                  <td className="num">{row.capacity}</td>
                  <td className="num">
                    <span className="dot-variants">
                      {row.dots.map((cell) => (
                        <span key={cell.slug} data-dot-variant={cell.slug}>
                          {cell.text}
                        </span>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      <p className="chart-source" style={{ ...regs.body, margin: "6px 0 0" }}>
        {source}
      </p>

      {/* THE PLAN THE LIVE LAYER READS, as `application/json` — which is also what the font machine
          reads when it decides which characters this page can display, so every piece an answer is
          joined from is cut into the embedded faces like every other word. */}
      <script
        id="mw-live-plan"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(livePlan) }}
      />
      <script dangerouslySetInnerHTML={{ __html: maplibreJs }} />
      <script dangerouslySetInnerHTML={{ __html: liveScript }} />
    </figure>
  );
}
