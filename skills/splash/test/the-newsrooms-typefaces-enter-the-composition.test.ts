/**
 * THE NEWSROOM'S DECLARED FACES ENTER THE COMPOSITION, OR THE RUN SAYS WHY NOT.
 *
 * THE DEFECT, MEASURED ON THE COLD RUN OF 2026-09-15 (`.superpowers/sdd/cold-test2-chart-friction.md`,
 * item 8). `NEWSROOM.md` declared `typefaces: Space Grotesk, Courier New`. The composed direction
 * came back as `creme/creme/the newsroom` — the newsroom's ground and accent, and `creme`'s own
 * Merriweather and Open Sans — and the report's `type:` line said only "creme, measured on …".
 * Nothing anywhere said the house faces had been considered, nothing said they had lost, and
 * nothing said why. A profile field a newsroom fills in and the tree silently ignores reads as a
 * promise; that is worse than a field that does not exist.
 *
 * THE RULE THIS HOLDS. The list is walked in its declared order against the direction's own roles
 * in ITS prominence order, and a face takes a role only when it passes the SAME questions every
 * ladder entry already passed: there is a file for it at every weight and slant those registers
 * ask for, and it covers the words they set on this beat, read out of its own cmap. Nothing is
 * relaxed to let a face through. What changes is that a face that fails is named — one line, the
 * face and the reason — instead of vanishing.
 */
import { describe, expect, it } from "bun:test";
import {
  composeDirections,
  guardDirection,
  report,
} from "../../../scripts/design-base/compose.mjs";
import {
  assignHouseFaces,
  resolveDirectionFamilies,
} from "../../../scripts/design-base/resolve-families.mjs";

/** A filed direction as the corpus records one: its register families are ROLES, not faces. */
const FILED_DIRECTION = {
  id: "fixture",
  measuredFrom: "a-published-piece",
  ground: "#FFFCEE",
  groundSource: "measured",
  accent: "#1757B6",
  accentSource: "measured",
  pad: 52,
  header: "stack",
  headRule: true,
  stroke: { series: 2.5, rule: 1 },
  registers: {
    display: {
      family: "serif",
      size: 30,
      weight: 700,
      italic: false,
      tracking: -0.2,
      transform: "none",
      ink: "ink",
    },
    eyebrow: {
      family: "sans",
      size: 10,
      weight: 600,
      italic: false,
      tracking: 1.9,
      transform: "uppercase",
      ink: "accent",
    },
    body: {
      family: "sans",
      size: 13,
      weight: 400,
      italic: false,
      tracking: 0,
      transform: "none",
      ink: "muted",
    },
    axis: {
      family: "sans",
      size: 11,
      weight: 500,
      italic: false,
      tracking: 0.4,
      transform: "none",
      ink: "muted",
    },
    annot: {
      family: "serif",
      size: 13,
      weight: 400,
      italic: true,
      tracking: 0,
      transform: "none",
      ink: "muted",
    },
    value: {
      family: "sans",
      size: 15,
      weight: 600,
      italic: false,
      tracking: 0,
      transform: "none",
      ink: "accent",
    },
  },
};

const FILED = [FILED_DIRECTION];

/** Plain words: nothing here is a coverage question, so a refusal can only be about the face. */
const TEXT = {
  display: "Coal still makes a fifth of Europe's power",
  eyebrow: "Electricity",
  body: "Source: Ember, via Our World in Data",
  axis: "0123456789",
  annot: "Poland",
  value: "21",
};

/** The same beat, whose title carries the subscript that decides a typeface. */
const TEXT_WITH_SUBSCRIPT = {
  ...TEXT,
  display: "CO₂ per person, 1990 to 2024",
};

const HOUSE = { ground: "#FFFFFF", accent: "#0B7A75" };

