import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { EVENT_ORDER } from "#shared/chart-video/timing.ts";
import { registerOf } from "#shared/design-base/register.mjs";
import { readDirection } from "../../scripts/design-base/read-direction.mjs";
import { resolveDirectionFamilies } from "../../scripts/design-base/resolve-families.mjs";
import { videoRegistersOf } from "../../skills/map-beat/scripts/video-registers.mjs";
import { assertEventStates } from "../../skills/chart-video/scripts/choreography.mjs";
import {
  CAMERA_ASPECT,
  copyOf,
  loadSubject,
} from "../static-choropleth-europe-lowcarbon/beat.mjs";
import { caseCopy, videoCopyOf, videoLayoutFor } from "./layout.mjs";
import { statesFor } from "./states.mjs";

/**
 * Pins the choreography of `BRIEF.md` as numbers: every event's state passes `assertEventStates`
 * (each event changes the picture, the final hold restates the conclusion exactly — the one
 * exemption `skills/chart-video/scripts/choreography.mjs` names), and every derived value the BRIEF
 * asserts is hand-copied here from the BRIEF's own choreography table, not recomputed by the code
 * under test.
 *
 * `states.mjs` no longer reads a direction file itself (fix round 1): the caller hands it `drawn`,
 * the direction's own `videoLayoutFor(...).drawn`. Most of this file's behavioural tests only need
 * SOME real box, so `DRAWN` below is built once from one filed direction, the same way
 * `layout.test.ts` builds one for its own tests. The "camera geometry" block further down is the
 * one that actually varies the box, to pin `statesFor` against fitting the wrong direction's box.
 */

const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const DIRECTIONS = join(
  import.meta.dirname,
  "..",
  "..",
  "docs",
  "design-base",
  "directions",
);

const subject = loadSubject({
  dir: join(import.meta.dirname, "..", "static-choropleth-europe-lowcarbon"),
});

function drawnFor(file: string) {
  const { textPerRegister } = copyOf(subject);
  const rawCopy = videoCopyOf(subject);
  const direction = resolveDirectionFamilies(
    readDirection(join(DIRECTIONS, file)),
    textPerRegister,
  );
  const resolved = Object.fromEntries(
    REGISTER_NAMES.map((n) => [n, registerOf(direction, n)]),
  );
  const registers = videoRegistersOf(resolved, "landscape");
  const copy = caseCopy(rawCopy, registers);
  return videoLayoutFor({
    registers,
    copy,
    aspect: CAMERA_ASPECT,
    size: "landscape",
  }).drawn;
}

const DRAWN = drawnFor("creme.md");

