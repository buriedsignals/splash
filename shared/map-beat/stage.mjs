// skills/map-beat/scripts/stage.mjs
//
// WHERE A MAP IS DRAWN INSIDE A FRAME IT DID NOT CHOOSE.
//
// `sizes.mjs` answers how big the frame is. `type-at-size.mjs` answers whether a CHART type may
// enter it, and says in its own words that it cannot answer for a map: "a map has no plot rectangle
// to clamp. R2 makes the target aspect an input the CAMERA takes, which is a camera decision and
// belongs to the map chantier". This file is that decision, and it is deliberately small.
//
// ── THE RULE, WHICH IS `geo.ts`'s RULE READ AT THE FRAME ──────────────────────────────────────
//
// `assets/geo.ts` states it once and every genre inherits it:
//
//   **A map is never given more stage height than its own geography can fill. Where a frame is
//   taller than the geography admits, the map takes the height the geography demands and the
//   leftover goes to FURNITURE — never to a wider camera, and never to a crop.**
//
// A baked beat has that geography ALREADY, in a form stronger than a longitude span: its plate is a
// raster whose camera fitted the study bounds, so the plate's own aspect ratio IS the shape the
// geography takes. Drawing that raster at any other aspect is a non-uniform scale, which
// `map-web-discipline.md` rules out in writing — this genre would rather draw a smaller true map
// than a larger false one. So the drawn box is the plate's aspect, scaled to whichever of the two
// available dimensions binds first, and everything left over is furniture.
//
// ── WHY THE MERCATOR CEILING IS AN ASSERTION HERE AND NOT A CLAMP ─────────────────────────────
//
// `maxStageHeightPx` caps a map at `360 * width / lonSpan` px of height, because Web Mercator's
// world is square and MapLibre will not zoom out past it. Written against a box that keeps the
// plate's aspect `a`, the cap reads
//
//     h <= 360 w / lonSpan,  with h = w / a   ⟺   lonSpan <= 360 a
//
// — the frame's own size cancels. **Whether a plate can honour the ceiling is a property of the
// plate, not of the frame it is drawn in**, and it is settled once at the bake: the bake's
// `assertWorldFillsFrame` already refuses a camera whose world is narrower than its frame, which is
// the same inequality. Measured over the ten beats this file was written for, every plate clears it
// with room — the two planet-extent ones (`map-quake-density` 836x480, `mapvid-hexgrid-quakes`
// 940x540) sit at lonSpan 360 against a bound of 627 and 626.
//
// So a clamp here would be dead code that looks like a safety net. What ships is the assertion,
// which fires loudly if a future bake ever produces a plate the ceiling forbids — and which is the
// reason a caller may then trust `mapStageBox` to be honest about the leftover.
//
// CARRIED, NOT SHARED BY IMPORT. `skills/map-beat/scripts/` is canonical; `shared/map-beat/` is the
// mirror a `proof/` beat reaches through `#shared/*`, and `skills/splash/assets/root-template/
// shared/map-beat/` is what a `cp -r root-template/` install puts in a newsroom's root. All three
// are byte-identical and guarded — `skills/splash/test/map-stage-is-carried.test.ts` for the first
// pair, `root-template-tells-the-truth.test.ts` for the second.

/**
 * The tallest a map may be drawn at this width, in pixels — a DUPLICATE of `assets/geo.ts`'s
 * function of the same name, kept here because a `.mjs` a render script imports cannot reach a
 * skill's `.ts` asset and because a geometry core imports nothing. The two are held to the same
 * arithmetic by `map-stage-is-carried.test.ts`, which drives both over the same inputs rather than
 * comparing their text.
 */
export function maxStageHeightPx(frameWidthPx, studyLonSpanDeg) {
  if (studyLonSpanDeg <= 0) return Infinity;
  return (frameWidthPx * 360) / studyLonSpanDeg;
}

/**
 * REFUSE A PLATE WHOSE GEOGRAPHY CANNOT FILL ITS OWN SHAPE, at any size.
 *
 * The size-free form of the Mercator ceiling, derived above: a box of aspect `a` satisfies the
 * ceiling at every scale exactly when `lonSpan <= 360 * a`. Called once per render, with the
 * plate's own frame and the longitude its camera actually showed — both read out of the committed
 * `geometry.json`, never typed.
 */
