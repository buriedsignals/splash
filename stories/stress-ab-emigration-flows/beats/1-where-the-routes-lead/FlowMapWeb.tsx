/**
 * THE BEAT. Eight recorded emigration routes out of Portugal, drawn as ribbons over a baked dark
 * plate, with every reading a reader could want on demand and the two readings the takeaway makes
 * already on the page without asking for anything.
 *
 * It is written against `map-web`'s own composition rules and reuses that format's furniture
 * classes verbatim (`.map-web`, `.mw-stage`, `.mw-viewport`, `.mw-fallback`, `.mw-overlay`, `.pt`,
 * `.point-label`, `.mw-legend*`, `.mw-title`, `.mw-source`, `.mw-subject`, `.mw-caveat`), because
 * `renderMapWeb`'s own `buildCss` is what styles them and this beat does not get to invent a
 * second layout for the same format. What it DOES add is the one thing that format's CSS has no
 * rule for — a WIDTH legend and a ribbon — in a `<style>` element of its own, below.
 *
 * SVG carries geometry only; every piece of text is HTML over it
 * (`map-web/references/map-web-discipline.md`, "Text is HTML, not SVG"), so type stays one fixed
 * CSS size at every container width while the map stretches.
 */
import { createElement, Fragment } from "react";
import {
  angleAt,
  bowsFor,
  controlPoint,
  drawOrder,
  niceWidthReferences,
  people,
  pointAt,
  readingOrder,
  ribbonPath,
  shareOf,
  slugOf,
  widthScale,
} from "./geo-flow.ts";

/** The widest ribbon, in the plate's own frame units — so it scales with the fluid SVG rather than
 *  holding a fixed pixel size the way every piece of TEXT on this page deliberately does. */
export const MAX_RIBBON_UNITS = 30;
/** The fallback bow, for a route no group assigns one to. The real per-route value comes from
 *  `geo-flow.ts`'s `bowsFor`, which fans the ribbons that share a destination — read its own note
 *  for what that device is and, just as importantly, what it does not encode. */
export const BOW = 0.14;
/** The casing: how much wider the ground-coloured stroke under each ribbon is, in frame units. A
 *  crossing then reads as one ribbon passing OVER another. Translucent ribbons were the alternative
 *  and are refused: overlapping alpha makes a third, darker value at every crossing, and on a beat
 *  whose only encoding is ink this reads as a quantity that is not there. */
export const CASING_UNITS = 5;
/** The per-mark hit target's floor, in fixed CSS pixels — never a frame-unit size, which would
 *  shrink to a few physical pixels at 375px wide (`MapWebSeed.tsx`'s own `HIT_TARGET_PX` note). */
export const HIT_TARGET_PX = 30;
/** The legend's own widest key, in fixed CSS pixels — deliberately NOT derived from the map's own
 *  container-scaled ribbon width, for the same reason the symbol format fixes its swatch size. */
export const LEGEND_MAX_WIDTH_PX = 20;
/** The arrowhead's own length in frame units, floor and ceiling. It grows with the ribbon so a thin
 *  one still carries a visible direction, and it STOPS growing: at a plain `width * 1.5` the widest
 *  ribbon here grew a 45-unit head that read as a mark in its own right rather than as the end of a
 *  line, and covered the destination it was pointing at. */
export const ARROW_MIN_UNITS = 9;
export const ARROW_MAX_UNITS = 21;

const DEST_MARK_UNITS = 5;
/** The transparent over-stroke every ribbon carries is its own drawn width plus its casing, with
 *  this FLOOR in frame units so the thinnest ribbon (1,900 people, 3.1 units) is still findable.
 *
 *  It was 16 and that was too fat to be honest: Aveiro-Paris is a 3.1-unit ribbon and its 16-unit
 *  invisible band sat over the whole length of Porto-Paris, a ribbon five times wider, so the
 *  pointer answered "1,900" everywhere along a route carrying 9,600. Driven at all four viewports
 *  before this number moved. A hit surface may be generous; it may not be so generous that it
 *  claims its neighbour's ink. */
