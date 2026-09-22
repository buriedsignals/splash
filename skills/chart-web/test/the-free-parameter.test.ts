/**
 * THE FREE PARAMETER — what a fixed frame is forced to settle on the reader's behalf.
 *
 * Extracted from the catalogue rather than invented. All 27 authored `earns` make the same move, in
 * their own words: « un fixe doit choisir une largeur de palier et le lecteur n'a qu'à la croire »,
 * « une plaque ne peut couper la surface qu'une fois, à l'année de l'auteur », "all have exactly one
 * dot value, because a dot value is baked into the drawing". A video and a scrolly settle the same
 * parameter AND fix the order the alternatives are seen in, which is already somebody's argument;
 * the web export is the one that hands it back.
 *
 * WHY THIS HAD TO BECOME MECHANICAL. What justified the format until now was `earns` — prose, checked
 * at eight words. The one structural test, "the page answers a reading the plate does not print", was
 * measured across the 30 web beats with a findable static sibling and came back 30/30: a plate cannot
 * print 639 readings, so any beat that puts a tooltip on its marks clears the bar. The bar could not
 * discriminate, so nothing pushed the format higher.
 *
 * Spec: `docs/superpowers/specs/2026-09-23-web-free-parameter-design.md`.
 */
import { describe, expect, it } from "bun:test";
import { assertInteractionPlan } from "../assets/interaction-plan.ts";

/** A page carrying one live ask control, so only the DECLARATION is under test here. */
const PAGE = `<figure class="chart-figure">
<svg class="chart"><circle class="pt" data-detail="Romania · 25,505 · 85,0 %"></circle>
<circle class="pt" data-detail="Italy · 1,045 · 3,5 %"></circle></svg>
<p class="chart-reading">x</p></figure>`;

const control = (over: Record<string, unknown> = {}) => ({
  question: "This bar is a sliver — how many cases is that?",
  gesture: "ask-a-mark",
  changes: "the row repaints and the answer carries its share of the EU total",
  parameter: "which mark is in question",
  authorPicked: "Romania",
  readerPicks: "every mark",
  heldStill: [".chart-plot", ".row-name"],
  ...over,
});
const plan = (...controls: unknown[]) => ({
  earns: "a plate cannot print twenty-seven readings at once here",
  controls,
});

describe("the free parameter", () => {
  it("refuses a control that names none", () => {
    const { parameter, ...rest } = control();
    void parameter;
    expect(() => assertInteractionPlan(PAGE, plan(rest) as never, "the ranking")).toThrow(
      /free parameter/i,
    );
  });

  it("refuses a parameter the reader can put at one value — that is a view, not a choice", () => {
    expect(() =>
      assertInteractionPlan(PAGE, plan(control({ readerPicks: ["Romania"] })) as never, "the ranking"),
    ).toThrow(/not a choice/i);
  });

  it("refuses an author's value the reader cannot put it back to", () => {
    expect(() =>
      assertInteractionPlan(
        PAGE,
        plan(control({ readerPicks: ["Italy", "Germany"] })) as never,
        "the ranking",
      ),
    ).toThrow(/authorPicked/);
  });

  it("refuses two controls that move the same parameter", () => {
    expect(() =>
      assertInteractionPlan(
        PAGE,
        plan(control(), control({ gesture: "ask-a-line" })) as never,
        "the ranking",
      ),
    ).toThrow(/same free parameter/i);
  });

  it("refuses a control that holds nothing still", () => {
    expect(() =>
      assertInteractionPlan(PAGE, plan(control({ heldStill: [] })) as never, "the ranking"),
    ).toThrow(/holds nothing still/i);
  });

  it("refuses two marks whose reading is identical", () => {
    const twins = PAGE.replace("Italy · 1,045 · 3,5 %", "Romania · 25,505 · 85,0 %");
    expect(() => assertInteractionPlan(twins, plan(control()) as never, "the ranking")).toThrow(
      /same reading/i,
    );
  });

  it("allows one mark several hit anchors, which is a design the catalogue already ships", () => {
    // `proof/web-connected-scatter-lowcarbon` parks an anchor at every point its arrow occupies
    // across four states, each carrying that country's whole answer, so a reader pointing at the
    // arrow in ANY state is answered. They share a `data-mark-ref`; they are one mark.
    const anchored = `<figure class="chart-figure"><svg class="chart">
<circle class="pt" data-mark-ref="AUT" data-detail="Austria · 72,8 % · 43,4 TWh"></circle>
<circle class="pt" data-mark-ref="AUT" data-detail="Austria · 72,8 % · 43,4 TWh"></circle>
<circle class="pt" data-mark-ref="ITA" data-detail="Italy · 41,1 % · 22,0 TWh"></circle>
</svg><p class="chart-reading">x</p></figure>`;
    expect(() => assertInteractionPlan(anchored, plan(control()) as never, "the arrows")).not.toThrow();
  });

  it("still refuses two DIFFERENT marks that answer identically", () => {
    const twins = `<figure class="chart-figure"><svg class="chart">
<circle class="pt" data-mark-ref="AUT" data-detail="the same answer, twice"></circle>
<circle class="pt" data-mark-ref="ITA" data-detail="the same answer, twice"></circle>
</svg><p class="chart-reading">x</p></figure>`;
    expect(() => assertInteractionPlan(twins, plan(control()) as never, "the arrows")).toThrow(
      /"AUT" and "ITA"/,
    );
  });

  it("does not let a beat that names no marks at all slip the rule", () => {
    const twins = `<figure class="chart-figure"><svg class="chart">
<circle class="pt" data-detail="the same answer, twice"></circle>
<circle class="pt" data-detail="the same answer, twice"></circle>
</svg><p class="chart-reading">x</p></figure>`;
    expect(() => assertInteractionPlan(twins, plan(control()) as never, "the arrows")).toThrow(
      /same reading/i,
    );
  });

  it("accepts a complete declaration", () => {
    expect(() => assertInteractionPlan(PAGE, plan(control()) as never, "the ranking")).not.toThrow();
  });
});

