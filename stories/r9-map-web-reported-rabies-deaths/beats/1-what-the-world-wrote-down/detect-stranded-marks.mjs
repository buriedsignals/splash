// A MARK SMALLER THAN A PIXEL HAS NO POINTER PATH, AND THE TWO CHANNELS LEFT ARE NOT OPTIONAL.
//
// THE MEASUREMENT THIS EXISTS FOR. A ruling asked this format to replace `collidingPointerTargets`'s
// invariant with a live one about `queryRenderedFeatures`. Driven with a real key against the
// committed 241-region world beat, that invariant was red for 90 of 241 marks at 1600x900 and 149 of
// 241 at 375x667, and nothing this format can do turns it green: at that camera the live map draws
// 896px for 360° of longitude, so one pixel is about 26 km and Monaco is about a thirteenth of one.
// The collision was never the problem — of the 105 marks a neighbour's button covers, 46 are not
// served by the live pointer either. A mark smaller than a pixel has no pointer path and no target
// engineering creates one.
//
// So the pointer is not a channel every mark has, and this format has said in prose since it was
// written that the keyboard and the accessible table are two channels a reader PICKS BETWEEN. For
// these marks there is nothing to pick between: those two ARE the path. That turns an opt-out into a
// refusal — a beat that strands a mark under a pixel and then ships without a row for it, or without
// a keyboard target for it, has produced a mark no reader can reach by any means.
//
// READS THE ARTEFACT, NEVER THE COMPONENT, the same rule `detect-accessible-table.mjs` states: the
// delivered page carries its own frame (the map `<svg>`'s `viewBox`), its own drawn rings (a keyed
// `<path>`), its own marks (`data-detail`), its own keyboard targets and its own table. Every input
// this decision needs is in the file that ships, so it judges what shipped rather than what a render
// step meant to write.
//
// WHAT IT CANNOT SEE, SAID OUT LOUD AND BOUNDED IN CODE rather than left as prose. This measures a
// FILLED areal shape stated in frame units, which is what a choropleth region, a dot map's country
// outline and a hex bin all are. Three things are therefore refused rather than measured wrongly:
// a `fill="none"` path, whose pointer target is a STROKE WIDTH and not an enclosed area; a path
// under an SVG `transform`, whose rings are not where it is drawn; and a `d` carrying any command
// beyond `M`/`L`/`Z`, since a curve's control points are not vertices. The first two were found on
// real committed pages (`stress-ab-emigration-flows`'s route ribbons and arrowheads), and the keys
// dropped for the second are RETURNED so a caller can say so — a silence reported as a clean bill is
// the shape this project keeps finding. A page whose marks carry no areal geometry at all — the
// symbol seed's circles, a locator's pins — gets an empty answer, which is the honest one.
// `test/marks-smaller-than-a-pixel.test.ts` pins that several pages in this format's own delivered
// population DO strand marks, so an empty sweep can never read as a pass.

// A BEAT'S COPY, and the two import lines are the only bytes that differ from
// `map-web/scripts/detect-stranded-marks.mjs` — a beat keeps its own files flat beside it, the way
// `r8-map-web-japan-bear-casualties`'s copy already did.
//
// THIS COPY WAS BYTE-IDENTICAL TO THE SKILL'S UNTIL 2026-08-23, INCLUDING THESE TWO PATHS, so it
// could not be imported from where it sat — and the beat's own runner therefore re-implemented the
// census by hand and printed a number the guard did not agree with. A copy nothing can load is not
// a copy, it is a decision waiting to drift.
import { marksWithNoPointerPath } from "./geo-choropleth.ts";
import { tableCarriesTheMarks } from "./detect-accessible-table.mjs";

/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["marksStrandedWithNoChannel"];

