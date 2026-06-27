import { describe, it, expect } from "bun:test";
import { checkPictogramConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/pictogram.json";

const text = { text: ["#1A1A1A", "#6B6B6B"], bg: "#FFFFFF" };
const base = {
  title: sample.title,
  source: sample.source,
  iconColor: OKABE_ITO.blue,
  unitPerIcon: sample.unitPerIcon,
  unitStated: true,
};

describe("the shipped pictogram is conformant (global ++ pictogram)", () => {
  it("passes with zero violations (CVD-safe icon, unit stated)", () => {
    expect(checkPictogramConformance(base, text)).toEqual([]);
  });

  it("flags an unstated unit (count undecodable)", () => {
    const v = checkPictogramConformance({ ...base, unitStated: false }, text);
    expect(v.some((m) => m.includes("each icon = N"))).toBe(true);
  });

  it("flags a non-positive unit-per-icon", () => {
    const v = checkPictogramConformance({ ...base, unitPerIcon: 0 }, text);
    expect(v.some((m) => m.includes("positive unit-per-icon"))).toBe(true);
  });

  it("flags an off-palette icon colour", () => {
    const v = checkPictogramConformance(
      { ...base, iconColor: "#123456" },
      text,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});
