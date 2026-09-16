/**
 * Where Europe's largest low-carbon power station is — as a LIVE MapTiler map, with the one thing a
 * locator map has and no other type does: the READER'S OWN CHOICE OF HOW FAR TO STAND BACK.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WHY THE GESTURE IS THE REMOVE, AND WHY IT COULD NOT BE ANY OTHER TYPE'S.
 *
 * `skills/map-beat/references/types/locator.md` opens by saying this is "the map type with the least
 * to say: no magnitude, no rate, no gradient — just 'this place matters, here is where it is.'" It
 * is exactly that poverty that makes the gesture obvious once it is said out loud. A choropleth
 * hides where its classes were cut; a cartogram hides the geography it traded; a flow map hides
 * everything that is not the dominant flow. A locator hides NONE of those, because it has none of
 * them. What it hides is the only decision anybody made: **how far back the author stood.**
 *
 * That decision is the whole answer. This station's biggest neighbour is a 1 538 MW dam at 55 km, or
 * the country's other nuclear plant at 254 km, or a Russian 4 000 MW unit at 469 km, or Gravelines'
 * 5 460 MW at 2 367 km — and all four are true. Which one a reader ends up believing is decided by a
 * number nobody prints. A still can only stand at one distance and cannot say there were others;
 * the reader takes the framing as the map rather than as a choice, every single time.
 *
 * So the four removes are handed over, nearest first, and each one is an ANSWER rather than a
 * magnification: its own window, its own stated drawing rule, its own census of what the frame holds
 * and therefore what is not drawn, its own scale bar, its own sentence. The vocabulary is
 * `../../skills/map-web/assets/vantage.ts`, written for this type and refusing a ladder that does
 * not climb by at least a factor of two per rung.
 *
 * AND IT IS NOT MAPTILER'S ZOOM. The zoom, the drag, the wheel and the keyboard are all here — the
 * owner's ruling R1 — and the proportional-symbol beat is right that they are not an editorial
 * gesture: a zoom is continuous, anonymous, argues nothing, and changes neither what is drawn nor
 * what is written. Each remove changes the drawing rule, the legend line, the scale bar and the
 * sentence at the same moment as the camera. One is a magnifying glass; the other is an editor's
 * decision, offered four ways.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WHAT THE ARCHITECTURE COST THE GESTURE — AND ON THIS TYPE, NOTHING.
 *
 * `live-choropleth.ts` records honestly that its gesture's map half is script: no stylesheet can
 * reach a MapLibre fill layer, so with JavaScript off its map keeps one partition and the gesture
 * moves into the table. A CAMERA is a different object. A camera can be PHOTOGRAPHED — so this page
 * carries ONE FROZEN PICTURE PER REMOVE, each taken from this page's own live map at that remove,
 * and the four are swapped by pure CSS (`:has()` + `:checked`, generated at build time, zero
 * script). With JavaScript off, with no key, with no network, a reader gets four maps, four legend
 * lines, four scale bars and four sentences. What the live layer adds is the TRAVEL between them —
 * which is worth having (it is how a reader sees that the wider frame contains the narrower one) and
 * which is not the gesture.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * WEB MERCATOR, AND WHAT IT COSTS THIS TYPE — WHICH IS NOT WHAT IT COSTS A CHOROPLETH.
 *
 * The owner has chosen the flat map knowing the trade ("oui une carte MapLibre plate pas un globe"),
 * so this is a cost the page carries and therefore states. A choropleth is read by AREA, so Mercator
 * costs it areas, and its beat prints the inflated north. A LOCATOR IS READ BY DISTANCE, so Mercator
 * costs it the one instrument this type owes the reader: THE SCALE BAR. Ground scale runs as
 * `cos(latitude)`, so a bar true at the centre of the frame is wrong at its edges, and by how much
 * is a function of the remove. Measured on this beat's own four windows:
 *
 *   Le site 1,044 · La région 1,122 · Le voisinage 1,313 · L'Europe 1,534
 *
 * At the widest remove a 1 000 km bar laid across the middle of the frame is out by half as much
 * again against the top of it. The runner derives all four on every render, the standfirst carries
 * the published remove's and the widest, and the widest remove's own sentence repeats it where the
 * reader is looking at it; the headline counts MEGAWATTS, not kilometres, and survives untouched.
 *
 * AND THE BAR IS HALF LIVE AND HALF BAKED, which is the same bargain the names strike. Its LENGTH is
 * read off the camera on every move — two points a hundred pixels apart across the middle of the
 * canvas, unprojected, and the great-circle distance between them — so the distance it states stays
 * true while the reader zooms. Its WORDS are cut at build time, one per remove: a label assembled in
 * the browser is a label whose glyphs were never cut into this page's own embedded faces.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * THE TREATMENTS THIS BEAT SPENDS.
 *
 * `three-classes-of-place-three-treatments` — the subject, the other stations of the same kind, and
 * the settlements that let a reader place them. Three treatments, and a reader can tell which is
 * which without reading a key.
 * `the-subject-is-ringed-not-recoloured` — the accent already belongs to the station class, so the
 * subject is marked by a ring rather than by taking a second colour the page has not defined.
 * `the-basemap-gives-up-its-contrast` — a locator's only job is to say WHERE. The border and the
 * water are steps off the ground and nothing more.
 *
 * AND THE ONE THING THIS TYPE MAY NEVER DO: **no mark is sized.** `types/locator.md` names it as the
 * single defect of the form — "marker size gets used to imply importance … sneaks a false data
 * channel into a type that explicitly promised not to have one" — and `shared/map-beat/mount.mjs`
 * gives it its plan spelling, `radius: "fixed"`: a pin is not a measurement, so it holds the same
 * screen size at every zoom. Every circle here is a literal radius in CSS pixels, identical at every
 * zoom AND at every remove. Capacity decides only WHICH stations are drawn — the "declared
 * `priority` field" the type sheet asks for by name — and the page prints, at every remove, how many
 * the frame holds against how many it drew.
 *
 * THE SHAPE IS WHAT ANSWERS A POINTER, NEVER A DOT ON TOP OF IT — the owner's second arbitration,
 * and on this type it is doubly binding: a ring or a halo plaqued over a pin would be a second
 * circle of a different size on a map whose entire promise is that every circle is the same size.
 * The mark is re-coloured from its own fill, in a layer of its own so it is drawn above its
 * neighbours.
 *
 * THE WORDS INSIDE THE MAP ARE THE BEAT'S. No MapTiler `symbol` layer, not one: MapTiler answers 200
 * for a family it does not have and serves Noto Sans, and §2 of `references/map-plan.md` says the
 * beat writes every word inside the map. The names are an HTML overlay in the live box, re-projected
 * on every camera move — set in the direction's own register, cut into the page's embedded faces by
 * the font machine like every other word, and photographed into the frozen pictures, because those
 * are pictures of that box.
 */

