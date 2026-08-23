/**
 * NO-DATA MUST NOT READ AS DATA — on any ground, and measured in the unit a reader sees.
 *
 * THE PAGE THAT EARNED THIS. A world choropleth of rabies deaths REPORTED to WHO
 * (`stories/r9-map-web-reported-rabies-deaths`), whose whole editorial point is that **94 countries
 * filed nothing and 44 filed a real zero** — opposite facts. The owner saw it on the first draft,
 * before anything was measured: *"the no-data grey and the low class read the same."* Asked of the
 * page exactly as it shipped:
 *
 *   no-data #343434 against class 1 #484439      1.28:1
 *   the sea #2c343b against class 1              1.30:1
 *   the sea against no-data                      1.015:1
 *
 * and on the light-ground beat this format ships as its worked example
 * (`proof/mapgen-choropleth-web`, `#FFFFFF` + `#B2182B`):
 *
 *   no-data #ebebeb against class 1 #e1cfd1      1.25:1
 *   the sea #e2ecf4 against class 1              1.25:1
 *   the sea against no-data                      1.004:1
 *   no-data against the page                     1.192:1
 *
 * TWO MECHANISMS, and both are in `assets/geo-choropleth.ts`'s own note. The midpoint rule capped
 * the separation at 2:1 BY CONSTRUCTION, so no ground could ever have bought this case more; and
 * the guard measured LUMINANCE GAPS against a fixed 0.02, which is 1.34:1 beside a `#16191B` ground
 * and 1.019:1 beside white — so it could not see the failure at either end, and refused the darker,
 * better picture fourteen times out of fourteen while passing the lighter, worse one.
 *
 * This file drives the replacement: one decision over the whole surface set, measured in contrast.
 */
import { describe, expect, it } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import {
  KIND_FLOOR,
  MIN_CHROMA,
  assertSurfacesRead,
  blueAt,
  chromaOf,
  classesThatFit,
  contrastOf,
  contrastRamp,
  dataRampEnd,
  greyAt,
  luminanceOf,
  noDataFor,
  rangeOwedFor,
  sequentialRamp,
  stepFloorFor,
  surfaceReadings,
  waterFor,
} from "../assets/geo-choropleth.ts";

const TWIN = join(import.meta.dirname, "..", "..", "..");

/** Every ground this format actually ships a beat on, plus one narrow palette that must be refused
 *  and one neutral one whose ramp carries no hue at all — a colour rule checked on one ground is
 *  the same defect it is replacing. */
const PALETTES = [
  {
    name: "the rabies world map's dark ground",
    ground: "#16191B",
    accent: "#D4A853",
  },
  {
    name: "the worked beat's white ground",
    ground: "#FFFFFF",
    accent: "#B2182B",
  },
  {
    name: "a near-black ground with a neutral accent",
    ground: "#0B0B0B",
    accent: "#E8E8E8",
  },
] as const;

const scaleFor = (ground: string, accent: string, classes = 6) => {
  const ramp = contrastRamp(ground, dataRampEnd(accent, ground), classes);
  return {
    ramp,
    noData: noDataFor(ramp, ground),
    water: waterFor(ramp, ground),
  };
};

describe("the floors, derived rather than typed", () => {
  it("holds two things that differ in KIND to the same 3:1 the top class already carries", () => {
    expect(KIND_FLOOR).toBe(3);
  });

  it("makes one step of a ramp worth less the more classes it has", () => {
    // A ramp whose top class only just clears 3:1 against the ground, with its `classes` gaps spent
    // evenly. Two classes have to be 1.732:1 apart; nine need only 1.129:1.
    expect(stepFloorFor(2)).toBeCloseTo(1.7321, 4);
    expect(stepFloorFor(6)).toBeCloseTo(1.2009, 4);
    expect(stepFloorFor(9)).toBeCloseTo(1.1298, 4);
    expect(stepFloorFor(6) ** 6).toBeCloseTo(KIND_FLOOR, 6);
  });

  it("makes a LONGER ramp the cheaper ask, which is the opposite of what a typed floor said", () => {
    // The whole bill falls as classes are added, because every one of its steps is worth less.
    expect(rangeOwedFor(2)).toBeCloseTo(15.588, 3);
    expect(rangeOwedFor(6)).toBeCloseTo(10.808, 3);
    expect(rangeOwedFor(9)).toBeCloseTo(10.168, 3);
    expect(classesThatFit(rangeOwedFor(6))).toBe(6);
    expect(classesThatFit(8.473)).toBe(null);
  });
});

