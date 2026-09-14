/**
 * THE STACK VOCABULARY'S OWN REFUSALS — `assets/stack.ts`, the second control this format can
 * generate without a script.
 *
 * Every case below is a MUTATION that was run against the real beat before it was written down
 * here: `proof/web-bar-top-emitters-2024`'s runner or component was edited, the render was re-run,
 * and the message quoted is the one it printed. A guard that has never been seen to redden is a
 * guard nobody has tested, and this branch has met three that went green because their own walk
 * missed the files they were written to hold.
 *
 * The half this file does NOT hold, so it is not trusted past its reach: whether the picture the
 * generated CSS produces is the one the declaration describes. A transform is not a reading and no
 * markup scan can see one — that is verified by driving a real browser and measuring the rectangles
 * (each stacked column's bottom on the one below it, the tower's top reaching the column it is
 * stacked against, the plot not moving when the sentence appears), and by looking at the result.
 */
import { describe, expect, it } from "bun:test";

import {
  STACK_NONE_SLUG,
  assertStackDeclaration,
  stackCss,
  stackNotesForMarkup,
  stackOptionsForMarkup,
  stackSlugOf,
  stackTotalsForMarkup,
} from "../assets/stack.ts";

const DRAWN = ["CHN", "USA", "IND", "RUS"];

/** Two options over the same four drawn columns, in the shape the beat declares. */
const PLAN = {
  label: "Empiler contre",
  noneLabel: "Le classement seul",
  options: [
    {
      key: "CHN",
      label: "Chine",
      announce: "Chine — empiler les 2 pays suivants",
      note: "Les 2 pays suivants du classement · 8,10 Gt réunis · Chine : 12,29 Gt",
      total: "= 8,10",
      onto: [
        { key: "USA", dx: 0, dy: 0 },
        { key: "IND", dx: -90, dy: -168 },
      ],
    },
    {
      key: "USA",
      label: "États-Unis",
      announce: "États-Unis — empiler les 2 pays suivants",
      note: "Les 2 pays suivants du classement · 4,97 Gt réunis · États-Unis : 4,90 Gt",
      total: "= 4,97",
      onto: [
        { key: "IND", dx: 0, dy: 0 },
        { key: "RUS", dx: -90, dy: -109 },
      ],
    },
  ],
};

const clone = () => JSON.parse(JSON.stringify(PLAN));
const refuse = (mutate: (p: any) => void) => {
  const plan = clone();
  mutate(plan);
  return () => assertStackDeclaration(plan, DRAWN);
};

describe("the slug is derived from the key, never from the words", () => {
  it("slugs a column key", () => {
    expect(stackSlugOf("CHN")).toBe("chn");
  });

  it("survives a key a label would have mangled", () => {
    // `filter.ts` records what happens when one identity is derived twice: `Central & Northern
    // Europe` became `[data-group="Central &amp; Northern Europe"]`, matched no element, and emptied
    // a map with nothing red. An option here already HAS an identity — the column it stacks against.
    expect(stackSlugOf("Côte d'Ivoire & co")).toBe("c-te-d-ivoire-co");
  });
});

