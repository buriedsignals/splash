// camera-measure.test.ts — the instrument, tested two ways.
//
// PART 1-5 are SYNTHETIC: a frame is painted from a KNOWN camera (zoom + centre) with
// `paint`, then measured back. That is a genuine round trip and not a restatement — the
// painter uses `scaleFromZoom`/`mercatorUV` to place discs, the measurer uses connected
// components, RANSAC and `zoomFromScale` to recover them, and nothing but the projection is
// shared. No render, no ffmpeg, no network: the geometry is arithmetic and is proved as
// arithmetic.
//
// PART 6 is GROUND TRUTH: the real hue masks of real rendered mp4 frames, committed as a
// fixture, asserted to reproduce the zooms tour-box.ts already publishes. See
// ./camera-measure.fixture.json for how it was extracted and what it does and does not cover.
import { describe, it, expect } from "bun:test";
import fixture from "./camera-measure.fixture.json";
import {
  mercatorUV,
  inverseMercator,
  zoomFromScale,
  scaleFromZoom,
  rgbToHsv,
  hueOfHex,
  hueMask,
  findBlobs,
  findMarks,
  fitCamera,
  measureCamera,
  encodeMaskRuns,
  decodeMaskRuns,
  TILE_SIZE,
  MAX_CANDIDATE_BLOBS,
  type Mark,
  type RawFrame,
  type Blob,
} from "./camera-measure";

// ---------------------------------------------------------------------------------
// A synthetic renderer: paint marks as filled discs, from a camera we choose.
// ---------------------------------------------------------------------------------

const BG: [number, number, number] = [238, 236, 231]; // a light basemap
const MARK_HEX = "#E69F00"; // Okabe-Ito orange — the locator dot fill
const MARK_RGB: [number, number, number] = [0xe6, 0x9f, 0x00];

interface Camera {
  zoom: number;
  centreLon: number;
  centreLat: number;
}

function blank(width: number, height: number, rgb = BG): RawFrame {
  const data = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    data[i * 3] = rgb[0];
    data[i * 3 + 1] = rgb[1];
    data[i * 3 + 2] = rgb[2];
  }
  return { width, height, data };
}

/** Where a (lon,lat) lands in a frame under `cam` — the forward model the painter uses and
 *  the measurer must invert. */
function project(
  cam: Camera,
  frame: { width: number; height: number },
  lon: number,
  lat: number,
): { x: number; y: number } {
  const s = scaleFromZoom(cam.zoom);
  const c = mercatorUV(cam.centreLon, cam.centreLat);
  const p = mercatorUV(lon, lat);
  return {
    x: frame.width / 2 + (p.u - c.u) * s,
    y: frame.height / 2 + (p.v - c.v) * s,
  };
}

function disc(
  frame: RawFrame,
  cx: number,
  cy: number,
  radius: number,
  rgb: [number, number, number],
): void {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      if (x < 0 || y < 0 || x >= frame.width || y >= frame.height) continue;
      if ((x - cx) ** 2 + (y - cy) ** 2 > r2) continue;
      const i = (y * frame.width + x) * 3;
      frame.data[i] = rgb[0];
      frame.data[i + 1] = rgb[1];
      frame.data[i + 2] = rgb[2];
    }
  }
}

/** Blend a colour toward the background — how a DIMMED (non-subject) mark is painted. */
function dim(
  rgb: [number, number, number],
  alpha: number,
): [number, number, number] {
  return [
    Math.round(rgb[0] * alpha + BG[0] * (1 - alpha)),
    Math.round(rgb[1] * alpha + BG[1] * (1 - alpha)),
    Math.round(rgb[2] * alpha + BG[2] * (1 - alpha)),
  ];
}

function paint(
  cam: Camera,
  marks: readonly Mark[],
  opts: {
    width?: number;
    height?: number;
    radius?: number;
    /** Per-mark opacity; default fully opaque. */
    alpha?: (m: Mark) => number;
  } = {},
): RawFrame {
  // 1280x720 by default — the size map-native actually renders a landscape story at, and
  // wide enough to hold the glacier set at its own establishing zoom (which a 640x360 frame
  // is not: the set spans 431x470 px at z 8.478).
  const width = opts.width ?? 1280;
  const height = opts.height ?? 720;
  const radius = opts.radius ?? 7;
  const frame = blank(width, height);
  for (const m of marks) {
    const { x, y } = project(cam, frame, m.lon, m.lat);
    const a = opts.alpha ? opts.alpha(m) : 1;
    disc(frame, x, y, radius, dim(MARK_RGB, a));
  }
  return frame;
}

const HUE = hueOfHex(MARK_HEX);

