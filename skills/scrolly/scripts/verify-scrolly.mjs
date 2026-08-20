// twin/skills/scrolly/scripts/verify-scrolly.mjs
//
// THE GUARD THAT WATCHES A CONTINUOUS SCROLL, and the reason it exists is that the instrument this
// format had been verified with could not see the defect that broke every beat on disk.
//
// WHAT THE OLD INSTRUMENT DID, AND WHY IT PASSED A BROKEN VEHICLE. Every round of this skill was
// checked by jumping to N discrete scroll offsets, waiting for things to settle, and reading the
// state. Measured on the four beats plus the seed, at 1600x900 / 1280x800 / 375x812, that
// instrument reported 25 samples out of 25 with exactly one frame at opacity 1 and every other at
// exactly 0, one panel at a time, all four steps in order. Every one of those numbers was true.
//
// The same five pages, scrolled CONTINUOUSLY — 24 px per animation frame, which is an ordinary
// wheel — measured: in FOURTEEN of the fifteen runs at least one step's frame was NEVER PAINTED AT
// ALL; the graphic lagged the prose by up to 1,800px of a 3,300px track; and roughly 45% of every
// animation frame the browser drew was a blend of two frames rather than one settled image. The
// cause was in `assets/interaction.mjs` and is written up there: the old `IntersectionObserver`
// rule picked its winner from the entries of the CURRENT CALLBACK — the panels whose ratio had just
// crossed a threshold — so on a continuous scroll the active class oscillated between the outgoing
// and incoming panel, restarting the 0.3s transition on every flip. A teleport hands the observer
// every panel in one callback, so the delta set IS the full state and the rule is accidentally
// right. A reader never teleports.
//
// So this file scrolls. It installs a `requestAnimationFrame` recorder BEFORE touching the scroll
// position and reads back every frame the browser actually drew, rather than asking the DOM what it
// thinks after the dust has settled. A sampled probe is not a weaker version of this; it is blind
// to a whole class of defect by construction, and it proved it.
//
// AND THEN IT WAS BLIND ANYWAY, FOR ONE ROUND, BECAUSE OF WHAT IT ASKED. Everything above is about
// the INSTRUMENT. The round that fixed the instrument closed the last prose-over-annotation
// collision by PINNING each panel in a reserved band — and every assertion in this file went green
// and stayed green, because not one of them was about whether the words MOVE. The owner drove it:
// "le panel avec le texte ne bouge plus alors que l'effet c'est vraiment de les faire défiler au
// scroll vers le haut." Run over those same shipped artifacts with assertion G added, this file
// measured the middle panels holding ONE screen offset for 42-45% of every scroll-advancing
// animation frame and the last panel for 78%, sweeping 187px of an 821px track at 1600x900. A guard
// that only ever asks WHICH step is showing cannot see a page that has stopped moving.
//
// WHAT IS ASSERTED (each one red-able — see `test/scroll-integrity.test.ts` for the mutations):
//   A. THE PAGE DOES NOT SCROLL. `documentElement.scrollHeight <= clientHeight + 1`. The component
//      owns its own scroll; a CMS embed that steals the host article's scroll is a nuisance, and
//      the sticky model this replaced could not avoid being one.
//   B. THE GRAPHIC NEVER MOVES. `.scrolly-graphic`'s box is identical at every recorded frame —
//      not "identical once pinned", identical from the first frame, because there is no pin.
//   C. THE HEADER NEVER MOVES, same measurement. The owner's own report: the title disappeared on
//      the reader's first gesture.
//   D. EVERY STEP'S FRAME IS PAINTED, IN ORDER. Each `.step-frame` reaches opacity >= 0.98 at some
//      recorded frame, and the order in which they first do so is the order they are declared in.
//      This is the assertion the old vehicle failed 14 runs out of 15.
//   D2. THE ACTIVE STEP CHANGES ONCE PER BOUNDARY. Each step is handed the `active` class exactly
//      once during one pass. This is the oscillation itself, measured directly rather than through
//      the opacity it wrecked: the old rule handed a step `active` four and five times per
//      boundary, and it is the reason nothing ever finished fading.
//   D3. THE GRAPHIC SETTLES. When the scroll stops, exactly one frame is at 1 and every other at 0
//      — never a resting double exposure, the defect a previous round removed and this one had to
//      prove had not come back through the decision layer.
//   E. AT MOST TWO PANELS SHARE THE LANE. Two are on screen through every boundary — that is what
//      travelling prose looks like — but three would mean the steps are shorter than the prose in
//      them, and the reader is being handed a wall rather than a sequence.
//   F. THE CARD IS CENTRED, OVER THE VISUAL, OPAQUE, AND ONE OF TWO WIDTHS. This is the NINTH
//      correction, and it is assertion F pointed the other way: the eighth required that no panel
//      ever touch the graphic, which is exactly the side column the owner rejected — "le panel avec
//      le texte ne doit pas être sur le côté mais centré et par dessus le contenu visuel." Four
//      sub-assertions, because the form only works if all four hold at once:
//        F1 CENTRED — every painted card's horizontal centre is the graphic's own, within 2px, at
//           every recorded animation frame. A card that drifts to a side is the column returning.
//        F2 OVER — every painted card's box lies inside the graphic's, and at some recorded frame a
//           card overlaps the graphic's own vertical middle. A card that only ever meets the edge of
//           the visual is beside it in all but name.
//        F3 OPAQUE, IN THE RENDER'S OWN GROUND — read off `getComputedStyle` in the driven browser,
//           not off the stylesheet: the card's background is fully opaque (alpha 1), there is
//           exactly ONE background colour across the whole pass, and ink-on-that-background measures
//           at least 4.5:1 by the WCAG formula. This is what makes an opaque card a legitimate
//           answer to the collision problem at all — a translucent card's effective colour is a
//           blend with whatever the graphic shows behind it, which is not a value anyone can
//           measure. `renderScrolly` asserts the same pairing at build time; this asserts what the
//           browser actually painted.
//        F4 ONE OF TWO WIDTHS — the card is at most 70% of the graphic's width, or the whole of it.
//           The in-between shape is the one that reads as a bug: a label the card's own VERTICAL
//           edge cuts down the middle is broken text for every frame the card spends at that row,
//           and frames keep their margin furniture in their outer ~15%. Measured at 375px, the
//           in-between shape sliced the seed's own y-axis labels for 42 consecutive frames; edge to
//           edge it slices nothing.
//   G. THE PROSE TRAVELS, and this is the assertion that was missing. Every earlier check on this
//      vehicle asked WHICH step was painted and none of them asked whether the words MOVE, so a
//      panel parked motionless for the whole of its step passed everything. For each panel, over
//      the frames where it shares the lane: it must sweep a real distance, and it must not HOLD one
//      offset — measured as the fraction of scroll-advancing animation frames at which its own top
//      did not move at all. It must also be seen entirely below the lane before it arrives (every
//      panel but the first) and entirely above it after it leaves (every panel but the last).
//   H. THE VISUAL EVOLVES BETWEEN BOUNDARIES, and this is the second assertion whose absence let a
//      slideshow ship. The vehicle published a step state and a boundary transition that finishes
//      exactly when the step flips, so a consumer had nothing to read while the reader scrolled
//      through the MIDDLE of a step: "on y est pas du tout... faut que ce soit fluide et que
//      l'élément évolue au fur et à mesure du temps." `data-progress` — the fractional index of the
//      panel on the lane's centre line — is now published on every scroll, and this asserts that it
//      is present, that it never goes backwards on a forward pass, that it spans the whole range,
//      that it CHANGES on the frames where the active step does NOT (the discrete signal cannot be
//      standing in for the continuous one), and that the two stay in LOCK-STEP: the active step is
//      never more than half a step away from where the progress says the reader is, which is what
//      keeps a scrubbed drawing and the caption beside it describing the same moment.
//
// WHAT IS REPORTED BUT NOT ASSERTED, and why. THE CENSUS OF WHAT THE CARD COVERS: how many
// animation frames of the pass a card sat over one of the active frame's own labels, how many it sat
// over nothing at all, and — the number that matters — the longest RUN of consecutive frames on
// which a label was SLICED across its width by the card's own vertical edge. A label fully behind
// the card reads as absent, which is what a card over a picture means; a label cut down the middle
// reads as broken, which is the defect the owner reported the last time a card was centred ("the
// 'flood day' label reduced to 'flo…'"). F4 is the vehicle's own lever against it and it closes the
// narrow-viewport case outright; what is left on a desktop is the beat's own composition — where a
// beat puts a label, against a stripe whose footprint in the frame's own coordinates changes with
// the viewport — and the vehicle cannot move a beat's marks. Also reported: whether the tallest card
// FITS the frame it travels over.
//
// Usage: bun skills/scrolly/scripts/verify-scrolly.mjs <file.html> [more.html...] [--width=W]

import puppeteer from "puppeteer-core";
import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join } from "node:path";

/** A DUPLICATE of the `resolveChrome` every capture script in this tree carries — see
 *  `map-web/test/standalone.test.ts`'s own copy for why these are duplicated rather than
 *  imported (a skill's own scripts stay copy-pasteable). */