describe("assertStackDeclaration refuses a control the picture cannot honour", () => {
  it("accepts the beat's own declaration", () => {
    expect(() => assertStackDeclaration(PLAN as any, DRAWN)).not.toThrow();
  });

  it("refuses a reference the beat does not draw", () => {
    expect(refuse((p) => (p.options[0].key = "BRA"))).toThrow(/does not draw/);
  });

  it("refuses a stacked column the beat does not draw", () => {
    // The mutation on the real beat: offer the two ranks whose run of followers reaches past the
    // ten drawn (Corée du S. needs Canada, Allemagne needs Canada and Brésil). A tower one column
    // short of what its own sentence counts is a picture that lies.
    expect(refuse((p) => (p.options[0].onto[1].key = "CAN"))).toThrow(/picture that lies/);
  });

  it("refuses a column stacked onto itself", () => {
    expect(refuse((p) => (p.options[0].onto[0].key = "CHN"))).toThrow(/onto\s*itself|onto$|itself/);
  });

  it("refuses the same column stacked twice", () => {
    expect(refuse((p) => (p.options[0].onto[1].key = "USA"))).toThrow(/twice/);
  });

  it("refuses an option that stacks nothing", () => {
    expect(refuse((p) => (p.options[0].onto = []))).toThrow(/default under a second name/);
  });

  it("refuses a non-finite translation, which would put a column off the frame", () => {
    expect(refuse((p) => (p.options[0].onto[1].dy = Number.NaN))).toThrow(/non-finite dy/);
  });

  it("refuses an option with no sentence — a picture alone leaves a keyboard reader nothing", () => {
    expect(refuse((p) => (p.options[0].note = ""))).toThrow(/has no `note`/);
  });

  it("refuses a tower that does not say what it adds up to", () => {
    // The mutation on the real beat: drop `total` from the runner's option and re-run the render.
    // It is the owner's own reading of the first build — six segments of one colour and no sum —
    // turned into a refusal, so a tower can never again be drawn without the number it is worth.
    expect(refuse((p) => delete p.options[0].total)).toThrow(/has no `total`/);
    expect(refuse((p) => (p.options[0].total = "   "))).toThrow(/picture of a stack/);
  });

  it("refuses an accessible name that does not contain its own visible label", () => {
    // WCAG 2.5.3: a reader speaking what they can see cannot reach an option whose name is
    // something else. Run on the real beat, which announces "<pays> — empiler les N pays suivants".
    expect(refuse((p) => (p.options[0].announce = "empiler — les 2 pays suivants"))).toThrow(
      /2\.5\.3/,
    );
  });

  it("refuses two options that slug to one radio", () => {
    expect(refuse((p) => (p.options[1].key = "CHN"))).toThrow(/both slug to/);
  });

  it("refuses an option that slugs to the reserved untouched id", () => {
    const plan = clone();
    plan.options[0].key = STACK_NONE_SLUG.toUpperCase();
    // Drawn on purpose: a key the beat does not draw is refused one line earlier, and this case is
    // about the collision with the untouched option's own radio id, not about the column.
    expect(() => assertStackDeclaration(plan, [...DRAWN, STACK_NONE_SLUG.toUpperCase()])).toThrow(
      /reserved/,
    );
  });

  it("refuses a single option, which is not a choice", () => {
    expect(refuse((p) => (p.options = [p.options[0]]))).toThrow(/at least two options/);
  });
});

describe("the markup: the untouched option comes first and is the default", () => {
  it("puts it first and marks it", () => {
    const options = stackOptionsForMarkup(PLAN as any, "chart-stack");
    expect(options.map((o) => o.id)).toEqual([
      "chart-stack-none",
      "chart-stack-chn",
      "chart-stack-usa",
    ]);
    expect(options[0].isNone).toBe(true);
    expect(options.slice(1).every((o) => !o.isNone)).toBe(true);
  });

  it("gives the untouched option no sentence, because it is not a comparison", () => {
    expect(stackNotesForMarkup(PLAN as any).map((n) => n.slug)).toEqual(["chn", "usa"]);
  });

  it("gives each option its total, in the beat's own words, and the untouched one none", () => {
    expect(stackTotalsForMarkup(PLAN as any)).toEqual([
      { slug: "chn", text: "= 8,10" },
      { slug: "usa", text: "= 4,97" },
    ]);
  });

  it("emits nothing at all for a beat that declares no stack", () => {
    expect(stackOptionsForMarkup(null, "chart-stack")).toEqual([]);
    expect(stackNotesForMarkup(null)).toEqual([]);
    expect(stackTotalsForMarkup(null)).toEqual([]);
  });
});