export function assertStageHonoursGeography(plateFrame, studyLonSpanDeg, { what = "this plate" } = {}) {
  const aspect = plateFrame.width / plateFrame.height;
  if (!(aspect > 0))
    throw new Error(`${what}: a plate frame of ${plateFrame.width}x${plateFrame.height} has no aspect to draw at.`);
  if (studyLonSpanDeg <= 0 || studyLonSpanDeg <= 360 * aspect) return aspect;
  throw new Error(
    `${what}: the plate is ${plateFrame.width}x${plateFrame.height} (${aspect.toFixed(3)}:1) and its ` +
      `camera shows ${studyLonSpanDeg.toFixed(1)}° of longitude, but Web Mercator's world is square — ` +
      `so a box of this aspect can never be more than ${(360 * aspect).toFixed(1)}° wide without ` +
      `showing ground that does not exist. Re-bake the plate flatter, or narrow the study set and say ` +
      `in the beat what was left out. Stretching the raster is not one of the options.`,
  );
}

/**
 * THE BOX THE MAP IS DRAWN IN, and what is left for furniture.
 *
 * `availableWidth` / `availableHeight` are what the beat's own layout has after its margins and
 * whatever it has already spent on a text column — this function does not know about furniture and
 * must not: which side the credit sits on is a beat's decision, and a stage that also laid out
 * would be the one-function-two-jobs defect `sizes.mjs` refuses in its own header.
 *
 * Returns the box, which axis bound it, and the leftover. `letterboxed` is TRUE when the frame gave
 * more height than this geography can fill at this width — the case the rule above exists for, and
 * the case a caller reports rather than silently absorbs.
 */
export function mapStageBox({ availableWidth, availableHeight, plateFrame, studyLonSpanDeg }) {
  const aspect = assertStageHonoursGeography(plateFrame, studyLonSpanDeg);
  if (!(availableWidth > 0) || !(availableHeight > 0))
    throw new Error(
      `the map has no box to draw in: ${availableWidth}x${availableHeight}. Everything else in the ` +
        `frame — the title, the legend, the caveat, the credit — has taken all of it.`,
    );
  const heightAtFullWidth = availableWidth / aspect;
  const boundBy = heightAtFullWidth <= availableHeight ? "width" : "height";
  const width = boundBy === "width" ? availableWidth : Math.floor(availableHeight * aspect);
  const height = boundBy === "width" ? Math.floor(heightAtFullWidth) : availableHeight;
  return {
    width,
    height,
    aspect,
    boundBy,
    letterboxed: availableHeight - height > 0.5,
    spareHeightPx: availableHeight - height,
    spareWidthPx: availableWidth - width,
    ceilingPx: maxStageHeightPx(width, studyLonSpanDeg),
  };
}

/**
 * The longitude a committed plate's camera actually showed, read off `geometry.json`'s own
 * `frameCorners` — not the `bounds` somebody typed, which `geo.ts` measured admitting up to 2.46x
 * more longitude than the study set asked for.
 */
export function lonSpanOf(geometry) {
  const corners = geometry?.frameCorners;
  if (!corners || !Number.isFinite(corners.east) || !Number.isFinite(corners.west))
    throw new Error(
      `this geometry.json records no frameCorners, so the longitude its camera showed is unknown. ` +
        `Re-bake the plate: the bake writes them, and every stage decision below reads them rather ` +
        `than the bounds that were asked for.`,
    );
  return corners.east - corners.west;
}

/**
 * THE TYPE SCALE A BEAT DRAWS AT, given the floor its size carries.
 *
 * `sizes.mjs` publishes `typeScale` as the row's DEFAULT over a beat's 900x560 base tokens, chosen
 * so the SEED's smallest token (12) lands exactly on the floor. A map beat whose own smallest token
 * is under 12 would miss the floor by construction — the locator's marker label is 11 — so this
 * returns the scale that puts the beat's own smallest token on its size's floor, never below the
 * table's default.
 *
 * It is deliberately NOT a licence to keep small tokens: `assertTypeFloor` measures the rendered
 * markup and is what actually refuses. This is the derivation that stops a beat needing to be
 * hand-tuned per size, and it can only ever make type BIGGER — nothing in the removal ladder makes
 * type smaller.
 */
export function typeScaleFor(row, smallestBaseTokenPx) {
  if (!(smallestBaseTokenPx > 0))
    throw new Error(`a beat's smallest base token must be a positive number, got ${smallestBaseTokenPx}`);
  return Math.max(row.typeScale, row.minTypePx / smallestBaseTokenPx);
}
