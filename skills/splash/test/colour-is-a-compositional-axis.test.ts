/**
 * COLOUR IS A COMPOSITIONAL AXIS, NOT A BLOCK TAKEN WHOLE.
 *
 * THE DEFECT, NAMED BY THE OWNER ON 2026-09-08. Asked which of three hex values a direction's accent
 * should take, the answer was that the question is the wrong shape: this is a composition, not a
 * menu. He was right, and the code said so plainly — `composeDirections` crossed TYPE against SPACE
 * across the filed directions and took `ground` and `accent` wholesale from the type direction. A
 * palette could never be paired with type it was not measured beside, and the eighty measured
 * palettes in the corpus were invisible to it. One axis of the three was not an axis.
 *
 * AND THE PROVENANCE WAS FALSE. Every candidate reported its colour as `<direction>, measured`
 * unconditionally. Measured the same day: `rapport` chose both its ground and its accent and
 * `nocturne` chose its accent — so the composer told the journalist "measured" about three values
 * a person had decided. Every other falsehood in this chain sat in a record; this one was shown to
 * the reader whose job is to arbitrate it.
 *
 * What keeps widening safe is that nothing is relaxed: every composed candidate goes through the
 * same three guards a filed direction faces. A wider search refused by the same floors offers more
 * without offering worse.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  composeDirections,
  palettesFrom,
  palettesFromCorpus,
  report,
} from "../../../scripts/design-base/compose.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");

/** Two filed directions, deliberately unalike: a light serif one and a dark sans one. */
const CREME = {
  id: "creme",
  measuredFrom: "abc-mullet",
  ground: "#FFFCEE",
  groundSource: "measured",
  accent: "#1757B6",
  accentSource: "measured",
  pad: 40,
  header: "stack",
  headRule: false,
  stroke: { series: 2, rule: 1 },
  registers: {
    display: {
      family: "Georgia",
      size: 28,
      weight: 700,
      italic: false,
      tracking: 0,
      transform: "none",
      ink: "ink",
    },
    eyebrow: {
      family: "Helvetica",
      size: 9.5,
      weight: 700,
      italic: false,
      tracking: 1.6,
      transform: "uppercase",
      ink: "accent",
    },
    body: {
      family: "Georgia",
      size: 13,
      weight: 400,
      italic: true,
      tracking: 0,
      transform: "none",
      ink: "muted",
    },
    axis: {
      family: "Helvetica",
      size: 11,
      weight: 400,
      italic: false,
      tracking: 0.5,
      transform: "none",
      ink: "muted",
    },
    // Deliberately two axes away from `eyebrow`, which is also Helvetica caps in the accent: a
    // fixture whose registers collapse tests the separation floor and nothing else.
    annot: {
      family: "Helvetica",
      size: 14,
      weight: 400,
      italic: false,
      tracking: 1.2,
      transform: "none",
      ink: "ink",
    },
    value: {
      family: "Helvetica",
      size: 14.5,
      weight: 700,
      italic: false,
      tracking: 0,
      transform: "none",
      ink: "accent",
    },
  },
};

const NOCTURNE = {
  ...CREME,
  id: "nocturne",
  measuredFrom: "pudding-streaming",
  ground: "#111044",
  groundSource: "measured",
  accent: "#4FE0C0",
  accentSource: "chosen",
  pad: 56,
  header: "centre",
};

const FILED = [CREME, NOCTURNE];

/** Enough text that the glyph guard has something real to check. */
const TEXT = {
  display: "Emissions",
  eyebrow: "CLIMATE",
  body: "A caveat.",
  axis: "2024",
  annot: "PEAK",
  value: "42",
};