export function resolveChrome() {
  const candidates = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
  );
  const found = candidates.find((c) => existsSync(c));
  if (!found)
    throw new Error(
      `no Chrome to drive — looked at ${candidates.join(", ")}. This format is verified by driving a ` +
        `real browser and by nothing else; there is no fallback that would prove anything.`,
    );
  return found;
}

/** Desktop, laptop, phone — the three shapes this format is checked at. */
export const WIDTHS = [
  { w: 1600, h: 900 },
  { w: 1280, h: 800 },
  { w: 375, h: 812 },
];

/** How many animation frames a reader spends crossing ONE step. The scroll speed is derived from
 *  this and the beat's own step height rather than fixed in pixels, so a phone (a shorter track) and
 *  a desktop (a longer one) get the same DWELL per step — a fixed pixel rate reads as a brisk scroll
 *  at 1600x900 and as a flick at 375x812, and the difference silently decides whether a 0.3s
 *  transition has time to finish. 60 frames is about a second per step: brisk, and real. */
export const FRAMES_PER_STEP = 60;

/** THE GUARDS THIS SKILL CARRIES, declared rather than inferred.
 *
 *  `scripts/guards.mjs` reads this array to answer "what does this creation process actually check?"
 *  and `skills/doctrine/test/guard-parity.test.ts` fails if the catalogue claims a guard this list
 *  does not name — or if this list names one the catalogue never declared, which would be a rule no
 *  other format could ever inherit. Everything else exported below is machinery, not a guard. */
export const GUARDS = [
  "stillSteps",
  "duplicatedPayload",
  "projectionDisagreements",
  "revealDashInScreenSpace",
  "requiresScrub",
  "stalledSteps",
  "neverReached",
  "plateFollowsGround",
  "plateMatchesGeometry",
  "csvSplitByHand",
  "pageLanguageMatchesStory",
];

/** Does the delivered page's own `<html lang>` agree with the language recorded for its story?
 *
 *  Reads the ARTEFACT, never re-derives it: `recorded` is the story's own answer (`STORYBOARD.md`'s
 *  `language:` field, or a beat's own recorded equivalent), handed in by the caller — this function
 *  never detects a language from prose and never assumes English. `renderWeb`'s own HTML shell used
 *  to hard-code `lang="fr"` regardless of what a beat actually said, discovered when an English beat
 *  had to patch its own runner to fix it after the fact; this is the guard that would have caught it
 *  on the delivered file, not just at render time. */
export function pageLanguageMatchesStory(html, recorded) {
  const found = /<html[^>]*\slang="([^"]*)"/i.exec(html);
  if (!found) return false;
  return found[1] === String(recorded ?? "").trim();
}

/** THE THREE CARGO GUARDS. Everything else in this file measures the VEHICLE — the handover, the
 *  card's travel, the frame that never moves — and a delivered five-stop route scrolly passed all of
 *  it while being dead: the same picture five times, the route never drawn, the plate cropped out
 *  from under the marks on a phone. These three take measurements and decide; the browser work that
 *  produces those measurements stays in `verifyOne`, so what fails is testable without Chrome
 *  (`test/verify-guards.test.ts`). */

/** How much of a step's painted picture must change for it to count as a step at all. Read off a
 *  population, measured with the fingerprint below at three widths: this tree's seven scrollies
 *  redraw 6.5% to 96.8% of their marks per step, and the delivered route page 0.0% on three of its
 *  four transitions. One percent is six times below the lowest living step and above nothing but
 *  zero, which is what a frozen picture measures.
 *
 *  A NOTE ON THE FLOOR'S ONE NEIGHBOUR. That same delivered page's first transition measures 4.4% —
 *  one of five stops lighting up and nothing else — and passes. It is thin, and it is a change; a
 *  guard that failed it would be legislating composition, which belongs to the doctrine and to a
 *  reader, not to a threshold. */
export const STEP_REDRAW_FLOOR = 0.01;

/** The share of a step's painted marks that differ from the step before it. A MULTISET of what the
 *  reader can see, never a map of DOM addresses: the delivered route page carries five copies of one
 *  frame and swaps which is painted, so keyed by position in the tree its identical pictures read as
 *  97.7% redrawn. Copies count — dropping one of fifteen identical labels IS a redraw — and order
 *  does not. Both empty is not a division by zero; it is two empty pictures, which are the same
 *  picture. */
export function fingerprintDrift(before, after) {
  const tally = (marks) => {
    const counts = new Map();
    for (const mark of marks) counts.set(mark, (counts.get(mark) ?? 0) + 1);
    return counts;
  };
  const one = tally(before);
  const two = tally(after);
  let total = 0;
  let moved = 0;
  for (const mark of new Set([...one.keys(), ...two.keys()])) {
    const a = one.get(mark) ?? 0;
    const b = two.get(mark) ?? 0;
    total += Math.max(a, b);
    moved += Math.abs(a - b);
  }
  return total === 0 ? 0 : moved / total;
}

/** Consecutive steps whose graphic was not materially repainted — pairs of ids, in reader order.
 *  `changed` is the fraction of the graphic that differs from the step before it; the first step has
 *  none. A picture that returns LATER in the sequence is a composition (a map coming home to its
 *  opening camera); only a repeat the reader meets back to back gave them nothing for the scroll. */
export function stillSteps(shots, floor = STEP_REDRAW_FLOOR) {
  const pairs = [];
  for (let i = 1; i < shots.length; i += 1)
    if (Number(shots[i].changed ?? 0) < floor)
      pairs.push([shots[i - 1].id, shots[i].id]);
  return pairs;
}

/** Below this many base64 characters a repeated inline asset is an icon or a font scrap, not the
 *  defect: reporting those would bury the 1.33 MB one under a list of nothing. */
const PAYLOAD_FLOOR = 1024;

/** Every data: asset inlined more than once, worst waste first. A weight ceiling would have been
 *  arbitrary — this tree's own image scrolly is legitimately 3 MB — but a second copy of one asset
 *  is bytes no reader benefits from, whatever the beat, and it is the file-side fingerprint of a
 *  visual duplicated into every step frame. */
export function duplicatedPayload(html) {
  const blobs = new Map();
  for (const match of html.matchAll(/data:[a-z/+.-]+;base64,([A-Za-z0-9+/=]+)/gi)) {
    const body = match[1];
    if (body.length < PAYLOAD_FLOOR) continue;
    const seen = blobs.get(body) ?? { copies: 0, bytes: body.length };
    seen.copies += 1;
    blobs.set(body, seen);
  }
  return [...blobs.values()]
    .filter((b) => b.copies > 1)
    .map((b) => ({
      copies: b.copies,
      bytes: b.bytes,
      wastedBytes: (b.copies - 1) * b.bytes,
    }))
    .sort((a, b) => b.wastedBytes - a.wastedBytes);
}

/** The two sides a mid-grey band apart: below this a surface is DARK, above it LIGHT, and in
 *  between it belongs to neither and this guard says nothing. */
const DARK_SIDE = 0.25;
const LIGHT_SIDE = 0.6;

/** The relative luminance of a CSS colour, or `null` when the string is not a painted colour.
 *
 *  THE `null` IS THE POINT. This guard failed three correct beats by reading
 *  `getComputedStyle(".scrolly").backgroundColor` — which is `rgba(0, 0, 0, 0)` on an element that
 *  sets no background — and taking its zeros for black. A transparent surface has not been measured;
 *  it has been missed. Returning a number there is how a broken instrument reports confidently.
 *
 *  Translucent is NOT transparent: `rgba(255,255,255,0.5)` is paint, and its own colour is the best
 *  reading available without compositing the whole stack. */
export function surfaceLuminance(css) {
  if (typeof css !== "string") return null;
  const value = css.trim();
  if (!value || value === "transparent" || value === "none") return null;
  let channels = null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((d) => d + d)
            .join("")
        : hex[1];
    channels = [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16));
  } else if (/^rgba?\(/i.test(value)) {
    const parts = value.match(/[\d.]+/g);
    if (!parts || parts.length < 3) return null;
    if (parts.length >= 4 && Number(parts[3]) === 0) return null;
    channels = parts.slice(0, 3).map(Number);
  }
  if (!channels || channels.some((c) => !Number.isFinite(c))) return null;
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(channels[0]) +
    0.7152 * channel(channels[1]) +
    0.0722 * channel(channels[2])
  );
}

/** Whether a baked plate is on the same side as the ground its beat declared.
 *
 *  The delivered route beat declared `--ground: #16191B` and painted every label white on a dark
 *  halo — right for that ground — over a basemap baked in `dataviz-light`. The furniture was correct
 *  and unreadable, which is what correct furniture looks like over the wrong ground. Both sides are
 *  numbers, so a machine can settle it; what it must not do is prescribe a direction, since a dark
 *  beat and a light one are equally legitimate. Only the two-sided disagreement is refused. */

