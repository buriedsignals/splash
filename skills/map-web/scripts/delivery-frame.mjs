// twin/skills/map-web/scripts/delivery-frame.mjs
//
// THE PLATE IS BAKED TO THE SHAPE OF THE BOX IT WILL BE DRAWN IN, NOT TO THE SHAPE OF ITS CAMERA.
//
// THE INSTRUCTION THIS FILE EXISTS FOR, from the owner, looking at a real delivered page
// (`stories/r8-map-web-japan-bear-casualties`, in a 2990px window): *the map must take all the
// available width, every time* — and, on the correction that followed, *the height is not an
// editorial choice either; like the scrolly, it must take all the space available.* One rule on
// both axes: **the graphic occupies the whole box its host gives it.** The host decides the box;
// the graphic never shrinks itself inside that box to keep a plate's aspect, on either axis.
//
// WHAT IT REPLACES, and the argument has to be at least as good as the one it overrules. Until
// 2026-08-23 this format sized its map box FROM THE PLATE — `width: min(100cqw, 100cqh * aspect)`
// plus an `aspect-ratio` — and the frame guard measured *the fraction of the axis the box is bound
// on*, precisely because a portrait plate in a landscape window is smaller in AREA by construction
// and the area reading punished a correct bake for the shape of its own camera. That reasoning was
// right about the thing it fixed and it is the reason the Japan page passed every check: its plate
// is 1000x1089, the box is bound on HEIGHT, it fills that height, and the binding reading was 62.9%
// while the box covered **33.2% of the container's width** (520.1px of 1568px at 1600x900, 428.3 of
// 1248 at 1280x800, measured before anything here was written). A metric can be perfectly sound and
// still be a reading of the wrong quantity: the owner is not asking how well the box fits the plate,
// he is asking how much of the room it was given the graphic took.
//
// The new reading needs no floor measured over a population, because there is nothing to calibrate:
// the box IS the container, so the fraction is 1.0 on both axes or the layout is broken.
//
// WHAT THAT COSTS, AND WHERE IT IS PAID. A box the host's shape and a plate the camera's shape
// cannot both be honoured by letterboxing (that puts page ground INSIDE the frame) or by stretching
// (`geo-discipline.md`: a plate is never drawn to a shape it was not baked for — a lie about
// distance and shape). So the box is filled by COVER — the plate is scaled uniformly until it
// covers the box and the overflow is clipped — and the bake's job becomes: give the plate enough
// real basemap around the study set that every crop the delivery can ask for eats ocean and
// neighbouring coast, never the subject. That is what `deliveryFrame` computes and what
// `frameCoversTheBoxRange` refuses.
//
// COVER, NOT CONTAIN, IS ALSO WHAT THE OTHER FORMAT THAT ALREADY DOES THIS DOES. `scrolly`'s map
// track resolves its camera against the box it is actually being drawn in
// (`proof/mapscrolly-one-map-europe-carbon/map-drive.mjs`, `resolveCamera`: *"COVER, not contain:
// the target box FILLS the frame … A contain fit would letterbox a near-square European plate
// inside a wide frame and leave a third of the picture as bare ground"*). It reaches the same shape
// by a different road — a scrolly runs JavaScript on every scroll and can re-resolve a camera per
// frame, while a map-web page must be right with JavaScript OFF — so this format's cover is written
// in CSS (`render-web.mjs`'s `.mw-fallback`/`.mw-overlay` sizing) rather than in a transform, and
// the arithmetic below is the bake-time half the scrolly has no need of. The two are not a copied
// decision: `resolveCamera` interpolates between contain and cover from a scroll state and centres
// on a prose band; nothing here has a scroll state or a prose band.
//
// THE BOX ASPECTS ARE MEASURED, NEVER CHOSEN. A page's box is its `.mw-stage` — the window minus
// this beat's own furniture — so the range of shapes a beat is delivered into is a property of THAT
// BEAT's title, source line, filter chips, legend, caveat and table, and it is read off the rendered
// page rather than guessed at. `verify-fills-the-box.mjs` is what reads it back, and it refuses a
// page whose real range has escaped the range its plate was baked for, which is the only thing that
// makes a bake-time number safe to trust at delivery time.