describe("the stylesheet is the whole mechanism, and every selector carries its own scope", () => {
  const css = stackCss(PLAN as any, {
    scope: ".chart-figure",
    idPrefix: "chart-stack",
    lit: { fill: "var(--accent)", ink: "var(--accent)" },
    dim: { fill: "var(--col-neutral)", ink: "var(--label-ink)", weight: "var(--axis-weight)" },
    seam: "var(--ground)",
    moveMs: 420,
  });

  it("is the empty string for a beat that declares none — no chrome, no rule, no residue", () => {
    expect(stackCss(null, {
      scope: ".chart-figure",
      idPrefix: "chart-stack",
      lit: { fill: "a", ink: "b" },
      dim: { fill: "c", ink: "d", weight: "e" },
      seam: "f",
      moveMs: 1,
    })).toBe("");
  });

  it("hides every sentence by default and reveals one per option", () => {
    expect(css).toContain(".chart-figure [data-stack-note] { display: none; }");
    expect(css).toContain('[data-stack-note="chn"] { display: revert; }');
    expect(css).toContain('[data-stack-note="usa"] { display: revert; }');
  });

  it("carries each column's own translation, in the geometry's own units", () => {
    expect(css).toContain(
      '.chart-figure:has(#chart-stack-chn:checked) [data-col="IND"] { transform: translate(-90px, -168px); }',
    );
  });

  it("puts the motion out of reach under prefers-reduced-motion rather than overriding it back", () => {
    // `render-web.mjs`'s entrance rules take the same shape, and for the reason `scrolly` argues:
    // a `* { animation: none }` reset depends on a cascade nobody can see and leaves the property
    // resolving on the element for anything that asks. Here, under `reduce`, nothing is defined.
    const guarded = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference) {"));
    expect(guarded.slice(0, guarded.indexOf("}\n"))).toContain("transition: transform 420ms");
    expect(css.split("transition:").length - 1).toBe(3);
    expect(css.indexOf("transition:")).toBeGreaterThan(
      css.indexOf("@media (prefers-reduced-motion: no-preference)"),
    );
  });

  it("SCOPES EVERY SELECTOR IN A GROUP, which a real defect did not", () => {
    // `A B, C` is `(A B), (C)`. The first form of `stackCss` wrote the scope once in front of a
    // joined list, so `[data-col="IND"]` and `[data-col="RUS"]` were painted with the accent in
    // EVERY state of the page, the untouched one included. Nothing in the declaration or the markup
    // was wrong — the stylesheet was, and it was caught by reading the emitted CSS back.
    for (const rule of css.split("\n")) {
      if (!rule.includes(":has(#chart-stack")) continue;
      const selectors = rule.slice(0, rule.indexOf("{")).split(",");
      for (const selector of selectors)
        expect([rule, selector.trim().startsWith(".chart-figure:has(#chart-stack")]).toEqual([
          rule,
          true,
        ]);
    }
  });

  it("steps every column back BEFORE it lights the reference and its run", () => {
    // Identical specificity — an attribute selector with a value is still one attribute selector —
    // so which wins is source order and nothing else.
    const at = ".chart-figure:has(#chart-stack-chn:checked)";
    expect(
      css.indexOf(`${at} [data-col]:not(.mark-active) { fill: var(--col-neutral); }`),
    ).toBeLessThan(css.indexOf(`${at} [data-col="CHN"]:not(.mark-active), `));
    expect(css.indexOf(`${at} [data-col="CHN"]:not(.mark-active), `)).toBeGreaterThan(-1);
  });

  it("LETS THE POINTER WIN over the option, which specificity alone would not", () => {
    // `…:has(#id:checked) [data-col]` scores (1,3,0) against `.mark-active`'s (0,1,0), so without
    // the exclusion a reader pointing at a column under a chosen option saw nothing change.
    // Excluding the active mark from the FILL leaves exactly one rule matching it.
    for (const rule of css.split("\n"))
      if (rule.includes(":has(#chart-stack") && / fill: /.test(rule))
        expect([rule, rule.includes(":not(.mark-active)")]).toEqual([rule, true]);
  });

  it("still declares what a column takes under the pointer ON the column the pointer is on", () => {
    // THE MUTATION THAT FOUND THIS, run in a real browser before it was written down: fold
    // `--mark-active` into the `:not(.mark-active)` rule. The property then stops being declared
    // at the exact moment it is read — the lit tower's top segment, hovered, came back #66645f,
    // the NEUTRAL's step, because the only rule left matching it was the beat's own default.
    const lifted = stackCss(PLAN as any, {
      scope: ".chart-figure",
      idPrefix: "chart-stack",
      lit: { fill: "var(--accent)", ink: "var(--accent)", active: "#103d7f" },
      dim: {
        fill: "var(--col-neutral)",
        ink: "var(--label-ink)",
        weight: "var(--axis-weight)",
        active: "#66645f",
      },
      seam: "var(--ground)",
      moveMs: 420,
    });
    const at = ".chart-figure:has(#chart-stack-chn:checked)";
    expect(lifted).toContain(`${at} [data-col] { --mark-active: #66645f; }`);
    expect(lifted).toContain(
      `${at} [data-col="CHN"], ${at} [data-col="USA"], ${at} [data-col="IND"] ` +
        "{ --mark-active: #103d7f; }",
    );
    for (const rule of lifted.split("\n"))
      if (rule.includes("--mark-active:"))
        expect([rule, rule.includes(":not(.mark-active)")]).toEqual([rule, false]);
    // And a beat that declares no active colour gets no property at all — no dead CSS, the rule
    // `stackCss` already holds for a beat with no declaration.
    expect(css).not.toContain("--mark-active");
  });

  it("reveals the tower's own total with the same :checked that moves the columns", () => {
    expect(css).toContain(".chart-figure [data-stack-total] { display: none; }");
    expect(css).toContain('[data-stack-total="chn"] { display: revert; }');
    expect(css).toContain('[data-stack-total="usa"] { display: revert; }');
  });
});