/** The reader's WINDOW a producer is answered at — a shape, not a width, and that is the correction
 *  of 2026-08-23.
 *
 *  Four, not one, because the answer changes with the container: measured on the world beat, 75
 *  marks with no pointer path at the widest and 124 at the narrowest over the same geometry. The
 *  narrow end is where a world map stops being a map and becomes a table, and a producer who is
 *  only told the desktop number never learns that.
 *
 *  WHY A HEIGHT BELONGS HERE AT ALL. This format's stage takes the whole window on BOTH axes
 *  (`render-web.mjs`, "THE GRAPHIC TAKES THE WHOLE BOX"), so how wide the map is DRAWN is decided
 *  by the box, and the box's height is decided by the window's height less the page's own
 *  furniture. A reading set that carried widths alone was answering about a box nobody has. */
export const READING_VIEWPORTS = [
  { width: 1600, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 375, height: 667 },
];

/** The widths of `READING_VIEWPORTS`, derived rather than typed beside them — `render-web.mjs`'s
 *  verdict loop reads this and prints one sentence per width. Two lists typed by hand is how a
 *  reading set and the verdict about it come apart. */
export const READING_WIDTHS = READING_VIEWPORTS.map((viewport) => viewport.width);

/** The page padding this format's own stage spends before the map is drawn — `.map-web-page`'s own,
 *  stated here rather than parsed out of the CSS, exactly as `render-web.mjs`'s colliding-target
 *  verdict states it. */
export const PAGE_PADDING_PX = 32;

/** `.mw-viewport`'s own border, one pixel each side. It is here because it was WRONG by exactly this
 *  much and the browser said so: `container-type: size` measures the CONTENT box, so every `cqh`
 *  inside the viewport resolves against `boxHeight - 2`, not against the box a `getBoundingClientRect`
 *  reports. Measured on the rabies world beat at 1600x900 — border box 583.5, one world drawn
 *  1042.3; 583.5 x 1.79257 is 1045.9 and 581.5 x 1.79257 is 1042.4. Two pixels of border, three and
 *  a half pixels of map. */
export const BOX_BORDER_PX = 1;

/** `.mw-stage`'s own `min-height`, which is a real floor and not a hint: on a short window the stage
 *  stops giving up height and the page scrolls instead. Measured at 375x667 across this format's
 *  whole delivered population — five of fourteen pages sit at exactly 180. */
export const STAGE_MIN_HEIGHT_PX = 180;

/**
 * THE VERTICAL ROOM A MAP-WEB PAGE'S OWN FURNITURE TAKES, per reading viewport — the one term of the
 * box arithmetic that a string cannot be read for, and the reason this reading is an estimate.
 *
 * A page's title, its source line, its legend, its caption, its note and its table summary are text.
 * How tall they are depends on where the words wrap, which is a browser's answer and not a
 * stylesheet's. So the census cannot compute the box; it can only bound it.
 *
 * THE NUMBER IS THE MOST THIS FORMAT'S OWN PAGES SPEND, not an average and not a guess — the
 * shortest box any delivered page in this population is drawn into, therefore the NARROWEST world
 * and therefore the MOST stranded marks. That direction is deliberate: a count that is wrong low
 * tells a journalist the map is better than it is, and the count exists so they can tighten the
 * camera or add an inset.
 *
 * MEASURED 2026-08-23 in Chrome over all 14 pages `discoverMapWebPages()` finds, at these four
 * viewports (`test/marks-smaller-than-a-pixel.test.ts` re-derives it and reddens if the population
 * moves under it):
 *
 *   viewport   least   median   MOST   the page that spends the most
 *   1600x900   166.0   290.3   333.6   r8-map-web-japan-bear-casualties
 *   1024x768   166.0   306.8   347.6   r8-map-web-japan-bear-casualties
 *   768x1024   180.0   315.0   390.6   r8-map-web-japan-bear-casualties
 *    375x667   256.0   487.0   487.0   five pages, all of them clamped by STAGE_MIN_HEIGHT_PX
 *
 * WHAT IT IS WORTH, measured against the browser on the rabies world beat — census against a real
 * `getBoundingClientRect` of one painted world: 41/41, 49/49, 38/38, 86/87. Before this, with the
 * plate's own frame width as the cap, the same four read 36/41, 41/49, 50/38, 78/87 — wrong in both
 * directions and wrong LOW on the two commonest desktop shapes.
 */