/** The capability this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["frameCoversTheBoxRange"];

/** Web-Mercator northing for a latitude, in world units where a full turn of longitude is 2π.
 *  A duplicate of the bakes' own `mercY` rather than an import of one: importing a bake RUNS it. */
export function mercY(latDeg) {
  return Math.log(Math.tan(Math.PI / 4 + (latDeg * Math.PI) / 360));
}

/** The aspect a pair of bounds asks for, in Web Mercator — the study set's own shape, which is the
 *  one shape in this file that belongs to the geography rather than to the layout. */
export function studyAspect(bounds) {
  const [[west, south], [east, north]] = bounds;
  const lonSpan = ((east - west) * Math.PI) / 180;
  const latSpan = mercY(north) - mercY(south);
  if (!(lonSpan > 0) || !(latSpan > 0))
    throw new Error(`a camera with no area has no shape: bounds ${JSON.stringify(bounds)}`);
  return lonSpan / latSpan;
}

/** A measured pair of box aspects, refused rather than defaulted when it is not one.
 *
 *  `narrowest` and `widest` are the extreme `width / height` ratios of the `.mw-stage` this beat is
 *  actually delivered into, read off the rendered page at the widths this format drives. They are
 *  the ONLY two numbers the frame below is derived from that do not come from the geography, and a
 *  pair nobody measured would silently produce a plate that crops the subject at delivery — the
 *  same silent direction `plateFollowsGround` refuses one level down. */
export function readBoxAspects(value) {
  const pair =
    typeof value === "string"
      ? value.split(",").map(Number)
      : value && !Array.isArray(value) && typeof value === "object"
        ? [value.narrowest, value.widest]
        : value;
  const [narrowest, widest] = Array.isArray(pair) ? pair : [];
  for (const [side, number] of [
    ["narrowest", narrowest],
    ["widest", widest],
  ])
    if (!Number.isFinite(number) || !(number > 0))
      throw new Error(
        `box aspects: ${side} is ${number}. This pair is the range of shapes the delivered page's ` +
          `own .mw-stage takes, measured on the rendered page (see verify-fills-the-box.mjs) — a ` +
          `plate baked against a number nobody measured crops the subject at a width nobody looked at.`,
      );
  if (!(widest >= narrowest))
    throw new Error(
      `box aspects: widest ${widest} is narrower than narrowest ${narrowest}; the pair is ` +
        `[narrowest, widest] as width/height.`,
    );
  return { narrowest, widest };
}

/** No clearance at all: the crop is allowed to come right up to the study set's own edge. The
 *  default, because a beat that draws no labels outside its marks needs none, and because a margin
 *  nobody measured is ocean the reader pays for. */
export const NO_CLEARANCE = { x: 0, y: 0 };

/** A clearance nobody measured is refused; a clearance at or past half the box is refused too,
 *  because two of them leave the study set no room at all. */
export function readClearance(clearance) {
  const { x = 0, y = 0 } = clearance ?? {};
  for (const [side, value] of [
    ["x", x],
    ["y", y],
  ])
    if (!Number.isFinite(value) || value < 0 || value >= 0.5)
      throw new Error(
        `clearance.${side} is ${value}; it is the fraction of the delivered BOX that each side must ` +
          `keep clear of the study set, measured from the labels the page actually draws, and it has ` +
          `to sit in [0, 0.5).`,
      );
  return { x, y };
}