describe("the newsroom's typefaces in a composed direction", () => {
  it("should set a register in a face the newsroom declares when the tree can serve it", () => {
    const { offered } = composeDirections({
      newsroom: { ...HOUSE, typefaces: "Merriweather" },
      filed: FILED,
      textPerRegister: TEXT,
    });
    expect(offered.length).toBeGreaterThan(0);
    for (const candidate of offered) {
      // The display register's role is the most prominent, so the most prominent declared face
      // takes it — and it is marked as the newsroom's, not left to look like a corpus resolution.
      expect(candidate.registers.display.family).toBe("Merriweather");
      expect(candidate.registers.display.familySource).toBe("newsroom");
      // A role the list did not reach keeps its ladder, which is what leaves the two families two.
      expect(candidate.registers.body.family).toBe("sans");
      expect(candidate.provenance.registers).toContain("Merriweather");
    }
  });

  it("should give each role its own declared face, in the order the newsroom declared them", () => {
    const { offered } = composeDirections({
      newsroom: { ...HOUSE, typefaces: ["Merriweather", "Montserrat"] },
      filed: FILED,
      textPerRegister: TEXT,
    });
    expect(offered.length).toBeGreaterThan(0);
    const [candidate] = offered;
    expect(candidate.registers.display.family).toBe("Merriweather");
    expect(candidate.registers.annot.family).toBe("Merriweather");
    expect(candidate.registers.eyebrow.family).toBe("Montserrat");
    expect(candidate.registers.axis.family).toBe("Montserrat");
  });

  it("should carry the house face through to the resolved families the render draws with", () => {
    const { offered } = composeDirections({
      newsroom: { ...HOUSE, typefaces: "Merriweather" },
      filed: FILED,
      textPerRegister: TEXT,
    });
    const resolved = resolveDirectionFamilies(offered[0], TEXT);
    expect(resolved.registers.display.family).toBe("Merriweather");
    // The roles beside it still resolve down their own ladder, so nothing is left abstract.
    expect(resolved.registers.body.family).not.toBe("sans");
  });

  it("should report a declared face it cannot install, naming the face and the reason", () => {
    // `Courier New` is not a Google family. Google answers the name with no TrueType face, which is
    // what "not installed" looks like from a tree that draws from files only.
    const composition = composeDirections({
      newsroom: { ...HOUSE, typefaces: "Courier New" },
      filed: FILED,
      textPerRegister: TEXT,
    });
    const refusal = composition.typefaces.refused.find(
      (entry) => entry.family === "Courier New",
    );
    expect(
      refusal,
      "the declared face was dropped without a word",
    ).toBeDefined();
    expect(refusal!.reason).toMatch(/not installed/i);
    const text = report(composition, { beat: {} });
    expect(text).toContain("Courier New");
    expect(text).toMatch(/Courier New — not installed/);
    // And it is still a refusal, not a smuggled-in face.
    for (const candidate of composition.offered)
      for (const register of Object.values(candidate.registers) as Array<{
        family: string;
      }>)
        expect(register.family).not.toBe("Courier New");
  });

  it("should report a declared face that cannot set this beat's words, naming what it lacks", () => {
    // Roboto Slab has no U+2082 (`resolve-families.mjs`, measured 2026-09-12). The face installs;
    // it simply cannot set this beat's title, and the difference is what the report has to say.
    const composition = composeDirections({
      newsroom: { ...HOUSE, typefaces: "Roboto Slab" },
      filed: FILED,
      textPerRegister: TEXT_WITH_SUBSCRIPT,
    });
    const refusal = composition.typefaces.refused.find(
      (entry) => entry.family === "Roboto Slab",
    );
    expect(
      refusal,
      "a face that cannot set the title was dropped without a word",
    ).toBeDefined();
    expect(refusal!.reason).toMatch(/coverage/i);
    expect(refusal!.reason).toContain("U+2082");
    expect(report(composition, { beat: {} })).toMatch(
      /Roboto Slab — no coverage/,
    );
  });

  it("should list every declared face in the report, used or not", () => {
    const composition = composeDirections({
      newsroom: { ...HOUSE, typefaces: "Merriweather, Courier New" },
      filed: FILED,
      textPerRegister: TEXT,
    });
    const text = report(composition, { beat: {} });
    expect(text).toContain("the newsroom declares Merriweather, Courier New");
    expect(text).toMatch(/Merriweather sets display, annot/);
    expect(text).toMatch(/Courier New — /);
  });

  it("should change nothing for a newsroom that declares no typefaces", () => {
    const composition = composeDirections({
      newsroom: HOUSE,
      filed: FILED,
      textPerRegister: TEXT,
    });
    expect(composition.offered.length).toBeGreaterThan(0);
    for (const candidate of composition.offered) {
      expect(candidate.registers.display.family).toBe("serif");
      expect(candidate.registers.display.familySource).toBeUndefined();
      expect(candidate.provenance.registers).not.toMatch(/newsroom's/);
    }
    expect(composition.typefaces.declared).toEqual([]);
    expect(report(composition, { beat: {} })).not.toMatch(/declares/);
  });

  it("should never let a house face past the guard the ladder faces", () => {
    // NO GUARD IS RELAXED TO GET A HOUSE FACE IN. A direction handed straight to the guard with a
    // newsroom face that cannot set the text is refused, with the code point named.
    const problems = guardDirection(
      {
        ground: "#FFFFFF",
        accent: "#0B7A75",
        registers: {
          ...FILED_DIRECTION.registers,
          display: {
            ...FILED_DIRECTION.registers.display,
            family: "Roboto Slab",
            familySource: "newsroom",
          },
        },
      },
      TEXT_WITH_SUBSCRIPT,
    );
    expect(problems.join(" ")).toMatch(/Roboto Slab/);
    expect(problems.join(" ")).toContain("U+2082");
  });
});

describe("assigning the house faces to a direction's roles", () => {
  it("should leave a role its ladder when the declared list runs out", () => {
    const { families, used, refused } = assignHouseFaces(
      FILED_DIRECTION,
      ["Merriweather"],
      TEXT,
    );
    expect(families).toEqual({ serif: "Merriweather" });
    expect(used).toEqual([
      {
        role: "serif",
        family: "Merriweather",
        registers: ["display", "annot"],
      },
    ]);
    expect(refused).toEqual([]);
  });

  it("should record a refusal per face rather than swallow it", () => {
    const { families, used, refused } = assignHouseFaces(
      FILED_DIRECTION,
      ["Courier New", "Merriweather"],
      TEXT,
    );
    // The refused face does not block the next one: the list is a ladder.
    expect(families.serif).toBe("Merriweather");
    expect(used.map((u) => u.family)).toEqual(["Merriweather"]);
    expect(refused.map((r) => r.family)).toEqual(["Courier New"]);
  });
});