describe("the composer's colour axis", () => {
  it("should offer a candidate pairing one direction's type with another's palette", () => {
    // `limit` is a presentation decision — how many a journalist is shown — not a search one.
    // A test about what the axis can REACH must look past it.
    const { offered } = composeDirections({
      filed: FILED,
      textPerRegister: TEXT,
      limit: Infinity,
    });
    // The point of the axis: `nocturne`'s registers on `creme`'s ground. Before colour was an axis
    // this combination could not be expressed at all, whatever the guards said about it.
    const crossed = offered.find(
      (c) =>
        c.provenance.registers.startsWith("nocturne") &&
        c.ground === CREME.ground,
    );
    expect(
      crossed,
      `no candidate crossed nocturne's type with creme's palette; offered: ${offered.map((c) => c.id).join(", ")}`,
    ).toBeDefined();
  });

  it("should never overrule a newsroom that has recorded its palette", () => {
    // `PALETTE.md` already decides this for every beat, with its reasoning written out. Widening the
    // search is not a licence to overrule a house palette.
    const { offered } = composeDirections({
      newsroom: { ground: "#FFFFFF", accent: "#0B7A75" },
      filed: FILED,
      textPerRegister: TEXT,
    });
    expect(offered.length).toBeGreaterThan(0);
    for (const candidate of offered) {
      expect(candidate.ground).toBe("#FFFFFF");
      expect(candidate.accent).toBe("#0B7A75");
    }
  });

  it("should say a colour was chosen when a person chose it", () => {
    // THE FALSEHOOD THIS CLOSES. `nocturne`'s accent is authored; a candidate carrying it must not
    // tell the journalist it was measured off the Pudding piece.
    const { offered } = composeDirections({
      filed: FILED,
      textPerRegister: TEXT,
    });
    const carrying = offered.filter((c) => c.accent === NOCTURNE.accent);
    expect(carrying.length).toBeGreaterThan(0);
    for (const candidate of carrying) {
      expect(candidate.provenance.accent).toMatch(/chosen/i);
      expect(candidate.provenance.accent).not.toMatch(/measured/i);
    }
  });

  it("should say a colour was measured when it was, and name the piece", () => {
    const { offered } = composeDirections({
      filed: FILED,
      textPerRegister: TEXT,
    });
    const carrying = offered.filter((c) => c.accent === CREME.accent);
    expect(carrying.length).toBeGreaterThan(0);
    for (const candidate of carrying) {
      expect(candidate.provenance.accent).toMatch(/measured/i);
      expect(candidate.provenance.accent).toContain(CREME.measuredFrom);
    }
  });

  it("should prefer a palette published as one whole over a pair we assembled", () => {
    // A ground and an accent taken from the SAME piece is a pairing a designer shipped. Mixing two
    // pieces' colours is our invention, and it may well be a good one — it just does not get to
    // outrank the published pairing by default.
    // The assembled candidate here is deliberately the more legible of the two, so nothing but the
    // ordering rule can put the published pairing first.
    const { offered } = composeDirections({
      filed: FILED,
      // The assembled palette is offered FIRST. Both candidates carry the same registers, so their
      // separation ties and a stable sort would simply keep this order — only the rule that ranks a
      // published pairing above one we put together can move it. Listing them the other way round
      // makes this test pass with the rule deleted, which was measured.
      palettes: [
        {
          from: "creme+nocturne",
          measuredFrom: "two pieces",
          ground: CREME.ground,
          // A red at hue 0, not another blue: the short list collapses two accents inside one
          // hue pole, so a fixture whose two palettes are both blue tests the collapse rule and
          // never reaches the ordering rule it means to test.
          accent: "#8B1A1A",
          groundSource: "measured",
          accentSource: "measured",
          whole: false,
        },
        ...palettesFrom([CREME]),
      ],
      textPerRegister: TEXT,
      limit: Infinity,
    });
    const whole = offered.findIndex((c) => c.palette.whole === true);
    const mixed = offered.findIndex((c) => c.palette.whole === false);
    expect(whole, "no whole palette was offered").toBeGreaterThanOrEqual(0);
    expect(mixed, "no assembled palette was offered").toBeGreaterThanOrEqual(0);
    expect(whole).toBeLessThan(mixed);
  });

  it("should still refuse, on the same floors, whatever the axis offers", () => {
    // WIDENING THE SEARCH MUST NOT WIDEN WHAT PASSES. A palette drawn from a filed direction always
    // travels as a PAIR, so this combination cannot arise by itself — it has to be assembled, which
    // is exactly what the axis now allows a caller to do. `nocturne`'s mint reads 1.6:1 on `creme`'s
    // cream, and two registers set type in the accent. Legal to propose, refused on the floor, and
    // refused with the number rather than silently dropped.
    const { offered, refused } = composeDirections({
      filed: FILED,
      palettes: [
        {
          from: "assembled",
          measuredFrom: "two pieces",
          ground: CREME.ground,
          accent: NOCTURNE.accent,
          groundSource: "measured",
          accentSource: "chosen",
          whole: false,
        },
      ],
      textPerRegister: TEXT,
    });
    expect(offered, "a 1.6:1 accent on cream was offered").toEqual([]);
    expect(refused.length).toBeGreaterThan(0);
    for (const entry of refused) {
      expect(entry.problems.length).toBeGreaterThan(0);
      expect(entry.problems.join(" ")).toMatch(/1\.\d\d:1|floor/);
    }
  });
});