export const FURNITURE_HEIGHT_PX = { 1600: 333.6, 1024: 347.6, 768: 390.6, 375: 487.0 };

/** The furniture allowance for a container width, from the table when it is one of the four and from
 *  the NEAREST measured width when it is not. Nearest, not the maximum of all four: the table's
 *  values climb as the window narrows and the words wrap more, so the maximum applied to a wide
 *  window says a 1280px desktop is drawn in a phone's box. Measured on the world beat at 1280x800 —
 *  the maximum answered 125 stranded against the browser's 91; the nearest width answers 104. Both
 *  err high, which is the direction this count must err in; one of them errs high by a third. */
export function furnitureAt(containerWidthPx) {
  const widths = Object.keys(FURNITURE_HEIGHT_PX).map(Number);
  const nearest = widths.reduce((best, width) =>
    Math.abs(width - containerWidthPx) < Math.abs(best - containerWidthPx) ? width : best,
  );
  return FURNITURE_HEIGHT_PX[nearest];
}

/** The window this format answers about at a given container width, and the shape it assumes when
 *  the width is not one of the four. 16:9 is named rather than left implicit — it is the ordinary
 *  desktop window and the shape three of this tree's own capture scripts already drive. */
export function viewportFor(containerWidthPx) {
  return (
    READING_VIEWPORTS.find((viewport) => viewport.width === containerWidthPx) ?? {
      width: containerWidthPx,
      height: Math.round((containerWidthPx * 9) / 16),
    }
  );
}

/** The CONTENT box the two plate layers measure themselves against, at one reading viewport — the
 *  container less this format's page padding and less `.mw-viewport`'s own border on each axis, with
 *  the stage's own `min-height` taking over on a window too short to give the room up. */
export function boxAt(viewport, furnitureHeightPx = furnitureAt(viewport.width)) {
  const furniture = furnitureHeightPx;
  return {
    width: viewport.width - PAGE_PADDING_PX - 2 * BOX_BORDER_PX,
    height: Math.max(STAGE_MIN_HEIGHT_PX, viewport.height - furniture) - 2 * BOX_BORDER_PX,
  };
}

/** HOW WIDE ONE WORLD IS DRAWN IN A BOX OF THIS SHAPE — the page's own two CSS expressions, in
 *  arithmetic, and exact to a tenth of a pixel against the browser.
 *
 *  Cover (`render-web.mjs`: `width: max(100cqw, calc(100cqh * aspect))`) — the plate is scaled up
 *  until it fills the box on both axes, so it is drawn `max(boxWidth, boxHeight * aspect)` and never
 *  narrower than the box.
 *
 *  Wrap (`worldTilingCss`: `width: calc(100cqh * aspect * worldCopies)`, each `.mw-world` taking
 *  `100% / worldCopies`) — one world is drawn at exactly `boxHeight * aspect`, whatever the box's
 *  width, because a full-turn camera fills the width by REPEATING rather than by scaling.
 *
 *  Verified in Chrome on the rabies beat, box content height against one `.mw-world`'s measured
 *  width: 581.5 -> 1042.4 (measured 1042.3), 633.2 -> 1135.0 (1135.0), 178.0 -> 319.1 (319.1). */
export function drawnWidthInBox(box, frame, heightBound = false) {
  const aspect = frame.width / frame.height;
  return heightBound ? box.height * aspect : Math.max(box.width, box.height * aspect);
}