/**
 * THE RANGE THE FRAME IS ACTUALLY SOLVED AGAINST, once a beat's own labels are accounted for.
 *
 * A point label is drawn beside its mark at a FIXED CSS size, outside the SVG, so it is not part of
 * the study set and the crop does not know about it — measured on this skill's own seed at 375x812,
 * three of thirteen labels were cut by the frame ("Athens" by 61.1px, "Warsaw" by 34.9, "Stockholm"
 * by 25.2) on a plate that held every MARK with 0.2% to spare. A clipped label is silent by
 * construction (`labelsClippedByPlate`): the run is simply cut.
 *
 * The arithmetic is one line each way, and it is exact rather than a fudge. At the narrowest box the
 * height binds, so the drawn study width is `studyWidth · boxHeight / frameHeight`, and requiring it
 * to leave `x · boxWidth` clear on each side is requiring `studyWidth / frameHeight ≤ narrowest ·
 * (1 - 2x)`. At the widest box the width binds and the same step gives `widest / (1 - 2y)`. So a
 * clearance is not a new mechanism — it is the SAME two inequalities, asked about a rectangle that
 * includes the room the labels need.
 */
export function withClearance(boxAspects, clearance) {
  const { narrowest, widest } = readBoxAspects(boxAspects);
  const { x, y } = readClearance(clearance);
  return { narrowest: narrowest * (1 - 2 * x), widest: widest / (1 - 2 * y) };
}

/**
 * THE FRAME, AND WHERE THE STUDY SET SITS INSIDE IT.
 *
 * Work in units where the study set is exactly 1 tall and `studyAspect` wide. A box of aspect `a`
 * drawn COVER over a frame of `W x H` shows the largest `a`-shaped rectangle that fits inside the
 * frame, centred: `min(W, H·a)` wide by `min(H, W/a)` tall. For the study set to survive every crop
 * in `[narrowest, widest]` the frame therefore has to satisfy exactly two inequalities —
 *
 *   at the WIDEST box, the visible band is `W / widest` tall, and it must hold the study set's
 *   height:      W ≥ 1 · widest
 *   at the NARROWEST box, the visible band is `H · narrowest` wide, and it must hold its width:
 *                H ≥ studyAspect / narrowest
 *
 * — and it must hold the study set itself on both axes, which is what the `Math.max` against the
 * study set's own 1 x studyAspect is for: a study set WIDER than the widest box, or TALLER than the
 * narrowest box needs, asks for no margin on that axis at all and must not be given negative
 * padding. Both inequalities are taken as equalities, because every unit of margin past them is
 * ocean nobody asked for that the reader pays for in plate pixels and the file pays for in bytes.
 *
 * `padding` is what `fitBounds` is then given, so the bounds land on exactly the central
 * `studySet` rectangle instead of filling the frame. It is per-side rather than one number: the two
 * axes want different amounts and a single `padding` would take the larger on both.
 */
