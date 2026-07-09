import { describe, it, expect } from "bun:test";
import { checkBeeswarmConformance } from "../src/core/conformance";
import { OKABE_ITO } from "../src/core/tokens";
import sample from "../assets/sample-data/beeswarm.json";

const colors = {
  data: OKABE_ITO.blue,
  text: ["#1A1A1A", "#6B6B6B"],
  bg: "#FFFFFF",
};
const catColors = [OKABE_ITO.blue, OKABE_ITO.orange];

describe("the shipped beeswarm is conformant (global ++ beeswarm)", () => {
  it("passes with zero violations (labelled axis, 2 CVD-safe categories)", () => {
    const v = checkBeeswarmConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: sample.valueLabel,
        pointCount: sample.points.length,
        categoryColors: catColors,
      },
      colors,
    );
    expect(v).toEqual([]);
  });

  it("flags a missing value-axis label", () => {
    const v = checkBeeswarmConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: "",
        pointCount: 42,
        categoryColors: catColors,
      },
      colors,
    );
    expect(v.some((m) => m.includes("value-axis label"))).toBe(true);
  });

  it("flags an off-palette category colour", () => {
    const v = checkBeeswarmConformance(
      {
        title: sample.title,
        source: sample.source,
        valueLabel: sample.valueLabel,
        pointCount: 42,
        categoryColors: [...catColors, "#123456"],
      },
      colors,
    );
    expect(v.some((m) => m.includes("not in the Okabe-Ito"))).toBe(true);
  });
});

// Subject-fit: a SINGLE-HUE swarm (categoryColors === []) whose subject is not
// water/cold/sky must not be left on a blue-family hue — the exact defect where a
// housing rent-dispersion beeswarm shipped default blue. The guard forwards `subject`
// to checkGlobalConformance only for a single-hue swarm (a categorical swarm's colour
// encodes the category, not the subject, so subject-fit does not apply there).
describe("beeswarm subject-fit (single-hue swarm)", () => {
  const blueData = { data: OKABE_ITO.blue, text: ["#1A1A1A"], bg: "#FFFFFF" };
  const amberData = {
    data: OKABE_ITO.orange,
    text: ["#1A1A1A"],
    bg: "#FFFFFF",
  };

  it("flags a housing swarm left on blue", () => {
    const v = checkBeeswarmConformance(
      {
        title: "Rents scatter wide across the city's communes",
        source: sample.source,
        valueLabel: "monthly rent (CHF)",
        pointCount: 42,
        categoryColors: [], // single-hue
        subject: "housing rents",
      },
      blueData,
    );
    expect(v.some((m) => m.includes("subject-fit"))).toBe(true);
  });

  it("flags the sky-blue escape hatch too", () => {
    const v = checkBeeswarmConformance(
      {
        title: "Rents scatter wide across the city's communes",
        source: sample.source,
        valueLabel: "monthly rent (CHF)",
        pointCount: 42,
        categoryColors: [],
        subject: "housing rents",
      },
      { data: OKABE_ITO.skyblue, text: ["#1A1A1A"], bg: "#FFFFFF" },
    );
    expect(v.some((m) => m.includes("subject-fit"))).toBe(true);
  });

  it("passes the same housing swarm painted amber", () => {
    const v = checkBeeswarmConformance(
      {
        title: "Rents scatter wide across the city's communes",
        source: sample.source,
        valueLabel: "monthly rent (CHF)",
        pointCount: 42,
        categoryColors: [],
        subject: "housing rents",
      },
      amberData,
    );
    expect(v).toEqual([]);
  });

  it("does NOT subject-check a categorical swarm (colour encodes category, not subject)", () => {
    const v = checkBeeswarmConformance(
      {
        title: "Rents scatter wide across the city's communes",
        source: sample.source,
        valueLabel: "monthly rent (CHF)",
        pointCount: 42,
        categoryColors: catColors, // blue is a legit first category here
        subject: "housing rents",
      },
      blueData,
    );
    expect(v.some((m) => m.includes("subject-fit"))).toBe(false);
  });
});