describe("the palettes a composition may draw from", () => {
  it("should carry one entry per filed direction, with its sources", () => {
    const palettes = palettesFrom(FILED);
    const nocturne = palettes.find((p) => p.from === "nocturne");
    expect(nocturne?.ground).toBe("#111044");
    expect(nocturne?.accent).toBe("#4FE0C0");
    expect(nocturne?.groundSource).toBe("measured");
    expect(nocturne?.accentSource).toBe("chosen");
    expect(nocturne?.whole).toBe(true);
  });

  it("should treat a missing source as measured, exactly as a record does", () => {
    const [palette] = palettesFrom([
      { ...CREME, groundSource: undefined, accentSource: undefined },
    ]);
    expect(palette.groundSource).toBe("measured");
    expect(palette.accentSource).toBe("measured");
  });
});

/**
 * THE CORPUS IS REACHABLE, AND THIS IS THE TEST THAT SAYS SO.
 *
 * Eighty references have been measured on their own graphic. Before colour was an axis, not one of
 * their palettes could reach a beat: the composer saw three filed directions and nothing else. A
 * base that harvests eighty pieces and can offer three is a library nobody can borrow from.
 *
 * It runs against the real corpus rather than a fixture, deliberately — the number it asserts is
 * about the base's actual reach, and a fixture would assert the reach of the fixture.
 */
describe("the palettes the corpus carries", () => {
  const REFS = join(ROOT, "docs", "design-base", "references");

  function corpus() {
    if (!existsSync(REFS)) return [];
    const out: Array<{ id: string; family: string; record: any }> = [];
    for (const family of readdirSync(REFS)) {
      const familyDir = join(REFS, family);
      if (!statSync(familyDir).isDirectory()) continue;
      for (const id of readdirSync(familyDir)) {
        const path = join(familyDir, id, "measured.json");
        if (!existsSync(path)) continue;
        out.push({ id, family, record: JSON.parse(readFileSync(path, "utf8")) });
      }
    }
    return out;
  }

  it("should offer a palette from every reference measured on its own graphic", () => {
    const references = corpus();
    if (!references.length) return;
    // A palette needs a ground AND an accent. Two of the eighty graphics measured on 2026-09-08 —
    // ProPublica's hate-crime map and the Marshall Project's mortality gap — carry ZERO chromatic
    // poles: they are genuinely achromatic pieces, drawn in greys on near-white. They contribute no
    // accent, which is correct, and it is not the same thing as failing to be measured.
    const withAnAccent = references.filter(
      (r) =>
        r.record.routes?.pixel?.measuredFrom === "graphic.png" &&
        r.record.pixel?.chromatic?.length,
    );
    const palettes = palettesFromCorpus(references);
    expect(palettes.length).toBe(withAnAccent.length);
    expect(palettes.length).toBeGreaterThan(20);
    for (const palette of palettes) {
      expect(palette.ground, palette.from).toMatch(/^#[0-9A-F]{6}$/);
      expect(palette.accent, palette.from).toMatch(/^#[0-9A-F]{6}$/);
      expect(palette.whole).toBe(true);
    }
  });

  it("should refuse a record that measured the page rather than the graphic", () => {
    // The repair of 2026-09-08 is what makes this base usable as a palette source at all. A record
    // measured on a page carries the site's navigation bar and its cookie strip, and offering that
    // to a beat as an art direction is the defect wearing a new hat.
    const pageMeasured = {
      id: "somewhere",
      family: "line",
      record: {
        routes: { pixel: { state: "ok", measuredFrom: "screenshot.png" } },
        pixel: { ground: { hex: "#FFFFFF" }, chromatic: [{ hex: "#3274DA", share: 0.09 }] },
      },
    };
    expect(palettesFromCorpus([pageMeasured])).toEqual([]);
  });

  it("should hand a beat more art directions than the three that are filed", () => {
    const references = corpus();
    if (!references.length) return;
    const { held } = composeDirections({
      filed: FILED,
      palettes: palettesFromCorpus(references),
      textPerRegister: TEXT,
    });
    expect(held).toBeGreaterThan(3);
  });

  it("should still show a journalist a short list, and say how many held up", () => {
    const references = corpus();
    if (!references.length) return;
    const result = composeDirections({
      filed: FILED,
      palettes: palettesFromCorpus(references),
      textPerRegister: TEXT,
    });
    expect(result.offered.length).toBeLessThanOrEqual(3);
    const text = report(result, { beat: { evidenceLevels: 4 } });
    expect(text).toMatch(/best are below/);
    expect(text).toMatch(/none is chosen/i);
  });
});
