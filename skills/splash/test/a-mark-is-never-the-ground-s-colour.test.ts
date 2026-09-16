/**
 * A MARK IS NEVER DRAWN IN THE COLOUR OF THE GROUND IT SITS ON.
 *
 * THE DEFECT, MEASURED COLD ON 2026-09-16. `proof/web-flow-map-danube` shipped a BLUE Danube on
 * BLUE water: 1.4° of hue between river and sea on `rapport`, 19.5° on `creme`. Nothing refused it,
 * because it is not a legibility failure — the river reads 5.55:1 on that water and clears every
 * floor in `compose.mjs`. The beat's own `PALETTE.md` argues against that render in writing, at
 * length, and records an amber (`#9A6B00`) that the renderer never drew.
 *
 * WHY IT COULD HAPPEN. The direction's colour and the beat's recorded colour were resolved in two
 * places that never met. `composeDirections()` read `PALETTE.md`, composed a candidate, printed it
 * in a report — and every render read `readDirection()` off disk and painted `direction.accent`.
 * The resolution that reached the paint was the one that had never heard of the subject.
 *
 * WHAT REPLACES IT. One resolution, `composeDirection()`, read by the report and by the renderer.
 * The record owns the HUE (a subject convention is a hue and nothing else); the direction owns the
 * VALUE (how deep and how saturated a mark may be on this paper). Neither survives as a hex, which
 * is what makes it a composition rather than a precedence rule — the owner ruled precedence out:
 * « couleur du sujet et direction […] c'est un ensemble commun ».
 *
 * MUTATIONS THAT MUST GO RED (all four run below as live mutations, not as comments):
 *   1. give a mark the hue of the pigment its ground was painted in → the hue guard.
 *   2. tint the ground with the mark's own accent, as the danube's own `plateTints` did → 0.0°.
 *   3. have `composeAccent` return the direction's accent instead of composing → the amber is gone.
 *   4. drop `grounds` from the `guardDirection` call → the blue-on-blue passes again.
 */
import { describe, it, expect } from "bun:test";
import {
  composeAccent,
  composeDirection,
  composeDirections,
  groundHueProblems,
  guardDirection,
} from "#shared/design-base/compose.mjs";
import {
  plateTints,
  plateGrounds,
  WATER_HUE,
} from "#shared/map-beat/tints.mjs";
import { readDirection } from "#shared/design-base/read-direction.mjs";
import { contrast, mix, readPalette } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import {
  hsl,
  hueGap,
  SAME_POLE_DEGREES,
} from "#shared/design-base/colour-space.mjs";
import { channels } from "#shared/chart-beat/colour.mjs";
import { join } from "node:path";
import { readdirSync } from "node:fs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const DIRECTIONS = join(ROOT, "shared", "design-base", "directions");
const DANUBE = join(ROOT, "archive", "web-flow-map-danube");

/** THE OCCUPANCY THESE CASES ARE ABOUT, FIXED ON PURPOSE.
 *
 *  `plateGrounds` now refuses to guess which of a basemap's grounds a beat's marks sit on — see
 *  `a-mark-is-only-measured-against-the-ground-it-sits-on.test.ts`, which measures it. Every case
 *  below is about the RULE that holds a mark apart from the water under it, so the water is put
 *  under the mark here rather than measured: a test that let the occupancy vary would be testing
 *  two things and reporting one. */
const ON_BOTH = { water: true, land: true };

const hueOf = (hex: string) => {
  const [r, g, b] = channels(hex);
  return hsl(r, g, b).h;
};

const filed = () =>
  readdirSync(DIRECTIONS)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readDirection(join(DIRECTIONS, f)));

/** Enough text that the glyph guard has something real to check. */
const TEXT = {
  display: "Le Danube",
  eyebrow: "FLEUVE",
  body: "Un caveat.",
  axis: "2024",
  annot: "SOURCE",
  value: "2 860",
};