/**
 * AND IT HAS TO REACH THE DELIVERED FILE.
 *
 * `verify-web.mjs` reads an HTML page and has no access to the beat's render module, so a
 * declaration that stays in the module is a declaration no driven browser can check — which is how
 * `heldStill` would have stayed exactly as unverifiable as the prose it replaces. Everything else
 * this format guards is discovered off the markup the same way: `shippedControls` finds a control
 * because the attribute that makes it work is there, `plotViewBoxOf` reads the geometry the
 * component actually drew.
 */
import { stampFreeParameters } from "../scripts/render-web.mjs";

describe("the declaration a delivered page carries", () => {
  const markup = `<figure class="chart-figure"><svg class="chart"></svg></figure>`;

  it("stamps each control's parameter and everything held still", () => {
    const out = stampFreeParameters(markup, {
      earns: "x",
      controls: [
        { parameter: "the reference year", heldStill: [".x-axis", ".chart-total"] },
        { parameter: "which mark is in question", heldStill: [".chart-plot"] },
      ],
    });
    expect(out).toContain('data-free-parameter="the reference year|which mark is in question"');
    expect(out).toContain('data-held-still=".x-axis|.chart-total|.chart-plot"');
  });

  it("names a selector once however many controls hold it", () => {
    const out = stampFreeParameters(markup, {
      earns: "x",
      controls: [
        { parameter: "a", heldStill: [".chart-plot"] },
        { parameter: "b", heldStill: [".chart-plot"] },
      ],
    });
    expect(out.match(/\.chart-plot/g)).toHaveLength(1);
  });

  it("leaves a page with no plan exactly as it was", () => {
    expect(stampFreeParameters(markup, null)).toBe(markup);
  });

  it("escapes a parameter carrying a quote, so the attribute cannot be broken out of", () => {
    const out = stampFreeParameters(markup, {
      earns: "x",
      controls: [{ parameter: `the "author's" cut`, heldStill: [".a"] }],
    });
    expect(out).toContain("&quot;");
    expect(out).toMatch(/^<figure class="chart-figure" data-free-parameter="[^"]*" data-held-still="[^"]*">/);
  });
});

/**
 * AND THE JOURNALIST IS ASKED UPSTREAM, BEFORE ANY CODE.
 *
 * The scaffold writes the empty table into `BRIEF.md`; it is the web analogue of the video's
 * six-row event table. It asked for the gesture — a mechanism — and never for the thing the
 * mechanism exists to hand back.
 */
import { renderChoreographySection } from "../scripts/choreography.mjs";
import { chainFrameFor } from "../scripts/scaffold-web-beat.mjs";

describe("what the BRIEF asks the journalist, upstream", () => {
  const section = () => renderChoreographySection(chainFrameFor("bar-and-column").frame);

  it("asks for the free parameter, what the fixed frame had to pick, and what is held still", () => {
    expect(section()).toContain("| le paramètre libre |");
    expect(section()).toContain("| ce que le fixe a dû trancher |");
    expect(section()).toContain("| ce que le lecteur peut poser |");
    expect(section()).toContain("| ce qui ne bouge pas |");
  });

  it("says why the last column is selectors and not a sentence", () => {
    expect(section()).toMatch(/selectors|sélecteurs/i);
  });

  it("still names the closed repertoire, which this work does not touch", () => {
    expect(section()).toContain("ask-a-mark");
    expect(section()).toContain("the repertoire:");
  });
});