describe("statesFor", () => {
  const states = statesFor(subject, { drawn: DRAWN });

  it("should refuse to run without the caller's own drawn map box", () => {
    // @ts-expect-error — exercising the missing-argument guard on purpose
    expect(() => statesFor(subject)).toThrow(
      /needs the direction's own drawn map box/,
    );
    expect(() =>
      statesFor(subject, { drawn: { width: 0, height: 800 } }),
    ).toThrow(/needs the direction's own drawn map box/);
  });

  it("should return one state per event, in EVENT_ORDER", () => {
    expect(states.length).toBe(EVENT_ORDER.length);
  });

  it("should give every field a finite number, on every event", () => {
    for (const state of states)
      for (const value of Object.values(state))
        expect(Number.isFinite(value)).toBe(true);
  });

  it("should change the picture at every event but the final hold", () => {
    // statesFor already runs its result through assertEventStates; calling it again here pins the
    // behaviour against a change to statesFor's own event order, not just to the guard.
    expect(() => statesFor(subject, { drawn: DRAWN })).not.toThrow();
  });

  it("should hold the conclusion frame exactly — hold plays no gesture of its own", () => {
    const [, , , , conclusion, hold] = states;
    expect(hold).toEqual(conclusion);
  });

  it("should mark the reference event, and only from there on, with the 94 % accent", () => {
    const [establish, reference, reveal] = states;
    expect(establish.referenceMark).toBe(0);
    expect(reference.referenceMark).toBe(1);
    expect(reveal.referenceMark).toBe(1);
  });

  it("should fill all six classes by the end of reveal, hand-derived: 8+6+6+8+5+7 = 40", () => {
    const [, , reveal] = states;
    expect(reveal.classesRevealed).toBe(6);
  });

  it("should name six countries at reveal and the seventh — Albania — once subject settles", () => {
    const [, , reveal, subjectState] = states;
    expect(reveal.namesShown).toBe(6);
    expect(subjectState.namesShown).toBe(7);
  });

  it("should ring Albania and print its neighbours' values only during subject", () => {
    const [establish, , , subjectState, conclusion] = states;
    expect(establish.ring).toBe(0);
    expect(subjectState.ring).toBe(1);
    expect(subjectState.neighbourValues).toBe(1);
    // the neighbour values leave with the zoom (BRIEF.md), the ring does not
    expect(conclusion.neighbourValues).toBe(0);
    expect(conclusion.ring).toBe(1);
  });

  it("should step the 33 below-floor countries back only at conclusion and hold", () => {
    const [establish, reference, reveal, subjectState, conclusion, hold] =
      states;
    expect(
      [establish, reference, reveal, subjectState].map(
        (s) => s.filterBelowFloor,
      ),
    ).toEqual([0, 0, 0, 0]);
    expect(conclusion.filterBelowFloor).toBe(1);
    expect(hold.filterBelowFloor).toBe(1);
  });

  it("should close the camera on the Balkans only at subject, and return to the establish camera at conclusion", () => {
    const [establish, reference, reveal, subjectState, conclusion] = states;
    expect([reference.zoom, reveal.zoom]).toEqual([
      establish.zoom,
      establish.zoom,
    ]);
    expect(subjectState.zoom).toBeGreaterThan(establish.zoom);
    expect(conclusion.zoom).toBe(establish.zoom);
    expect(conclusion.centerLon).toBe(establish.centerLon);
    expect(conclusion.centerLat).toBe(establish.centerLat);
  });

  it("should print the conclusion sentence only from conclusion on", () => {
    const [establish, reference, reveal, subjectState, conclusion, hold] =
      states;
    expect(
      [establish, reference, reveal, subjectState].map((s) => s.conclusion),
    ).toEqual([0, 0, 0, 0]);
    expect(conclusion.conclusion).toBe(1);
    expect(hold.conclusion).toBe(1);
  });
});

describe("the BRIEF's derived values, hand-copied from BRIEF.md's choreography table", () => {
  const { value, above, neighbours, unreported, ODD_ONE, format } = subject;

  it("should report 40 countries and leave 1 unreported (Ukraine)", () => {
    expect(value.size).toBe(40);
    expect(unreported.length).toBe(1);
  });

  it("should class the six reveal steps 8·6·6·8·5·7, summing to 40", () => {
    const BREAKS = subject.BREAKS;
    const counts = new Array(BREAKS.length + 1).fill(0);
    for (const v of value.values()) {
      let i = 0;
      while (i < BREAKS.length && v.lowCarbon >= BREAKS[i]) i++;
      counts[i]++;
    }
    expect(counts).toEqual([8, 6, 6, 8, 5, 7]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(40);
  });

  it("should hold exactly 7 countries above the 94 % floor", () => {
    expect(above.length).toBe(7);
  });

  it("should name 6 of the 7 above the floor at reveal, Albania held back for subject", () => {
    expect(above.filter((r) => r.iso !== ODD_ONE).length).toBe(6);
  });

  it("should place Albania in `above`, at 100 %", () => {
    expect(above.some((r) => r.iso === ODD_ONE)).toBe(true);
    expect(format(value.get(ODD_ONE).lowCarbon)).toBe("100 %");
  });

  it("should measure 3 neighbours for Albania, the highest under 60 % (Montenegro 59.5 %)", () => {
    expect(neighbours.length).toBe(3);
    const max = Math.max(...neighbours.map((iso) => value.get(iso).lowCarbon));
    expect(max).toBeLessThan(60);
    expect(Math.round(max * 10) / 10).toBe(59.5);
  });

  it("should step 33 countries back at conclusion (40 reported minus 7 above the floor)", () => {
    expect(value.size - above.length).toBe(33);
  });
});

describe("mutation: assertEventStates refuses two consecutive equal states", () => {
  it("should refuse a subject event that changes nothing from reveal", () => {
    const states = statesFor(subject, { drawn: DRAWN });
    const mutated = [...states];
    mutated[3] = { ...mutated[2] }; // subject == reveal
    expect(() => assertEventStates(mutated, EVENT_ORDER)).toThrow(
      /subject changes nothing/,
    );
  });
});

/**
 * CAMERA GEOMETRY — DIRECTION-AWARE (fix round 1).
 *
 * Independent Web-Mercator arithmetic, NOT `states.mjs`'s own `fitCamera`/`worldX`/`worldY` — a
 * hand-derived cross-check, the same discipline `checkTiming`'s own timing tests apply.
 *
 * Hand derivation, box 920x837, Balkans window 18.4-26.6°E x 36.4-43.5°N (worked with a calculator,
 * not run):
 *   worldX(18.4) = (18.4+180)/360 = 0.551111,  worldX(26.6) = (26.6+180)/360 = 0.573889
 *   lonSpan = 0.022778  ->  width-derived worldPx = 920 / 0.022778 = 40390.2
 *   mercY(lat) = ln(tan(pi/4 + lat*pi/360)); mercY(36.4) = 0.682927, mercY(43.5) = 0.844822
 *   worldY(lat) = (1 - mercY/pi)/2  ->  worldY(36.4) = 0.391309, worldY(43.5) = 0.365542
 *   latSpan = 0.025767  ->  height-derived worldPx = 837 / 0.025767 = 32483.6
 *   binding axis = latitude (the smaller of the two)  ->  worldPx = 32483.6
 *   zoom = log2(32483.6 / 512) = log2(63.4445) = 5.9874
 * (`states.test.ts` below checks `statesFor`'s own arithmetic against this by hand, not the other
 * way round — a mismatch here means the FORMULA drifted, not just the code.)
 */
describe("the camera fitted to two different directions' own map boxes", () => {
  // Two literal boxes named by the review that found the bug: creme/rapport's own (~920x837) and
  // nocturne's own (782x743) — deliberately NOT re-derived from `layout.mjs` here, so this block
  // does not depend on the directions still resolving to exactly these pixels.
  const CREME_BOX = { width: 920, height: 837 };
  const NOCTURNE_BOX = { width: 782, height: 743 };

  // The same small Web-Mercator helpers as `states.mjs`'s own, written again independently here —
  // an intentional duplication: the point is to check the FORMULA, not to import the code under
  // test's own copy of it.
  const RAD = Math.PI / 180;
  const mercY = (lat: number) =>
    Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2));
  const worldX = (lon: number) => (lon + 180) / 360;
  const worldY = (lat: number) => (1 - mercY(lat) / Math.PI) / 2;
  const latOf = (y: number) =>
    (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - Math.PI / 2) / RAD;
  const TILE_SIZE = 512;
  const BALKANS = { west: 18.4, east: 26.6, south: 36.4, north: 43.5 };

  function handZoom(box: { width: number; height: number }) {
    const widthPx = box.width / (worldX(BALKANS.east) - worldX(BALKANS.west));
    const heightPx =
      box.height / (worldY(BALKANS.south) - worldY(BALKANS.north));
    return Math.log2(Math.min(widthPx, heightPx) / TILE_SIZE);
  }

  /** The window a camera actually shows, computed from zoom + centre + box — the inverse of the
   *  fit, so a window this returns must contain BALKANS for the fit to have done its job. */
  function visibleBounds(
    camera: { zoom: number; centerLon: number; centerLat: number },
    box: { width: number; height: number },
  ) {
    const worldPx = TILE_SIZE * 2 ** camera.zoom;
    const cxPx = worldX(camera.centerLon) * worldPx;
    const cyPx = worldY(camera.centerLat) * worldPx;
    return {
      west: ((cxPx - box.width / 2) / worldPx) * 360 - 180,
      east: ((cxPx + box.width / 2) / worldPx) * 360 - 180,
      north: latOf((cyPx - box.height / 2) / worldPx),
      south: latOf((cyPx + box.height / 2) / worldPx),
    };
  }

  it("should match the hand-derived zoom (5.9874, see the derivation above) within 0.01, for creme/rapport's box", () => {
    const [, , , subjectState] = statesFor(subject, { drawn: CREME_BOX });
    expect(Math.abs(subjectState.zoom - handZoom(CREME_BOX))).toBeLessThan(
      0.01,
    );
  });

  it("should match its own hand-derived zoom within 0.01, for nocturne's narrower box", () => {
    const [, , , subjectState] = statesFor(subject, { drawn: NOCTURNE_BOX });
    expect(Math.abs(subjectState.zoom - handZoom(NOCTURNE_BOX))).toBeLessThan(
      0.01,
    );
  });

  it("should give nocturne's own box a lower zoom than creme/rapport's — a narrower box needs to zoom out further to fit the same window", () => {
    const cremeSubject = statesFor(subject, { drawn: CREME_BOX })[3];
    const nocturneSubject = statesFor(subject, { drawn: NOCTURNE_BOX })[3];
    expect(nocturneSubject.zoom).toBeLessThan(cremeSubject.zoom);
  });

  it("should keep the whole Balkans window inside the visible bounds, fitted to creme/rapport's own box", () => {
    const [, , , subjectState] = statesFor(subject, { drawn: CREME_BOX });
    const bounds = visibleBounds(subjectState, CREME_BOX);
    const EPS = 1e-6; // floating-point slack on the binding axis, which the fit touches exactly
    expect(bounds.west).toBeLessThanOrEqual(BALKANS.west + EPS);
    expect(bounds.east).toBeGreaterThanOrEqual(BALKANS.east - EPS);
    expect(bounds.south).toBeLessThanOrEqual(BALKANS.south + EPS);
    expect(bounds.north).toBeGreaterThanOrEqual(BALKANS.north - EPS);
  });

  it("should keep the whole Balkans window inside the visible bounds, fitted to nocturne's own (narrower) box", () => {
    const [, , , subjectState] = statesFor(subject, { drawn: NOCTURNE_BOX });
    const bounds = visibleBounds(subjectState, NOCTURNE_BOX);
    const EPS = 1e-6;
    expect(bounds.west).toBeLessThanOrEqual(BALKANS.west + EPS);
    expect(bounds.east).toBeGreaterThanOrEqual(BALKANS.east - EPS);
    expect(bounds.south).toBeLessThanOrEqual(BALKANS.south + EPS);
    expect(bounds.north).toBeGreaterThanOrEqual(BALKANS.north - EPS);
  });

  it("should NOT contain the Balkans window when nocturne's own box is drawn with creme/rapport's camera — the bug this fix closes", () => {
    const cremeSubject = statesFor(subject, { drawn: CREME_BOX })[3];
    const bounds = visibleBounds(cremeSubject, NOCTURNE_BOX);
    // creme/rapport's camera is more zoomed in than nocturne's own would be, so drawn into
    // nocturne's narrower box it shows LESS than the window on the binding (latitude) axis —
    // exactly the crop the review named (Kosovo, Greece sit near this edge).
    expect(bounds.south).toBeGreaterThan(BALKANS.south);
    expect(bounds.north).toBeLessThan(BALKANS.north);
  });
});
