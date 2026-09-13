// twin/proof/video-choropleth-europe-lowcarbon/states.mjs
//
// THE CHOREOGRAPHY OF BRIEF.md, AS NUMBERS — one plain `Record<string, number>` per event, in
// `EVENT_ORDER`, run through `assertEventStates` (`skills/chart-video/scripts/choreography.mjs`) so
// an event that would leave the picture untouched is refused before a frame is ever rendered
// (`skills/chart-video/references/directed-type-choreography.md`, rule 2).
//
// EVERY DERIVED VALUE BRIEF.md NAMES IS ASSERTED HERE, against the SAME `loadSubject` the static
// beat reads its own claim from — reported 40, unreported 1, the six class counts 8·6·6·8·5·7
// summing to 40, the top class 7, six named at `reveal`, Albania in `above` at 100 %, Albania's
// three measured neighbours maxing under 60 %, and the 33 stepped back at `conclusion`. A number
// that stops matching the BRIEF throws here, the same discipline `loadSubject` itself applies to the
// claim's own count of seven.
//
// THE CAMERA NUMBERS. `establish`, `reference` and `reveal` sit at the still's own overview camera
// (`cameraFor`, re-used rather than re-derived — the same corners `proof/static-choropleth-europe-
// lowcarbon/beat.mjs`'s `CAMERA` is built from). `subject` closes on the Balkans window BRIEF.md
// names, 18.4-26.6°E x 36.4-43.5°N; `conclusion` and `hold` pull back to the establish camera again
// ("conclusion camera = establish camera", BRIEF.md).
//
// THE CAMERA IS FITTED TO THE CALLER'S OWN MAP BOX, NOT A HARD-CODED ONE. Fitting a window into a
// pixel box needs an actual pixel box, and the three filed directions draw different ones (creme and
// rapport near 920x837, nocturne 782x743, checked by hand) — a camera fitted to one direction's box
// and drawn inside a NARROWER one shows less of the window on the binding axis than the window needs,
// which is exactly how a fixed camera would crop Kosovo or Greece out of nocturne's own frame. So
// `statesFor` takes `drawn` — the direction's own `videoLayoutFor(...).drawn` — from its caller; this
// module never reads a direction file or resolves a register itself. The fit is the MapLibre/Mapbox
// GL convention `beat.mjs`'s own `cameraFor` inverts — a world painted at `worldPx` pixels sits at
// zoom `log2(worldPx / 512)` — read here from a window and a box to a zoom, rather than from a box to
// a window.

import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";
import { CAMERA_ASPECT, cameraFor } from "../static-choropleth-europe-lowcarbon/beat.mjs";

// ── the camera: a window in degrees, fit into a pixel box, the MapLibre way ─────────────────────

const RAD = Math.PI / 180;
const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
const worldX = (lon) => (lon + 180) / 360;
const worldY = (lat) => (1 - mercY(lat) / Math.PI) / 2;
const latOf = (y) => (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - Math.PI / 2) / RAD;

/** MapLibre/Mapbox GL's own definition: zoom 0 shows the whole (normalised) world painted into one
 *  512px tile, so a world painted `worldPx` pixels wide sits at `log2(worldPx / 512)`. */
const TILE_SIZE = 512;
function fitCamera(window, box) {
  const worldPx = Math.min(
    box.width / (worldX(window.east) - worldX(window.west)),
    box.height / (worldY(window.south) - worldY(window.north)),
  );
  const cx = (worldX(window.west) + worldX(window.east)) / 2;
  const cy = (worldY(window.north) + worldY(window.south)) / 2;
  return { zoom: Math.log2(worldPx / TILE_SIZE), centerLon: cx * 360 - 180, centerLat: latOf(cy) };
}

/** BRIEF.md's zoom window for the `subject` event: the union of the five largest rings around
 *  Albania, 18.4-26.6°E x 36.4-43.5°N. */
const BALKANS_WINDOW = { west: 18.4, east: 26.6, south: 36.4, north: 43.5 };

// ── the derived values BRIEF.md names, asserted against the same loadSubject the still reads ────

function classIndexOf(value, breaks) {
  for (let i = 0; i < breaks.length; i++) if (value < breaks[i]) return i;
  return breaks.length;
}

/** Every number BRIEF.md's choreography table names, checked against the loaded subject — throws
 *  naming the mismatch the moment the frozen data stops supporting the sentence, exactly like
 *  `loadSubject`'s own assertions about `above.length` and the neighbours. */