/** Is this delivered page's plate bound by the container's HEIGHT rather than by its width?
 *
 *  One page shape in this format is, and it is derived rather than guessed: a camera that already
 *  spans a full turn of longitude cannot be given horizontal margin (`delivery-frame.mjs`,
 *  `cannotCover`), so its page fills the box by drawing the plate at exactly the box's HEIGHT and
 *  REPEATING it east and west (the owner's wrap ruling, 2026-08-23). One world is then
 *  `boxHeight × plateAspect` wide, which is narrower than the container the moment the box is wider
 *  than the world — the opposite of the cover case below, where the plate is at least as wide as
 *  the box.
 *
 *  The marker is the RULE that does it, `height: 100cqh` on the two plate layers, which
 *  `render-web.mjs` emits only on the wrapping branch (the cover branch writes
 *  `height: max(100cqh, …)`). A declaration, not a word: the prose above it in the same stylesheet
 *  quotes the expressions it replaced, so a looser match would read the explanation as the thing it
 *  explains. It replaces `containsItsPlate`, whose marker — `container-type: normal` — was the
 *  CONTAINED layout the ruling removed; the reading it fed is unchanged, and the name is now what
 *  the page actually does. */
export function plateIsBoundByHeight(html) {
  return /\.mw-fallback,\s*\.mw-overlay\s*\{[^}]*\bheight:\s*100cqh;/.test(html);
}

/** HOW WIDE THE MAP IS DRAWN at one of this format's reading widths, in the fallback layer.
 *
 *  THE CAP CAME OFF ON 2026-08-23; THE CONTAINER'S HEIGHT WENT ON THE SAME DAY, AND THE SECOND HALF
 *  IS WHAT MADE THE READING TRUE. Taking the cap off replaced `Math.min(container - padding,
 *  frame.width)` with `container - padding`, which is exact for a COVER page and has nothing to do
 *  with a WRAPPING one: there one world is drawn at the box's HEIGHT times the plate's aspect and
 *  never scales with the container's width at all. The plate's own frame width was standing in for
 *  a number nobody had.
 *
 *  WHAT THAT COST, MEASURED IN CHROME on the rabies world beat (194 regions, a 1400x781 plate, three
 *  painted copies) — the census against a `getBoundingClientRect` of one painted world:
 *
 *    viewport    one world drawn   census said   stranded, census vs browser
 *    1600x900          1042.3         1400.0            36  vs  41
 *    1024x768           751.0          992.0            41  vs  49
 *    768x1024          1135.0          736.0            50  vs  38
 *     375x667           319.1          343.0            78  vs  87
 *
 *  Wrong in both directions, and wrong LOW on the two commonest desktop shapes — which is the
 *  direction that flatters, and the direction this count may not err in. It is now derived from the
 *  BOX (`boxAt`) and the page's own two CSS expressions (`drawnWidthInBox`), and reads 41 / 49 / 38
 *  / 86 against the browser's 41 / 49 / 38 / 87.
 *
 *  IT IS STILL AN ESTIMATE, AND WHAT IS ESTIMATED IS NAMED. One term of the box is not in the file:
 *  the height the page's own furniture takes, which depends on where its words wrap.
 *  `FURNITURE_HEIGHT_PX` bounds it with the MOST this format's own delivered population spends, so
 *  the box is the shortest a page here is drawn into and the count errs high rather than low. It is
 *  not a proved bound: at 375x667 it read 86 against the browser's 87, a sub-pixel tie on one mark.
 *
 *  AND IT IS STILL A FLOOR AGAINST THE LIVE LAYER, which is a different claim from the old one. The
 *  live camera fits the reader's own container and draws NARROWER than the fallback — measured on
 *  the world beat, canvas 896 / 640 / 263 px from containers of 1600x900, 1024x768 and 375x667 — so
 *  a reader of the live map loses more marks than this, not fewer. `scripts/verify-live-map.mjs`
 *  drives the real camera and prints that number; this is what a producer can be told without a
 *  browser and without a key. */
export function drawnWidthAt(containerWidthPx, frame, heightBound = false) {
  return drawnWidthInBox(boxAt(viewportFor(containerWidthPx)), frame, heightBound);
}