describe("the figures ride with the columns they belong to", () => {
  /** The same declaration with no `carry`: the shape every beat had before figures could ride. */
  const uncarried = stackCss(PLAN as any, {
    scope: ".chart-figure",
    idPrefix: "chart-stack",
    lit: { fill: "var(--accent)", ink: "var(--accent)" },
    dim: { fill: "var(--col-neutral)", ink: "var(--label-ink)", weight: "var(--axis-weight)" },
    seam: "var(--ground)",
    moveMs: 420,
  });
  const carried = stackCss(PLAN as any, {
    scope: ".chart-figure",
    idPrefix: "chart-stack",
    lit: { fill: "var(--accent)", ink: "var(--accent)" },
    dim: { fill: "var(--col-neutral)", ink: "var(--label-ink)", weight: "var(--axis-weight)" },
    seam: "var(--ground)",
    moveMs: 420,
    carry: { width: 900, height: 420 },
  });

  it("moves each figure by its own column's displacement, as a share of the label layer", () => {
    // The same `dx`/`dy` the column moves by, converted once: the overlay shares the `<svg>`'s own
    // grid cell and the `<svg>` carries `preserveAspectRatio="none"`, so `dx / 900` of that layer
    // IS `dx` viewBox units, at every width.
    expect(carried).toContain(
      '.chart-figure:has(#chart-stack-chn:checked) [data-value="IND"] { --stack-dx: -10%; --stack-dy: -40%; }',
    );
    expect(carried).toContain(
      '.chart-figure:has(#chart-stack-chn:checked) [data-value="USA"] { --stack-dx: 0%; --stack-dy: 0%; }',
    );
  });

  it("flags the riding figures instead of taking them away", () => {
    expect(carried).toContain(
      '.chart-figure:has(#chart-stack-chn:checked) [data-value="USA"], ' +
        '.chart-figure:has(#chart-stack-chn:checked) [data-value="IND"] { --stack-carried: 1; }',
    );
    expect(carried).not.toContain("[data-value=\"IND\"] { opacity: 0; }");
  });

  it("takes them away for a beat with NO label layer, which is what it always did", () => {
    // The fallback is stated rather than silent: a beat that declares no `carry` has nothing to
    // move, and a figure left behind on the baseline while its mark is on a tower is the defect.
    expect(uncarried).toContain(
      '.chart-figure:has(#chart-stack-chn:checked) [data-value="USA"], ' +
        '.chart-figure:has(#chart-stack-chn:checked) [data-value="IND"] { opacity: 0; }',
    );
    expect(uncarried).not.toContain("--stack-carried");
    expect(uncarried).not.toContain("--stack-dx");
  });

  it("glues the figure to its column for the whole trip, not just at the ends", () => {
    // `left`/`top` take the COLUMN's duration and easing, in the one declaration the labels
    // already had — so the count of transitions this file emits is unchanged.
    expect(carried).toContain(
      "transition: opacity 210ms ease, color 210ms ease, left 420ms cubic-bezier(0.4, 0, 0.2, 1), top 420ms cubic-bezier(0.4, 0, 0.2, 1);",
    );
    expect(carried.split("transition:").length - 1).toBe(3);
  });
});
