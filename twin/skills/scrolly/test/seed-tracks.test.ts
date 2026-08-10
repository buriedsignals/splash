/**
 * The four TRACKS, and the placement rule that keeps each one on screen.
 *
 * `render-scrolly.test.ts` covers the generic scaffold and the seed's two original frames. This
 * file covers what the vehicle gained when it learned to carry a MAP and a CHART, and the mechanism
 * that made carrying them safe: `safeBand`, for frames that are COVER-cropped, exercised against
 * real box aspect ratios rather than against its own formula.
 *
 * IT USED TO COVER A SECOND ONE, `CONTENT_TOP`, and the agreement between the band the frames kept
 * clear at their bottom and the band the scaffold's CSS reserved. The ninth correction removed the
 * band: the card travels over the whole frame and rests nowhere, so a reservation at the bottom
 * protected the one place it never dwells and cost this seed's chart 230px of an 821px box. What
 * replaced those assertions is below, on `CHART_LAYOUT` — the plot uses the frame's own height, and
 * the strip under it is measured against what the x-axis labels actually occupy.
 *
 * Plus the thing this project has been wrong about more often than anything else: every number the
 * beat says out loud is checked back against the frozen file it came from.
 */

import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture } from "../scripts/render-still.mjs";
import {
  STEPS_META,
  ASPECT_ENVELOPE,
  CHART_LAYOUT,
  FRAME,
  SAFE_AREA,
  safeBand,
  MapFrame,
  ChartFrame,
} from "../assets/ScrollySeed.tsx";
import {
  parseRdb,
  parseReadings,
  readStation,
  deriveFacts,
  group,
  dayAndMonth,
} from "../assets/gauge-data.ts";
import { render } from "../scripts/render-scrolly.mjs";

setDefaultTimeout(20000);

const SAMPLE_DATA = join(import.meta.dirname, "..", "assets", "sample-data");
const ground = "#FFFFFF";
const accent = "#0B7A75";
const furniture = deriveFurniture(ground);

const stationRdb = await readFile(
  join(SAMPLE_DATA, "potomac-station.rdb"),
  "utf8",
);
const readingsCsv = await readFile(
  join(SAMPLE_DATA, "potomac-2024.csv"),
  "utf8",
);
const plateGeometry = JSON.parse(
  await readFile(join(SAMPLE_DATA, "potomac-plate.json"), "utf8"),
);
const station = readStation(stationRdb);
const readings = parseReadings(readingsCsv);
const gauge = deriveFacts(readings);

// ---------------------------------------------------------------------------
// The vehicle carries DIFFERENT MEDIA — the whole reason this skill exists.
// ---------------------------------------------------------------------------

