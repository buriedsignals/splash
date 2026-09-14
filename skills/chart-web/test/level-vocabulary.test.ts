/**
 * THE LEVEL VOCABULARY'S OWN REFUSALS — `assets/level.ts`, the third control this format can
 * generate without a script. `filter.ts` says what may LEAVE the picture, `stack.ts` what may MOVE
 * in it, this one what the picture may be MEASURED AGAINST.
 *
 * Every case below is a MUTATION that was run against the real beat before it was written down
 * here: `proof/web-grouped-bar-wind-vs-solar`'s runner or component was edited, the three renders
 * were re-run, and the message quoted is the one they printed. A guard that has never been seen to
 * redden is a guard nobody has tested, and this branch has met three that went green because their
 * own walk missed the files they were written to hold.
 *
 * The half this file does NOT hold, so it is not trusted past its reach: whether the picture the
 * generated CSS produces is the one the declaration describes. Whether a reference really lands on
 * the bar top it was read off, whether it crosses the whole plot, whether the chosen country's name
 * is the only one lit and its bars the only ones ringed, and whether every column keeps its series
 * colour in every state — all of that is measured by driving a real browser at real coordinates,
 * and by looking at the result.
 */
import { describe, expect, it } from "bun:test";

import {
  LEVEL_NONE_SLUG,
  assertLevelDeclaration,
  levelCss,
  levelNotesForMarkup,
  levelOptionId,
  levelOptionsForMarkup,
  levelRuleKey,
  levelRulesForMarkup,
  levelSlugOf,
} from "../assets/level.ts";

const DRAWN = { drawnKeys: ["DEU", "POL", "CHE"], drawnSeries: ["wind", "solar"], height: 340 };

/** Two options over the same three drawn countries, in the shape the beat declares. */
const PLAN = {
  label: "Mesurer les six à l'aune de",
  noneLabel: "Chaque pays pour lui-même",
  options: [
    {
      key: "CHE",
      label: "Suisse",
      announce: "Suisse — éolien 0,2 %, 6e sur 6 ; solaire 7,2 %, 3e sur 6",
      note: "Suisse · éolien 0,2 % — 6e sur 6 · solaire 7,2 % — 3e sur 6 · son solaire vaut 31,4 fois son éolien",
      marks: [
        { series: "wind", y: 337.5 },
        { series: "solar", y: 262.8 },
      ],
    },
    {
      key: "POL",
      label: "Pologne",
      announce: "Pologne — éolien 15,0 %, 3e sur 6 ; solaire 10,3 %, 2e sur 6",
      note: "Pologne · éolien 15,0 % — 3e sur 6 · solaire 10,3 % — 2e sur 6 · son solaire vaut 68 % de son éolien",
      marks: [
        { series: "wind", y: 179.2 },
        { series: "solar", y: 230.3 },
      ],
    },
  ],
};

const clone = () => JSON.parse(JSON.stringify(PLAN));

const CSS_ARGS = {
  scope: ".chart-figure",
  idPrefix: "chart-level",
  lit: { ink: "var(--ink)", weight: "700", ring: "var(--ink)", ringWidth: 1.5 },
  dim: { ink: "var(--axis-ink)", weight: "var(--axis-weight)" },
  revealMs: 220,
};