export function plateFollowsGround({ ground, plate }) {
  if (plate == null || ground == null) return true;
  const side = (value) => (value < DARK_SIDE ? "dark" : value > LIGHT_SIDE ? "light" : "middle");
  const one = side(ground);
  const two = side(plate);
  if (one === "middle" || two === "middle") return true;
  return one === two;
}

/** How far a plate's aspect ratio may sit from its frame's before it letterboxes. A frame is
 *  integers and a ratio is not: 936x827 baked at 2x is 1872x1654, and the two ratios agree to five
 *  decimals. One part in a thousand covers that rounding and nothing a reader could see — the
 *  smallest real disagreement in this corpus's history was 8%. */
const ASPECT_SLACK = 0.001;

/** Does the baked plate describe the frame its own marks were projected into?
 *
 *  A map beat draws the plate as one `<image>` filling the frame. An `<image>` whose own aspect ratio
 *  differs from the box it is given is letterboxed by the default `preserveAspectRatio="xMidYMid
 *  meet"` — scaled down and centred — so the basemap shifts and shrinks while the projected marks do
 *  not, and every one of them lands somewhere the basemap never claimed. Nothing in the render fails;
 *  the picture is simply wrong, which is the same shape as the cropped-plate defect a scrolly earned
 *  its projection guard from.
 *
 *  Returns the numbers as well as the verdict: a failure a reader cannot act on is half a failure. */
export function plateMatchesGeometry({ plate, frame }) {
  const plateRatio = plate.width / plate.height;
  const frameRatio = frame.width / frame.height;
  const drift = Math.abs(plateRatio - frameRatio) / frameRatio;
  return {
    ok: drift <= ASPECT_SLACK,
    plateRatio,
    frameRatio,
    drift,
    scale: plate.width / frame.width,
  };
}

/** Marks a beat declared PENDING that were still pending when the scroll ended.
 *
 *  The narrative reached them and the picture never said so — measured on a rebuilt route beat whose
 *  driver moved each stop's opacity and nothing else, so every stop kept the fill it was SSR'd with:
 *  "les points steps ne se colorisent pas de la couleur au passage, il reste gris foncé".
 *
 *  It is checked against a DECLARATION rather than against the pixels, because the pixels cannot
 *  settle it: requiring a colour to change would refuse `danube`, whose territories legitimately
 *  change only their opacity as the river reaches them, and requiring "the descriptor changed"
 *  accepts the broken beat, whose group opacity did move. A scrub beat marks its state-bearing
 *  elements `data-state="pending"` and its driver flips them to `reached`; one attribute, and a
 *  screen reader can be told the same thing. */
export function neverReached(marks) {
  return marks
    .filter((mark) => mark.opening === "pending" && mark.closing !== "reached")
    .map((mark) => mark.id);
}

/** Which of the two models a beat is built on, read off the markup rather than guessed.
 *
 *  An ASSEMBLY builds a picture into every step frame — the seed's four media, four encodings of one
 *  dataset — and its steps are MEANT to swap: there is nothing to scrub between a photograph and a
 *  chart. A SCRUB builds ONE picture and drives it off `data-progress`, and that is the only model
 *  that can draw a line under the reader's own gesture. A beat that fills some frames and not others
 *  is read as a scrub, because something is driving what is left — and that is the exact shape a
 *  delivered route page had after its script bound one copy of five. */
export function requiresScrub({ frames, framesWithContent }) {
  if (!(frames > 1)) return false;
  return framesWithContent < frames;
}

/** Steps whose picture never moved anywhere inside themselves, on a beat built to scrub. The
 *  vehicle has published a continuous signal since its eighth correction; this is what finally
 *  requires a beat to consume it. */
export function stalledSteps(readings) {
  return readings
    .filter((step) => step.drifts.length > 0 && step.drifts.every((drift) => drift === 0))
    .map((step) => step.id);
}

/** Marks whose dash MEASURES their own path while being computed in screen space — the reveal that
 *  cannot work, and the one this tree shipped for months without seeing.
 *
 *  `vector-effect: non-scaling-stroke` takes the stroke, and with it the dash pattern, out of the
 *  path's own user units. A dash pattern repeats forever, so a pattern one path-length long measured
 *  against a line the camera has scaled up draws dash, gap, dash: a head, a hole and a tail, sliding
 *  together as the offset moves. A DECORATIVE dash — a gridline, a leader — belongs in screen space
 *  and is left alone here; what is refused is a dash that measures, recognised by a declared
 *  `pathLength` or by an offset that is not zero. */
export function revealDashInScreenSpace(marks) {
  return marks
    .filter((mark) => mark.vectorEffect === "non-scaling-stroke")
    .filter(
      (mark) => mark.pathLength != null || Number.parseFloat(mark.dashoffset) !== 0,
    )
    .map((mark) => mark.id);
}

/** The overlay fitting each `object-fit` describes the same projection as. The alignment half of
 *  `preserveAspectRatio` is the beat's own composition and is not read here. */
const PROJECTION = { cover: "slice", contain: "meet", "scale-down": "meet", fill: "none" };

/** Frames whose raster plate and whose overlay project the geography differently. `cover` crops and
 *  `meet` letterboxes, so a mark drawn under one lands somewhere the other never claimed — measured
 *  at 375x812 on the delivered page, Lisbon was drawn over Switzerland.
 *  `references/scrolly-discipline.md` states this pairing; this is what measures it. */
export function projectionDisagreements(frames) {
  return frames.flatMap((frame) => {
    if (!frame.fit) return [];
    const expectedFitting = PROJECTION[frame.fit];
    if (!expectedFitting) return [];
    const fitting = frame.par === "none" ? "none" : String(frame.par).split(/\s+/)[1];
    if (fitting === expectedFitting) return [];
    const expected = expectedFitting === "none" ? "none" : `xMidYMid ${expectedFitting}`;
    return [{ id: frame.id, fit: frame.fit, par: frame.par, expected }];
  });
}

/** Opacity above which a panel counts as painted over the graphic. */
const PAINTED = 0.05;
/** Opacity at which a frame counts as fully arrived. */
const SETTLED = 0.98;

/** Installed in the page BEFORE any scrolling. One entry per animation frame.
 *
 *  This function is SERIALISED into the browser, so it closes over nothing: `PAINTED` is written
 *  out as a literal here and named as a constant above for the node side. A module constant read
 *  from inside this body is `undefined` in the page — it throws, which is how this was caught. */
function recorder() {
  const PAINTED = 0.05;
  const frames = Array.from(document.querySelectorAll(".step-frame"));
  const panels = Array.from(document.querySelectorAll(".step-panel"));
  const scroller = document.querySelector(".scrolly-steps");
  const graphic = document.querySelector(".scrolly-graphic");
  const header = document.querySelector(".scrolly-header");
  const root = document.querySelector(".scrolly");

  // Leaf text boxes inside each frame — what a reader would call a label. Precomputed once: the
  // SSR'd markup never changes, only which wrapper is visible.
  function leafText(container) {
    const out = [];
    (function walk(el) {
      const kids = Array.from(el.children);
      const own = (el.textContent || "").trim();
      if (own.length > 0 && !kids.some((k) => (k.textContent || "").trim()))
        return out.push(el);
      kids.forEach(walk);
    })(container);
    return out;
  }
  const labels = new Map(frames.map((f) => [f, leafText(f)]));
  const box = (e) => {
    const r = e.getBoundingClientRect();
    return [
      Math.round(r.left),
      Math.round(r.top),
      Math.round(r.width),
      Math.round(r.height),
    ];
  };
  const hits = (a, b) =>
    a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

  window.__rec = [];
  window.__recording = true;
  (function tick() {
    if (!window.__recording) return;
    // THE LANE IS THE SCROLLPORT ITSELF — which, since the ninth correction, covers the graphic edge
    // to edge again. "In the lane" and "inside the element that scrolls" are the same fact, read off
    // the same rect.
    const port = scroller.getBoundingClientRect();
    const graphicBox = graphic.getBoundingClientRect();
    const progressAttr = root.getAttribute("data-progress");
    const sample = {
      y: Math.round(scroller.scrollTop),
      graphic: box(graphic),
      header: box(header),
      // The CONTINUOUS signal, read as the consumer reads it: off the root, once per animation
      // frame, never re-derived here. `null` when the attribute is absent, which is itself a
      // failure — a consumer with nothing to scrub against is the defect this assertion exists for.
      progress: progressAttr === null ? null : Number(progressAttr),
      lane: [Math.round(port.top), Math.round(port.bottom)],
      frames: frames.map((f) => ({
        id: f.getAttribute("data-step"),
        o: Number(Number(getComputedStyle(f).opacity).toFixed(3)),
        active: f.classList.contains("active"),
      })),
      // EVERY panel, every frame, whatever its opacity — the travel assertion is about geometry,
      // and a check that only looked at painted panels would be blind to a panel hidden while it
      // moves, which is exactly the shape a "fix" for this could take.
      panels: [],
      cards: [],
      collisions: [],
    };
    const visible = [];
    for (const p of panels) {
      const o = Number(getComputedStyle(p).opacity);
      const r = p.getBoundingClientRect();
      const id = p.getAttribute("data-step");
      sample.panels.push({
        id: id,
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        inLane: r.bottom > port.top && r.top < port.bottom,
      });
      if (o <= PAINTED) continue;
      if (r.width === 0 || r.bottom <= port.top || r.top >= port.bottom) continue;
      // The card as a READER sees it: its own box clipped by the layer that scrolls it. A card
      // riding out past the top of the frame has a rect that reaches above the graphic while
      // nothing of it is painted there.
      const clipped = {
        left: Math.max(r.left, port.left),
        right: Math.min(r.right, port.right),
        top: Math.max(r.top, port.top),
        bottom: Math.min(r.bottom, port.bottom),
      };
      if (clipped.right <= clipped.left || clipped.bottom <= clipped.top) continue;
      const style = getComputedStyle(p);
      sample.cards.push({
        id: id,
        box: [
          Math.round(clipped.left),
          Math.round(clipped.top),
          Math.round(clipped.right),
          Math.round(clipped.bottom),
        ],
        // WHAT THE BROWSER PAINTED, not what the stylesheet asked for. A card declaring an opaque
        // colour is not proof it was painted opaque at the moment its text crosses the graphic.
        bg: style.backgroundColor,
        ink: style.color,
      });
      visible.push(clipped);
    }
    for (const f of frames) {
      if (Number(getComputedStyle(f).opacity) <= PAINTED) continue;
      for (const el of labels.get(f)) {
        const raw = el.getBoundingClientRect();
        if (raw.width === 0 || raw.height === 0) continue;
        // Clipped by the GRAPHIC's own box: a label whose box runs past it is cut at that edge and
        // painted nowhere. Measuring the raw rect reported four beats' photo credits as colliding
        // with prose that was two hundred pixels away from anything the reader could see.
        const r = {
          left: Math.max(raw.left, graphicBox.left),
          right: Math.min(raw.right, graphicBox.right),
          top: Math.max(raw.top, graphicBox.top),
          bottom: Math.min(raw.bottom, graphicBox.bottom),
        };
        if (r.right <= r.left || r.bottom <= r.top) continue;
        for (const v of visible) {
          if (!hits(r, v)) continue;
          const ix = Math.min(r.right, v.right) - Math.max(r.left, v.left);
          sample.collisions.push({
            frame: f.getAttribute("data-step"),
            text: (el.textContent || "").trim().slice(0, 30),
            // The share of the label's WIDTH the card covers. Strictly between 0 and 1 means the
            // card's own vertical edge is cutting the label in two — the run of frames that stays
            // true is the census number that matters.
            shareX: (ix / (r.right - r.left)).toFixed(3),
          });
        }
      }
    }
    window.__rec.push(sample);
    requestAnimationFrame(tick);
  })();
}

