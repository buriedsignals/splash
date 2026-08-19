/**
 * EVERY COMMITTED MAP SCROLLY IS A LIVE MAPTILER MAP, AND NONE OF THEM HAS CONTROLS.
 *
 * The owner drove the three map scrollys on 2026-08-10 and reported the fact rather than a
 * preference: *"j'ai l'impression que le scrolly map n'utilise pas MapTiler correctement, je ne
 * vois aucun canvas dans le DOM. Or il faut tout le temps utiliser MapTiler."* He was right —
 * `maplibregl`, `api.maptiler.com` and `<canvas>` were all **0** on all three committed pages, and
 * `AUDIT-W5-W6-map.md` §5.6 had already measured what that class of gap is worth: the whole live
 * layer could be deleted from the map × web format and **354 tests stayed green**.
 *
 * `skills/map-web/test/the-live-layer-is-in-the-artifact.test.ts` closed that for map × web.
 * This file is its scrolly sibling, and it asserts one thing more, because the two formats were
 * ruled differently on the same day and the difference is the kind that gets "fixed" by a later
 * agent who reads it as an omission:
 *
 *   - map × WEB gets MapTiler's own zoom and pan controls (R1) — the reader IS the camera there;
 *   - map × SCROLLY gets NONE (*"Pas de controls sur le scrolly, le scroll pilote et la map doit
 *     prendre toute la largeur"*) — the scroll is the camera, and a reader-moved view would be
 *     taken back by the next step.
 *
 * So this file fails BOTH ways: a scrolly that has stopped being live, and a scrolly that has grown
 * a control.
 *
 * It is about the BYTES ON DISK, deliberately, because "the mechanism exists" was true the whole
 * time every artifact the owner could open was a baked plate.
 *
 * THE MUTATIONS THAT REDDEN IT, run in an rsync copy outside this tree
 * (`<scratch>/mut-scrolly-live/twin`), with the red they produced.
 *
 * M1 — the live layer stripped from one beat's renderer: in
 *      `proof/mapscrolly-one-map-europe-carbon/render.mjs`, the two `createElement("script"…)` and
 *      `createElement("style"…)` calls that inline maplibre-gl removed, and the page re-rendered.
 *
 *        error: this page has no live map: it is missing new win.maplibregl.Map. A reader opens the
 *               baked plate.
 *        (fail) every committed map scrolly is a live MapTiler map >
 *               proof/mapscrolly-one-map-europe-carbon/render/one-map-four-readings.html is live
 *         6 pass, 1 fail
 *
 * M2 — a control added back, the way an agent reading map × web's seed would add it: in
 *      `proof/mapscrolly-one-map-europe-carbon/live-scroll-map.mjs`, one line
 *      `map.addControl(new win.maplibregl.NavigationControl({ showCompass: false }), "top-right");`
 *      after the constructor, and the page re-rendered.
 *
 *        error: this page constructs new win.maplibregl.NavigationControl. On a scrolly the scroll
 *               drives the camera, so a reader-moved camera is overridden by the next step — the
 *               owner ruled these out by name. This is a deliberate difference from map x web,
 *               where R1 requires them; see scrolly/references/scrolly-discipline.md.
 *        (fail) no map scrolly gives the reader controls the scroll would fight >
 *               proof/mapscrolly-one-map-europe-carbon/render/one-map-four-readings.html has no
 *               controls
 *         6 pass, 1 fail
 *
 * M3 — the anti-vacuity pin: `MAP_SCROLLY_PAGES` emptied, so both sweeps above run over nothing —
 *      which is exactly the state the audit found the tree in. **The first version of the pin did
 *      not catch this** (1 pass, 0 fail: it compared the named list, filtered, against itself). The
 *      pin now discovers the beats from the tree:
 *
 *        error: expect(received).toEqual(expected)
 *        (fail) every committed map scrolly is a live MapTiler map > should find the pages it is
 *               supposed to be checking
 *         0 pass, 1 fail
 */
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const TWIN = join(import.meta.dirname, "..", "..", "..");

/**
 * The map scrollys, by PATH, named rather than discovered.
 *
 * Named, because a sweep that finds nothing to do passes — and that is precisely the state
 * `AUDIT-W5-W6-map.md` found: it reported "0 of 9" for a format whose guard did not exist. A beat
 * that stops committing its rendered file has to redden here rather than quietly leave the list.
 */
