/**
 * REGISTERS: the one interface between the design base's two axes.
 *
 * A TREATMENT names the register it writes into; a DIRECTION says what that register looks like.
 * Neither knows the other's internals, which is what lets a treatment compose across every
 * direction and a direction apply across every treatment.
 *
 * The probes that produced this design hard-coded `.toUpperCase()` at four call sites and a
 * `fontStyle` ternary at six, so a treatment silently knew whether its direction set annotations in
 * capitals. That is the coupling these tests exist to refuse.
 */
import { describe, it, expect } from "bun:test";
import {
  CORE_REGISTERS,
  FAMILY_REGISTERS,
  REGISTERS,
  registersFor,
  resolveRegister,
  applyCase,
} from "../../../shared/chart-beat/registers.mjs";

const DIRECTION = {
  id: "rapport",
  ground: "#FFFFFF",
  accent: "#1F5C8B",
  registers: {
    display: {
      family: "Iowan Old Style",
      size: 27,
      weight: 700,
      italic: false,
      tracking: -0.3,
      transform: "none",
      ink: "ink",
    },
    eyebrow: {
      family: "Helvetica Neue",
      size: 9.5,
      weight: 700,
      italic: false,
      tracking: 1.6,
      transform: "uppercase",
      ink: "accent",
    },
    body: {
      family: "Iowan Old Style",
      size: 13,
      weight: 400,
      italic: true,
      tracking: 0,
      transform: "none",
      ink: "muted",
    },
    axis: {
      family: "Helvetica Neue",
      size: 11,
      weight: 400,
      italic: false,
      tracking: 0.5,
      transform: "none",
      ink: "muted",
    },
    annot: {
      family: "Helvetica Neue",
      size: 10,
      weight: 700,
      italic: false,
      tracking: 1.3,
      transform: "uppercase",
      ink: "ink",
    },
    value: {
      family: "Helvetica Neue",
      size: 14.5,
      weight: 700,
      italic: false,
      tracking: 0,
      transform: "none",
      ink: "accent",
    },
  },
};

describe("registers", () => {
  it("should hold five core voices every family shares", () => {
    // VOICE, never apparatus. A title, a category line, running text, an annotation, a number on a
    // mark — a chart has all five and so does a map, a video frame and a scrollytelling step.
    expect(CORE_REGISTERS).toEqual(["display", "eyebrow", "body", "annot", "value"]);
    expect(Object.isFrozen(CORE_REGISTERS)).toBe(true);
  });

  it("should give each family its own apparatus, because a map has no axis", () => {
    // A first version froze SIX registers with `axis` among them — one family's vocabulary imposed
    // on every family. `proof/map-quake-symbol/QuakeSymbolStill.tsx` declares `LEGEND_LABEL` and
    // `CAPTION` and no axis at all, and it found the mistake within minutes.
    expect(registersFor("chart")).toContain("axis");
    expect(registersFor("map")).not.toContain("axis");
    expect(registersFor("map")).toContain("legend");
    expect(registersFor("map")).toContain("place");
    for (const family of Object.keys(FAMILY_REGISTERS))
      for (const voice of CORE_REGISTERS)
        expect(registersFor(family), family).toContain(voice);
  });

  it("should refuse a register that belongs to another family", () => {
    expect(() => resolveRegister(DIRECTION, "legend", { family: "chart" })).toThrow(/legend/);
    expect(() => resolveRegister(DIRECTION, "axis", { family: "map" })).toThrow(/axis/);
  });

  it("should derive a family's apparatus from a core voice when the direction has none", () => {
    // What makes a direction PORTABLE. `creme` was measured on a unit chart that has no legend;
    // asked to govern a map it derives one from `body` rather than inventing a voice or refusing
    // the direction outright — and says so, so nothing inferred looks measured.
    const legend = resolveRegister(DIRECTION, "legend", { family: "map" });
    expect(legend.derivedFrom).toBe("body");
    expect(legend.fontFamily).toBe(DIRECTION.registers.body.family);
    expect(legend.fontSize).toBeLessThan(DIRECTION.registers.body.size);
    expect(resolveRegister(DIRECTION, "axis", { family: "chart" }).derivedFrom).toBeNull();
  });

  it("should keep the legacy list equal to a chart's set", () => {
    expect(REGISTERS).toEqual(registersFor("chart"));
    expect(Object.isFrozen(REGISTERS)).toBe(true);
  });

  it("should resolve a register into attributes an SVG text element takes", () => {
    const r = resolveRegister(DIRECTION, "body");
    expect(r.fontFamily).toBe("Iowan Old Style");
    expect(r.fontSize).toBe(13);
    expect(r.fontWeight).toBe(400);
    expect(r.fontStyle).toBe("italic");
    expect(r.letterSpacing).toBe(0);
  });

  it("should keep ink a role, never a colour", () => {
    // A direction that named a literal would render correctly for exactly one newsroom ground.
    // `deriveFurniture` resolves the role against the real ground at draw time.
    const r = resolveRegister(DIRECTION, "eyebrow");
    expect(r.ink).toBe("accent");
    expect(r.ink).not.toMatch(/^#/);
  });

  it("should refuse a register the direction does not define", () => {
    const partial = {
      ...DIRECTION,
      registers: { display: DIRECTION.registers.display },
    };
    expect(() => resolveRegister(partial, "annot")).toThrow(/annot/);
  });

  it("should refuse a register name no family has", () => {
    expect(() => resolveRegister(DIRECTION, "caption")).toThrow(/caption/);
  });

  it("should refuse an ink role that is not one of the three", () => {
    const wrong = {
      ...DIRECTION,
      registers: {
        ...DIRECTION.registers,
        axis: { ...DIRECTION.registers.axis, ink: "#999999" },
      },
    };
    expect(() => resolveRegister(wrong, "axis")).toThrow(/ink role/);
  });

  it("should apply the register's own case rather than leaving it to the caller", () => {
    // A treatment writes "sous le niveau" and never learns whether this direction shouts.
    expect(
      applyCase("sous le niveau", DIRECTION.registers.annot.transform),
    ).toBe("SOUS LE NIVEAU");
    expect(
      applyCase("sous le niveau", DIRECTION.registers.body.transform),
    ).toBe("sous le niveau");
    expect(applyCase("Niveau de 1967", "lowercase")).toBe("niveau de 1967");
  });

  it("should carry every register of a real direction without loss", () => {
    for (const name of REGISTERS) {
      const r = resolveRegister(DIRECTION, name);
      expect(typeof r.fontFamily, name).toBe("string");
      expect(Number.isFinite(r.fontSize), name).toBe(true);
      expect(["normal", "italic"], name).toContain(r.fontStyle);
      expect(["ink", "muted", "accent"], name).toContain(r.ink);
    }
  });
});