// Four Alpine glaciers — the real coordinates the tour-box record is written against.
const GLACIERS: Mark[] = [
  { label: "Rhone", lon: 8.077508042316026, lat: 46.451632464223096 },
  { label: "Zmutt", lon: 7.661000215400804, lat: 45.986011489842674 },
  { label: "Trift", lon: 8.39847520305841, lat: 46.62606149864873 },
  { label: "Gorner", lon: 7.547186841148459, lat: 46.00520315741525 },
];

/** The glacier tour's own ESTABLISHING camera: the centre of the set's bounds, at the zoom
 *  the rendered mp4 was measured at. Using the real camera keeps the synthetic cases on the
 *  same geometry as the ground-truth ones. */
const GLACIER_CAM: Camera = {
  zoom: 8.478,
  centreLon: 7.9728,
  centreLat: 46.306,
};

// ---------------------------------------------------------------------------------
// PART 1 — the projection, on its own.
// ---------------------------------------------------------------------------------

describe("web mercator", () => {
  it("should place the origin at the centre of the unit square", () => {
    const { u, v } = mercatorUV(0, 0);
    expect(u).toBeCloseTo(0.5, 12);
    expect(v).toBeCloseTo(0.5, 12);
  });

  it("should place the antimeridian corners at the unit square's edges", () => {
    expect(mercatorUV(-180, 0).u).toBeCloseTo(0, 12);
    expect(mercatorUV(180, 0).u).toBeCloseTo(1, 12);
  });

  it("should put north at the TOP (v grows southward)", () => {
    expect(mercatorUV(0, 60).v).toBeLessThan(mercatorUV(0, 0).v);
  });

  it("should round-trip lon/lat through the inverse", () => {
    for (const [lon, lat] of [
      [8.0775, 46.4516],
      [-3.7038, 40.4168],
      [13.405, 52.52],
      [179.9, -41.2],
    ] as const) {
      const { u, v } = mercatorUV(lon, lat);
      const back = inverseMercator(u, v);
      expect(back.lon).toBeCloseTo(lon, 9);
      expect(back.lat).toBeCloseTo(lat, 9);
    }
  });

  it("should NOT wrap a longitude past 180 — an unwrapped antimeridian set must stay unwrapped", () => {
    // core/longitude.ts hands over east > +180 deliberately; wrapping here would tear the
    // very frame the measurement is reading.
    expect(mercatorUV(190, 0).u).toBeGreaterThan(1);
  });

  it("should convert scale to zoom against the 512-px tile world", () => {
    expect(zoomFromScale(TILE_SIZE)).toBe(0);
    expect(zoomFromScale(TILE_SIZE * 2)).toBe(1);
    expect(scaleFromZoom(9.47)).toBeCloseTo(TILE_SIZE * 2 ** 9.47, 9);
    expect(zoomFromScale(scaleFromZoom(13.258))).toBeCloseTo(13.258, 12);
  });
});

// ---------------------------------------------------------------------------------
// PART 2 — colour and mark finding.
// ---------------------------------------------------------------------------------