describe("what the delivered pages measured before this decision existed", () => {
  // Reproduced here as the exact fixture, not as prose: the old derivation put both surfaces at the
  // ARITHMETIC midpoint of the band between the ground and the first class, and spaced the ramp
  // evenly in the mix ratio. These are the hexes the two pages shipped.
  // The two pages' own hexes, read off their plates' `geometry.json` and their components' own
  // ramps, written as literals rather than re-derived: the derivation they came from no longer
  // exists in this file, and a fixture that moves when the code moves proves nothing.
  const shippedRamp = (ground: string, accent: string, from: number, to: number) =>
    sequentialRamp(ground, dataRampEnd(accent, ground), 6, from, to);

  it("refuses the rabies world map as it shipped, naming the 1.28:1 the owner saw", () => {
    const ramp = shippedRamp("#16191B", "#D4A853", 0.24, 1);
    const shipped = { noData: "#343434", water: "#2c343b" };
    expect(ramp[0]).toBe("#484439");
    expect(contrastOf(shipped.noData, ramp[0]!)).toBeCloseTo(1.281, 3);
    expect(contrastOf(shipped.water, shipped.noData)).toBeCloseTo(1.015, 3);
    const readings = surfaceReadings(ramp, "#16191B", shipped);
    expect(readings).toHaveLength(2);
    expect(readings[0]).toContain(
      "the no-data fill #343434 measures 1.28:1 against class 1",
    );
    expect(readings[1]).toContain(
      "the sea #2c343b measures 1.30:1 against class 1",
    );
  });

  it("refuses the worked light beat as it shipped, on four readings and not one", () => {
    const ramp = shippedRamp("#FFFFFF", "#B2182B", 0.2, 0.78);
    const shipped = { noData: "#ebebeb", water: "#e2ecf4" };
    expect(ramp[0]).toBe("#e1cfd1");
    expect(contrastOf(shipped.noData, ramp[0]!)).toBeCloseTo(1.254, 3);
    expect(contrastOf(shipped.water, shipped.noData)).toBeCloseTo(1.004, 3);
    const readings = surfaceReadings(ramp, "#FFFFFF", shipped);
    expect(readings).toHaveLength(4);
    expect(readings.join(" ")).toContain("1.192:1 against the ground #FFFFFF");
  });

  it("shows why the retired rule could not see either page: 0.02 is not one quantity", () => {
    // The luminance gap the old `SURFACE_CLEARANCE` held both surfaces to, expressed as the
    // contrast it actually buys at each end of the two shipped grounds. The dark ground was held to
    // a floor seventeen times stricter than the light one — and failed it by 7.5%, while white
    // passed at 1.19:1.
    const beside = (ground: string) =>
      contrastOf(
        ground,
        greyAt(
          luminanceOf(ground) + (luminanceOf(ground) > 0.5 ? -0.02 : 0.02),
        ),
      );
    expect(beside("#16191B")).toBeCloseTo(1.338, 3);
    expect(beside("#FFFFFF")).toBeCloseTo(1.017, 3);
  });
});