/** Scrolls the prose column from top to bottom at one step per `framesPerStep` animation frames,
 *  then holds still long enough for any transition to finish. */
async function scrollThrough(page, framesPerStep) {
  await page.evaluate(async (perStep) => {
    const el = document.querySelector(".scrolly-steps");
    const max = el.scrollHeight - el.clientHeight;
    const stepHeight =
      document.querySelector(".step").getBoundingClientRect().height;
    const px = Math.max(2, Math.round(stepHeight / perStep));
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    for (let y = 0; y <= max; y += px) {
      el.scrollTop = y;
      await frame();
    }
    el.scrollTop = max;
    for (let i = 0; i < 40; i++) await frame();
  }, framesPerStep);
  await page.evaluate(() => {
    window.__recording = false;
  });
}

const same = (a, b) => a.every((v, i) => v === b[i]);

/** `rgb(r, g, b)` / `rgba(r, g, b, a)` — what `getComputedStyle` hands back — to `[r, g, b, a]`.
 *  Anything unparseable is treated as translucent, so an unrecognised colour FAILS loudly rather
 *  than passing by default. */
function parseCss(colour) {
  const m = String(colour).match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/,
  );
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
}

function isOpaque(colour) {
  const c = parseCss(colour);
  return c !== null && c[3] >= 1;
}

/** WCAG 2.x relative-luminance contrast between two CSS colours. A DUPLICATE of the `contrast`
 *  `scripts/render-still.mjs` exports — that one takes hex and runs at build time; this one takes
 *  what a browser reports and runs against what was actually painted. A skill's own scripts stay
 *  copy-pasteable, so the formula is written out rather than imported across the seam. */