describe("hue detection", () => {
  it("should read the hue of a hex fill", () => {
    expect(hueOfHex("#E69F00")).toBeCloseTo(41.5, 1); // the locator dot
    expect(hueOfHex("#2171b5")).toBeCloseTo(207.6, 1); // the symbol circle
    expect(hueOfHex("ff0000")).toBeCloseTo(0, 6);
  });

  it("should refuse a malformed fill rather than measure against a silent 0", () => {
    expect(() => hueOfHex("#fff")).toThrow(/expected #rrggbb/);
    expect(() => hueOfHex("orange")).toThrow(/expected #rrggbb/);
  });

  it("should report grey as unsaturated so it can never anchor a hue", () => {
    const [, s] = rgbToHsv(128, 128, 128);
    expect(s).toBe(0);
  });

  it("should keep a DIMMED mark in the mask — the fallback L3 exists for", () => {
    // A 0.25-opacity mark is what every NON-SUBJECT mark is painted at, and losing them
    // means losing the second mark, which by L1 means no reading at all.
    const faint = dim(MARK_RGB, 0.25);
    const [h] = rgbToHsv(faint[0], faint[1], faint[2]);
    let dh = Math.abs(h - HUE);
    if (dh > 180) dh = 360 - dh;
    expect(dh).toBeLessThan(14); // within HUE_TOLERANCE_DEG
  });

  it("should find one blob per painted mark, centred on it", () => {
    const frame = paint(GLACIER_CAM, GLACIERS);
    const blobs = findMarks(frame, { hue: HUE });
    expect(blobs).toHaveLength(4);
    for (const m of GLACIERS) {
      const want = project(GLACIER_CAM, frame, m.lon, m.lat);
      const hit = blobs.find((b) => Math.hypot(b.x - want.x, b.y - want.y) < 1);
      expect(hit).toBeDefined();
    }
  });

  it("should reject a non-round same-hue region — the water that outnumbers the marks 38:1", () => {
    const frame = paint(GLACIER_CAM, GLACIERS);
    // A long thin river/coastline band in the mark's own hue.
    // Clear of every mark: the set's southernmost disc bottoms out at y ≈ 602 here, and a
    // band that merely TOUCHED it would be testing blob merging (L2), not the shape filter.
    for (let y = 650; y < 666; y++) {
      for (let x = 20; x < 1260; x++) {
        const i = (y * frame.width + x) * 3;
        frame.data[i] = MARK_RGB[0];
        frame.data[i + 1] = MARK_RGB[1];
        frame.data[i + 2] = MARK_RGB[2];
      }
    }
    // It IS in the mask — hue cannot tell it apart…
    const mask = hueMask(frame, { hue: HUE });
    let on = 0;
    for (const v of mask) on += v;
    expect(on).toBeGreaterThan(9000);
    // …and the shape filter is what removes it.
    expect(findMarks(frame, { hue: HUE })).toHaveLength(4);
  });

  it("should reject a blob smaller than the noise floor", () => {
    const frame = blank(64, 64);
    disc(frame, 32, 32, 1, MARK_RGB); // ~5 px, under MIN_BLOB_PIXELS
    expect(findBlobs(hueMask(frame, { hue: HUE }), 64, 64)).toHaveLength(0);
  });

  it("should round-trip a mask through the fixture's run-length codec", () => {
    // The encoder writes the committed ground truth and the decoder reads it. If they drift,
    // every ground-truth number silently becomes a measurement of the wrong pixels.
    const frame = paint(GLACIER_CAM, GLACIERS);
    const mask = hueMask(frame, { hue: HUE });
    const runs = encodeMaskRuns(mask);
    expect(decodeMaskRuns(runs, mask.length)).toEqual(mask);
    // It must start with an OFF run, even when the very first pixel is on.
    const leading = new Uint8Array([1, 1, 0, 0]);
    expect(encodeMaskRuns(leading)).toEqual([0, 2, 2]);
    expect(decodeMaskRuns([0, 2, 2], 4)).toEqual(leading);
  });

  it("should refuse a TRUNCATED fixture rather than measure a partial frame", () => {
    expect(() => decodeMaskRuns([0, 2, 2], 100)).toThrow(
      /cover 4 px, expected 100/,
    );
    expect(() => decodeMaskRuns([0, 500], 100)).toThrow(/overflow/);
  });

  it("should refuse a frame whose buffer does not match its declared size", () => {
    expect(() =>
      hueMask(
        { width: 10, height: 10, data: new Uint8Array(12) },
        { hue: HUE },
      ),
    ).toThrow(/expected 300 bytes|expected 300/);
  });
});

// ---------------------------------------------------------------------------------
// PART 3 — the round trip: paint a known camera, measure it back.
// ---------------------------------------------------------------------------------

describe("measureCamera round trip", () => {
  // The exact zooms the record publishes, plus the extremes of the range a tour reaches.
  for (const zoom of [4.224, 8.478, 9.47, 12.721, 13.258, 14.26]) {
    it(`should recover a painted zoom of ${zoom}`, () => {
      const cam: Camera = { zoom, centreLon: 7.97, centreLat: 46.3 };
      // Marks placed by ANGLE around the centre, so every case has four in frame whatever
      // the zoom — a fixed lon/lat set would fly apart past z 10.
      const spreadDeg = 60 / 2 ** zoom;
      const marks: Mark[] = [
        { label: "N", lon: cam.centreLon, lat: cam.centreLat + spreadDeg },
        { label: "S", lon: cam.centreLon, lat: cam.centreLat - spreadDeg },
        { label: "E", lon: cam.centreLon + spreadDeg, lat: cam.centreLat },
        { label: "W", lon: cam.centreLon - spreadDeg, lat: cam.centreLat },
      ];
      const reading = measureCamera(paint(cam, marks), marks, { hue: HUE });
      expect(reading.ok).toBe(true);
      if (!reading.ok) return;
      // L5: never assert tighter than ±0.02 levels. Synthetic pixels are cleaner than a
      // codec's, but the tolerance the instrument CLAIMS is the tolerance it is held to.
      expect(reading.fit.zoom).toBeCloseTo(zoom, 2);
      expect(reading.fit.centreLon).toBeCloseTo(cam.centreLon, 3);
      expect(reading.fit.centreLat).toBeCloseTo(cam.centreLat, 3);
      expect(reading.fit.inliers).toBe(4);
      expect(reading.fit.residualPx).toBeLessThan(1);
    });
  }

  it("should recover the zoom of a NEAR-VERTICAL ribbon, where x alone carries almost nothing", () => {
    // The Seine-sites shape, and the reason the fit solves ONE isotropic scale over both
    // axes rather than an x scale and a y scale. Here the marks span ~5 px horizontally and
    // ~250 px vertically: a refine that read only x would be fitting rounding noise.
    const cam: Camera = { zoom: 13.258, centreLon: 2.33, centreLat: 48.857 };
    const marks: Mark[] = [
      { label: "n2", lon: cam.centreLon + 0.0002, lat: cam.centreLat + 0.006 },
      { label: "n1", lon: cam.centreLon - 0.0002, lat: cam.centreLat + 0.002 },
      { label: "s1", lon: cam.centreLon + 0.0002, lat: cam.centreLat - 0.002 },
      { label: "s2", lon: cam.centreLon - 0.0002, lat: cam.centreLat - 0.006 },
    ];
    const frame = paint(cam, marks);
    expect(findMarks(frame, { hue: HUE })).toHaveLength(4);
    const reading = measureCamera(frame, marks, { hue: HUE });
    expect(reading.ok).toBe(true);
    if (!reading.ok) return;
    expect(reading.fit.zoom).toBeCloseTo(cam.zoom, 2);
    expect(reading.fit.inliers).toBe(4);
  });

  it("should read the SAME zoom wherever the map sits in the frame — the offset cancels", () => {
    // L-zero of the method, and the reason a furniture inset costs nothing (L7).
    const cam: Camera = GLACIER_CAM;
    const a = measureCamera(paint(cam, GLACIERS), GLACIERS, { hue: HUE });
    // Same camera, but the whole map shifted 120 px right and 45 px down inside the frame.
    const shifted = blank(1280, 720);
    for (const m of GLACIERS) {
      const p = project(cam, shifted, m.lon, m.lat);
      disc(shifted, p.x + 120, p.y + 45, 7, MARK_RGB);
    }
    const b = measureCamera(shifted, GLACIERS, { hue: HUE });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(b.fit.zoom).toBeCloseTo(a.fit.zoom, 6);
    // …while the CENTRE moves by exactly the shift, which is L7 stated as a test.
    expect(b.fit.centreLat).not.toBeCloseTo(a.fit.centreLat, 3);
  });

  it("should be insensitive to mark radius — a bigger dot is not a closer camera", () => {
    const cam: Camera = GLACIER_CAM;
    const small = measureCamera(paint(cam, GLACIERS, { radius: 4 }), GLACIERS, {
      hue: HUE,
    });
    const big = measureCamera(paint(cam, GLACIERS, { radius: 12 }), GLACIERS, {
      hue: HUE,
    });
    expect(small.ok && big.ok).toBe(true);
    if (!small.ok || !big.ok) return;
    expect(big.fit.zoom).toBeCloseTo(small.fit.zoom, 2);
  });

  it("should measure a frame whose non-subject marks are dimmed to 0.25", () => {
    const cam: Camera = GLACIER_CAM;
    const frame = paint(cam, GLACIERS, {
      alpha: (m) => (m.label === "Rhone" ? 0.95 : 0.25),
    });
    const reading = measureCamera(frame, GLACIERS, { hue: HUE });
    expect(reading.ok).toBe(true);
    if (!reading.ok) return;
    expect(reading.fit.zoom).toBeCloseTo(cam.zoom, 2);
    expect(reading.fit.inliers).toBe(4);
  });

  it("should reject a same-hue legend swatch as an outlier instead of biasing the fit", () => {
    const cam: Camera = GLACIER_CAM;
    const frame = paint(cam, GLACIERS);
    disc(frame, 40, 330, 7, MARK_RGB); // a legend key, round and in-hue
    disc(frame, 40, 310, 7, MARK_RGB);
    expect(findMarks(frame, { hue: HUE })).toHaveLength(6);
    const reading = measureCamera(frame, GLACIERS, { hue: HUE });
    expect(reading.ok).toBe(true);
    if (!reading.ok) return;
    expect(reading.fit.zoom).toBeCloseTo(cam.zoom, 2);
    expect(reading.fit.inliers).toBe(4); // the two swatches explained by nothing
  });
});

// ---------------------------------------------------------------------------------
// PART 4 — the refusals. A wrong number is worse than no number (L4).
// ---------------------------------------------------------------------------------

describe("refusals", () => {
  it("should refuse a frame with ONE mark in it — L1", () => {
    const cam: Camera = { zoom: 14.26, centreLon: 2.2895, centreLat: 48.8584 };
    const solo: Mark[] = [{ label: "Trocadero", lon: 2.2895, lat: 48.8584 }];
    const reading = measureCamera(paint(cam, solo), solo, { hue: HUE });
    expect(reading.ok).toBe(false);
    if (reading.ok) return;
    expect(reading.reason).toBe("no-reading");
    expect(reading.detail).toMatch(/two marks/);
  });

  it("should drop a NEAR-TOUCHING merged pair on the disc filter — L2, regime 1", () => {
    // Centres ~1.8 radii apart: the merged component is wider than it is tall, so it is not
    // a disc and both marks are lost. The beat reads nothing rather than half a distance.
    const frame = blank(1280, 720);
    disc(frame, 600, 360, 9, MARK_RGB);
    disc(frame, 617, 360, 9, MARK_RGB); // 17 px apart, r=9
    expect(findMarks(frame, { hue: HUE })).toHaveLength(0);
    const pair: Mark[] = [
      { label: "a", lon: 8.0, lat: 46.4 },
      { label: "b", lon: 8.02, lat: 46.4 },
    ];
    const reading = measureCamera(frame, pair, { hue: HUE });
    expect(reading.ok).toBe(false);
    if (reading.ok) return;
    expect(reading.reason).toBe("no-reading");
  });

  it("should survive a DEEPLY overlapped pair as one blob and still read true — L2, regime 2", () => {
    // Centres ~1.3 radii apart: the merged component IS round enough to pass the filter,
    // and its centroid sits a pixel or so from both marks it merged — near enough that the
    // reading stays inside the ±0.02 this instrument claims. Documented because it is the
    // one overlap regime that does NOT refuse, and a reader must know it does not.
    const near: Mark[] = [
      ...GLACIERS,
      // 0.004° east of Gorner ≈ 2 px at this camera.
      {
        label: "GornerBis",
        lon: 7.547186841148459 + 0.004,
        lat: 46.00520315741525,
      },
    ];
    const frame = paint(GLACIER_CAM, near);
    expect(findMarks(frame, { hue: HUE })).toHaveLength(4); // 5 marks, one merged pair
    const reading = measureCamera(frame, near, { hue: HUE });
    expect(reading.ok).toBe(true);
    if (!reading.ok) return;
    expect(reading.fit.zoom).toBeCloseTo(GLACIER_CAM.zoom, 2);
  });

  it("should REFUSE the band where a merged centroid forces a bad correspondence — L2, regime 3", () => {
    // Centres far enough apart that the merged centroid is not either mark, near enough
    // that it is still admitted as an inlier. Nothing but the residual gate catches this,
    // which is why MAX_FIT_RESIDUAL_PX is not optional.
    const near: Mark[] = [
      ...GLACIERS,
      // 0.0158° east of Gorner ≈ 8 px at this camera.
      {
        label: "GornerBis",
        lon: 7.547186841148459 + 0.0158,
        lat: 46.00520315741525,
      },
    ];
    const reading = measureCamera(paint(GLACIER_CAM, near), near, { hue: HUE });
    expect(reading.ok).toBe(false);
    if (reading.ok) return;
    expect(reading.reason).toBe("residual-too-high");
  });

  it("should refuse two same-hue blobs that correspond to nothing — L4", () => {
    // Two round in-hue blobs at a distance no pair of the known marks can explain at any
    // single scale consistent with the rest: with only two blobs a scale always exists, so
    // the guard that must bite here is the KNOWN-MARK check — a set of marks whose every
    // pair is collinear-incompatible is not what this asserts. Instead: give the fitter
    // blobs but NO marks to match them to.
    const frame = blank(640, 360);
    disc(frame, 100, 100, 7, MARK_RGB);
    disc(frame, 400, 300, 7, MARK_RGB);
    const blobs = findMarks(frame, { hue: HUE });
    expect(blobs).toHaveLength(2);
    const reading = fitCamera(blobs, [{ label: "only", lon: 8, lat: 46 }]);
    expect(reading.ok).toBe(false);
    if (reading.ok) return;
    expect(reading.reason).toBe("no-reading");
  });

  it("should refuse a fit whose residual exceeds the gate — L4", () => {
    // Three blobs placed so no single scale+translation explains them: the best fit over
    // any pair leaves the third far off, and forcing all three costs residual.
    const marks: Mark[] = [
      { label: "a", lon: 8.0, lat: 46.4 },
      { label: "b", lon: 8.1, lat: 46.4 },
      { label: "c", lon: 8.2, lat: 46.4 },
    ];
    const bad: Blob[] = [
      { x: 100, y: 180, pixels: 150, boxWidth: 14, boxHeight: 14, fill: 0.79 },
      { x: 200, y: 180, pixels: 150, boxWidth: 14, boxHeight: 14, fill: 0.79 },
      { x: 260, y: 180, pixels: 150, boxWidth: 14, boxHeight: 14, fill: 0.79 },
    ];
    const reading = fitCamera(bad, marks, { inlierTolerancePx: 60 });
    expect(reading.ok).toBe(false);
    if (reading.ok) return;
    expect(reading.reason).toBe("residual-too-high");
    expect(reading.detail).toMatch(/not a camera/);
  });

  it("should refuse to search past the candidate budget instead of hanging — L6", () => {
    const many: Blob[] = Array.from(
      { length: MAX_CANDIDATE_BLOBS + 1 },
      (_, i) => ({
        x: i * 3,
        y: 10,
        pixels: 150,
        boxWidth: 14,
        boxHeight: 14,
        fill: 0.79,
      }),
    );
    const reading = fitCamera(many, GLACIERS);
    expect(reading.ok).toBe(false);
    if (reading.ok) return;
    expect(reading.reason).toBe("too-many-candidates");
  });

  it("should refuse a MIRRORED camera rather than report its zoom", () => {
    // A negative scale would fit a flipped frame perfectly and report a real-looking zoom.
    // Web Mercator as MapLibre renders it is never mirrored, so this must not be solvable.
    const cam: Camera = GLACIER_CAM;
    const frame = blank(1280, 720);
    for (const m of GLACIERS) {
      const p = project(cam, frame, m.lon, m.lat);
      disc(frame, frame.width - p.x, p.y, 7, MARK_RGB);
    }
    // The marks are all found — this is not a detection failure, it is the fit refusing a
    // geometry Mercator cannot produce.
    expect(findMarks(frame, { hue: HUE })).toHaveLength(4);
    const reading = measureCamera(frame, GLACIERS, { hue: HUE });
    expect(reading.ok).toBe(false);
    if (reading.ok) return;
    expect(reading.reason).toBe("no-fit");
  });

  it("should refuse a set whose marks are COINCIDENT rather than divide by zero", () => {
    // Two distinct known marks at the same coordinates give a zero baseline. A caller can
    // hand this over (two markers on one place is a legal config), so the contract is that
    // it comes back refused — never a fit, never a NaN.
    const coincident: Mark[] = [
      { label: "a", lon: 8.0, lat: 46.4 },
      { label: "aDuplicate", lon: 8.0, lat: 46.4 },
    ];
    const frame = blank(1280, 720);
    disc(frame, 500, 360, 7, MARK_RGB);
    disc(frame, 700, 360, 7, MARK_RGB);
    const reading = measureCamera(frame, coincident, { hue: HUE });
    expect(reading.ok).toBe(false);
    if (reading.ok) return;
    expect(reading.reason).toBe("no-fit");
  });
});

// ---------------------------------------------------------------------------------
// PART 5 — the instruments this one replaced, shown failing on the same synthetic pair.
// ---------------------------------------------------------------------------------

describe("why not the metric that came first", () => {
  it("should show a whole-frame pixel difference reporting a camera move where there is NONE", () => {
    // The recorded reason this method exists: a whole-frame difference metric measures INK,
    // and ink is not camera. On the tour-box work it moved the WRONG WAY on a fix that was
    // correct — a tighter camera draws fewer basemap labels and less coastline, so total
    // change and camera change can point in opposite directions.
    //
    // That exact reversal needs a basemap to reproduce and is NOT claimed here. What IS
    // demonstrable on synthetic pixels is the defect underneath it: the metric cannot tell a
    // camera move from a repaint. A pure recolour — the camera provably identical, because
    // this instrument reads the same zoom and centre off both frames — still registers as a
    // large whole-frame difference. A big difference therefore does not imply a camera move,
    // which is all it takes to disqualify the metric from answering "where is the camera".
    const cam: Camera = { zoom: 9, centreLon: 7.97, centreLat: 46.3 };
    const spread = 0.1373; // ≈ 200 px across at this zoom — comfortably inside the frame
    const marks: Mark[] = [
      { label: "N", lon: cam.centreLon, lat: cam.centreLat + spread },
      { label: "S", lon: cam.centreLon, lat: cam.centreLat - spread },
      { label: "E", lon: cam.centreLon + spread, lat: cam.centreLat },
      { label: "W", lon: cam.centreLon - spread, lat: cam.centreLat },
    ];

    const changed = (a: RawFrame, b: RawFrame) => {
      let n = 0;
      for (let i = 0; i < a.data.length; i++) if (a.data[i] !== b.data[i]) n++;
      return n;
    };

    const base = paint(cam, marks);
    // Same camera, different paint: every mark recoloured to another Okabe-Ito hue.
    const recoloured = paint(cam, marks);
    for (let i = 0; i < recoloured.data.length; i += 3) {
      if (
        recoloured.data[i] === MARK_RGB[0] &&
        recoloured.data[i + 1] === MARK_RGB[1] &&
        recoloured.data[i + 2] === MARK_RGB[2]
      ) {
        recoloured.data[i] = 0x00;
        recoloured.data[i + 1] = 0x9e;
        recoloured.data[i + 2] = 0x73;
      }
    }

    // The difference metric sees a large change…
    expect(changed(base, recoloured)).toBeGreaterThan(1000);

    // …and yet the camera did not move at all: this instrument reads the same zoom and the
    // same centre off both frames, each keyed on its own mark colour.
    const before = measureCamera(base, marks, { hue: HUE });
    const after = measureCamera(recoloured, marks, {
      hue: hueOfHex("#009E73"),
    });
    expect(before.ok && after.ok).toBe(true);
    if (!before.ok || !after.ok) return;
    expect(after.fit.zoom).toBeCloseTo(before.fit.zoom, 6);
    expect(after.fit.centreLon).toBeCloseTo(before.fit.centreLon, 6);

    // And when the camera DOES move by one clean level, this instrument says so — the
    // reading a scalar difference could not have produced at all.
    const oneLevelIn = measureCamera(
      paint({ ...cam, zoom: cam.zoom + 1 }, marks),
      marks,
      { hue: HUE },
    );
    expect(oneLevelIn.ok).toBe(true);
    if (!oneLevelIn.ok) return;
    expect(oneLevelIn.fit.zoom - before.fit.zoom).toBeCloseTo(1, 2);
  });
});

// ---------------------------------------------------------------------------------
// PART 6 — GROUND TRUTH: the real masks of real mp4 frames must reproduce the numbers
// tour-box.ts publishes. A tool that cannot reproduce a number the repo already trusts is
// not ready.
// ---------------------------------------------------------------------------------

interface FixtureCase {
  case: string;
  mp4: string;
  hue: number;
  width: number;
  height: number;
  marks: Mark[];
  beats: Array<{
    beat: number;
    kind: string;
    frame: number;
    subject: string;
    /** Flat run-length encoding of the hue mask: [offRun, onRun, offRun, onRun, …]. */
    maskRuns: number[];
    expect: { zoom: number } | { refusal: string };
  }>;
}

/** The fixture's masks are decoded with the SAME codec the CLI encodes them with — see
 *  encodeMaskRuns's note on why the pair lives in the module and not in either end. */
const inflate = decodeMaskRuns;

describe("ground truth — the published tour-box measurements", () => {
  const cases = fixture.cases as unknown as FixtureCase[];

  it("should carry every case the record publishes", () => {
    expect(cases.map((c) => c.case).sort()).toEqual([
      "continental-capped",
      "continental-uncapped",
      "glaciers",
      "ribbon",
    ]);
  });

  for (const c of cases) {
    describe(c.case, () => {
      for (const b of c.beats) {
        const what = b.subject ? `${b.kind} "${b.subject}"` : b.kind;
        it(`should read ${what} (frame ${b.frame}) as the record says`, () => {
          const mask = inflate(b.maskRuns, c.width * c.height);
          const blobs = findBlobs(mask, c.width, c.height);
          const reading = fitCamera(blobs, c.marks);
          if ("refusal" in b.expect) {
            expect(reading.ok).toBe(false);
            if (reading.ok) return;
            expect(reading.reason).toBe(b.expect.refusal);
            return;
          }
          expect(reading.ok).toBe(true);
          if (!reading.ok) return;
          // ±0.02 levels — the tolerance L5 measured, not a preference.
          expect(reading.fit.zoom).toBeCloseTo(b.expect.zoom, 2);
          expect(reading.fit.residualPx).toBeLessThan(1);
        });
      }
    });
  }

  it("should reproduce the glacier tour's ONE CLEAN LEVEL in (8.478 → 9.47)", () => {
    const c = cases.find((x) => x.case === "glaciers")!;
    const zoomAt = (kind: string, subject?: string) => {
      const b = c.beats.find(
        (x) =>
          x.kind === kind && (subject === undefined || x.subject === subject),
      )!;
      const r = fitCamera(
        findBlobs(inflate(b.maskRuns, c.width * c.height), c.width, c.height),
        c.marks,
      );
      if (!r.ok)
        throw new Error(`${kind} ${subject ?? ""} did not read: ${r.detail}`);
      return r.fit.zoom;
    };
    const establish = zoomAt("establish");
    expect(establish).toBeCloseTo(8.478, 2);
    for (const subject of ["Rhone", "Zmutt", "Trift", "Gorner"]) {
      const z = zoomAt("reveal", subject);
      expect(z).toBeCloseTo(9.47, 1);
      // The whole claim of tour-box.ts: every stop is ONE clean level in.
      expect(z - establish).toBeGreaterThan(0.95);
      expect(z - establish).toBeLessThan(1.05);
    }
  });

  it("should reproduce the ribbon's +1.000 — the row that is the whole argument", () => {
    // A SCALAR stop box zoomed this set OUT by 2.19 levels; halving each axis on its own
    // takes it IN by one, whatever the set's shape.
    const c = cases.find((x) => x.case === "ribbon")!;
    const read = (b: FixtureCase["beats"][number]) => {
      const r = fitCamera(
        findBlobs(inflate(b.maskRuns, c.width * c.height), c.width, c.height),
        c.marks,
      );
      return r.ok ? r.fit.zoom : null;
    };
    const establish = read(c.beats.find((b) => b.kind === "establish")!)!;
    expect(establish).toBeCloseTo(13.258, 2);
    const stops = c.beats
      .filter((b) => b.kind === "reveal")
      .map(read)
      .filter((z): z is number => z !== null);
    expect(stops.length).toBeGreaterThanOrEqual(2);
    for (const z of stops) expect(z - establish).toBeCloseTo(1.0, 1);
  });

  it("should reproduce the continental cap: establish 4.224, and stops that CANNOT be read", () => {
    // Both halves are the finding. The cap tightens every stop to ±1.5°, and at that
    // framing no stop keeps a neighbour in frame — so the capped tour reads `no-reading` at
    // every stop (L1), while the UNCAPPED render still holds neighbours and reads 5.05-5.17,
    // i.e. only ~0.86 levels in and still showing the whole distribution.
    const capped = cases.find((x) => x.case === "continental-capped")!;
    const uncapped = cases.find((x) => x.case === "continental-uncapped")!;
    const read = (c: FixtureCase, b: FixtureCase["beats"][number]) => {
      const r = fitCamera(
        findBlobs(inflate(b.maskRuns, c.width * c.height), c.width, c.height),
        c.marks,
      );
      return r.ok ? r.fit.zoom : null;
    };
    expect(
      read(
        capped,
        capped.beats.find((b) => b.kind === "establish")!,
      ),
    ).toBeCloseTo(4.224, 2);
    for (const b of capped.beats.filter((b) => b.kind === "reveal")) {
      expect(read(capped, b)).toBeNull();
    }
    const uncappedStops = uncapped.beats
      .filter((b) => b.kind === "reveal")
      .map((b) => read(uncapped, b))
      .filter((z): z is number => z !== null);
    expect(uncappedStops.length).toBeGreaterThanOrEqual(2);
    for (const z of uncappedStops) {
      expect(z).toBeGreaterThan(5.0);
      expect(z).toBeLessThan(5.2);
    }
  });

  it("should read the same zoom off two INDEPENDENTLY ENCODED frames of one camera — L5", () => {
    // Repeatability, on real codec output — and note what this is NOT claiming. A tour's
    // `establish` and `takeaway` beats frame the SAME box, but they are two frames hundreds
    // apart in the stream, encoded against different reference frames and carrying different
    // furniture and label states. Agreeing to within the ±0.02 levels this instrument claims
    // is the claim being kept.
    //
    // The STRONGER claim — two separate renders of the same config, whose files hash
    // differently — is recorded in the fixture's `renders.codecNoise` and cannot be tested
    // here: those two renders produced BIT-IDENTICAL hue masks, so committing both would be
    // the same input twice and would assert nothing.
    for (const name of ["glaciers", "ribbon", "continental-capped"]) {
      const c = cases.find((x) => x.case === name)!;
      const pair = c.beats.filter(
        (b) => b.kind === "establish" || b.kind === "takeaway",
      );
      expect(pair).toHaveLength(2);
      const zooms = pair.map((b) => {
        const r = fitCamera(
          findBlobs(inflate(b.maskRuns, c.width * c.height), c.width, c.height),
          c.marks,
        );
        if (!r.ok) throw new Error(`${name} ${b.kind}: ${r.detail}`);
        return r.fit.zoom;
      });
      expect(Math.abs(zooms[0]! - zooms[1]!)).toBeLessThan(0.02);
    }
  });
});