/** The map's own frame and drawn rings, read out of the delivered page.
 *
 *  The frame is the map `<svg class="map">`'s own `viewBox`, which IS the frame every ring in it was
 *  projected into — never a second number derived somewhere else. The rings are parsed back out of
 *  the `d` attribute `pathFromRings` wrote (`M x yL x y…Z`, one subpath per ring), so what is
 *  measured is the geometry the reader's browser actually paints. Returns `null` for a page with no
 *  map svg at all, and an empty `shapes` for one that draws no keyed areal geometry.
 *
 *  A SHAPE IS A `<path>` THAT NAMES A KEY, not a `<path class="region">`, and the difference was a
 *  false negative on a real page. The first version keyed off the choropleth's own class and
 *  therefore reported ZERO stranded marks on `proof/mapgen-dot-web` — a beat whose live hover layer
 *  is the country FILL (`mw-countries`, `hover: true`) and whose own prose claimed a reader could
 *  hover any of its 42 countries, while Liechtenstein and Malta are drawn under a pixel at every
 *  width. A guard that only recognises one beat's class name confirms every beat that spells it
 *  differently. `marksStrandedWithNoChannel` intersects these keys with the ones the page ANNOUNCES,
 *  so a context outline that is not a mark is still not judged as one.
 *
 *  PARTS ARE MERGED BY KEY: a country drawn as several `<path>` elements is one mark, and asking
 *  whether its smallest island is sub-pixel would report a reachable country as stranded. */
export function drawnRegionsOf(html) {
  const svg = /<svg[^>]*class="map"[^>]*>/.exec(html)?.[0];
  const viewBox = svg && /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!viewBox) return null;
  const byKey = new Map();
  const skipped = new Set();
  for (const path of html.matchAll(/<path\b[^>]*>/g)) {
    const key = /\bdata-key="([^"]+)"/.exec(path[0])?.[1];
    const d = /\bd="([^"]+)"/.exec(path[0])?.[1];
    if (!key || !d) continue;
    // FILLED GEOMETRY ONLY, and this is a correctness bound rather than a convenience. A STROKED
    // path — `stories/stress-ab-emigration-flows`'s route flows, `fill="none"` with a stroke-width
    // of 30 down to 3.1 — is pointed at through its STROKE, and the area its open curve happens to
    // enclose is not a thing the map paints or hit-tests. Measured on that page: eight route keys
    // parse as "shapes" and the even-odd spans of an open curve answered a question nobody asked.
    // A mark whose target is a stroke width is a different measurement and this is not it.
    if ((/\bfill="([^"]*)"/.exec(path[0])?.[1] ?? "none").toLowerCase() === "none") continue;
    // AND NOTHING THIS FUNCTION CANNOT PLACE. A `transform` composes a matrix onto the path's own
    // coordinates and this reads frame units off the `d` attribute alone, so a transformed shape's
    // rings are not where it is drawn. Skipped and RECORDED rather than measured wrongly or dropped
    // in silence: found on `stories/stress-ab-emigration-flows`, whose eight route ARROWHEADS carry
    // the route's `data-key` on a translated-and-rotated triangle. That triangle is decoration; the
    // route's own pointer target is a 35px transparent stroke (`.fm-hit`), which is a stroke-width
    // question and not this one.
    if (/\btransform="/.test(path[0])) {
      skipped.add(key);
      continue;
    }
    // AND NOTHING WHOSE `d` IS NOT A POLYGON. `pathFromRings` writes `M x yL x y…Z` and nothing
    // else; a `C`, `Q` or `A` in there means the outline has control points that are not vertices,
    // and reading them as vertices would answer a different shape's question.
    if (/[^\s\d.,\-MLZ]/.test(d)) {
      skipped.add(key);
      continue;
    }
    const rings = byKey.get(key) ?? [];
    for (const subpath of d.split("M")) {
      if (!subpath.trim()) continue;
      const ring = subpath
        .replace(/Z\s*$/, "")
        .split("L")
        .map((pair) => pair.trim().split(/\s+/).map(Number))
        .filter((point) => point.length === 2 && point.every(Number.isFinite));
      if (ring.length >= 3) rings.push(ring);
    }
    if (rings.length > 0) byKey.set(key, rings);
  }
  return {
    frame: { width: Number(viewBox[1]), height: Number(viewBox[2]) },
    shapes: [...byKey].map(([key, rings]) => ({ key, rings })),
    // The keys this reading could not place, so a caller can say so rather than report a silence as
    // a clean bill. `render-web.mjs` prints them.
    unplaceable: [...skipped].filter((key) => !byKey.has(key)).sort(),
  };
}