const HIT_STROKE_UNITS = 10;
/** The transparent disc every destination carries, in frame units. */
const DEST_HIT_UNITS = 13;

type Place = { key: string; name: string; lon: number; lat: number; px: number; py: number; role: string; value: number };
type Route = { key: string; origin: string; destination: string; value: number };
type Geometry = { frame: { width: number; height: number }; points: Place[] };

export type FlowProps = {
  title: string;
  source: string;
  subject: string;
  caveat: string;
  language: string;
  ground: string;
  accent: string;
  accents: string[];
  ink: string;
  muted: string;
  plate: string;
  geometry: Geometry;
  routes: Route[];
  destinations: { key: string; name: string; value: number; routes: number }[];
  total: number;
  subjectKey: string;
  /** The one ribbon whose figure is written ON the map — the takeaway names it, so a reader never
   *  has to hover to find the claim the title makes. */
  annotateRouteKey: string;
  labelOffsets: Record<string, [number, number]>;
};

const pct = (n: number, of: number) => `${(100 * n) / of}%`;

/** Every place, by key — the ribbons are a table of NAMES and the plate is a table of POINTS, and
 *  this is the one place they are joined. A route naming a place the plate never projected is a
 *  join failure and says so, rather than drawing a ribbon from `undefined`. */
function placeIndex(points: Place[]): Map<string, Place> {
  return new Map(points.map((p) => [p.name, p]));
}