describe("the guard: a mark may not take the hue of the ground it sits on", () => {
  it("should refuse a mark drawn in the pigment its ground was painted in (MUTATION 1)", () => {
    const water = {
      name: "the basemap's water",
      colour: "#CEDDE1",
      pigment: WATER_HUE,
    };
    // The mutation: hand the guard a mark in the water's own blue.
    const problems = groundHueProblems(WATER_HUE, [water]);
    expect(problems.length).toBe(1);
    expect(problems[0]).toContain("0.0°");
    expect(problems[0]).toContain("the basemap's water");
  });

  it("should pass a mark whose hue is a pole away from every ground it sits on", () => {
    const water = {
      name: "the basemap's water",
      colour: "#CEDDE1",
      pigment: WATER_HUE,
    };
    expect(groundHueProblems("#9A6B00", [water])).toEqual([]);
    expect(hueGap(hueOf("#9A6B00"), hueOf(WATER_HUE))).toBeGreaterThan(
      SAME_POLE_DEGREES,
    );
  });

  it("should say NOTHING about a ground that declares no pigment — paper is not a convention", () => {
    // Cream paper `#FFFCEE` has hue 49° and an amber mark has 41.7°: seven degrees apart, and
    // perfectly legible. A rule read off the pixel would refuse it. A rule read off the pigment does
    // not, because paper was never painted with anything.
    const land = { name: "the basemap's land", colour: "#F4F1E3" };
    expect(hueGap(hueOf("#9A6B00"), hueOf("#FFFCEE"))).toBeLessThan(
      SAME_POLE_DEGREES,
    );
    expect(groundHueProblems("#9A6B00", [land])).toEqual([]);
  });

  it("should refuse EVERY accent when the ground is tinted with the accent itself (MUTATION 2)", () => {
    // This is the danube's own former `plateTints`: `water: mix(ground, accent, 0.16)`. The mark can
    // never be picked out of a ground that follows it, whatever hue is chosen — which is why the
    // defect was structural and not one unlucky pairing.
    for (const direction of filed()) {
      const water = mix(direction.ground, direction.accent, 0.16);
      const problems = groundHueProblems(direction.accent, [
        {
          name: "the basemap's water",
          colour: water,
          pigment: direction.accent,
        },
      ]);
      expect([direction.id, problems.length]).toEqual([direction.id, 1]);
      expect(problems[0]).toContain("0.0°");
    }
  });

  it("should reach the guard through guardDirection's own grounds argument (MUTATION 4)", () => {
    const direction = readDirection(join(DIRECTIONS, "rapport.md"));
    const tints = plateTints(direction);
    const grounds = plateGrounds(tints, ON_BOTH);
    // rapport's filed accent is a blue 1.4° from the water it would be drawn on, and it clears
    // every contrast floor there — which is exactly why nothing caught it.
    expect(contrast(direction.accent, tints.water)).toBeGreaterThan(3);
    const withGrounds = guardDirection(direction, TEXT, grounds);
    const withoutGrounds = guardDirection(direction, TEXT);
    expect(withGrounds.join(" ")).toMatch(/ONE\s+pole|one pole/);
    // The mutation — dropping `grounds` at the call site — puts the blue-on-blue back through.
    expect(withoutGrounds.join(" ")).not.toMatch(/one pole/);
  });
});