/** Every mark the page announces, keyed: `data-key` → the `data-detail` it carries, and whether the
 *  element carrying it is a KEYBOARD TARGET.
 *
 *  A keyboard target is a native `<button>` that is not `disabled`, or anything with a
 *  `tabindex` of 0 or more — and it must also carry a non-empty accessible name (`aria-label`,
 *  falling back to `title`), which is `keyboardReachesEveryMark`'s own second half: focus that
 *  arrives with nothing to say is not a path to a value. Read from the markup rather than driven,
 *  because this decision runs at RENDER time, before there is a page to Tab through — the live Tab
 *  sequence is `test/keyboard-reach.test.ts`'s job and it drives the same pages. */
export function announcedMarksOf(html) {
  const marks = new Map();
  for (const element of html.matchAll(/<([a-zA-Z][\w-]*)\b[^>]*\bdata-detail="([^"]*)"[^>]*>/g)) {
    const [tag, tagName, detail] = element;
    const key = /\bdata-key="([^"]+)"/.exec(tag)?.[1];
    if (!key) continue;
    const tabIndex = /\btabindex="(-?\d+)"/i.exec(tag)?.[1];
    const focusable =
      (tagName.toLowerCase() === "button" && !/\bdisabled\b/.test(tag)) ||
      (tabIndex != null && Number(tabIndex) >= 0);
    const name = (/\baria-label="([^"]*)"/.exec(tag)?.[1] ?? /\btitle="([^"]*)"/.exec(tag)?.[1] ?? "").trim();
    marks.set(key, { detail, keyboardTarget: focusable && name.length > 0 });
  }
  return marks;
}

/**
 * THE MARKS THIS PAGE STRANDS, and which of the two remaining channels each one is missing.
 *
 * `stranded` — announced marks the map draws no pixel of their own for at `drawnWidthPx`, so no
 * pointer, no tap and no `queryRenderedFeatures` reaches them. `withoutARow` — of those, the ones
 * the accessible table does not carry, decided by this format's own `tableCarriesTheMarks` rather
 * than by a second table reader written here, so the two can never disagree about what a row is.
 * `withoutAKeyboardTarget` — of those, the ones with no focusable, named element of their own.
 * `unreachable` — the union: a mark with no pointer path AND a missing channel, which is a fact this
 * beat has drawn and no reader can get to.
 *
 * THE UNION, NOT THE INTERSECTION, and `map-web-discipline.md`'s "Two channels, not one" is why:
 * the table restores the FACTS in a linear order and the keyboard restores reading the MAP mark by
 * mark, and that file already rules that neither substitutes for the other. Requiring both is what
 * the ruling asks for; requiring either would let a beat drop the table on a camera where the table
 * is the only complete reading there is.
 */
export function marksStrandedWithNoChannel(html, drawnWidthPx) {
  const drawn = drawnRegionsOf(html);
  const announced = announcedMarksOf(html);
  if (!drawn) return { of: 0, stranded: [], withoutARow: [], withoutAKeyboardTarget: [], unreachable: [] };
  const drawnMarks = drawn.shapes.filter((shape) => announced.has(shape.key));
  const stranded = marksWithNoPointerPath(drawnMarks, drawn.frame, drawnWidthPx);
  const missingRows = new Set(tableCarriesTheMarks(html).missing);
  const withoutARow = stranded.filter((key) => missingRows.has(announced.get(key).detail));
  const withoutAKeyboardTarget = stranded.filter((key) => !announced.get(key).keyboardTarget);
  const unreachable = [...new Set([...withoutARow, ...withoutAKeyboardTarget])].sort();
  return { of: drawnMarks.length, stranded, withoutARow, withoutAKeyboardTarget, unreachable };
}