export function FlowMapWeb(props: FlowProps) {
  const { frame } = props.geometry;
  const at = placeIndex(props.geometry.points);
  const resolve = (name: string): Place => {
    const place = at.get(name);
    if (!place) throw new Error(`the route table names "${name}" and the projected plate does not carry it`);
    return place;
  };

  const maxValue = Math.max(...props.routes.map((r) => r.value));
  const widthOf = widthScale(maxValue, MAX_RIBBON_UNITS);
  const bows = bowsFor(props.routes);
  const drawn = drawOrder(props.routes).map((route) => {
    const from = resolve(route.origin);
    const to = resolve(route.destination);
    const a = { x: from.px, y: from.py };
    const b = { x: to.px, y: to.py };
    const { d, control } = ribbonPath(a, b, bows.get(route.key) ?? BOW);
    return {
      route,
      d,
      width: widthOf(route.value),
      mid: pointAt(a, control, b, 0.5),
      tip: pointAt(a, control, b, 0.94),
      angle: angleAt(a, control, b, 0.94),
    };
  });
  const byKey = new Map(drawn.map((r) => [r.route.key, r]));

  const detailOf = (route: Route) => routeDetail(route, props.language, props.total);
  const destinationDetail = (d: { name: string; value: number; routes: number }) =>
    arrivalDetail(d, props.language, props.total);

  const legendValues = niceWidthReferences(maxValue);
  const legendWidth = (value: number) => Math.max(1, (value / maxValue) * LEGEND_MAX_WIDTH_PX);

  const destinationPlaces = props.destinations.map((d) => ({ ...d, place: resolve(d.name) }));
  const origins = props.geometry.points.filter((p) => p.role === "origin");

  return createElement(Fragment, null,
    createElement("style", { dangerouslySetInnerHTML: { __html: BEAT_CSS } }),
    createElement("div", { className: "map-web" },
      createElement("h1", { className: "mw-title" }, props.title),
      createElement("p", { className: "mw-source" }, props.source),

      createElement("div", { className: "mw-stage" },
        // THE ASPECT IS AN INLINE STYLE, AND IT HAS TO BE. `renderMapWeb`'s own `buildCss` uses
        // the plate's aspect only inside the viewport's WIDTH `min()`; the box's HEIGHT comes from
        // this attribute alone, which lives in `MapWebSeed.tsx` — the file a beat is told to
        // replace. Leave it out and every child is `position:absolute; inset:0`, so the viewport
        // has no content to be tall for: measured at 1600x900 before this line existed, the map
        // rendered 451 x 2 CSS pixels and nothing anywhere threw.
        createElement("div", {
          className: "mw-viewport",
          style: { aspectRatio: `${frame.width} / ${frame.height}` },
        },
          // THE ID IS `mw-map` AND THE CLASS IS `mw-live-map`, AND THEY ARE NOT THE SAME WORD.
          // `live-map.mjs`'s own `initLiveMap` does `getElementById("mw-map")` and RETURNS NULL if
          // it is not there — no throw, no console message. Written as `id="mw-live-map"` (the
          // obvious guess, since that is the class) this page shipped with MapLibre parsed, the
          // plan JSON present, the key substituted, and zero network requests: the reader got the
          // fallback plate forever and nothing anywhere said why. Found by counting the delivered
          // page's own requests in a real browser, not by reading it.
          createElement("div", { className: "mw-live-map", id: "mw-map" }),
          createElement("div", { className: "mw-fallback", id: "mw-fallback" },
            createElement("svg", {
              className: "map",
              viewBox: `0 0 ${frame.width} ${frame.height}`,
              role: "img",
              "aria-label": `${props.title}. ${props.subject}`,
              preserveAspectRatio: "xMidYMid meet",
            },
              createElement("defs", null,
                createElement("clipPath", { id: "mw-frame" },
                  createElement("rect", { x: 0, y: 0, width: frame.width, height: frame.height }))),
              createElement("g", { clipPath: "url(#mw-frame)" },
                createElement("image", {
                  href: props.plate, x: 0, y: 0, width: frame.width, height: frame.height,
                  preserveAspectRatio: "xMidYMid meet",
                }),
                // The casings first, ALL of them, then the ribbons. Drawn ribbon-by-ribbon
                // (casing, ribbon, casing, ribbon) a wide ribbon's casing would erase the thin
                // ribbon already painted under it — measured on Aveiro-Paris, which disappeared
                // under Lisboa-Paris's casing for exactly that reason.
                drawn.map((r) => createElement("path", {
                  key: `casing-${r.route.key}`, d: r.d, fill: "none",
                  stroke: props.ground, strokeWidth: r.width + CASING_UNITS,
                  strokeLinecap: "round", strokeOpacity: 0.9,
                })),
                drawn.map((r) => createElement("path", {
                  key: `ribbon-${r.route.key}`, d: r.d, fill: "none",
                  stroke: props.accent, strokeWidth: r.width, strokeLinecap: "round",
                  "data-key": r.route.key, "data-role": "ribbon",
                })),
                // The arrowhead. A ribbon without one is a LINK, and this extract records a
                // departure — see the brief, "Direction is data".
                drawn.map((r) => createElement("path", {
                  key: `head-${r.route.key}`,
                  d: arrowHead(Math.min(ARROW_MAX_UNITS, Math.max(ARROW_MIN_UNITS, r.width * 0.85 + 6))),
                  fill: props.accent,
                  transform: `translate(${r.tip.x} ${r.tip.y}) rotate(${r.angle})`,
                  "data-key": r.route.key, "data-role": "arrow",
                })),
                // The destination marks: a different KIND of object from a ribbon (a place, not a
                // movement), in the second recorded house accent, at ONE size — they are not part
                // of the volume comparison and must not be read as if they were.
                destinationPlaces.map((d) => createElement("circle", {
                  key: `dest-${d.key}`, cx: d.place.px, cy: d.place.py, r: DEST_MARK_UNITS,
                  fill: props.ground, stroke: props.accents[1] ?? props.accent, strokeWidth: 3,
                })),
                // THE HIT SURFACE IS THE RIBBON ITSELF, NOT A DISC AT ITS MIDPOINT.
                //
                // A midpoint button is the symbol format's answer because a symbol IS a disc. A
                // ribbon is a long curve, and thirteen fixed-size discs over eight curves that
                // converge on five cities overlap: driven at 1600x900, hovering Porto-Paris's own
                // centre returned AVEIRO-Paris's reading, and at 375 three of the eight answered
                // for a different route. A wrong number under the pointer is worse than no number.
                //
                // So every ribbon carries a transparent over-stroke of its own, hit-tested on the
                // STROKE, and the whole length of a ribbon answers for that ribbon. Each one also
                // carries a native `title`, so a pointer gets a reading with this page's script
                // absent entirely. The `.pt` buttons stay in the DOM, still Tab-reachable and still
                // carrying their own `aria-label` and `data-detail` — only their pointer-events go,
                // which is exactly what this format already does to them when the live map boots.
                drawn.map((r) => createElement("path", {
                  key: `hit-${r.route.key}`, d: r.d, fill: "none",
                  stroke: "rgba(0,0,0,0)",
                  strokeWidth: Math.max(r.width + CASING_UNITS, HIT_STROKE_UNITS),
                  strokeLinecap: "round",
                  className: "fm-hit", "data-key": r.route.key,
                }, createElement("title", null, detailOf(r.route)))),
                // The destination discs sit ABOVE the ribbon hits, so a city answers for itself
                // where a ribbon happens to arrive at it.
                destinationPlaces.map((d) => createElement("circle", {
                  key: `hit-${d.key}`, cx: d.place.px, cy: d.place.py, r: DEST_HIT_UNITS,
                  fill: "rgba(0,0,0,0)", className: "fm-hit", "data-key": d.key,
                }, createElement("title", null, destinationDetail(d)))),
              ),
            ),
          ),

          createElement("div", { className: "mw-overlay" },
            // THE SIX ORIGINS ARE ONE BLOCK, ANCHORED ONCE.
            //
            // Six names on six dots inside 190 frame units of each other cannot be separated by
            // per-place nudges: a nudge is a fixed number of CSS pixels and the dot it hangs off is
            // a percentage of a frame that scales, so any tuning holds at exactly one container
            // width. Measured: six hand-tuned offsets that read at 1600x900 printed "Coimbra" over
            // "Lisboa" the moment the map was 489 px instead of 585.
            //
            // So the cluster gets ONE anchor — its own centroid — and the six names stack beside it
            // in north-to-south order, laid out by normal flow. They cannot collide at any width,
            // by construction. What is given up is that a name no longer points at its own dot;
            // the exact place of every origin is in that route's tooltip and in the route table
            // below, and the ORDER on the map is the order on the ground.
            createElement("div", { className: "fm-origins", style: originsAnchor(origins, frame) },
              [...origins].sort((a, b) => a.py - b.py).map((p) => createElement("span", {
                key: `label-${p.key}`, className: "point-label",
              }, p.name))),
            // AND THE SAME SIX NAMES AGAIN, ONE PER POINT, FOR THE LIVE LAYER ONLY.
            //
            // The block above is the right answer for a picture that cannot move: it cannot
            // collide at any width. It is the WRONG answer for a map that can — one absolutely
            // positioned block has no anchor for `reposition` to follow, so it would sit still over
            // the Atlantic while the reader panned Portugal away from under it, which is a name
            // saying a city is somewhere it is not. Live, each origin gets its own label at its own
            // point, and the reader who finds six names crowded has the zoom that the block never
            // had. Exactly one of the two systems is visible at a time, by one CSS rule.
            origins.map((p) => createElement("span", {
              key: `live-label-${p.key}`, className: "point-label fm-live-only", "data-key": p.key,
              style: { left: pct(p.px, frame.width), top: pct(p.py, frame.height) },
            }, p.name)),
            // ANCHORED TO THE FRAME'S OWN LEFT EDGE, at the annotated ribbon's own height — not to
            // the ribbon's midpoint with a fixed pixel offset. The offset version read correctly at
            // 1600 and was cut in half by the viewport edge at 375, because the offset is pixels
            // and the frame is a percentage. The Atlantic is empty at every width, so the left edge
            // is a place this can always stand.
            createElement("span", {
              className: "point-label subject fm-annotation",
              // The live plan carries an anchor for every ROUTE (its own midpoint), so live this
              // annotation rides the ribbon it names instead of the frame's left edge.
              "data-key": props.annotateRouteKey,
              style: { left: "1.5%", top: pct(byKey.get(props.annotateRouteKey)!.mid.y, frame.height) },
            }, `${routeLabel(props.routes, props.annotateRouteKey)} ${people(byKey.get(props.annotateRouteKey)!.route.value, props.language)}`),
            destinationPlaces.map((d) => createElement("span", {
              key: `label-${d.key}`,
              className: `point-label${d.key === props.subjectKey ? " subject" : ""}`,
              // `data-key` is what `live-map.mjs`'s `reposition` looks a label's own anchor up by.
              // Without it a label keeps the percentage it was SSR'd with while the camera moves
              // under it — a name that says a city is somewhere it is not, the moment a reader pans.
              "data-key": d.key,
              style: labelStyle(d.place, frame, props.labelOffsets),
            },
              createElement("span", { className: "fm-dest-name" }, d.name),
              createElement("span", { className: "fm-dest-value" }, ` ${people(d.value, props.language)}`))),

            // ONE HIT TARGET PER ROUTE, at its own ribbon's midpoint, and one per destination.
            // Keyboard order is the reading order the table below uses, so a reader moving between
            // the two never has to re-learn where they are.
            readingOrder(props.routes).map((route) => {
              const r = byKey.get(route.key)!;
              return createElement("button", {
                key: `pt-${route.key}`, type: "button", className: "pt pt-route",
                "data-key": route.key,
                "data-detail": detailOf(route),
                title: detailOf(route),
                "aria-label": detailOf(route),
                style: { left: pct(r.mid.x, frame.width), top: pct(r.mid.y, frame.height) },
              });
            }),
            destinationPlaces.map((d) => createElement("button", {
              key: `pt-${d.key}`, type: "button", className: "pt pt-place",
              "data-key": d.key,
              "data-detail": destinationDetail(d),
              title: destinationDetail(d),
              "aria-label": destinationDetail(d),
              style: { left: pct(d.place.px, frame.width), top: pct(d.place.py, frame.height) },
            })),
          ),
        ),
      ),

      // THE LEGEND, in fixed CSS pixels. A width legend, not a radius one: the unit word is spent
      // once here rather than repeated per key.
      createElement("div", { className: "mw-legend" },
        createElement("p", { className: "mw-legend-caption" }, "Ribbon width = people recorded on that route in 2025"),
        createElement("div", { className: "fm-legend-keys" },
          legendValues.map((value) => createElement("div", { key: value, className: "fm-legend-key" },
            createElement("span", {
              className: "fm-legend-bar",
              style: { height: `${legendWidth(value)}px`, background: props.accent },
            }),
            createElement("span", { className: "mw-legend-value" }, people(value, props.language)))))),

      createElement("p", { className: "mw-subject" }, props.subject),

      createElement("p", { className: "mw-caveat" }, props.caveat),
    ),
    createElement("script", { dangerouslySetInnerHTML: { __html: HIT_SCRIPT } }),
  );
}