describe("the scale this decision derives, on every ground", () => {
  for (const palette of PALETTES) {
    it(`answers every reading on ${palette.name}`, () => {
      const scale = scaleFor(palette.ground, palette.accent);
      expect(surfaceReadings(scale.ramp, palette.ground, scale)).toEqual([]);
      expect(
        assertSurfacesRead(scale.ramp, palette.ground, {
          noData: scale.noData,
          water: scale.water,
        }),
      ).toEqual({ noData: scale.noData, water: scale.water });
    });

    it(`puts every class ${KIND_FLOOR}:1 clear of both silences on ${palette.name}`, () => {
      const scale = scaleFor(palette.ground, palette.accent);
      for (const klass of scale.ramp) {
        expect(contrastOf(scale.noData, klass)).toBeGreaterThanOrEqual(
          KIND_FLOOR,
        );
        expect(contrastOf(scale.water, klass)).toBeGreaterThanOrEqual(
          KIND_FLOOR,
        );
      }
    });

    it(`keeps the sea blue and the no-data fill neutral on ${palette.name}`, () => {
      const scale = scaleFor(palette.ground, palette.accent);
      expect(chromaOf(scale.noData)).toBe(0);
      expect(chromaOf(scale.water)).toBeGreaterThanOrEqual(MIN_CHROMA);
      // …and a real step between them as well, so a reader who cannot use hue is not left with one
      // surface where there are two. This is the 1.00–1.02:1 the shipped pages carried.
      expect(contrastOf(scale.noData, scale.water)).toBeGreaterThanOrEqual(
        stepFloorFor(6),
      );
    });
  }

  it("spends the newsroom's own accent at full strength on the class the argument is made with", () => {
    for (const palette of PALETTES) {
      const scale = scaleFor(palette.ground, palette.accent);
      expect(scale.ramp[scale.ramp.length - 1]).toBe(
        dataRampEnd(palette.accent, palette.ground),
      );
    }
  });

  it("holds for every class count a palette can pay for, not only for six", () => {
    for (const palette of PALETTES)
      for (let classes = 2; classes <= 9; classes++) {
        const end = dataRampEnd(palette.accent, palette.ground);
        if (rangeOwedFor(classes) > contrastOf(end, palette.ground)) continue;
        let scale;
        try {
          scale = scaleFor(palette.ground, palette.accent, classes);
        } catch (error) {
          // Only 8-bit rounding may refuse a scale the arithmetic could pay for, and it has to say
          // so in those words rather than in any other.
          expect((error as Error).message).toContain("8-bit colour does not");
          continue;
        }
        expect(surfaceReadings(scale.ramp, palette.ground, scale)).toEqual([]);
      }
  });
});