/** The sentence a producer reads at one reading viewport — the verdict, said the way the
 *  colliding-target verdict already is, because a number nobody is shown is the same as no number.
 *
 *  IT NO LONGER SAYS "THIS IS A FLOOR", AND THAT SENTENCE WAS THE DEFECT. It was a positive claim —
 *  the real count is higher than this — and on a wrapping page it was false: the reading was wrong
 *  LOW at 1600x900 (36 said, 41 drawn) and wrong HIGH at 768x1024 (50 said, 38 drawn), because the
 *  drawn width was capped at the plate's own frame and the box's height was never looked at. A
 *  verdict that names the wrong side of a number is worse than one that names none. What it says
 *  now is what is true of it: an ESTIMATE of the fallback layer, taken at the shortest box this
 *  format's own pages are drawn into so that it errs high rather than low, and still a floor against
 *  the LIVE layer, whose camera is narrower again. */
export function strandedVerdict(containerWidthPx, found) {
  const marks = found.of;
  const viewport = viewportFor(containerWidthPx);
  const at = `${viewport.width}x${viewport.height}`;
  if (found.stranded.length === 0)
    return `no pointer path at ${at}: every one of the ${marks} marks is drawn at least one whole pixel of its own`;
  const names = found.stranded.slice(0, 6).join(", ");
  return (
    `no pointer path at ${at}: ${found.stranded.length} of ${marks} marks are drawn ` +
    `smaller than a pixel (${names}${found.stranded.length > 6 ? ", …" : ""}) — NO pointer, tap or ` +
    `hover reaches them at this camera and no hit target can be made that does. The keyboard and the ` +
    `accessible table ARE their path. Tighten the camera, add an inset, or accept it knowingly and ` +
    `say so in the caveat. This number is an estimate of the FALLBACK layer at the shortest box this ` +
    `format's pages take, so it errs high rather than low (measured against Chrome on a 194-region ` +
    `world beat: 41/41, 49/49, 38/38, 86/87). The LIVE layer fits a narrower canvas still, so a ` +
    `reader of the live map loses more than this — scripts/verify-live-map.mjs prints that count.`
  );
}

/** What a render REFUSES over, across every width a reader gets. Returns the message to throw, or
 *  null when every stranded mark still has both of its remaining channels. */
export function strandedRefusal(html, viewports = READING_VIEWPORTS) {
  const drawn = drawnRegionsOf(html);
  if (!drawn || drawn.shapes.length === 0) return null;
  const heightBound = plateIsBoundByHeight(html);
  const reasons = [];
  // A NUMBER OR A SHAPE, both accepted, because this is called from four copies of `render-web.mjs`
  // and one of them may still hand it the old width list. A bare width is read as this format's own
  // window of that width (`viewportFor`), never as a box of unknown height.
  for (const shape of viewports) {
    const viewport = typeof shape === "number" ? viewportFor(shape) : shape;
    const width = `${viewport.width}x${viewport.height}`;
    const found = marksStrandedWithNoChannel(html, drawnWidthInBox(boxAt(viewport), drawn.frame, heightBound));
    if (found.unreachable.length === 0) continue;
    const rows = found.withoutARow.length > 0 ? `no row in the accessible table for ${found.withoutARow.join(", ")}` : null;
    const keys =
      found.withoutAKeyboardTarget.length > 0
        ? `no keyboard target for ${found.withoutAKeyboardTarget.join(", ")}`
        : null;
    reasons.push(`at ${width} — ${[rows, keys].filter(Boolean).join("; ")}`);
  }
  if (reasons.length === 0) return null;
  return (
    `this beat draws marks smaller than a pixel and leaves them nothing to be reached by: ` +
    `${reasons.join(" · ")}. A mark under a pixel has no pointer path at all, so the accessible ` +
    `table and the keyboard are the only paths it has left and neither is optional here — a beat ` +
    `that strands a mark and drops one of them has drawn a fact no reader can reach by any means. ` +
    `Keep the table on (renderMapWeb's own default), keep every mark's own focusable target, or ` +
    `bake a camera at which those marks are drawn.`
  );
}