describe("a yardstick the plate cannot honour is refused before anything is drawn", () => {
  it("should accept the declaration the beat actually ships", () => {
    expect(() => assertLevelDeclaration(PLAN as any, DRAWN)).not.toThrow();
  });

  it("should refuse an option that reads its levels off a country the beat does not draw", () => {
    const plan = clone();
    plan.options[0].key = "ESP";
    expect(() => assertLevelDeclaration(plan, DRAWN)).toThrow(/does not draw/);
  });

  it("should refuse a single option, because one choice is not a choice", () => {
    const plan = clone();
    plan.options = [plan.options[0]];
    expect(() => assertLevelDeclaration(plan, DRAWN)).toThrow(/at least two options/);
  });

  it("should refuse an option that lays no reference at all — the default under a second name", () => {
    const plan = clone();
    plan.options[0].marks = [];
    expect(() => assertLevelDeclaration(plan, DRAWN)).toThrow(/lays no reference across the plot/);
  });

  it("should refuse a yardstick that reports one of the two series it is drawn on", () => {
    const plan = clone();
    plan.options[0].marks = [{ series: "wind", y: 337.5 }];
    expect(() => assertLevelDeclaration(plan, DRAWN)).toThrow(
      /lays no rule on "solar".*answers\s+half the question/s,
    );
  });

  it("should refuse a rule on a series the beat does not draw", () => {
    const plan = clone();
    plan.options[0].marks[1].series = "hydro";
    expect(() => assertLevelDeclaration(plan, DRAWN)).toThrow(/a reference in a colour that means nothing/);
  });

  it("should refuse two rules on one series — one datum has one value on one series", () => {
    const plan = clone();
    plan.options[0].marks[1].series = "wind";
    expect(() => assertLevelDeclaration(plan, DRAWN)).toThrow(/lays two rules on "wind"/);
  });

  it("should refuse a reference drawn outside the plot the reader can see", () => {
    const plan = clone();
    plan.options[0].marks[0].y = 341;
    expect(() => assertLevelDeclaration(plan, DRAWN)).toThrow(/outside the plot's own 0…340/);
  });

  it("should refuse a non-finite y rather than transform a rule off the frame", () => {
    const plan = clone();
    plan.options[1].marks[0].y = Number.NaN;
    expect(() => assertLevelDeclaration(plan, DRAWN)).toThrow(/non-finite y/);
  });

  // ── A REFERENCE STOOD UP, and the refusals that come with the second axis ────────────────────
  // `proof/web-scatter-income-life-expectancy` is the beat that needed it: a scatter is the one
  // type here where BOTH axes carry a measured value, so a chosen country's own case is two
  // references, one flat and one upright.
  const UPRIGHT = {
    drawnKeys: ["NGA", "CHN"],
    drawnSeries: ["income", "life"],
    height: 340,
    width: 880,
  };
  const upright = () => ({
    label: "Mesurer le nuage à l'aune de",
    noneLabel: "Le nuage entier",
    options: [
      {
        key: "NGA",
        label: "Nigeria",
        announce: "Nigeria — 5 029 $ par personne, 53,5 ans",
        note: "Nigeria · 5 029 $ · 53,5 ans · 41 pays plus pauvres vivent plus longtemps",
        marks: [
          { series: "income", x: 300.2 },
          { series: "life", y: 250.4 },
        ],
      },
      {
        key: "CHN",
        label: "Chine",
        announce: "Chine — 18 667 $ par personne, 78,1 ans",
        note: "Chine · 18 667 $ · 78,1 ans · 61 pays plus riches vivent moins longtemps",
        marks: [
          { series: "income", x: 540.9 },
          { series: "life", y: 96.3 },
        ],
      },
    ],
  });

  it("should accept a case whose two references cross the plot on different axes", () => {
    expect(() => assertLevelDeclaration(upright() as any, UPRIGHT)).not.toThrow();
  });

  it("should refuse a mark carrying both an x and a y, rather than pick one silently", () => {
    const plan = upright();
    (plan.options[0].marks[1] as any).x = 12;
    expect(() => assertLevelDeclaration(plan as any, UPRIGHT)).toThrow(
      /2 coordinates at once \(x, y\)/,
    );
  });

  it("should refuse a mark carrying neither coordinate", () => {
    const plan = upright();
    delete (plan.options[1].marks[0] as any).x;
    expect(() => assertLevelDeclaration(plan as any, UPRIGHT)).toThrow(
      /neither an x, a y nor an angle/,
    );
  });

  it("should refuse an upright reference outside the plot the reader can see", () => {
    const plan = upright();
    plan.options[1].marks[0].x = 880.5;
    expect(() => assertLevelDeclaration(plan as any, UPRIGHT)).toThrow(
      /rule at x=880.5, outside the plot's own 0…880/,
    );
  });

  it("should refuse a non-finite x rather than draw a rule off the frame", () => {
    const plan = upright();
    plan.options[0].marks[0].x = Number.NaN;
    expect(() => assertLevelDeclaration(plan as any, UPRIGHT)).toThrow(/non-finite x/);
  });

  it("should refuse an upright reference when the beat declared no width to check it against", () => {
    const { width, ...noWidth } = UPRIGHT;
    expect(() => assertLevelDeclaration(upright() as any, noWidth as any)).toThrow(
      /the geometry's width is what it is checked against/,
    );
  });

  it("should still refuse a case that lays only one of the two axes", () => {
    const plan = upright();
    plan.options[0].marks = [plan.options[0].marks[0]] as any;
    expect(() => assertLevelDeclaration(plan as any, UPRIGHT)).toThrow(/lays no rule on "life"/);
  });

  // ── A REFERENCE LAID AROUND A DIAL, and the refusals the third coordinate brings with it ────
  // `proof/web-donut-world-co2-share` is the beat that needed it: a donut has no flat band and no
  // upright one — a horizontal rule at one y names TWO wedges, mirrored about the vertical axis —
  // so the reference is an ANGLE, and the sweep it is bounded against is the beat's to state.
  const TURN = Math.PI * 2;
  const RADIAL = {
    drawnKeys: ["CHN", "USA"],
    drawnSeries: ["2000", "2023"],
    height: 380,
    turn: TURN,
  };
  const radial = () => ({
    label: "Lire un pays sur les deux anneaux",
    noneLabel: "Les deux anneaux tels quels",
    options: [
      {
        key: "CHN",
        label: "Chine",
        announce: "Chine — 14,7 % en 2000, 32,9 % en 2023",
        note: "Chine · 14,7 % (3,6 Gt) en 2000, 32,9 % (12,2 Gt) en 2023",
        marks: [
          { series: "2000", angle: 1.5 },
          { series: "2023", angle: 0.93 },
        ],
      },
      {
        key: "USA",
        label: "États-Unis",
        announce: "États-Unis — 24,4 % en 2000, 13,3 % en 2023",
        note: "États-Unis · 24,4 % (6,0 Gt) en 2000, 13,3 % (4,9 Gt) en 2023",
        marks: [
          { series: "2000", angle: 1.76 },
          { series: "2023", angle: 3.6 },
        ],
      },
    ],
  });

  it("should accept a case whose two references are laid around the dial", () => {
    expect(() => assertLevelDeclaration(radial() as any, RADIAL)).not.toThrow();
  });

  it("should refuse a reference past the end of the sweep the beat draws", () => {
    const plan = radial();
    plan.options[1].marks[0].angle = TURN + 0.01;
    expect(() => assertLevelDeclaration(plan as any, RADIAL)).toThrow(
      /reference at 6\.29\d* rad, outside the plot's own 0…6\.28/,
    );
  });

  it("should refuse a non-finite angle rather than draw a reference nowhere on the dial", () => {
    const plan = radial();
    plan.options[0].marks[1].angle = Number.NaN;
    expect(() => assertLevelDeclaration(plan as any, RADIAL)).toThrow(/non-finite angle/);
  });

  it("should refuse an angled reference when the beat declared no turn to check it against", () => {
    const { turn, ...noTurn } = RADIAL;
    expect(() => assertLevelDeclaration(radial() as any, noTurn as any)).toThrow(
      /the geometry's full sweep in radians is what it is checked against/,
    );
  });

  it("should refuse a mark carrying an angle AND an axis, rather than pick one silently", () => {
    const plan = radial();
    (plan.options[0].marks[0] as any).y = 12;
    expect(() => assertLevelDeclaration(plan as any, RADIAL)).toThrow(
      /2 coordinates at once \(y, angle\)/,
    );
  });

  it("should still refuse a dial that lays a reference on one of its two rings", () => {
    const plan = radial();
    plan.options[0].marks = [plan.options[0].marks[0]] as any;
    expect(() => assertLevelDeclaration(plan as any, RADIAL)).toThrow(/lays no rule on "2023"/);
  });

  it("should refuse an option with no sentence — the derived reading would live nowhere", () => {
    const plan = clone();
    plan.options[1].note = "  ";
    expect(() => assertLevelDeclaration(plan, DRAWN)).toThrow(/has no `note`/);
  });

  it("should refuse an accessible name that does not contain the visible one (WCAG 2.5.3)", () => {
    const plan = clone();
    plan.options[0].announce = "CH — éolien 0,2 %";
    expect(() => assertLevelDeclaration(plan, DRAWN)).toThrow(/WCAG 2\.5\.3/);
  });

  it("should refuse two options that slug to one radio id", () => {
    const plan = clone();
    plan.options[1].key = "CHE";
    expect(() => assertLevelDeclaration(plan, DRAWN)).toThrow(/one radio would drive both/);
  });

  it("should refuse a key that slugs to the reserved untouched id", () => {
    const plan = clone();
    plan.options[0].key = "none";
    expect(() => assertLevelDeclaration(plan, { ...DRAWN, drawnKeys: [...DRAWN.drawnKeys, "none"] })).toThrow(
      /reserved/,
    );
  });

  it("should refuse a beat that draws no series at all", () => {
    expect(() => assertLevelDeclaration(PLAN as any, { ...DRAWN, drawnSeries: [] })).toThrow(
      /the beat draws no series/,
    );
  });
});

describe("one identity, derived once", () => {
  it("should slug from the key and never from the label", () => {
    expect(levelSlugOf("CHE")).toBe("che");
    expect(levelOptionId("chart-level", levelSlugOf("CHE"))).toBe("chart-level-che");
    expect(levelRuleKey("che", "solar")).toBe("che:solar");
  });

  it("should put the untouched option first, because that is the picture the page ships in", () => {
    const options = levelOptionsForMarkup(PLAN as any, "chart-level");
    expect(options[0]).toMatchObject({ slug: LEVEL_NONE_SLUG, isNone: true, label: PLAN.noneLabel });
    expect(options.slice(1).map((o) => o.slug)).toEqual(["che", "pol"]);
    expect(options.slice(1).every((o) => o.isNone === false)).toBe(true);
  });

  it("should give the untouched option no sentence, because it is the claim and not a comparison", () => {
    expect(levelNotesForMarkup(PLAN as any).map((n) => n.slug)).toEqual(["che", "pol"]);
  });

  it("should flatten every option's references, one per option per series", () => {
    expect(levelRulesForMarkup(PLAN as any).map((r) => r.key)).toEqual([
      "che:wind",
      "che:solar",
      "pol:wind",
      "pol:solar",
    ]);
  });

  it("should carry through only the coordinate each mark declared", () => {
    const rules = levelRulesForMarkup({
      label: "l",
      noneLabel: "n",
      options: [
        {
          key: "NGA",
          label: "Nigeria",
          announce: "Nigeria",
          note: "Nigeria",
          marks: [
            { series: "income", x: 300.2 },
            { series: "life", y: 250.4 },
          ],
        },
      ],
    } as any);
    expect(rules).toEqual([
      { key: "nga:income", slug: "nga", series: "income", x: 300.2 },
      { key: "nga:life", slug: "nga", series: "life", y: 250.4 },
    ] as any);
  });

  it("should emit nothing at all for a beat that declared no yardstick", () => {
    expect(levelCss(null, CSS_ARGS)).toBe("");
    expect(levelOptionsForMarkup(null, "chart-level")).toEqual([]);
    expect(levelNotesForMarkup(null)).toEqual([]);
    expect(levelRulesForMarkup(null)).toEqual([]);
  });
});

describe("the stylesheet is the whole mechanism, and it is generated", () => {
  const css = levelCss(PLAN as any, CSS_ARGS);

  it("should hide every sentence and every reference by default", () => {
    expect(css).toContain(".chart-figure [data-level-note] { display: none; }");
    expect(css).toContain(".chart-figure [data-level-rule] { opacity: 0; }");
  });

  it("should reveal a chosen option's two references and its own sentence, and no other", () => {
    expect(css).toContain(
      '.chart-figure:has(#chart-level-che:checked) [data-level-rule="che:wind"], ' +
        '.chart-figure:has(#chart-level-che:checked) [data-level-rule="che:solar"] { opacity: 1; }',
    );
    expect(css).toContain('.chart-figure:has(#chart-level-che:checked) [data-level-note="che"] { display: revert; }');
  });

  it("should take the ring OFF EVERYTHING before it puts one on the chosen country", () => {
    const at = ".chart-figure:has(#chart-level-pol:checked)";
    const off = css.indexOf(`${at} [data-col] { stroke: none; }`);
    const on = css.indexOf(`${at} [data-col="POL"] { stroke: var(--ink); stroke-width: 1.5; }`);
    expect(off).toBeGreaterThan(-1);
    expect(on).toBeGreaterThan(off);
  });

  it("should step every name back before it lights the chosen one — source order, not weight", () => {
    const at = ".chart-figure:has(#chart-level-che:checked)";
    const back = css.indexOf(`${at} [data-axis] { color: var(--axis-ink); font-weight: var(--axis-weight); }`);
    const lit = css.indexOf(`${at} [data-axis="CHE"] { color: var(--ink); font-weight: 700; }`);
    expect(back).toBeGreaterThan(-1);
    expect(lit).toBeGreaterThan(back);
  });

  it("should never emit a transform — a moved mark answers as the mark whose slot it landed in", () => {
    expect(css).not.toContain("translate");
    expect(css).not.toContain("transform:");
  });

  it("should name no colour of its own — every ink arrives as a custom property", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("should put its only motion behind prefers-reduced-motion: no-preference", () => {
    expect(css).toContain("@media (prefers-reduced-motion: no-preference) {");
    expect(css.match(/transition:/g)?.length).toBe(2);
  });

  it("should refuse a grouped selector whose second half would apply in every state of the page", () => {
    // `A B, C` is `(A B), (C)`. `stack.ts` shipped exactly this defect once — two of ten columns
    // painted with the accent in the untouched state — so the refusal is asserted, not remembered.
    const plan = clone();
    plan.options[0].marks[1].series = "solar";
    const emitted = levelCss(plan, CSS_ARGS);
    const rules = emitted.split("\n").filter((line) => line.includes("{") && line.includes(", "));
    expect(rules.length).toBeGreaterThan(0);
    for (const line of rules) {
      const selector = line.slice(0, line.indexOf("{"));
      expect(selector.split(", ").every((half) => half.trim().startsWith(".chart-figure:has("))).toBe(true);
    }
  });
});