describe("what the derivation refuses, with the number", () => {
  it("a palette whose range cannot pay the bill, itemised", () => {
    // `#5B8A8A` is this newsroom's SECOND recorded accent, and it measures 4.58:1 against its own
    // ground where `#D4A853` measures 8.01:1. A six-class choropleth cannot be drawn in it.
    expect(() => scaleFor("#16191B", "#5B8A8A")).toThrow(
      /8\.473:1 apart, and a 6-class choropleth needs 10\.808:1 — short by 1\.276x/,
    );
    expect(() => scaleFor("#16191B", "#5B8A8A")).toThrow(
      /No class count up to twelve fits this range/,
    );
  });

  it("a scale the arithmetic fits and 8-bit colour does not, naming the longer ramp that would", () => {
    // 11.168:1 of range against a 10.808:1 bill — 3.3% of surplus, and quantising six classes onto
    // an 8-bit channel costs more than that.
    expect(() => scaleFor("#FFFFFF", "#1A6B8A")).toThrow(
      /8-bit colour does not/,
    );
    expect(() => scaleFor("#FFFFFF", "#1A6B8A")).toThrow(/Ask for 7 classes/);
    expect(
      surfaceReadings(
        ...(() => {
          const scale = scaleFor("#FFFFFF", "#1A6B8A", 7);
          return [scale.ramp, "#FFFFFF", scale] as const;
        })(),
      ),
    ).toEqual([]);
  });

  it("a no-data fill a reader would read a value off — the defect itself", () => {
    const scale = scaleFor("#16191B", "#D4A853");
    expect(() =>
      assertSurfacesRead(scale.ramp, "#16191B", {
        ...scale,
        noData: "#B9B9B9",
      }),
    ).toThrow(/the no-data fill #B9B9B9 measures 1\.03:1 against class 5/);
  });

  it("a sea a reader cannot tell from a country with no reading, by either channel", () => {
    const scale = scaleFor("#16191B", "#D4A853");
    expect(() =>
      assertSurfacesRead(scale.ramp, "#16191B", {
        noData: scale.noData,
        water: scale.noData,
      }),
    ).toThrow(
      /cannot tell a country with no reading from the sea by either channel/,
    );
  });

  it("a surface a reader cannot tell from the page it sits on", () => {
    const scale = scaleFor("#16191B", "#D4A853");
    expect(() =>
      assertSurfacesRead(scale.ramp, "#16191B", {
        ...scale,
        noData: "#191c1e",
      }),
    ).toThrow(/rather than the page showing through/);
  });

  it("a ramp that folds back on itself", () => {
    const scale = scaleFor("#16191B", "#D4A853");
    const folded = [...scale.ramp];
    folded[3] = folded[1]!;
    expect(() => assertSurfacesRead(folded, "#16191B", scale)).toThrow(
      /turns back on class 3/,
    );
  });

  it("names EVERY failed reading at once, because a bad palette fails three at a time", () => {
    const scale = scaleFor("#FFFFFF", "#B2182B");
    const message = (() => {
      try {
        assertSurfacesRead(scale.ramp, "#FFFFFF", {
          noData: "#f4f4f4",
          water: "#f2f6fa",
        });
      } catch (error) {
        return (error as Error).message;
      }
      return "";
    })();
    expect(message.split(" · ")).toHaveLength(3);
  });
});

describe("the axes the two surfaces travel", () => {
  it("keeps the family's own two hexes as the midpoint of each axis", () => {
    expect(greyAt(luminanceOf("#B9B9B9"))).toBe("#b8b8b8");
    expect(blueAt(luminanceOf("#AAC9E0"))).toBe("#aac9e0");
  });

  it("carries a navy at the dark pole, because a sea derived on a dark ground has to stay blue", () => {
    // The whole reason `WATER_AXIS` changed. At the luminance a `#16191B` ground puts the sea at,
    // the old `#000000` pole carried 0.043 of chroma — under `MIN_CHROMA`, which is this file's own
    // floor for "does this read as a hue at all".
    const sea = waterFor(scaleFor("#16191B", "#D4A853").ramp, "#16191B");
    expect(luminanceOf(sea)).toBeLessThan(0.03);
    expect(chromaOf(sea)).toBeGreaterThan(0.19);
    // The old axis ran from `#000000`, and at this luminance it carried 0.043 of chroma — a sea a
    // reader would have called grey, which is why the derivation could not put the sea down here at
    // all until the pole moved.
    expect(chromaOf(sea)).toBeGreaterThan(MIN_CHROMA * 3);
  });
});

describe("the copies of this decision still carrying the retired one", () => {
  // The surfaces family is copied into every beat that draws a choropleth, and the copies are NOT
  // held byte-identical by `geo-parity.test.ts` — nothing in the family is tagged `@parity`, which
  // is that walk's own documented blind spot ("a family duplicated under a name that is tagged
  // nowhere is invisible"). So the drift is pinned HERE, as an equality with the exact list: a beat
  // that adopts the new decision is red until it is struck off, and a beat that starts carrying the
  // retired one is red on the day it appears.
  const cores = (() => {
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".git") continue;
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (/^geo-choropleth\.ts$/.test(entry.name)) out.push(path);
      }
    };
    walk(TWIN);
    return out.sort();
  })();

  it("finds every choropleth core in the tree", () => {
    expect(cores.length).toBeGreaterThanOrEqual(6);
  });

  it("names the beats whose colours are still placed at the midpoint of the band", () => {
    const retired = cores
      .filter((path) =>
        readFileSync(path, "utf8").includes("export function offRampLuminance"),
      )
      .map((path) => relative(TWIN, path));
    expect(retired).toEqual([
      // All three are outside the ownership of the round that replaced this decision. Each carries
      // its own copy, so each still refuses and still passes exactly as it did — no page in the
      // tree changed behaviour without being re-rendered. What they measure today, with the
      // decision this file now holds: their no-data fill sits at 1.2–1.3:1 from their own first
      // class, the same defect, on the same arithmetic.
      "stories/r8-map-web-japan-bear-casualties/beats/1-bear-casualties-by-prefecture/geo-choropleth.ts",
      "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023/geo-choropleth.ts",
      "stories/stress-f-housing-pressure/beats/housing-pressure-choropleth/geo-choropleth.ts",
    ]);
  });
});