describe("the seed's tracks", () => {
  it("should carry a map track and a chart track, not only a picture and a diagram", () => {
    const kinds = STEPS_META.map((s) => s.frameKind);
    // A scrolly whose steps are all one medium is a duplicate of a beat that already exists (see
    // SKILL.md, "When to use"). Two kinds was the old floor and it let the seed demonstrate the
    // vehicle with two media no other skill in this project produces; a map and a chart are media
    // other skills DO produce, which is exactly why assembling them is the thing worth proving.
    expect(kinds).toContain("map");
    expect(kinds).toContain("chart");
    expect(new Set(kinds).size).toBeGreaterThanOrEqual(4);
  });

  it("should give every step prose that is a FUNCTION of the beat's own facts, never a literal", () => {
    for (const step of STEPS_META) {
      expect(typeof step.prose).toBe("function");
      const paragraphs = step.prose({ station, gauge });
      expect(paragraphs.length).toBeGreaterThan(0);
      for (const p of paragraphs) expect(p.trim().length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// safeBand — the placement rule, checked against real boxes.
// ---------------------------------------------------------------------------

describe("safeBand — a COVER-cropped frame's own visible rectangle", () => {
  /** What COVER actually does to a viewBox in a box of `width x height`, computed independently of
   *  `safeBand` itself: the visible slice, in viewBox coordinates. */
  function coverSlice(
    frame: { width: number; height: number },
    box: { width: number; height: number },
  ) {
    const scale = Math.max(box.width / frame.width, box.height / frame.height);
    const visibleW = box.width / scale;
    const visibleH = box.height / scale;
    return {
      x: [frame.width / 2 - visibleW / 2, frame.width / 2 + visibleW / 2],
      y: [frame.height / 2 - visibleH / 2, frame.height / 2 + visibleH / 2],
      unitsPerPx: 1 / scale,
      visibleH,
    };
  }

  const boxes = [
    { width: 1600, height: 900 }, // 1.78 desktop
    { width: 1280, height: 800 }, // 1.60 laptop
    { width: 2400, height: 1000 }, // 2.40 — the envelope's widest
    { width: 1024, height: 768 }, // 1.33
    { width: 375, height: 812 }, // 0.46 phone
    { width: 378, height: 900 }, // 0.42 — the envelope's tallest
  ];

  for (const frame of [FRAME, plateGeometry.frame]) {
    const band = safeBand(frame);
    for (const box of boxes) {
      it(`should stay visible for a ${frame.width}x${frame.height} frame in a ${box.width}x${box.height} box`, () => {
        const aspect = box.width / box.height;
        expect(aspect).toBeGreaterThanOrEqual(ASPECT_ENVELOPE.min - 0.001);
        expect(aspect).toBeLessThanOrEqual(ASPECT_ENVELOPE.max + 0.001);

        const slice = coverSlice(frame, box);
        // Visible: the whole band survives the crop.
        expect(band.x[0]).toBeGreaterThanOrEqual(slice.x[0]);
        expect(band.x[1]).toBeLessThanOrEqual(slice.x[1]);
        expect(band.y[0]).toBeGreaterThanOrEqual(slice.y[0]);
        expect(band.y[1]).toBeLessThanOrEqual(slice.y[1]);

        // And it is a REAL band, not a degenerate one: the crop leaves something to place inside.
        expect(band.x[1] - band.x[0]).toBeGreaterThan(0);
        expect(band.y[1] - band.y[0]).toBeGreaterThan(0);
      });
    }
  }
});

describe("CHART_LAYOUT — the reclaimed band, and what the strip below the plot is for", () => {
  // THE RECLAIM, asserted so re-reserving the band goes red here. `bottom` was `CONTENT_TOP - 0.09`
  // = 0.63 for three rounds, which left 37% of every frame — 230px of an 821px box at 1600x900 —
  // as bare ground under the plot, for a panel that has not parked there since the eighth
  // correction and cannot park anywhere since the ninth.
  it("should give the plot the frame's own height rather than a band of it", () => {
    expect(CHART_LAYOUT.plot.bottom).toBeGreaterThan(0.85);
    expect(CHART_LAYOUT.plot.bottom).toBeLessThan(1);
  });

  // What remains below the plot is not a reservation: it is the strip the x-axis labels occupy —
  // 8px under `plot.bottom` at a 15px type size, so roughly 25px of whatever box the frame fills.
  // At the shortest track this genre is checked at (573px, the Grinnell beat at 375x812) that is
  // 4.4%, and the layout leaves 10%.
  for (const trackHeight of [821, 721, 573]) {
    it(`should leave the x-axis label strip room in a ${trackHeight}px-tall frame`, () => {
      const below = (1 - CHART_LAYOUT.plot.bottom) * trackHeight;
      expect(below).toBeGreaterThanOrEqual(8 + 15 + 2);
    });
  }

  // The y-axis furniture stays in the LEFT gutter, which is the composition rule a card travelling
  // over the frame imposes: the card is centred, so its own vertical edges cut a pair of columns
  // out of the middle, and a label straddling one of them is broken text for as long as the card is
  // at that row. A fitted frame can obey this at every width; a cropped one cannot (see
  // `DrawnGraphicFrame`'s own flow label). 0.13 of the frame, floored at 62px, is well outside a
  // 410px card centred in any box this genre is checked at.
  it("should keep the y-axis gutter outside a centred card's own stripe", () => {
    for (const frameWidth of [1600, 1280, 600]) {
      const cardLeftEdge = (frameWidth - 410) / 2;
      const gutter = Math.max(62, 0.13 * frameWidth);
      expect(gutter).toBeLessThan(cardLeftEdge);
    }
  });
});

// ---------------------------------------------------------------------------
// MapFrame — a baked plate, one marker, nothing live.
// ---------------------------------------------------------------------------

describe("MapFrame", () => {
  const props = {
    plate: "data:image/jpeg;base64,AA==",
    frame: plateGeometry.frame,
    station: {
      px: plateGeometry.station.px,
      py: plateGeometry.station.py,
      label: "Point of Rocks, MD",
    },
    ground,
    ink: furniture.ink,
    accent,
  };

  it("should draw the baked plate as an embedded image, never a live map or a network request", () => {
    const svg = renderToStaticMarkup(createElement(MapFrame, props));
    expect(svg).toContain('href="data:image/jpeg;base64,AA=="');
    expect(svg).not.toContain("maptiler");
    // No remote reference of any kind — the only `http` left is the SVG namespace itself.
    expect(svg).not.toMatch(/(?:href|src)="https?:/);
  });

  it("should keep its marker and its label inside the plate's own safe band", () => {
    const svg = renderToStaticMarkup(createElement(MapFrame, props));
    const band = safeBand(plateGeometry.frame);
    const circles = [
      ...svg.matchAll(/<circle cx="([\d.-]+)" cy="([\d.-]+)"/g),
    ].map((m) => ({
      cx: Number(m[1]),
      cy: Number(m[2]),
    }));
    const texts = [...svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"/g)].map(
      (m) => ({
        x: Number(m[1]),
        y: Number(m[2]),
      }),
    );
    expect(circles.length).toBeGreaterThan(0);
    expect(texts.length).toBe(1);
    for (const c of [...circles, ...texts.map((t) => ({ cx: t.x, cy: t.y }))]) {
      expect(c.cx).toBeGreaterThanOrEqual(band.x[0]);
      expect(c.cx).toBeLessThanOrEqual(band.x[1]);
      expect(c.cy).toBeGreaterThanOrEqual(band.y[0]);
      expect(c.cy).toBeLessThanOrEqual(band.y[1]);
    }
  });

  it("should clamp a station that the bake put outside the safe band, rather than drawing it off screen", () => {
    const svg = renderToStaticMarkup(
      createElement(MapFrame, {
        ...props,
        station: { px: -500, py: 9999, label: "off" },
      }),
    );
    const band = safeBand(plateGeometry.frame);
    const [{ cx, cy }] = [
      ...svg.matchAll(/<circle cx="([\d.-]+)" cy="([\d.-]+)"/g),
    ].map((m) => ({
      cx: Number(m[1]),
      cy: Number(m[2]),
    }));
    expect(cx).toBeGreaterThanOrEqual(band.x[0]);
    expect(cy).toBeLessThanOrEqual(band.y[1]);
  });

  it("should never assign the scaffold's own wrapper classes", () => {
    const svg = renderToStaticMarkup(createElement(MapFrame, props));
    expect(svg).not.toContain("step-frame");
    expect(svg).not.toContain("aria-hidden");
  });
});

// ---------------------------------------------------------------------------
// ChartFrame — a real chart, fitted, with its type held at a fixed pixel size.
// ---------------------------------------------------------------------------

describe("ChartFrame", () => {
  const props = { readings, facts: gauge, ground, accent, ...furniture };

  it("should draw geometry that stretches and type that does not", () => {
    const html = renderToStaticMarkup(createElement(ChartFrame, props));
    // Geometry: one SVG, stretched, carrying no <text> at all.
    expect(html).toContain('preserveAspectRatio="none"');
    expect(html).not.toContain("<text");
    // Type: every word is HTML at a fixed PIXEL size — never a font-size in viewBox units, which
    // is the defect that made the web genres unreadable at 375px before they separated the two.
    const fontSizes = [...html.matchAll(/font-size:([^;"]+)/g)].map((m) =>
      m[1].trim(),
    );
    expect(fontSizes.length).toBeGreaterThan(0);
    for (const size of fontSizes) expect(size).toMatch(/^\d+px$/);
  });

  it("should paint only with the ground, its derived furniture and the one accent", () => {
    const html = renderToStaticMarkup(createElement(ChartFrame, props));
    const allowed = new Set(
      [ground, accent, furniture.ink, furniture.muted, furniture.grid].map(
        (c) => c.toLowerCase(),
      ),
    );
    const used = new Set(
      (html.match(/#[0-9a-fA-F]{6}/g) ?? []).map((c) => c.toLowerCase()),
    );
    expect([...used].filter((c) => !allowed.has(c))).toEqual([]);
  });

  it("should label the peak with the value and date its own data carries, not a literal", () => {
    const html = renderToStaticMarkup(createElement(ChartFrame, props));
    expect(html).toContain(
      `${group(gauge.peak.value)} on ${dayAndMonth(gauge.peak.date)}`,
    );
    expect(html).toContain(`median day ${group(gauge.median)}`);
  });

  it("should place every vertical position inside the frame", () => {
    // Percentages parsed out of the rendered markup, not re-derived from the layout constant — a
    // typo'd literal in the component fails here exactly as a wrong formula would. The ceiling
    // used to be `CONTENT_TOP`, the top 72% of the frame; the band below it is reclaimed, so what
    // is left to assert is that nothing is placed off the frame altogether.
    const html = renderToStaticMarkup(createElement(ChartFrame, props));
    const tops = [...html.matchAll(/top:\s*(?:calc\()?([\d.]+)%/g)].map(
      (m) => Number(m[1]) / 100,
    );
    expect(tops.length).toBeGreaterThan(3);
    for (const top of tops) expect(top).toBeLessThanOrEqual(CHART_LAYOUT.plot.bottom);
  });

  it("should never assign the scaffold's own wrapper classes", () => {
    const html = renderToStaticMarkup(createElement(ChartFrame, props));
    expect(html).not.toContain("step-frame");
    expect(html).not.toContain("aria-hidden");
  });
});

// ---------------------------------------------------------------------------
// The data layer, and the beat's own claims measured back against it.
// ---------------------------------------------------------------------------

describe("gauge-data", () => {
  it("should refuse an RDB file whose format row is missing, rather than reading data as headers", () => {
    expect(() => parseRdb("a\tb\n1\t2\n")).toThrow("format row");
  });

  it("should read the station out of the frozen site file", () => {
    expect(station.id).toBe("01638500");
    expect(station.name).toBe("Potomac River at Point of Rocks, MD");
    expect(station.drainageSqMi).toBe(9651);
    // The bake's own camera centre came from this same file — if one drifts, the marker stops
    // being where the beat says it is.
    expect(plateGeometry.station.lon).toBeCloseTo(station.lon, 6);
    expect(plateGeometry.station.lat).toBeCloseTo(station.lat, 6);
  });

  it("should refuse a frozen file spanning more than the one year the prose claims", () => {
    expect(() =>
      deriveFacts([
        { date: "2024-01-01", value: 1 },
        { date: "2025-01-01", value: 2 },
      ]),
    ).toThrow("a year");
  });

  it("should group thousands without depending on the machine's own locale", () => {
    expect(group(76500)).toBe("76,500");
    expect(group(1330)).toBe("1,330");
    expect(group(366)).toBe("366");
    expect(dayAndMonth("2024-04-04")).toBe("4 April");
  });
});

describe("the rendered beat's own claims", () => {
  it("should say only figures the frozen readings support", async () => {
    const { outPath, facts } = await render({
      outDir: "/tmp/scrolly-test-tracks",
    });
    const html = await readFile(outPath, "utf8");

    // Recomputed HERE, from the frozen file, rather than read back from `facts` — the whole point
    // is to check the render against the data, not against the object the render was handed.
    const values = readings.map((r) => r.value);
    const peak = Math.max(...values);
    const low = Math.min(...values);
    expect(facts.gauge.peak.value).toBe(peak);
    expect(facts.gauge.low.value).toBe(low);
    expect(readings.length).toBe(366);

    expect(html).toContain(group(readings.length));
    expect(html).toContain(group(peak));
    expect(html).toContain(
      dayAndMonth(readings.find((r) => r.value === peak)!.date),
    );
    expect(html).toContain(
      dayAndMonth(readings.find((r) => r.value === low)!.date),
    );
    expect(html).toContain(group(station.drainageSqMi));
    expect(html).toContain(station.id);

    // The plate travels inside the file — no request, no key.
    expect(html).toContain("data:image/jpeg;base64,");
    expect(html).not.toContain("api.maptiler.com");
  });
});