export function deliveryFrame(bounds, width, boxAspects, clearance = NO_CLEARANCE) {
  if (!Number.isFinite(width) || !(width > 0))
    throw new Error(`deliveryFrame: a frame ${width}px wide has nothing to bake into`);
  const measured = readBoxAspects(boxAspects);
  const { narrowest, widest } = withClearance(measured, clearance);
  const study = studyAspect(bounds);
  let unitWidth = Math.max(study, widest);
  let unitHeight = Math.max(1, study / narrowest);
  // THE ONE STUDY SET THIS CANNOT BE SOLVED FOR, and it is named rather than approximated. A frame
  // is `unitWidth / study` times the longitude the bounds asked for; a camera that already spans a
  // full turn has no more world to its east or west, and past the world's own width MapLibre draws a
  // REPEAT continent carrying none of this beat's marks — a bare copy a reader can reasonably take
  // for a place with no data (`assertWorldFillsFrame` is the bake's own refusal of exactly that).
  // So for such a camera the two requirements are provably in conflict, and the conflict is
  // three-way rather than a preference: at `real-owid-life-expectancy`'s widest measured box
  // (2.572:1) a 1568px-wide graphic showing the whole world is 1065px tall against a 610px stage.
  // Full width, the whole subject, one window: pick two.
  //
  // The frame is then the camera's own shape, exactly as before, and `cannotCover` travels into
  // `geometry.json` so the render can lay the page out the old way and SAY SO rather than crop
  // 42.8% of the latitude range in silence. It is not a throw: a beat is not defective for being
  // about the whole world.
  const askedLon = bounds[1][0] - bounds[0][0];
  const frameLon = (askedLon * unitWidth) / study;
  const cannotCover =
    frameLon > 360 + 1e-9
      ? {
          axis: "longitude",
          askedLon: Math.round(askedLon * 1000) / 1000,
          frameLon: Math.round(frameLon * 10) / 10,
          why:
            `this camera spans ${Math.round(askedLon * 10) / 10}° of longitude and the box range asks for a ` +
            `frame ${Math.round(frameLon * 10) / 10}° wide — past a full turn there is no more world, only a ` +
            `repeat of it`,
        }
      : null;
  if (cannotCover) {
    unitWidth = study;
    unitHeight = 1;
  }
  const perUnit = width / unitWidth;
  const height = Math.max(1, Math.round(perUnit * unitHeight));
  const studyWidth = perUnit * study;
  const studyHeight = perUnit;
  const padX = Math.max(0, Math.round((width - studyWidth) / 2));
  const padY = Math.max(0, Math.round((height - studyHeight) / 2));
  return {
    frame: { width, height: height },
    padding: { top: padY, right: padX, bottom: padY, left: padX },
    studySet: {
      x: padX,
      y: padY,
      width: Math.round(width - padX * 2),
      height: Math.round(height - padY * 2),
    },
    study,
    // The MEASURED range is what travels into `geometry.json`, never the range inflated by the
    // clearance: the first is a fact about the delivered page that `verify-fills-the-box.mjs` reads
    // back, the second is an intermediate this derivation used and nothing downstream should be
    // checked against.
    boxAspects: measured,
    clearance: readClearance(clearance),
    cannotCover,
  };
}

/** The largest `aspect`-shaped rectangle that fits inside `frame`, centred — what a reader of a box
 *  of that shape actually SEES of this plate once the box is filled by cover. The one piece of
 *  arithmetic this file shares with `render-web.mjs`'s CSS, which writes the same two `max()`
 *  expressions the other way round (it scales the plate up to the box rather than the box down to
 *  the plate). */
export function visibleBand(frame, aspect) {
  if (!Number.isFinite(aspect) || !(aspect > 0))
    throw new Error(`visibleBand: a box of aspect ${aspect} has no shape to crop to`);
  return {
    width: Math.min(frame.width, frame.height * aspect),
    height: Math.min(frame.height, frame.width / aspect),
  };
}

/**
 * THE REFUSAL, and it is the half `assertCameraReachesBounds` never had at delivery time.
 *
 * That assertion refuses a plate that CROPS the study area AT BAKE TIME. This one refuses a plate
 * that will crop it AT DELIVERY time — a plate whose ocean margin does not reach the shapes the box
 * actually takes. The two travel together: a plate can hold the whole study set and still hand the
 * reader two thirds of it once the box it is drawn in is 2.77:1.
 *
 * `TOLERANCE_PX` is one pixel, and it is a rounding allowance rather than a margin: `deliveryFrame`
 * rounds the frame height and the padding to whole pixels, so the exact equalities it solves land
 * within half a pixel of themselves on each side. Anything larger would be a margin nobody measured.
 */
export const TOLERANCE_PX = 1;