import { webRegisters, figureVars } from "#shared/design-base/web.mjs";
import { controlChromeCss } from "../../skills/chart-web/assets/control-chrome.ts";
import {
  assertVantageDeclaration,
  vantageBarsForMarkup,
  vantageCss,
  vantageNotesForMarkup,
  vantageOptionsForMarkup,
  vantageRulesForMarkup,
  vantageSlugOf,
  type VantageDeclaration,
} from "../../skills/map-web/assets/vantage.ts";
import { liveLocatorCss } from "../../skills/map-web/assets/live-locator.ts";

/** The scope every generated rule is written inside. */
const SCOPE = ".chart-figure";
/** The prefix every radio id carries. `mw-stack-` is the FORMAT'S DISCOVERY CONTRACT for a control
 *  that changes the picture and owes the reader a sentence — `interaction-plan.ts` matches
 *  `(?:chart|mw)-stack-` and reads the sentence off `data-stack-note`. A third spelling would be
 *  invisible to the guard written to hold it. */
export const VANTAGE_ID_PREFIX = "mw-stack";
/** How long the camera takes to travel from one remove to the next, and how long the frozen pictures
 *  take to cross-fade — ONE number, given to the stylesheet and to the live plan, because two clocks
 *  on one gesture is two halves of one reading coming apart mid-travel. Honoured only under
 *  `no-preference`: the travel is the reading here, so a reader who asked for no motion gets the new
 *  framing instantly rather than not at all. */