function assertDerivedValues(subject) {
  const { value, BREAKS, FLOOR, above, ODD_ONE, neighbours, unreported, studySet, format } = subject;

  if (value.size !== 40)
    throw new Error(`establish reports 40 countries; loadSubject carries ${value.size}`);
  if (unreported.length !== 1)
    throw new Error(`establish reports 1 unreported country; loadSubject carries ${unreported.length}`);
  if (studySet.length !== value.size + unreported.length)
    throw new Error(
      `the study set (${studySet.length}) should be the reported (${value.size}) plus the ` +
        `unreported (${unreported.length})`,
    );

  const counts = new Array(BREAKS.length + 1).fill(0);
  for (const v of value.values()) counts[classIndexOf(v.lowCarbon, BREAKS)]++;
  const EXPECTED_COUNTS = [8, 6, 6, 8, 5, 7];
  if (counts.join(",") !== EXPECTED_COUNTS.join(","))
    throw new Error(
      `reveal's six class counts should be ${EXPECTED_COUNTS.join("·")}; the data now classes ` +
        `${counts.join("·")}`,
    );
  if (counts.reduce((a, b) => a + b, 0) !== 40)
    throw new Error(`the six class counts should sum to 40 reported countries; they sum to ${counts.reduce((a, b) => a + b, 0)}`);

  if (counts[counts.length - 1] !== 7 || above.length !== 7)
    throw new Error(`the top class and \`above\` should both count 7; they count ${counts[counts.length - 1]} and ${above.length}`);

  const namedAtReveal = above.filter((r) => r.iso !== ODD_ONE).length;
  if (namedAtReveal !== 6)
    throw new Error(`reveal names six of the seven above the floor; it would name ${namedAtReveal}`);

  const odd = value.get(ODD_ONE);
  if (!odd || format(odd.lowCarbon) !== "100 %")
    throw new Error(`subject asserts Albania at 100 %; loadSubject carries ${odd ? format(odd.lowCarbon) : "no value"}`);
  if (!above.some((r) => r.iso === ODD_ONE))
    throw new Error(`Albania should be in \`above\` at ${FLOOR} %+; it is not`);

  if (neighbours.length !== 3)
    throw new Error(`subject asserts 3 measured neighbours; loadSubject carries ${neighbours.length}`);
  const maxNeighbour = Math.max(...neighbours.map((iso) => value.get(iso).lowCarbon));
  if (!(maxNeighbour < 60))
    throw new Error(`every measured neighbour should be under 60 %; the highest is ${maxNeighbour.toFixed(1)} %`);

  const steppedBack = value.size - above.length;
  if (steppedBack !== 33)
    throw new Error(`conclusion's filter steps back 33 countries; value.size - above.length is ${steppedBack}`);
}

/**
 * The choreography of BRIEF.md, as one numeric state per event. `establish`, `reference` and
 * `reveal` share the overview camera; `subject` closes on the Balkans; `conclusion` and `hold` pull
 * back to the overview again, `hold` restating `conclusion` exactly — the one case
 * `assertEventStates` now allows, because a hold plays no gesture of its own.
 *
 * A state is the picture at the END of its event, not a script of what happens inside one — a name
 * gated on its own class's fill, neighbour values arriving only once the camera has settled, the
 * conclusion sentence arriving only after the pull-back: all sub-event timing BRIEF.md describes is
 * the composition's job to read off `BRIEF.md` directly, not this module's to encode.
 *
 * @param {{ drawn: { width: number, height: number } }} options `drawn` is the direction's own
 *        `videoLayoutFor(...).drawn` (`layout.mjs`) — the map box the camera is actually fitted to.
 */
export function statesFor(subject, { drawn } = {}) {
  if (!drawn || !(drawn.width > 0) || !(drawn.height > 0))
    throw new Error(
      `statesFor needs the direction's own drawn map box as { drawn: { width, height } } — a ` +
        `camera fitted to one direction's box and drawn inside another crops the window on the ` +
        `binding axis. Got ${JSON.stringify(drawn)}.`,
    );
  assertDerivedValues(subject);

  const overviewWindow = cameraFor({ width: 1000, height: 1000 / CAMERA_ASPECT }).corners;
  const overview = fitCamera(overviewWindow, drawn);
  const balkans = fitCamera(BALKANS_WINDOW, drawn);

  const furniture = 1;
  const conclusionState = {
    furniture,
    referenceMark: 1,
    classesRevealed: 6,
    namesShown: 7,
    ...overview,
    ring: 1,
    neighbourValues: 0,
    filterBelowFloor: 1,
    conclusion: 1,
  };

  const byEvent = {
    establish: {
      furniture,
      referenceMark: 0,
      classesRevealed: 0,
      namesShown: 0,
      ...overview,
      ring: 0,
      neighbourValues: 0,
      filterBelowFloor: 0,
      conclusion: 0,
    },
    reference: {
      furniture,
      referenceMark: 1,
      classesRevealed: 0,
      namesShown: 0,
      ...overview,
      ring: 0,
      neighbourValues: 0,
      filterBelowFloor: 0,
      conclusion: 0,
    },
    reveal: {
      furniture,
      referenceMark: 1,
      classesRevealed: 6,
      namesShown: 6,
      ...overview,
      ring: 0,
      neighbourValues: 0,
      filterBelowFloor: 0,
      conclusion: 0,
    },
    subject: {
      furniture,
      referenceMark: 1,
      classesRevealed: 6,
      namesShown: 7,
      ...balkans,
      ring: 1,
      neighbourValues: 1,
      filterBelowFloor: 0,
      conclusion: 0,
    },
    conclusion: conclusionState,
    // A hold plays no gesture of its own: its state equals conclusion's exactly
    // (`assertEventStates`'s one named exception, `skills/chart-video/scripts/choreography.mjs`).
    hold: { ...conclusionState },
  };

  return assertEventStates(
    EVENT_ORDER.map((name) => byEvent[name]),
    EVENT_ORDER,
  );
}
