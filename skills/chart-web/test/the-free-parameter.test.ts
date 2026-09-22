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

  it("accepts a complete declaration", () => {
    expect(() => assertInteractionPlan(PAGE, plan(control()) as never, "the ranking")).not.toThrow();
  });
});