/**
 * ONE SENTENCE PER FACT, WRITTEN ONCE. The ribbon's own `data-detail` (what a reader gets on hover,
 * on tap and on focus) and the table cell that has to carry the same fact are the same string built
 * by the same function — never two phrasings of one number, which is how a table comes to disagree
 * with the picture above it. `map-web`'s own `tableCarriesTheMarks` compares the two verbatim.
 */
export function routeDetail(route: any, language: string, total: number) {
  return `${route.origin} to ${route.destination}: ${people(route.value, language)} people, ${shareOf(route.value, total)}% of the eight recorded routes`;
}

/** The same, for a destination: a number no single ribbon can carry, because it is a sum of them. */
export function arrivalDetail(d: { name: string; value: number; routes: number }, language: string, total: number) {
  return `${d.name}: ${people(d.value, language)} people arriving on ${d.routes} of the eight recorded routes, ${shareOf(d.value, total)}% of them`;
}

/**
 * THE ONE TABLE THIS PAGE DISCLOSES, and it carries BOTH readings.
 *
 * Eight routes, one row each, and each row also names the total arriving at that route's own
 * destination — a number no single ribbon can carry, because it is a sum of ribbons. The
 * destination total repeats across the rows that share a destination, which is what the data is:
 * three of these rows end in Paris and all three report the same 23,600.
 *
 * WHY ONE TABLE AND NOT TWO. The destination reading used to render as a SECOND table, expanded, in
 * the composition. Two independent guards measured the same five rows: `fills-its-frame` failed at
 * 16.6% and 14.8% against a 17.9% floor on the first render of this page (that table was the only
 * fault), and `the-value-table-is-collapsed` counted it as a value table a reader meets before
 * asking for it. The argument itself is not behind anything — the `mw-subject` line above the map
 * states it in words, "Paris still takes more than London — 23,600 against 21,200 — because three
 * routes end there". What is disclosed is the full breakdown, which is second-channel material.
 *
 * THE CELLS CARRY THE PICTURE'S OWN WORDS, not a paraphrase of them: `map-web`'s
 * `tableCarriesTheMarks` compares each mark's `data-detail` against the table, and this beat draws
 * THIRTEEN marks — eight ribbons and five destination points. One table has to answer for all
 * thirteen, so each row spells out its route's share and its destination's whole sentence rather
 * than leaving either to be inferred from a column header.
 */
