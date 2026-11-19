// gx-histogram scrolly, Gemma 12B (mvg99, 2026-11-19): bracket "0–4" of "whole" drew one even spine over all ten
// bins with "6 pays sur 10" at its middle, read as if every country were the share (the video's mvg98 defect).
import { describe, expect, it } from "bun:test";
import { applyUnitsState } from "../craft/_shared/gesture-units-scrolly.mjs";

const DATA = {
  variant: "histogram",
  groups: [{ count: 127 }, { count: 53 }, { count: 15 }],
  plan: [
    { k: 0, do: "highlight", own: [0] },
    { k: 1, do: "name", own: [1] },
    { k: 2, do: "bracket", own: [0], members: [0, 1, 2], part: [0], steps: ["127", "195"], noteText: "6 sur 10" },
  ],
  max: 127,
  colours: { ink: "#000", accentInk: "#0b7873", accent: "#0B7A75", neutral: "#919191" },
};

const node = (text = "") => ({
  style: {} as Record<string, string>,
  textContent: text,
  attrs: {} as Record<string, string>,
  setAttribute(k: string, v: string) {
    this.attrs[k] = String(v);
  },
  getBoundingClientRect() {
    return { width: this.textContent.length * 8 };
  },
});

function page() {
  const nodes = new Map<string, ReturnType<typeof node>>();
  const one = (sel: string) => nodes.get(sel) ?? nodes.set(sel, node(/data-value/.test(sel) ? "16" : /data-name/.test(sel) ? "0–4" : "")).get(sel)!;
  const stage = { clientWidth: 1488, clientHeight: 800, querySelector: one, querySelectorAll: () => [] };
  const carrier = { getAttribute: () => JSON.stringify(DATA) };
  const root: any = {
    querySelector: (sel: string) => (sel === "[data-ugrp]" ? carrier : sel === '[data-part="stage"]' ? stage : one(sel)),
  };
  return { root, spine: one('[data-spine="2"]'), part: one('[data-partspine="2"]') };
}

const lastY = (d: string) => Math.max(...[...d.matchAll(/V([\d.]+)/g)].map((m) => Number(m[1]))) || NaN;

describe("the units scrolly bracket against the whole", () => {
  it("should close the group's own stretch of the spine above the whole's end", () => {
    const { root, spine, part } = page();
    const state = { fill: 1, note: 2, g0: 1, g1: 1, g2: 1 };
    applyUnitsState(root, state, { resized: true });
    applyUnitsState(root, state, {});
    const [p, w] = [lastY(part.attrs.d ?? ""), lastY(spine.attrs.d ?? "")];
    expect(p > 0 && p < w).toBe(true);
  });
});