function contrastOfCss(a, b) {
  const lum = (colour) => {
    const c = parseCss(colour);
    if (!c) return null;
    const [r, g, bl] = c.slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const la = lum(a);
  const lb = lum(b);
  if (la === null || lb === null) return 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Drives one file at one size through a full continuous scroll and returns its findings.
 * `failures` are assertion breaches; `notes` are measured facts a person should read.
 */
export async function verifyOne(page, file, { w, h }) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`file://${file}`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 300));
  await page.evaluate(recorder);
  await scrollThrough(page, FRAMES_PER_STEP);

  const rec = await page.evaluate(() => window.__rec);
  const shape = await page.evaluate(() => {
    const doc = document.scrollingElement;
    const scroller = document.querySelector(".scrolly-steps");
    const graphic = document.querySelector(".scrolly-graphic");
    const port = scroller.getBoundingClientRect();
    const panels = Array.from(document.querySelectorAll(".step-panel"));
    const g = graphic.getBoundingClientRect();
    return {
      docScrollable: doc.scrollHeight - doc.clientHeight,
      horizontalOverflow: doc.scrollWidth - doc.clientWidth,
      lane: Math.round(port.height),
      graphicBox: [Math.round(g.width), Math.round(g.height)],
      // Which of the two width regimes the browser actually chose — read off the rendered card, not
      // off the media query, so the report says what was laid out rather than what was intended.
      cardWidth: Math.round(
        Math.max(...panels.map((p) => p.getBoundingClientRect().width)),
      ),
      tallestPanel: Math.round(
        Math.max(...panels.map((p) => p.getBoundingClientRect().height)),
      ),
    };
  });

  const where = `${file.split("/").slice(-2).join("/")} @ ${w}x${h}`;
  const failures = [];
  const notes = [];
  if (rec.length < 20)
    failures.push(`${where}: only ${rec.length} animation frames recorded`);

  // A — the page does not scroll.
  if (shape.docScrollable > 1)
    failures.push(
      `${where}: the DOCUMENT has ${shape.docScrollable}px of scroll; the component must own its own scroll`,
    );
  if (shape.horizontalOverflow > 1)
    failures.push(`${where}: ${shape.horizontalOverflow}px of horizontal overflow`);

  // B, C — the graphic and the header never move.
  for (const part of ["graphic", "header"]) {
    const first = rec[0][part];
    const moved = rec.find((s) => !same(s[part], first));
    if (moved)
      failures.push(
        `${where}: the ${part} MOVED — ${JSON.stringify(first)} at the top, ` +
          `${JSON.stringify(moved[part])} at scroll ${moved.y}`,
      );
  }

  // D — every step's frame is painted, in the order it is declared.
  const order = rec[0].frames.map((f) => f.id);
  const arrival = new Map();
  for (const s of rec)
    for (const f of s.frames)
      if (f.o >= SETTLED && !arrival.has(f.id)) arrival.set(f.id, s.y);
  // D2 — how many times each step was handed `active`. One boundary, one handover.
  const handovers = new Map(order.map((id) => [id, 0]));
  let held = null;
  for (const s of rec) {
    const now = s.frames.find((f) => f.active);
    const id = now ? now.id : null;
    if (id && id !== held) handovers.set(id, (handovers.get(id) || 0) + 1);
    held = id;
  }
  const flapping = [...handovers].filter(([, n]) => n > 1);
  if (flapping.length)
    failures.push(
      `${where}: the active step OSCILLATED — ` +
        flapping.map(([id, n]) => `${id} became active ${n} times`).join(", ") +
        `; one continuous pass must hand each step the class exactly once`,
    );

  // D3 — the graphic settles once the reader stops.
  const last = rec[rec.length - 1].frames;
  const settled = last.filter((f) => f.o >= 0.999);
  if (settled.length !== 1 || last.some((f) => f.o > 0.001 && f.o < 0.999))
    failures.push(
      `${where}: the graphic did not settle after the scroll stopped — ` +
        JSON.stringify(last.map((f) => `${f.id}=${f.o}`)),
    );

  const missing = order.filter((id) => !arrival.has(id));
  if (missing.length)
    failures.push(
      `${where}: ${missing.length} of ${order.length} step frames were NEVER painted during a ` +
        `continuous scroll — ${JSON.stringify(missing)}; painted: ` +
        JSON.stringify([...arrival.keys()]),
    );
  else {
    const seen = [...arrival.keys()];
    if (seen.join(">") !== order.join(">"))
      failures.push(
        `${where}: frames arrived out of order — ${seen.join(" > ")} against ${order.join(" > ")}`,
      );
  }

  // E — at most two panels share the lane. Two IS travel; three is a wall of prose.
  const crowded = rec.find((s) => s.panels.filter((p) => p.inLane).length > 2);
  if (crowded)
    failures.push(
      `${where}: ${crowded.panels.filter((p) => p.inLane).length} panels shared the lane at scroll ` +
        `${crowded.y} — ${JSON.stringify(crowded.panels.filter((p) => p.inLane).map((p) => p.id))}; ` +
        `a step must be taller than the prose in it`,
    );

  // F — the card is centred, over the visual, opaque in the render's own ground, and one of two
  // widths. The ninth correction's whole claim, and the exact reverse of the eighth's.
  const [gx, gy, gw, gh] = rec[0].graphic;
  const graphicCentre = gx + gw / 2;
  const cardFrames = rec.filter((s) => s.cards.length);
  if (!cardFrames.length)
    failures.push(
      `${where}: no card was painted on any of ${rec.length} animation frames — the prose is meant ` +
        `to travel over the visual, and a reader saw none of it`,
    );

  // F1 — centred.
  const offCentre = rec
    .flatMap((s) => s.cards.map((c) => ({ y: s.y, c })))
    .find(({ c }) => Math.abs((c.box[0] + c.box[2]) / 2 - graphicCentre) > 2);
  if (offCentre)
    failures.push(
      `${where}: card ${offCentre.c.id} sat at x ${offCentre.c.box[0]}..${offCentre.c.box[2]} ` +
        `(centre ${((offCentre.c.box[0] + offCentre.c.box[2]) / 2).toFixed(1)}) against a graphic ` +
        `centred on ${graphicCentre} at scroll ${offCentre.y} — the card is centred over the ` +
        `visual, never off to a side`,
    );

  // F2 — over the visual, and over its MIDDLE at some point, not only its edge.
  const outside = rec
    .flatMap((s) => s.cards.map((c) => ({ y: s.y, c })))
    .find(
      ({ c }) =>
        c.box[0] < gx - 1 ||
        c.box[2] > gx + gw + 1 ||
        c.box[1] < gy - 1 ||
        c.box[3] > gy + gh + 1,
    );
  if (outside)
    failures.push(
      `${where}: card ${outside.c.id} was painted at ${JSON.stringify(outside.c.box)}, outside the ` +
        `graphic's own ${JSON.stringify(rec[0].graphic)} at scroll ${outside.y} — the card travels ` +
        `over the visual, not beside it`,
    );
  const crossedMiddle = rec.some((s) =>
    s.cards.some((c) => c.box[1] < gy + gh / 2 && c.box[3] > gy + gh / 2),
  );
  if (cardFrames.length && !crossedMiddle)
    failures.push(
      `${where}: no card ever reached the graphic's own vertical middle — a card that only meets ` +
        `the edge of the visual is beside it in all but name`,
    );

  // F3 — opaque, one colour, and legible against it. Read off the live computed styles.
  const bgs = [...new Set(rec.flatMap((s) => s.cards.map((c) => c.bg)))];
  const translucent = bgs.filter((b) => !isOpaque(b));
  if (translucent.length)
    failures.push(
      `${where}: the card was painted ${translucent.join(", ")} — a translucent card's effective ` +
        `colour is a blend with whatever the graphic shows behind it, which is not a value anyone ` +
        `can measure; the card is opaque or the contrast claim is empty`,
    );
  if (bgs.length > 1)
    failures.push(
      `${where}: the card was painted in ${bgs.length} different backgrounds — ${bgs.join(", ")}; ` +
        `one render, one ground`,
    );
  const inks = [...new Set(rec.flatMap((s) => s.cards.map((c) => c.ink)))];
  for (const bg of bgs)
    for (const ink of inks) {
      const ratio = contrastOfCss(ink, bg);
      if (ratio < 4.5)
        failures.push(
          `${where}: the card painted ${ink} on ${bg} — ${ratio.toFixed(2)}:1, under the 4.5:1 ` +
            `floor the whole opaque-card answer rests on`,
        );
    }

  // F4 — one of two widths, never the in-between shape that slices a label down its side.
  const widths = [...new Set(rec.flatMap((s) => s.cards.map((c) => c.box[2] - c.box[0])))];
  for (const w of widths) {
    const share = w / gw;
    if (share > 0.7 && w < gw - 2)
      failures.push(
        `${where}: the card rendered ${w}px against a ${gw}px graphic — ${Math.round(share * 100)}%, ` +
          `the in-between shape: its own vertical edges land in the outer band where a frame keeps ` +
          `its axis furniture, and a label cut down the middle reads as broken text for every frame ` +
          `the card spends at that row. At most 70% of the frame, or the whole of it`,
      );
  }

  // G — the prose TRAVELS. Measured only over the frames where the reader could see it, and only
  // across scroll-advancing frames, so the recorder's own aliasing (two ticks at one scrollTop)
  // cannot be mistaken for a panel holding still.
  const travel = [];
  for (const [i, id] of order.entries()) {
    let minTop = Infinity;
    let maxTop = -Infinity;
    let advanced = 0;
    let held = 0;
    let seenBelow = false;
    let seenAbove = false;
    let prev = null;
    for (const s of rec) {
      const p = s.panels.find((q) => q.id === id);
      if (!p) continue;
      const laneTop = s.lane[0];
      const laneBottom = s.lane[1];
      if (p.top >= laneBottom) seenBelow = true;
      if (p.bottom <= laneTop) seenAbove = true;
      if (p.inLane) {
        minTop = Math.min(minTop, p.top);
        maxTop = Math.max(maxTop, p.top);
        if (prev && prev.y !== s.y) {
          advanced += 1;
          if (Math.abs(p.top - prev.top) < 1) held += 1;
        }
      }
      prev = { y: s.y, top: p.top };
    }
    const swept = maxTop === -Infinity ? 0 : maxTop - minTop;
    const heldShare = advanced ? held / advanced : 1;
    travel.push({ id, swept, held, advanced, heldShare, seenBelow, seenAbove, i });
  }
  const laneHeight = shape.lane;
  for (const t of travel) {
    if (t.swept < laneHeight * 0.5)
      failures.push(
        `${where}: panel ${t.id} swept only ${t.swept}px of a ${laneHeight}px lane — the prose is ` +
          `meant to travel the full height of its own column, not to be revealed in place`,
      );
    if (t.heldShare > 0.15)
      failures.push(
        `${where}: panel ${t.id} HELD one offset for ${t.held} of ${t.advanced} scroll-advancing ` +
          `frames (${Math.round(t.heldShare * 100)}%) — a parked panel is a slideshow; the reader ` +
          `must see the words move past the graphic`,
      );
    if (t.i > 0 && !t.seenBelow)
      failures.push(
        `${where}: panel ${t.id} was never entirely below the lane — it did not ENTER from the ` +
          `bottom edge, it appeared`,
      );
    if (t.i < order.length - 1 && !t.seenAbove)
      failures.push(
        `${where}: panel ${t.id} was never entirely above the lane — it did not LEAVE past the ` +
          `top edge, it vanished`,
      );
  }
  const clearFrames = rec.filter((s) => s.cards.length === 0).length;
  notes.push(
    `${where}: graphic ${shape.graphicBox.join("x")}, card ${shape.cardWidth}x${shape.tallestPanel} ` +
      `(${Math.round((shape.cardWidth / shape.graphicBox[0]) * 100)}% of the frame's width, ` +
      `${Math.round((shape.tallestPanel / shape.graphicBox[1]) * 100)}% of its height); the visual ` +
      `stood entirely clear on ${clearFrames}/${rec.length} frames; travel per card ` +
      travel.map((t) => `${t.id} ${t.swept}px`).join(", "),
  );
  // H — the continuous signal. Read off the root exactly as a consumer reads it.
  const missingProgress = rec.filter((s) => s.progress === null || Number.isNaN(s.progress));
  if (missingProgress.length)
    failures.push(
      `${where}: no readable \`data-progress\` on ${missingProgress.length}/${rec.length} animation ` +
        `frames — a consumer has nothing to scrub a visual against, so the visual can only ever ` +
        `catch up at a step boundary`,
    );
  else {
    const backwards = rec.find((s, i) => i > 0 && s.progress < rec[i - 1].progress - 0.001);
    if (backwards)
      failures.push(
        `${where}: progress went BACKWARDS on a forward scroll — ` +
          `${rec[rec.indexOf(backwards) - 1].progress} then ${backwards.progress} at scroll ${backwards.y}`,
      );
    const first = rec[0].progress;
    const last = rec[rec.length - 1].progress;
    const top = order.length - 1;
    if (first > 0.15 || last < top - 0.15)
      failures.push(
        `${where}: progress spanned ${first.toFixed(2)}..${last.toFixed(2)} of an expected ` +
          `0..${top} — the signal does not reach the ends of the piece`,
      );
    // THE ONE THAT MATTERS. Between two boundaries the discrete state is constant by definition;
    // if the continuous one is constant too, the visual is a slideshow whatever else is true.
    let between = 0;
    let frozen = 0;
    let worstStill = null;
    let run = 0;
    for (let i = 1; i < rec.length; i++) {
      const prev = rec[i - 1];
      const now = rec[i];
      if (now.y === prev.y) continue;
      const held = now.frames.find((f) => f.active);
      const heldBefore = prev.frames.find((f) => f.active);
      if (!held || !heldBefore || held.id !== heldBefore.id) {
        run = 0;
        continue;
      }
      between += 1;
      if (Math.abs(now.progress - prev.progress) < 0.0005) {
        frozen += 1;
        run += 1;
        if (!worstStill || run > worstStill.run) worstStill = { run: run, y: now.y, p: now.progress };
      } else run = 0;
    }
    const frozenShare = between ? frozen / between : 1;
    if (frozenShare > 0.15)
      failures.push(
        `${where}: progress did not move on ${frozen} of ${between} scroll-advancing frames INSIDE ` +
          `a step (${Math.round(frozenShare * 100)}%` +
          (worstStill
            ? `, longest still run ${worstStill.run} frames ending at scroll ${worstStill.y}, ` +
              `progress stuck at ${worstStill.p}`
            : "") +
          `) — the element must evolve as the reader scrolls, not catch up at the handover`,
      );
    // LOCK-STEP. The scrub and the caption must describe the same moment.
    let worstDrift = null;
    for (const s of rec) {
      const active = s.frames.find((f) => f.active);
      if (!active) continue;
      const drift = Math.abs(s.progress - order.indexOf(active.id));
      if (!worstDrift || drift > worstDrift.drift)
        worstDrift = { drift: drift, y: s.y, id: active.id, progress: s.progress };
    }
    if (worstDrift && worstDrift.drift > 0.65)
      failures.push(
        `${where}: the step and the progress drifted ${worstDrift.drift.toFixed(2)} steps apart ` +
          `at scroll ${worstDrift.y} (step ${worstDrift.id}, progress ${worstDrift.progress}) — ` +
          `a scrubbed visual and the words beside it must describe the same moment`,
      );
    notes.push(
      `${where}: progress ${first.toFixed(2)}..${last.toFixed(2)}, still on ${frozen}/${between} ` +
        `in-step frames, worst step/progress drift ${worstDrift ? worstDrift.drift.toFixed(2) : "n/a"}`,
    );
  }

  if (shape.tallestPanel > shape.lane)
    notes.push(
      `${where}: the tallest card (${shape.tallestPanel}px) is taller than the ${shape.lane}px ` +
        `frame it travels over, so it is legible on the way through and never all at once`,
    );

  // THE CENSUS OF WHAT THE CARD COVERS — reported, never asserted; see this file's own header for
  // why the SLICED run is the number that matters and the total is only context.
  const collided = rec.filter((s) => s.collisions.length);
  if (collided.length) {
    const runs = new Map();
    const open = new Map();
    for (const s of rec) {
      const cutNow = new Set();
      for (const c of s.collisions) {
        const share = Number(c.shareX);
        if (!(share > 0.04 && share < 0.96)) continue;
        const key = `${c.frame}:${c.text}`;
        cutNow.add(key);
        const run = (open.get(key) || 0) + 1;
        open.set(key, run);
        if (run > (runs.get(key) || 0)) runs.set(key, run);
      }
      for (const key of [...open.keys()]) if (!cutNow.has(key)) open.delete(key);
    }
    const sliced = [...runs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    notes.push(
      `${where}: the card covered a frame's own label on ${collided.length}/${rec.length} frames — ` +
        JSON.stringify(
          [...new Set(collided.flatMap((s) => s.collisions.map((c) => `${c.frame}:${c.text}`)))].slice(0, 6),
        ) +
        `; longest SLICED run ` +
        (sliced.length ? sliced.map(([k, n]) => `${k} ${n}f`).join(", ") : "none"),
    );
  }

  return { where, failures, notes, frames: rec.length, arrival: [...arrival.entries()] };
}