export function RouteTable({ points, language = "en", total = 0, destinations = [] }: { points: any[]; language?: string; total?: number; destinations?: any[] }) {
  const rows = readingOrder(points as any);
  const arrivalsByName = new Map(destinations.map((d: any) => [d.name, d]));
  return createElement("table", { className: "region-table" },
    createElement("caption", null, "Every recorded route, largest first, with the total arriving at each destination"),
    createElement("thead", null, createElement("tr", null,
      createElement("th", { scope: "col" }, "Route"),
      createElement("th", { scope: "col" }, "People"),
      createElement("th", { scope: "col" }, "Share"),
      createElement("th", { scope: "col" }, "Everyone arriving at that destination"))),
    createElement("tbody", null, rows.map((row: any) => {
      const arrival = arrivalsByName.get(row.destination);
      return createElement("tr", { key: row.key },
        createElement("th", { scope: "row" }, `${row.origin} to ${row.destination}`),
        createElement("td", null, `${people(row.value, language)} people`),
        createElement("td", null, total ? `${shareOf(row.value, total)}% of the eight recorded routes` : "—"),
        createElement("td", null, arrival ? arrivalDetail(arrival, language, total) : "—"));
    })));
}

/** A triangle whose TIP is at the origin and which points along +x, so one `rotate()` by the
 *  ribbon's own tangent angle aims it along the curve rather than along the chord. */
