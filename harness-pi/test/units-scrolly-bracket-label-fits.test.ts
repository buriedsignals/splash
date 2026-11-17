// gx-pictogram-isotype scrolly, Qwen3.5-9B (mvq44, 2026-11-17): the bracket's "6 sur 40" ran off the stage's right
// edge on cards 3 and 4. The drive measured the label column from the label's text at measure time, which is empty
// until the bracket lands, so the column reserved 0px.
import { describe, expect, it } from "bun:test";
import { applyUnitsState } from "../craft/_shared/gesture-units-scrolly.mjs";

const DATA = {
  variant: "pictogram-isotype",
  groups: [{ count: 16 }, { count: 6 }, { count: 18 }],
  plan: [
    { k: 0, do: "reveal", own: [] },
    { k: 1, do: "name", own: [1] },
    { k: 2, do: "bracket", own: [1], members: [0, 1, 2], steps: ["6", "40"], noteText: "6 sur 40" },
  ],
  max: 18,
  colours: { ink: "#000", accentInk: "#0b7873", accent: "#0B7A75", neutral: "#919191" },
};

// A node whose width is its text at 8px a character.
const node = (text = "") => ({
  style: {} as Record<string, string>,
  textContent: text,
  setAttribute() {},
  getBoundingClientRect() {
    return { width: this.textContent.length * 8 };
  },
});

function page() {
  const nodes = new Map<string, ReturnType<typeof node>>();
  const one = (sel: string) => nodes.get(sel) ?? nodes.set(sel, node(/data-value/.test(sel) ? "16" : /data-name/.test(sel) ? "au-dessus de 75 %" : "")).get(sel)!;
  const stage = { clientWidth: 1488, clientHeight: 800, querySelector: one, querySelectorAll: () => [] };
  const carrier = { getAttribute: () => JSON.stringify(DATA) };
  const root: any = {
    querySelector: (sel: string) => (sel === "[data-ugrp]" ? carrier : sel === '[data-part="stage"]' ? stage : one(sel)),
  };
  return { root, label: one('[data-label="2"]') };
}

describe("the units scrolly bracket's label", () => {
  it("should stand inside the stage once the bracket lands, though empty when the column was measured", () => {
    const { root, label } = page();
    const state = { fill: 1, note: 2, g0: 1, g1: 1, g2: 0 };
    applyUnitsState(root, state, { resized: true });
    applyUnitsState(root, { ...state, g2: 1 }, {});
    expect(parseFloat(label.style.left) + label.getBoundingClientRect().width).toBeLessThanOrEqual(1488);
  });
});