/** Reduced motion is an instant cut, and JavaScript off still shows one frame and every word. */
export async function verifyStates(browser, file) {
  const out = { failures: [], notes: [] };
  const name = file.split("/").slice(-2).join("/");

  const reduced = await browser.newPage();
  await reduced.setViewport({ width: 1600, height: 900 });
  await reduced.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "reduce" },
  ]);
  await reduced.goto(`file://${file}`, { waitUntil: "load" });
  await reduced.evaluate(recorder);
  // A quarter of the reading dwell, deliberately: under `reduce` there is no transition to wait
  // for — that is the whole claim — so a slow pass would only spend time proving it again. If a
  // transition survived the media query, a fast pass is MORE likely to catch it mid-flight, not
  // less.
  await scrollThrough(reduced, Math.round(FRAMES_PER_STEP / 4));
  const rec = await reduced.evaluate(() => window.__rec);
  const between = rec.flatMap((s) =>
    s.frames.filter((f) => f.o > 0.001 && f.o < 0.999).map((f) => `${f.id}=${f.o}@${s.y}`),
  );
  if (between.length)
    out.failures.push(
      `${name} @ reduce: ${between.length} intermediate frame opacities — ${between.slice(0, 4).join(", ")}`,
    );
  const reducedArrivals = new Set(
    rec.flatMap((s) => s.frames.filter((f) => f.o >= SETTLED).map((f) => f.id)),
  );
  if (reducedArrivals.size !== rec[0].frames.length)
    out.failures.push(
      `${name} @ reduce: only ${reducedArrivals.size} of ${rec[0].frames.length} frames were painted`,
    );
  await reduced.close();

  const nojs = await browser.newPage();
  await nojs.setJavaScriptEnabled(false);
  await nojs.setViewport({ width: 1600, height: 900 });
  await nojs.goto(`file://${file}`, { waitUntil: "load" });
  const still = await nojs.evaluate(() => ({
    active: Array.from(document.querySelectorAll(".step-frame.active")).length,
    live: document.querySelector(".scrolly").classList.contains("scrolly--live"),
    prose: Array.from(document.querySelectorAll(".step-panel")).map(
      (p) => p.textContent.trim().length,
    ),
    scrollable:
      document.querySelector(".scrolly-steps").scrollHeight -
      document.querySelector(".scrolly-steps").clientHeight,
  }));
  if (still.active !== 1)
    out.failures.push(`${name} @ no-JS: ${still.active} frames carry \`active\`, expected 1`);
  if (still.live) out.failures.push(`${name} @ no-JS: \`scrolly--live\` was baked into the markup`);
  if (still.prose.some((n) => n === 0))
    out.failures.push(`${name} @ no-JS: a step's prose is empty — ${JSON.stringify(still.prose)}`);
  if (still.scrollable < 1)
    out.failures.push(
      `${name} @ no-JS: the prose column has no scroll distance, so the reader cannot reach step 2`,
    );
  await nojs.close();
  return out;
}

/** THE CARGO PASS. `verifyOne` drives the vehicle continuously and reads what moves; this one stops
 *  at each step, lets it settle, and asks the only question that pass cannot: did the picture the
 *  reader came for actually change, and does it describe one place?
 *
 *  It reads the graphic's own painted geometry — position, size, opacity, fill, path data, text —
 *  and never a screenshot. The page that forced this check had markup that differed per step (one
 *  class, one inline style) while the picture did not, so a naive DOM diff would have passed it;
 *  what is fingerprinted here is only what a reader can see. Pixels were tried first and had to go:
 *  see the capture's own note below. */
/** WHAT A READER CAN SEE, as a multiset, serialised into the page. Shared by the per-step reading
 *  and the intra-step one so both ask the same question of the same tree. */
function paintedMarks() {
  const graphic = document.querySelector(".scrolly-graphic");
  const painted = [];
  const walk = (node) => {
    const style = getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return;
    const opacity = Number(style.opacity);
    if (opacity <= 0.01) return;
    const box = node.getBoundingClientRect();
    if (box.width === 0 && box.height === 0) return;
    const kids = Array.from(node.children);
    const own = kids.length === 0 ? (node.textContent || "").trim() : "";
    painted.push(
      [
        node.tagName,
        Math.round(box.x * 2) / 2,
        Math.round(box.y * 2) / 2,
        Math.round(box.width * 2) / 2,
        Math.round(box.height * 2) / 2,
        opacity.toFixed(2),
        style.fill,
        style.stroke,
        style.transform,
        style.clipPath,
        style.mask,
        style.filter,
        node.getAttribute("d") ?? "",
        own,
      ].join("|"),
    );
    kids.forEach(walk);
  };
  walk(graphic);
  return painted;
}