function arrowHead(size: number): string {
  const h = size * 0.62;
  return `M 0 0 L ${-size} ${-h} L ${-size} ${h} Z`;
}

/** A label's own placement, as a percentage of the frame, plus this beat's own hand-set offset in
 *  fixed CSS pixels. The offsets are the composition — six Portuguese cities inside 120 frame units
 *  of each other cannot all hang in the same direction — and they are DECLARED per place in the
 *  runner rather than derived, because there is no derivation that reads better than a person
 *  looking at the render. */
/** The origin cluster's own centroid, in frame percentages — the one anchor the six names hang off. */
function originsAnchor(origins: Place[], frame: { width: number; height: number }) {
  const x = origins.reduce((sum, p) => sum + p.px, 0) / origins.length;
  const y = origins.reduce((sum, p) => sum + p.py, 0) / origins.length;
  return { left: pct(x, frame.width), top: pct(y, frame.height) };
}

function annotationStyle(mid: { x: number; y: number }, frame: { width: number; height: number }, offset: [number, number]) {
  const [dx, dy] = offset;
  return {
    left: pct(mid.x, frame.width),
    top: pct(mid.y, frame.height),
    transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
  };
}

/** "Lisboa to London", from the route table rather than from a string typed twice. */
function routeLabel(routes: Route[], key: string): string {
  const route = routes.find((r) => r.key === key);
  if (!route) throw new Error(`no route keyed "${key}" to annotate`);
  return `${route.origin} to ${route.destination}`;
}

