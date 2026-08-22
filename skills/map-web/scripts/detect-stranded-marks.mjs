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
// delivered page carries its own frame (the map `<svg>`'s `viewBox`), its own drawn rings
// (`<path class="region" … data-key>`), its own marks (`data-detail`), its own keyboard targets and
// its own table. Every input this decision needs is in the file that ships, so it judges what
// shipped rather than what a render step meant to write.
//
// WHAT IT CANNOT SEE, said out loud. A page that draws its marks as something other than a region
// path — the symbol seed's circles, the hex grid's bins, a route beat's lines — has no areal
// geometry to be sub-pixel, so this reports an empty set for it and that is the honest answer, not a
// skip. `test/marks-smaller-than-a-pixel.test.ts` pins that at least one page in this format's own
// delivered population does strand marks, so an empty sweep can never read as a pass.

import { marksWithNoPointerPath } from "../assets/geo-choropleth.ts";
import { tableCarriesTheMarks } from "./detect-accessible-table.mjs";

/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["marksStrandedWithNoChannel"];

/** The container widths a producer is answered at. Four, not one, because the answer changes with
 *  the container — measured on the world beat: 75 marks with no pointer path at the widest and 124
 *  at the narrowest, over the same geometry. The narrow end is where a world map stops being a map
 *  and becomes a table, and a producer who is only told the desktop number never learns that. */
export const READING_WIDTHS = [1600, 1024, 768, 375];

/** The page padding this format's own stage spends before the map is drawn — `.map-web-page`'s own,
 *  stated here rather than parsed out of the CSS, exactly as `render-web.mjs`'s colliding-target
 *  verdict states it. */
export const PAGE_PADDING_PX = 32;

/** How wide the map is DRAWN at a given container width, in the fallback layer: the container less
 *  this format's page padding, never more than the plate's own frame, since `preserveAspectRatio`
 *  stops scaling it up past that.
 *
 *  IT IS A FLOOR, AND THE FLOOR IS NAMED. The LIVE layer fits its camera to the reader's own
 *  container and draws NARROWER than this — measured on the world beat, canvas 896 / 640 / 263 px
 *  from containers of 1600x900, 1024x768 and 375x667, against 1200 / 992 / 343 here. So the count
 *  this returns is the fewest marks a reader loses, not the most: live, at 1600x900, it is 90 rather
 *  than the 75 this width gives. `scripts/verify-live-map.mjs` drives the real camera and prints the
 *  real number; this is what a producer can be told without a browser and without a key. */
export function drawnWidthAt(containerWidthPx, frame) {
  return Math.min(containerWidthPx - PAGE_PADDING_PX, frame.width);
}

/** The map's own frame and drawn rings, read out of the delivered page.
 *
 *  The frame is the map `<svg class="map">`'s own `viewBox`, which IS the frame every ring in it was
 *  projected into — never a second number derived somewhere else. The rings are parsed back out of
 *  the `d` attribute `pathFromRings` wrote (`M x yL x y…Z`, one subpath per ring), so what is
 *  measured is the geometry the reader's browser actually paints. Returns `null` for a page with no
 *  map svg at all, and an empty `shapes` for one whose marks are not regions. */
export function drawnRegionsOf(html) {
  const svg = /<svg[^>]*class="map"[^>]*>/.exec(html)?.[0];
  const viewBox = svg && /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!viewBox) return null;
  const shapes = [];
  for (const path of html.matchAll(/<path\b[^>]*class="region"[^>]*>/g)) {
    const key = /\bdata-key="([^"]+)"/.exec(path[0])?.[1];
    const d = /\bd="([^"]+)"/.exec(path[0])?.[1];
    if (!key || !d) continue;
    const rings = [];
    for (const subpath of d.split("M")) {
      if (!subpath.trim()) continue;
      const ring = subpath
        .replace(/Z\s*$/, "")
        .split("L")
        .map((pair) => pair.trim().split(/\s+/).map(Number))
        .filter((point) => point.length === 2 && point.every(Number.isFinite));
      if (ring.length >= 3) rings.push(ring);
    }
    if (rings.length > 0) shapes.push({ key, rings });
  }
  return { frame: { width: Number(viewBox[1]), height: Number(viewBox[2]) }, shapes };
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

/** The sentence a producer reads at one container width — the verdict, said the way the
 *  colliding-target verdict already is, because a number nobody is shown is the same as no number. */
export function strandedVerdict(containerWidthPx, found) {
  const marks = found.of;
  if (found.stranded.length === 0)
    return `no pointer path at ${containerWidthPx}px: every one of the ${marks} marks is drawn at least one whole pixel of its own`;
  const names = found.stranded.slice(0, 6).join(", ");
  return (
    `no pointer path at ${containerWidthPx}px: ${found.stranded.length} of ${marks} marks are drawn ` +
    `smaller than a pixel (${names}${found.stranded.length > 6 ? ", …" : ""}) — NO pointer, tap or ` +
    `hover reaches them at this camera and no hit target can be made that does. The keyboard and the ` +
    `accessible table ARE their path. Tighten the camera, add an inset, or accept it knowingly and ` +
    `say so in the caveat. This is a floor: the live layer fits a narrower canvas than the fallback, ` +
    `so the real count is higher — scripts/verify-live-map.mjs prints it.`
  );
}

/** What a render REFUSES over, across every width a reader gets. Returns the message to throw, or
 *  null when every stranded mark still has both of its remaining channels. */
export function strandedRefusal(html, widths = READING_WIDTHS) {
  const drawn = drawnRegionsOf(html);
  if (!drawn || drawn.shapes.length === 0) return null;
  const reasons = [];
  for (const width of widths) {
    const found = marksStrandedWithNoChannel(html, drawnWidthAt(width, drawn.frame));
    if (found.unreachable.length === 0) continue;
    const rows = found.withoutARow.length > 0 ? `no row in the accessible table for ${found.withoutARow.join(", ")}` : null;
    const keys =
      found.withoutAKeyboardTarget.length > 0
        ? `no keyboard target for ${found.withoutAKeyboardTarget.join(", ")}`
        : null;
    reasons.push(`at ${width}px — ${[rows, keys].filter(Boolean).join("; ")}`);
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