export const CHANGE_MS = 520;

export type LocatorRow = {
  key: string;
  name: string;
  kind: string;
  distance: string;
  detail: string;
  /** The removes that draw this mark, by slug — the table's own copy of the framing, and the one
   *  `assertVantageReachesTheLayers` rebuilds the live plan's filters against. */
  removes: string[];
};

export type LocatorLabel = {
  key: string;
  text: string;
  lon: number;
  lat: number;
  removes: string[];
  emphasis: boolean;
};

export function DirectedLocatorWeb({
  plates,
  vantage,
  rows,
  labels,
  livePlan,
  liveScript,
  liveHint,
  maplibreCss,
  maplibreJs,
  tableCaption,
  columns,
  drawnWord,
  outOfFrameWord,
  aspect,
  size,
  title,
  eyebrow,
  caveat,
  source,
  alt,
  reading,
  claimNote,
  kinds,
  direction,
  ground,
  accent,
  ink,
  muted,
  grid,
}: {
  /** One frozen picture per remove, by slug, already a data URI. */
  plates: { slug: string; href: string }[];
  vantage: VantageDeclaration;
  rows: LocatorRow[];
  labels: LocatorLabel[];
  livePlan: Record<string, unknown>;
  liveScript: string;
  liveHint: string;
  maplibreCss: string;
  maplibreJs: string;
  tableCaption: string;
  columns: string[];
  drawnWord: string;
  outOfFrameWord: string;
  aspect: number;
  size: number;
  title: string;
  eyebrow: string;
  caveat: string;
  source: string;
  alt: string;
  reading: string;
  claimNote: string;
  kinds: { label: string; fill: string; ring: string | null; r: number }[];
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

  assertVantageDeclaration(vantage);
  const options = vantageOptionsForMarkup(vantage, VANTAGE_ID_PREFIX);
  const notes = vantageNotesForMarkup(vantage);
  const rules = vantageRulesForMarkup(vantage);
  const bars = vantageBarsForMarkup(vantage);
  const defaultSlug = vantageSlugOf(vantage.defaultKey);

  const css = [
    controlChromeCss({
      scope: SCOPE,
      name: "vantage",
    }),
    vantageCss(vantage, {
      scope: SCOPE,
      idPrefix: VANTAGE_ID_PREFIX,
      changeMs: CHANGE_MS,
    }),
    liveLocatorCss({ scope: SCOPE }),
    // The answer is four readings long and the format's box is 220 px wide.
    `#tooltip { max-width: 320px; }`,
    // THE TABLE IS THE NON-VISUAL ROUTE TO A SPATIAL THING, and it is a real table rather than a
    // grid of divs: a map is spatial and a screen reader has no spatial access, so the rows — name,
    // kind, distance, and whether the current remove draws it — are the same content in an order an
    // eye cannot impose on the marks.
    `${SCOPE} .mw-table { width: 100%; border-collapse: collapse; margin: 6px 0 0; }`,
    `${SCOPE} .mw-table th, ${SCOPE} .mw-table td { text-align: left; padding: 2px 10px 2px 0; border-bottom: 1px solid ${grid}; white-space: nowrap; }`,
    `${SCOPE} .mw-table td.num { text-align: right; }`,
    // A ROW HEADING IS STILL A HEADING to a screen reader, and still a plain cell to the eye: the
    // browser's own bold on `th` would make every place name the heaviest ink on the page. Named
    // literally, because the font machine cannot resolve `inherit` into a weight to cut.
    `${SCOPE} .mw-table th.rowhead { font-weight: ${regs.axis.fontWeight}; }`,
    // THE ROW FOLLOWS THE REMOVE, IN WORDS, IN ITS OWN CELL — never by leaving the table. A row that
    // disappeared would take its reading with it, and the reading is the point of the table.
    `${SCOPE} .mw-at { display: grid; align-items: center; }`,
    `${SCOPE} .mw-at > span { grid-area: 1 / 1; visibility: hidden; opacity: 0; }`,
    `${SCOPE} .mw-at > span[data-vantage-at="${defaultSlug}"] { visibility: visible; opacity: 1; }`,
    ...vantage.removes.map((remove) => {
      const slug = vantageSlugOf(remove.key);
      return (
        `${SCOPE}:has(#${VANTAGE_ID_PREFIX}-${slug}:checked) .mw-at > span { visibility: hidden; opacity: 0; }\n` +
        `${SCOPE}:has(#${VANTAGE_ID_PREFIX}-${slug}:checked) .mw-at > span[data-vantage-at="${slug}"] { visibility: visible; opacity: 1; }`
      );
    }),
    `${SCOPE} .mw-out { color: ${muted}; }`,
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

      {/* THE KEY IS THREE TREATMENTS AND THEIR OWN SHAPES, ALL THE SAME SIZE THEY ARE DRAWN ON THE
          MAP — which is the key's real job on this type: a reader's first instinct on a map of
          circles is to read area as value, and the surest denial is a key where nothing differs by
          size. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0 14px",
          margin: "8px 0 2px",
          flex: "0 0 auto",
        }}
      >
        {kinds.map((kind) => (
          <span
            key={kind.label}
            style={{
              ...regs.axis,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg
              width={18}
              height={18}
              aria-hidden="true"
              style={{ display: "block" }}
            >
              <circle
                cx={9}
                cy={9}
                r={kind.r}
                fill={kind.fill}
                stroke={kind.ring ?? "none"}
                strokeWidth={kind.ring ? 2 : 0}
              />
            </svg>
            {kind.label}
          </span>
        ))}
      </div>

      {/* THE CONTROL. Native radios in a real `<fieldset>` with a `<legend>`: a radio group to the
          keyboard and to a screen reader before this page's stylesheet does anything to it, and
          `aria-label` carries the remove's full name where the pill carries its short one. In
          declaration order, which is nearest first — a reader who starts at the far end has already
          lost the subject. */}
      <fieldset className="chart-vantage">
        <legend>{vantage.label}</legend>
        <div className="options">
          {options.map((option) => (
            <label key={option.id}>
              <input
                id={option.id}
                type="radio"
                name={VANTAGE_ID_PREFIX}
                value={option.slug}
                aria-label={option.announce}
                defaultChecked={option.isDefault}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* THE LEGEND LINE OF THIS GESTURE, AND IT IS THIS TYPE'S OWN: the census. A reader looking at
          twelve markers has no way to know the frame holds a hundred and seventy-seven — so every
          remove prints what it kept out of what it framed. Every remove's line sits in ONE grid
          cell, so the row is as tall and as wide as the longest of them at the reader's own width
          and choosing a remove never moves the map. */}
      <p className="vantage-rules" style={{ ...regs.annot, margin: "4px 0 0" }}>
        {rules.map((rule) => (
          <span key={rule.slug} data-vantage-rule={rule.slug}>
            {rule.text}
          </span>
        ))}
      </p>

      {/* WHAT THE CHOSEN REMOVE MAKES TRUE. Every sentence sits in one grid cell, so the row is
          always as tall as the longest of them and choosing a remove never moves the map. The
          published remove gets none: the untouched map is the claim, not a comparison. */}
      <div className="vantage-notes" role="status">
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
          // is given and the height the window leaves — exactly what the scrolly's stage does. The
          // layers then COVER it; none of them is stretched.
          aspectRatio: `${width} / ${height}`,
        }}
      >
        <div className="y-axis" />
        {/* THE FALLBACK, AND IT CARRIES THE WHOLE GESTURE. One `<svg class="chart">` per remove,
            each holding that remove's own frozen picture — photographed from THIS page's live map
            at THAT remove, names and scale bar included, because the photograph is of the live box
            and the names are inside it. All four declare the same viewBox, because all four were
            taken of the same box: `plotViewBoxOf` refuses a beat that draws two, and rightly — a
            control that changed the cell's ratio would reshape the plot under the reader rather
            than answer a question about it. */}
        {plates.map((plate) => (
          <svg
            key={plate.slug}
            role="img"
            aria-label={title}
            xmlns="http://www.w3.org/2000/svg"
            className="chart"
            viewBox={`0 0 ${width} ${height}`}
            // COVER, never stretch and never letterbox: `slice` is SVG's `object-fit: cover`.
            preserveAspectRatio="xMidYMid slice"
            data-plate=""
            data-vantage-plate={plate.slug}
          >
            <desc>{alt}</desc>
            <image
              href={plate.href}
              x={0}
              y={0}
              width={width}
              height={height}
              preserveAspectRatio="none"
            />
          </svg>
        ))}
        {/* THE LIVE MAP'S BOX — empty and invisible until MapLibre says it has drawn. It takes the
            plot's whole track rather than the cell, which IS the ruling: a live map has no viewBox
            to be bound by, so it fills the width the figure has. The names and the scale bar live
            INSIDE it, so they travel with the camera and are photographed with it. */}
        <div className="map-layer" aria-hidden="true">
          <div className="mw-overlay">
            {labels.map((label) => (
              <span
                key={label.key}
                className="mw-label"
                data-at={`${label.lon},${label.lat}`}
                data-vantage={label.removes.join(" ")}
                style={{
                  ...(label.emphasis ? regs.value : regs.axis),
                  color: ink,
                  fontWeight: label.emphasis ? 700 : 500,
                  paddingLeft: 12,
                  marginTop: -8,
                }}
              >
                {label.text}
              </span>
            ))}
            {/* THE SCALE BAR: one per remove, stacked in one cell, the right one revealed by the
                same CSS that reveals its picture. Its WORDS are baked — a label assembled in the
                browser is a string whose glyphs were never cut into this page's embedded faces —
                and its LENGTH is set from the live camera, so the distance it states stays true
                while the reader zooms. */}
            <div className="mw-bars" style={{ color: ink }}>
              {bars.map((bar) => (
                <span
                  key={bar.slug}
                  className="mw-bar"
                  data-vantage-bar={bar.slug}
                >
                  <span className="mw-bar-line" data-km={bar.km} />
                  <span
                    style={{ ...regs.axis, color: ink }}
                  >{`${bar.km} km`}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
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

      {/* EVERY MARK, AS TEXT, WITH AND WITHOUT SCRIPT — and the gesture with it. The last cell says,
          for the remove in force, whether this mark is on the map or outside its frame, and it says
          it in pure CSS. A native `<details>`: it opens with the keyboard, it opens with no script,
          and it is the one control on this page that was never at risk. */}
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
                    className={i === 2 ? "num" : undefined}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  data-mark={row.key}
                  data-detail={row.detail}
                  data-vantage={row.removes.join(" ")}
                >
                  <th scope="row" className="rowhead">
                    {row.name}
                  </th>
                  <td>{row.kind}</td>
                  <td className="num">{row.distance}</td>
                  <td>
                    <span className="mw-at">
                      {vantage.removes.map((remove) => {
                        const slug = vantageSlugOf(remove.key);
                        const drawn = row.removes.includes(slug);
                        return (
                          <span
                            key={slug}
                            data-vantage-at={slug}
                            className={drawn ? undefined : "mw-out"}
                          >
                            {drawn ? drawnWord : outOfFrameWord}
                          </span>
                        );
                      })}
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
          reads when it decides which characters this page can display, so MapLibre's own control
          names are cut into the embedded faces like every other word. */}
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