describe("the composition: the record owns the hue, the direction owns the value", () => {
  it("should keep the direction's accent untouched when nothing is recorded", () => {
    const direction = readDirection(join(DIRECTIONS, "creme.md"));
    const kept = composeAccent({
      subject: null,
      key: direction.accent,
      ground: direction.ground,
      registers: direction.registers,
    });
    expect(kept.accent).toBe(direction.accent);
    expect(kept.composed).toBe(false);
  });

  it("should carry the recorded HUE into every direction, at that direction's own value", () => {
    const palette = readPalette(DANUBE, { stopAt: join(ROOT, "proof") });
    const recorded = hueOf(palette.accent);
    const values = new Set<string>();
    for (const direction of filed()) {
      const tints = plateTints(direction);
      const composed = composeAccent({
        subject: palette.accent,
        key: direction.accent,
        ground: direction.ground,
        registers: direction.registers,
        grounds: plateGrounds(tints, ON_BOTH),
      });
      expect(composed.accent, direction.id).not.toBeNull();
      // The hue is the argument and is never rotated…
      expect(
        hueGap(hueOf(composed.accent!), recorded),
        `${direction.id} lost the recorded hue`,
      ).toBeLessThan(1);
      values.add(composed.accent!);
    }
    // …and the value is the direction's, so three directions give three different colours. A single
    // value across all three would mean the record had simply been selected (MUTATION 3).
    expect(values.size).toBe(filed().length);
  });

  it("should never hand back the filed accent when a subject colour is recorded (MUTATION 3)", () => {
    const palette = readPalette(DANUBE, { stopAt: join(ROOT, "proof") });
    for (const direction of filed()) {
      const composed = composeAccent({
        subject: palette.accent,
        key: direction.accent,
        ground: direction.ground,
        registers: direction.registers,
        grounds: plateGrounds(plateTints(direction), ON_BOTH),
      });
      expect([direction.id, composed.accent]).not.toEqual([
        direction.id,
        direction.accent,
      ]);
      // Nor is it the recorded hex taken whole: that would be selection with an extra step.
      expect([direction.id, composed.accent]).not.toEqual([
        direction.id,
        palette.accent,
      ]);
    }
  });

  it("should clear the text floor its own registers set, not merely the mark floor", () => {
    // `creme` sets its eyebrow and its value register in the accent, so 3:1 is not enough — this is
    // the walk `PALETTE.md` did by hand, now done by the machinery for any subject.
    const direction = readDirection(join(DIRECTIONS, "creme.md"));
    const palette = readPalette(DANUBE, { stopAt: join(ROOT, "proof") });
    const composed = composeAccent({
      subject: palette.accent,
      key: direction.accent,
      ground: direction.ground,
      registers: direction.registers,
      grounds: plateGrounds(plateTints(direction), ON_BOTH),
    });
    expect(contrast(composed.accent!, direction.ground)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("should keep a deliberately neutral record neutral, and never read a hue off a grey", () => {
    // `proof/web-heatmap-coal-share-europe` records `#3A3A3A` — coal, drawn in greys on purpose. A
    // grey has chroma 0 and therefore hue 0, so lending "its hue" to a direction's saturation would
    // paint that subject RED. The record owns whether there is a hue at all.
    const direction = readDirection(join(DIRECTIONS, "creme.md"));
    const composed = composeAccent({
      subject: "#3A3A3A",
      key: direction.accent,
      ground: direction.ground,
      registers: direction.registers,
    });
    const [r, g, b] = channels(composed.accent!);
    expect([r, g, b]).toEqual([r, r, r]);
    expect(contrast(composed.accent!, direction.ground)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("should leave a house palette exactly as the newsroom recorded it", () => {
    // `origin: newsroom` is a house identity, not a subject claim. Composing it would be overruling
    // a newsroom's own colours, which this file must never do.
    const { offered } = composeDirections({
      newsroom: { ground: "#FFFFFF", accent: "#0B7A75", origin: "newsroom" },
      filed: filed(),
      textPerRegister: TEXT,
    });
    expect(offered.length).toBeGreaterThan(0);
    for (const candidate of offered) {
      expect(candidate.ground).toBe("#FFFFFF");
      expect(candidate.accent).toBe("#0B7A75");
    }
  });
});

describe("one resolution reaches the paint", () => {
  it("should hand a renderer a direction whose accent is off every ground's hue", () => {
    const palette = readPalette(DANUBE, { stopAt: join(ROOT, "proof") });
    for (const direction of filed()) {
      const tints = plateTints(direction);
      const grounds = plateGrounds(tints, ON_BOTH);
      const composed = composeDirection({
        direction,
        palette,
        grounds,
        textPerRegister: TEXT,
      });
      // Everything a renderer also needs survives the composition.
      expect([direction.id, composed.id]).toEqual([direction.id, direction.id]);
      expect(composed.registers.display.size).toBe(
        direction.registers.display.size,
      );
      expect(composed.stroke).toEqual(direction.stroke);
      expect(composed.ground).toBe(direction.ground);
      // …and the colour that reaches the paint is the composed one.
      expect(guardDirection(composed, TEXT, grounds)).toEqual([]);
      expect(
        hueGap(hueOf(composed.accent), hueOf(tints.pigment)),
        `${direction.id} draws its river in the water's own hue`,
      ).toBeGreaterThanOrEqual(SAME_POLE_DEGREES);
      const furniture = deriveFurniture(composed.ground);
      expect(furniture.ink).toBeTruthy();
    }
  });

  it("should refuse loudly rather than fall back to the filed accent", () => {
    const direction = readDirection(join(DIRECTIONS, "creme.md"));
    // Two grounds a mark cannot clear at once: 3:1 on `#595959` needs a lightness at or above the
    // pale end, 3:1 on `#B0B0B0` needs one at or below the dark end, and no colour is both. The
    // mark must be refused with the numbers, never quietly replaced by the direction's own accent.
    const impossible = [
      { name: "a mid-grey band", colour: "#595959" },
      { name: "a pale grey band", colour: "#B0B0B0" },
    ];
    expect(() =>
      composeDirection({
        direction,
        palette: { ground: "#FFFFFF", accent: "#9A6B00", origin: "journalist" },
        grounds: impossible,
        textPerRegister: TEXT,
      }),
    ).toThrow(/clears every floor|floor/);
  });
});