function labelStyle(place: Place, frame: { width: number; height: number }, offsets: Record<string, [number, number]>) {
  const [dx, dy] = offsets[place.key] ?? [8, -8];
  return {
    left: pct(place.px, frame.width),
    top: pct(place.py, frame.height),
    transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
  };
}

/**
 * The rules `map-web`'s own `buildCss` has no line for, because that format's mark is a circle and
 * this one's is a ribbon. Shipped inside the component's own markup rather than pushed into the
 * format's CSS: `renderMapWeb` takes no extra-stylesheet argument, and a beat may not edit the skill
 * it was produced by. Every font-size here is a fixed CSS pixel value, the same rule the format's
 * own furniture follows.
 */
/**
 * The pointer half of the interaction, for the FALLBACK layer. Deliberately tiny and deliberately
 * NOT a second source of truth: it reads the `data-detail` the markup already carries — the same
 * string the `.pt` button carries, the same string the live map's own `showTooltip` looks up — so
 * no number on this page is formatted twice. It shares `#tooltip`, the element `map-web`'s own
 * `interaction.mjs` created and positions, and it leaves the keyboard entirely to that script.
 *
 * Inlined as a classic script (no `type="module"`), the same treatment this format gives its own
 * two scripts, so a CMS iframe that refuses module scripts still gets it.
 */
const HIT_SCRIPT = `
(function () {
  // DEFERRED, AND THAT IS NOT A STYLE CHOICE. This script is inlined inside .map-web-page, and
  // renderMapWeb writes the shared #tooltip element AFTER that div — so at parse time
  // getElementById("tooltip") is null and every listener here is silently never attached. Driven
  // before this guard existed: elementFromPoint returned the right ribbon at every viewport and the
  // tooltip stayed hidden at all thirteen. Nothing threw.
  function wire() {
  var tooltip = document.getElementById("tooltip");
  var hits = document.querySelectorAll("svg.map .fm-hit");
  if (!tooltip || !hits.length) return;
  function detailFor(key) {
    var button = document.querySelector('.pt[data-key="' + key + '"]');
    return button ? button.getAttribute("data-detail") : null;
  }
  function clear() {
    tooltip.hidden = true;
    var active = document.querySelectorAll(".pt-active");
    for (var i = 0; i < active.length; i++) active[i].classList.remove("pt-active");
  }
  function show(key, clientX, clientY) {
    var detail = detailFor(key);
    if (!detail) return;
    clear();
    var button = document.querySelector('.pt[data-key="' + key + '"]');
    if (button) button.classList.add("pt-active");
    tooltip.textContent = detail;
    tooltip.hidden = false;
    var tw = tooltip.offsetWidth || 160;
    var th = tooltip.offsetHeight || 28;
    tooltip.style.left = Math.min(Math.max(clientX - tw / 2, 8), window.innerWidth - tw - 8) + "px";
    tooltip.style.top = Math.max(clientY - th - 14, 8) + "px";
  }
  for (var i = 0; i < hits.length; i++) {
    (function (hit) {
      var key = hit.getAttribute("data-key");
      hit.addEventListener("pointerenter", function (e) { show(key, e.clientX, e.clientY); });
      hit.addEventListener("pointermove", function (e) { show(key, e.clientX, e.clientY); });
      hit.addEventListener("pointerleave", clear);
    })(hits[i]);
  }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
`.trim();