export async function verifyCargo(page, file, { w, h }) {
  const failures = [];
  const notes = [];
  const where = `${basename(file)} @ ${w}x${h}`;

  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`file://${file}`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 300));

  const stepCount = await page.evaluate(
    () => document.querySelectorAll(".step-frame").length,
  );
  const shots = [];
  let previous = null;
  const dashed = new Map();
  const scales = [];
  for (let i = 0; i < stepCount; i += 1) {
    await page.evaluate((index) => {
      const scroller = document.querySelector(".scrolly-steps");
      const steps = document.querySelectorAll(".step-frame").length;
      const travel = scroller.scrollHeight - scroller.clientHeight;
      scroller.scrollTop = steps < 2 ? 0 : (travel * index) / (steps - 1);
    }, i);
    // WAIT FOR THIS STEP'S OWN FRAME — not for "some frame has settled", which is already true the
    // instant the scroll is set, because the OUTGOING frame still holds the class: the reading then
    // describes the previous step. Measured while it was wrong, it called this tree's own four-map
    // beat 0.0% / 4.1% / 39.9% redrawn where every step of it really moves. FULLY arrived, not
    // assertion D3's 0.98, because opacity is part of what is fingerprinted and a frame caught
    // mid-fade would read as a picture nobody ever sees.
    try {
      await page.waitForFunction(
        (index) => {
          const opacities = Array.from(document.querySelectorAll(".step-frame")).map((frame) =>
            Number(getComputedStyle(frame).opacity),
          );
          return (
            opacities[index] >= 0.999 &&
            opacities.filter((o) => o > 0.001).length === 1
          );
        },
        { timeout: 4000, polling: 50 },
        i,
      );
    } catch {
      // A beat whose steps do not land one per equal share of the track — the id recorded below is
      // read off the DOM either way, so the comparison stays honest about what it photographed.
      notes.push(`${where}: step ${i + 1} never arrived alone; captured what was on screen`);
      await new Promise((r) => setTimeout(r, 700));
    }
    // THE PICTURE IS READ WHERE IT IS DECIDED, never where it is presented. Screenshots were the
    // first instrument and they lied: on a beat whose axes demonstrably fly in, the DOM read
    // position 3.000 with its x ticks at 2012-2022 while every capture still showed the whole
    // record. Puppeteer reads the compositor surface and that surface was stale — an ELEMENT
    // screenshot even came back carrying a prose card that is not inside that element. Geometry,
    // text and opacity are what a reader sees; a class or an inline style nobody can see is not in
    // here, which is exactly what the delivered route page's five frozen copies differed by.
    const seen = await page.evaluate(() => {
      const active = document.querySelector(".step-frame.active");
      const graphic = document.querySelector(".scrolly-graphic");
      // Every mark whose dash could be measuring its own path, and the scale the camera draws at.
      const dashed = [];
      for (const node of graphic.querySelectorAll("*")) {
        const style = getComputedStyle(node);
        if (style.strokeDasharray === "none" || !style.strokeDasharray) continue;
        dashed.push({
          id:
            node.getAttribute("data-part") ??
            node.getAttribute("data-layer") ??
            node.tagName.toLowerCase(),
          dasharray: style.strokeDasharray,
          dashoffset: style.strokeDashoffset,
          pathLength: node.getAttribute("pathLength"),
          vectorEffect: style.vectorEffect,
        });
      }
      const svg = graphic.querySelector("svg[viewBox]");
      const viewBox = svg?.getAttribute("viewBox")?.split(/[\s,]+/);
      const scale =
        svg && viewBox && Number(viewBox[2]) > 0
          ? svg.getBoundingClientRect().width / Number(viewBox[2])
          : null;
      return { id: active ? active.getAttribute("data-step") : null, dashed, scale };
    });
    seen.painted = await page.evaluate(paintedMarks);
    const changed = previous === null ? null : fingerprintDrift(previous, seen.painted);
    previous = seen.painted;
    for (const mark of seen.dashed) if (!dashed.has(mark.id)) dashed.set(mark.id, mark);
    scales.push(seen.scale);
    shots.push({ id: seen.id ?? `step-${i + 1}`, changed });
  }

  // ── Does the picture move INSIDE a step, on a beat built to scrub? ──────────────────────────
  //
  // The step-to-step guard above passes a beat that shows five finished pictures and swaps between
  // them, which is a slideshow with a crossfade — "le dessin de la ligne n'est pas progressif au
  // scroll, il est un peu abrupt au step là". The vehicle has published a continuous signal since
  // its eighth correction; this is what requires a beat to consume it, and only of the beats whose
  // own markup says they should (see `requiresScrub`).
  const framesWithContent = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll(".step-frame")).filter(
        (frame) => frame.querySelector("svg, img, canvas, [data-visual]") !== null,
      ).length,
  );
  if (requiresScrub({ frames: stepCount, framesWithContent })) {
    const readings = [];
    for (let i = 0; i < stepCount - 1; i += 1) {
      const inside = [];
      for (const offset of [0.3, 0.45, 0.6, 0.75]) {
        await page.evaluate(
          (progress, steps) => {
            const scroller = document.querySelector(".scrolly-steps");
            const travel = scroller.scrollHeight - scroller.clientHeight;
            scroller.scrollTop = (travel * progress) / (steps - 1);
          },
          i + offset,
          stepCount,
        );
        // The MIDDLE of the step, never its edges: the vehicle's own 0.3s crossfade lives at the
        // boundaries and registers as motion, so a slideshow sampled there reads as a scrub — it
        // did, at 91%, the first time this ran. No settle predicate either: mid-step is exactly
        // where a reader lives, and waiting for a frame to arrive alone would skip these frames.
        // LONGER than the vehicle's own 0.3s crossfade. Each sample is a jump, so a shorter wait
        // measures the fade the jump started rather than the drawing: a slideshow read as 91%
        // moving that way, which is the opposite of the truth.
        await new Promise((r) => setTimeout(r, 550));
        inside.push(await page.evaluate(paintedMarks));
      }
      const drifts = inside
        .slice(1)
        .map((marks, at) => fingerprintDrift(inside[at], marks));
      readings.push({ id: shots[i]?.id ?? `step-${i + 1}`, drifts });
    }
    for (const id of stalledSteps(readings))
      failures.push(
        `${where}: the picture never moved anywhere inside step ${id} — the vehicle publishes a ` +
          `continuous \`data-progress\` and this beat drives ONE picture, so a step the reader ` +
          `scrolls through without the drawing changing is a slideshow with a crossfade`,
      );
    notes.push(
      `${where}: intra-step motion ` +
        readings
          .map((step) => `${(Math.max(0, ...step.drifts) * 100).toFixed(1)}%`)
          .join(" / "),
    );
  }

  for (const [before, after] of stillSteps(shots))
    failures.push(
      `${where}: steps ${before} and ${after} painted the SAME picture — a reader who scrolled ` +
        `from one to the other was given nothing for it; a step that does not redraw is prose ` +
        `with a photograph behind it, not a scrolly`,
    );

  const projections = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".step-frame")).map((frame) => {
      const plate = frame.querySelector("img");
      const overlay = frame.querySelector("svg");
      const covers = (a, b) => {
        if (!a || !b) return false;
        const one = a.getBoundingClientRect();
        const two = b.getBoundingClientRect();
        const overlap =
          Math.max(0, Math.min(one.right, two.right) - Math.max(one.left, two.left)) *
          Math.max(0, Math.min(one.bottom, two.bottom) - Math.max(one.top, two.top));
        const smaller = Math.min(one.width * one.height, two.width * two.height);
        return smaller > 0 && overlap / smaller > 0.8;
      };
      return {
        id: frame.getAttribute("data-step"),
        fit: plate && covers(plate, overlay) ? getComputedStyle(plate).objectFit : null,
        par: overlay ? overlay.getAttribute("preserveAspectRatio") : null,
      };
    }),
  );
  for (const bad of projectionDisagreements(projections))
    failures.push(
      `${where}: step ${bad.id} paints its plate \`object-fit: ${bad.fit}\` under an overlay ` +
        `\`preserveAspectRatio="${bad.par}"\` — one crops and the other letterboxes, so every mark ` +
        `is drawn somewhere the basemap never claimed; expected \`${bad.expected}\``,
    );

  // The states a beat DECLARED, read at the opening and at the close. Silence is not a failure —
  // an assembly has nothing to declare — but it is worth saying out loud, because a scrub beat that
  // declares nothing is a beat whose marks nobody is checking.
  const declaredState = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-state]")).map((node) => ({
        id:
          node.getAttribute("data-stop") ??
          node.getAttribute("data-mark") ??
          node.getAttribute("data-territory") ??
          node.tagName.toLowerCase(),
        state: node.getAttribute("data-state"),
      })),
    );
  if (requiresScrub({ frames: stepCount, framesWithContent })) {
    await page.evaluate(() => {
      const scroller = document.querySelector(".scrolly-steps");
      scroller.scrollTop = 0;
    });
    await new Promise((r) => setTimeout(r, 600));
    const opening = await declaredState();
    await page.evaluate(() => {
      const scroller = document.querySelector(".scrolly-steps");
      scroller.scrollTop = scroller.scrollHeight - scroller.clientHeight;
    });
    await new Promise((r) => setTimeout(r, 600));
    const closing = await declaredState();
    const byId = new Map(closing.map((mark) => [mark.id, mark.state]));
    const marks = opening.map((mark) => ({
      id: mark.id,
      opening: mark.state,
      closing: byId.get(mark.id),
    }));
    for (const id of neverReached(marks))
      failures.push(
        `${where}: mark ${id} was still \`pending\` when the scroll ended — the narrative reached ` +
          `it and the picture never said so`,
      );
    notes.push(
      marks.length
        ? `${where}: ${marks.filter((m) => m.opening === "pending").length} of ${marks.length} declared marks start pending`
        : `${where}: this beat declares no \`data-state\` marks, so nothing checks that its own marks register the narrative`,
    );
  }

  // THE PLATE AGAINST THE THEME, both as numbers.
  //
  // THE GROUND IS THE ONE THE BEAT DECLARES, `--ground`, and the reason is a false failure this guard
  // shipped: it read `getComputedStyle(".scrolly").backgroundColor`, and `.scrolly` sets no
  // background, so the computed value is `rgba(0, 0, 0, 0)` and the luminance maths read its zeros as
  // pure black. Three correct light beats — `danube-scrolly`, `one-map-four-readings`,
  // `quakes-four-maps`, all `--ground: #FFFFFF` under light plates — were failed at three widths
  // each, and the one beat that passed passed by luck, its declared ground being genuinely dark.
  //
  // The page returns STRINGS and node decides: `surfaceLuminance` is pure, tested without Chrome,
  // and returns `null` for a colour with zero alpha, so nothing downstream can mistake "not read"
  // for "black". Only the plate's mean is computed in the page, because that one is pixels.
  const surfaces = await page.evaluate(async () => {
    const relative = (rgb) => {
      const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(Number);
      const channel = (value) => {
        const c = value / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const root = document.querySelector(".scrolly");
    const declared = getComputedStyle(document.documentElement)
      .getPropertyValue("--ground")
      .trim();
    const painted = root ? getComputedStyle(root).backgroundColor : "";
    const body = getComputedStyle(document.body).backgroundColor;
    const graphic = document.querySelector(".scrolly-graphic");
    const source =
      graphic?.querySelector("img[src^='data:']") ??
      graphic?.querySelector("image[href^='data:'], image[*|href^='data:']");
    const grounds = { declared, painted, body };
    if (!source) return { ...grounds, plate: null };
    const href = source.getAttribute("src") ?? source.getAttribute("href");
    const bitmap = await new Promise((settle) => {
      const img = new Image();
      img.onload = () => settle(img);
      img.onerror = () => settle(null);
      img.src = href;
    });
    if (!bitmap) return { ...grounds, plate: null };
    const canvas = new OffscreenCanvas(64, 32);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0, 64, 32);
    const data = context.getImageData(0, 0, 64, 32).data;
    let sum = 0;
    for (let px = 0; px < data.length; px += 4)
      sum += relative(`rgb(${data[px]},${data[px + 1]},${data[px + 2]})`);
    return { ...grounds, plate: sum / (data.length / 4) };
  });
  const ground =
    surfaceLuminance(surfaces.declared) ??
    surfaceLuminance(surfaces.painted) ??
    surfaceLuminance(surfaces.body);
  if (!plateFollowsGround({ ground, plate: surfaces.plate }))
    failures.push(
      `${where}: the baked plate and the ground this beat declares are on opposite sides — ground ` +
        `luminance ${ground.toFixed(3)}, plate ${surfaces.plate.toFixed(3)}. The furniture ` +
        `derives from the ground, so it will be right and unreadable: white labels over a light ` +
        `basemap, or ink over a dark one. Bake the plate in the style the theme asked for`,
    );
  if (surfaces.plate != null)
    notes.push(
      ground == null
        ? `${where}: a plate is on the page and NO ground could be read from it (\`--ground\` ` +
          `"${surfaces.declared}", .scrolly "${surfaces.painted}", body "${surfaces.body}") — the ` +
          `plate-against-theme guard did not run here`
        : `${where}: ground luminance ${ground.toFixed(3)}, plate ${surfaces.plate.toFixed(3)}`,
    );

  for (const id of revealDashInScreenSpace([...dashed.values()]))
    failures.push(
      `${where}: \`${id}\` reveals itself with a dash while carrying ` +
        `\`vector-effect: non-scaling-stroke\` — the pattern is then measured in SCREEN space, ` +
        `not in the path's own units, and repeats wherever the camera scales up: a head, a hole ` +
        `and a tail. Drop the vector-effect on a measuring dash, or measure the reveal some other way`,
    );

  // Reported, not asserted. The camera's scale is the number this file never wrote down, and it is
  // what a reader's window changes under a beat that fits a fixed plate into it. Stated so that a
  // run which never left one narrow band of scale says so, instead of reading as full coverage.
  const drawn = scales.filter((one) => one != null);
  if (drawn.length)
    notes.push(
      `${where}: camera scale ${Math.min(...drawn).toFixed(2)}..${Math.max(...drawn).toFixed(2)}` +
        (Math.max(...drawn) < 1.15
          ? "  — never drawn above 1.15x here, so a defect that needs a scaled-up camera would not show"
          : ""),
    );

  const wasted = duplicatedPayload(await readFile(file, "utf8"));
  const total = wasted.reduce((sum, one) => sum + one.wastedBytes, 0);
  if (wasted.length)
    failures.push(
      `${basename(file)}: ${wasted.length} inlined asset(s) carried more than once — ` +
        wasted
          .slice(0, 3)
          .map((one) => `${one.copies} copies of ${Math.round(one.bytes / 1024)} KiB`)
          .join(", ") +
        `; ${Math.round(total / 1024)} KiB a reader downloads for nothing`,
    );
  notes.push(
    `${where}: ${shots.length} steps, redraw ` +
      shots
        .slice(1)
        .map((shot) => `${(Number(shot.changed ?? 0) * 100).toFixed(1)}%`)
        .join(" / "),
  );

  return { failures, notes };
}