export function frameCoversTheBoxRange(frame, studySet, boxAspects, cannotCover = null) {
  const { narrowest, widest } = readBoxAspects(boxAspects);
  // A NAMED, MEASURED IMPOSSIBILITY IS NOT A DEFECT — but it is only allowed to silence this
  // refusal because `deliveryFrame` DERIVED it from the camera's own longitude span, and because
  // the render is told about it and lays the page out differently and says so. An exemption a
  // caller could simply pass in would be a way to turn this guard off.
  if (cannotCover) return;
  const short = [];
  const atWidest = visibleBand(frame, widest);
  if (atWidest.height < studySet.height - TOLERANCE_PX)
    short.push(
      `at the widest box (${widest.toFixed(3)}:1) a reader sees a ${atWidest.width.toFixed(0)}x` +
        `${atWidest.height.toFixed(0)} band of this plate, and the study set is ${studySet.height}px tall — ` +
        `${(((studySet.height - atWidest.height) / studySet.height) * 100).toFixed(1)}% of its height is cropped`,
    );
  const atNarrowest = visibleBand(frame, narrowest);
  if (atNarrowest.width < studySet.width - TOLERANCE_PX)
    short.push(
      `at the narrowest box (${narrowest.toFixed(3)}:1) a reader sees a ${atNarrowest.width.toFixed(0)}x` +
        `${atNarrowest.height.toFixed(0)} band of this plate, and the study set is ${studySet.width}px wide — ` +
        `${(((studySet.width - atNarrowest.width) / studySet.width) * 100).toFixed(1)}% of its width is cropped`,
    );
  if (short.length === 0) return;
  throw new Error(
    `this plate does not cover the box it will be drawn in: ${short.join("; ")}. The delivered page ` +
      `fills its container on both axes and clips what overflows, so a frame is only correct if ` +
      `every crop between ${narrowest.toFixed(3)}:1 and ${widest.toFixed(3)}:1 takes basemap and ` +
      `not the subject. deliveryFrame() computes the frame this camera needs.`,
  );
}

/**
 * THE WIDEST BOX THIS PLATE ACTUALLY COVERS, which is not always the widest one asked for.
 *
 * A camera spanning a full turn of longitude has no more ground to its east or west — the world is
 * already the whole width of the plate — so horizontal margin cannot be baked for it at all
 * (`assertWorldFillsFrame` refuses the attempt: past the world's own width MapLibre draws a repeat
 * continent carrying none of this beat's marks). For such a camera the plate covers boxes up to its
 * OWN aspect and no wider, and the honest thing is to record that number rather than to claim the
 * range that was asked for. Recorded in `geometry.json` as `coversTo`, read back by
 * `verify-fills-the-box.mjs`, and reported per page rather than averaged away.
 */
export function coversTo(frame, studySet) {
  return {
    widest: frame.width / studySet.height,
    narrowest: studySet.width / frame.height,
  };
}

/**
 * THE BOX A LABEL HAS TO STAY INSIDE, and it is not the plate.
 *
 * A point label is placed at SSR time, in plate pixels, and flipped to the other side of its mark
 * when it would run past the frame's own edge. That was exactly right while the whole plate was
 * visible. Under cover the reader sees a BAND of the plate, so a run that clears the plate's edge by
 * 300px of ocean can still be cut by the box — measured on `proof/mapgen-locator-web` at 375x812
 * after its re-bake: three of eleven runs cut, on a plate whose every mark sat comfortably inside.
 * It is this codebase's own recurring shape — a decision taken against the wrong quantity — and the
 * quantity here is the band, not the frame.
 *
 * The safe box is the INTERSECTION of every band the delivery can show: the narrowest box gives the
 * least width, the widest box the least height, and both are centred on the frame, so the
 * intersection is one centred rectangle. A label placed inside it is inside the picture at every
 * width this beat is delivered at — which is what the flip was always trying to guarantee.
 *
 * It is returned in the same `{ width, height }` shape `labelPlacement` already takes, plus the
 * offsets, so a caller can hand it over in place of the frame without a new signature: the sides a
 * flip is decided against are `right` and `bottom`, and both are absolute plate coordinates.
 */
export function labelSafeFrame(frame, boxAspects) {
  const { narrowest, widest } = readBoxAspects(boxAspects);
  const safeWidth = visibleBand(frame, narrowest).width;
  const safeHeight = visibleBand(frame, widest).height;
  const left = (frame.width - safeWidth) / 2;
  const top = (frame.height - safeHeight) / 2;
  return {
    // `width`/`height` are the RIGHT and BOTTOM edges in plate coordinates, not the box's own size:
    // `labelPlacement` reads them as `frame.width - margin` and `frame.height - 18`, which are edge
    // tests, and an edge test wants the edge.
    width: left + safeWidth,
    height: top + safeHeight,
    left,
    top,
    safeWidth,
    safeHeight,
  };
}