const MAP_SCROLLY_PAGES = [
  "proof/mapmore-scrolly-danube/render/danube-scrolly.html",
  "proof/mapmore-scrolly-route-access/render/route-access.html",
  "proof/mapscrolly-one-map-europe-carbon/render/one-map-four-readings.html",
  "proof/mapscrolly-quakes-three-ways/render/quakes-four-maps.html",
];

/**
 * What a live map scrolly must contain, each string chosen so it can only be there because the live
 * layer is. `maplibregl` alone would not do — it appears throughout the inlined library whether or
 * not this format ever calls it — so the markers are the CALL SITES this format's own duplicated
 * `live-scroll-map.mjs` makes: the constructor, the warm, the MapTiler request R1 accepts, and the
 * placeholder R1b requires in the key's place.
 */
const LIVE_MARKERS = [
  "api.maptiler.com/maps/",
  "new win.maplibregl.Map",
  "warmCameras",
  "__MAPTILER" + "_KEY__",
];

/**
 * What a map scrolly must NOT contain: a control CONSTRUCTION. The class name alone is worthless as
 * a signal — `NavigationControl` appears twice in every page here because the library exports it —
 * so what is banned is this format's own `new win.maplibregl.NavigationControl`, which is the exact
 * line `map-web/assets/live-map.mjs` carries and which R1 requires THERE.
 */
const CONTROL_MARKERS = [
  "new win.maplibregl.NavigationControl",
  "new win.maplibregl.ScaleControl",
  "new win.maplibregl.FullscreenControl",
];

function tracked(): string[] {
  return execFileSync("git", ["ls-files", "-z", "--", "."], {
    cwd: TWIN,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
}

function read(rel: string): string {
  return readFileSync(join(TWIN, rel), "utf8");
}

describe("every committed map scrolly is a live MapTiler map", () => {
  it("should find the pages it is supposed to be checking", () => {
    // ANTI-VACUITY, and the first version of it was itself vacuous — which is the whole reason this
    // project runs the mutation before shipping the guard. It filtered the named list against the
    // tracked files and compared the result with the named list, so emptying the list compared
    // `[]` with `[]`: watched in the mutation copy, **1 pass / 0 fail**. The pin has to come from
    // the TREE rather than from the list. Every tracked HTML under a `map…scrolly-…` beat is
    // discovered here and the named list must be exactly that set — so emptying the list reddens,
    // and so does a new map scrolly nobody added to it.
    const discovered = tracked()
      .filter(
        (rel) =>
          /^proof\/map[a-z]*-?scrolly-[a-z0-9-]+\//.test(rel) &&
          rel.endsWith(".html"),
      )
      .sort();
    expect(discovered.length).toBeGreaterThan(0);
    expect([...MAP_SCROLLY_PAGES].sort()).toEqual(discovered);
  });

  for (const rel of MAP_SCROLLY_PAGES)
    it(`${rel} is live`, () => {
      const html = read(rel);
      const missing = LIVE_MARKERS.filter((marker) => !html.includes(marker));
      if (missing.length > 0)
        throw new Error(
          `this page has no live map: it is missing ${missing.join(", ")}. A reader opens the baked plate.`,
        );
      expect(missing).toEqual([]);
    });
});

describe("no map scrolly gives the reader controls the scroll would fight", () => {
  for (const rel of MAP_SCROLLY_PAGES)
    it(`${rel} has no controls`, () => {
      const html = read(rel);
      const found = CONTROL_MARKERS.filter((marker) => html.includes(marker));
      if (found.length > 0)
        throw new Error(
          `this page constructs ${found.join(", ")}. On a scrolly the scroll drives the camera, so a ` +
            `reader-moved camera is overridden by the next step — the owner ruled these out by name. ` +
            `This is a deliberate difference from map x web, where R1 requires them; see ` +
            `scrolly/references/scrolly-discipline.md.`,
        );
      // And the camera is not merely uncontrolled by omission: it is constructed refusing every
      // reader gesture, which is what stops a wheel over the map eating the scroll that drives it.
      expect(html).toContain("interactive: false");
    });
});