const BEAT_CSS = `
/* The route hit targets are wider than the place ones: a ribbon's midpoint is a point on a curve,
   not a disc, so the target has to be generous enough to find without being large enough to cover
   its neighbours. Both are FIXED CSS pixels, never frame units. */
.pt.pt-route { width: ${HIT_TARGET_PX}px; }
.pt.pt-place { width: ${HIT_TARGET_PX - 6}px; }
.fm-legend-keys { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.fm-legend-key { display: flex; align-items: center; gap: 7px; }
/* A width key is a bar of the ribbon's own colour at the ribbon's own drawn width — read as a
   thickness, which is what the encoding is. Never a circle: this beat sizes nothing by area. */
.fm-legend-bar { display: block; width: 58px; border-radius: 999px; }
.fm-annotation { max-width: 190px; white-space: normal; line-height: 1.25; }
/* The origin cluster's names: one block, laid out by flow, sitting to the LEFT of the cluster's own
   centroid and vertically centred on it. 'translate(-100%, -50%)' is what puts it there without any
   knowledge of how wide the six names turn out to be. */
.fm-origins {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  transform: translate(-100%, -50%);
  margin-left: -14px;
  pointer-events: none;
}
.fm-origins .point-label { position: static; transform: none; }
/* ONE LABEL SYSTEM AT A TIME. The anchored block is the fallback's; the per-point labels are the
   live map's, because only a node with its own anchor can follow a camera. */
.fm-live-only { display: none; }
html.mw-live .fm-live-only { display: inline-block; transform: translate(8px, -22px); }
html.mw-live .fm-origins { display: none; }
.fm-annotation { transform: translate(0, -50%); }
/* THE POINTER TALKS TO THE RIBBONS, THE KEYBOARD TALKS TO THE BUTTONS. See the hit-surface note in
   the SVG above for the measurement that produced this split. Live, this format's own CSS already
   drops the buttons' pointer-events and the canvas answers instead — same division, one layer up. */
.mw-overlay .pt { pointer-events: none; }
.fm-hit { cursor: pointer; }
svg.map .fm-hit { pointer-events: stroke; }
svg.map circle.fm-hit { pointer-events: all; }
/* A SMALL MAP GETS SMALLER TYPE AND FEWER WORDS, NEVER FEWER FACTS.
   Below roughly 480 container pixels the eleven place names and the annotation stop fitting over a
   map that is itself only 180 px wide. Two things change and neither removes a reading from the
   PAGE: the type steps down, and each destination's arriving total leaves its map label — that
   number is still in every one of that destination's tooltips, in the subject line for the two the
   takeaway names, and in the arrivals table inside the page's own disclosure. The city names,
   the ribbons, the legend, the annotation and every tooltip are untouched.
   The stage declares container-type size, so this is the container's own width, not the window's. */
@container (max-width: 480px) {
  .point-label { font-size: 10px; padding: 0 3px; }
  .fm-dest-value { display: none; }
  .fm-origins { gap: 1px; margin-left: -8px; }
  .fm-annotation { max-width: 62%; }
}
/* EVERY PIXEL OF FURNITURE COMES OFF THE MAP. The page column is a fixed height and the stage
   is its only child that gives up height, so each row of padding below the map shrinks the map
   itself. Measured with the format's own graphicFillsItsFrame against its own floor (17.9% of the
   window): with the arrivals table expanded in the composition this beat covered 16.6% at 1600x900
   and 14.8% at 1280x800 — UNDER, on a page where nothing was wrong except that the argument needed
   a five-row table. That table now sits inside the page's own disclosure beside the eight routes
   (ArrivalsTable), so the rows cost the map nothing until a reader asks for them. */
.mw-legend { margin: 8px 0 2px; }
.mw-legend-caption { margin-bottom: 5px; }
.mw-subject { margin: 5px 0 2px; }
.mw-source { margin-bottom: 6px; }
.mw-caveat { margin: 0; }
/* The caveat is one sentence on the page and the rest travels in the hand-over: four lines of 11px
   grey type under a map is a wall, and it pushed the map itself down to 451 px in a 900 px window. */
.mw-caveat { max-width: 92ch; }
`.trim();