/** Drives every file at every width, plus the two state checks per file, on ONE browser. */
export async function verifyAll(files, widths = WIDTHS) {
  const browser = await puppeteer.launch({
    executablePath: resolveChrome(),
    headless: true,
    args: ["--allow-file-access-from-files", "--font-render-hinting=none"],
  });
  const failures = [];
  const notes = [];
  try {
    const page = await browser.newPage();
    for (const file of files) {
      for (const size of widths) {
        const r = await verifyOne(page, file, size);
        failures.push(...r.failures);
        notes.push(...r.notes);
        // The cargo pass reloads the file and stops at each step; it cannot share the continuous
        // drive's page state, and the projection defect it looks for only appears at some widths.
        const c = await verifyCargo(page, file, size);
        failures.push(...c.failures);
        notes.push(...c.notes);
      }
      const s = await verifyStates(browser, file);
      failures.push(...s.failures);
      notes.push(...s.notes);
    }
    await page.close();
  } finally {
    await browser.close();
  }
  return { failures, notes };
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const only = argv.find((a) => a.startsWith("--width="));
  const widths = only
    ? WIDTHS.filter((s) => String(s.w) === only.split("=")[1])
    : WIDTHS;
  const { failures, notes } = await verifyAll(
    argv.filter((a) => !a.startsWith("--")),
    widths,
  );
  for (const n of notes) console.log(`note   ${n}`);
  for (const f of failures) console.log(`FAIL   ${f}`);
  console.log(`${failures.length} failures, ${notes.length} notes`);
  process.exit(failures.length ? 1 : 0);
}

/** A `.csv` this script reads whose own row is cut on every literal comma instead of a parser that
 *  understands a quoted field — the pattern beat `proof/more-line-swiss-life-expectancy/render.mjs`
 *  shipped for months and every author since copied: `"1,234.5"` (a thousands separator) and
 *  `"Netherlands, the"` (a name carrying its own comma) both tear in two under a bare
 *  `row.split(",")`, silently — an extra field, every column after it one off, and nothing throws.
 *
 *  Reads SOURCE TEXT, not a delivered artifact: the defect lives in how a beat is WRITTEN, not in
 *  what it renders, so there is no rendered signal to inspect after the fact.
 *
 *  Two shapes have to appear TOGETHER for a match. A newline split that tokenises rows by hand
 *  (`.split(/\r?\n/)`, or the quoted `"\n"` / `"\r\n"` forms) is proof the source is walking a csv's
 *  own rows itself; paired with a bare single-comma split (`.split(",")`, either quote style) that
 *  cuts each one into fields. Either alone proves nothing — a comma split with no row split nearby
 *  is cutting something else (`place.split(" of ").pop().split(",")[0]`, a sentence, not a row: the
 *  false positive measured against `proof/mapgen-symbol-web/render-web.mjs`, which mentions "csv"
 *  repeatedly and reads a real one through a proper parser elsewhere), and a row split with no
 *  comma split nearby means the
 *  fields are read some other, safe way. Returns every offending `.split(",")` snippet found; empty
 *  means this source does not hand-cut a comma on its own csv rows. */
export function csvSplitByHand(source) {
  if (!/\bcsv\b/i.test(source)) return [];
  const rowSplitByHand =
    /\.split\(\s*(\/\\r\?\\n\/|["'`]\\r\\n["'`]|["'`]\\n["'`])\s*\)/.test(source);
  if (!rowSplitByHand) return [];
  return [...source.matchAll(/\.split\(\s*(["'`]),\1\s*\)/g)].map((m) => m[0]);
}
