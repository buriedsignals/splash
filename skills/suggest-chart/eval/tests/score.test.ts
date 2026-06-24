import { describe, it, expect } from "bun:test";
import { scoreSpec } from "../score";

const validLine = {
  type: "d3-lines",
  title: "Unemployment fell to a five-year low",
  data: "year,value\n2018,5.1\n2023,3.7",
  altInsight: "Unemployment fell from 5.1% in 2018 to 3.7% in 2023",
  baseColor: "#0072B2",
};

describe("scoreSpec", () => {
  it("passes a valid spec in the right family with no warnings", () => {
    const r = scoreSpec(validLine, {
      family: "change-over-time",
      maxWarnings: 0,
    });
    expect(r.validates).toBe(true);
    expect(r.familyMatch).toBe(true);
    expect(r.guardrailsOk).toBe(true);
    expect(r.pass).toBe(true);
  });

  it("fails and notes an invalid spec", () => {
    const r = scoreSpec(
      { ...validLine, title: "" },
      { family: "change-over-time" },
    );
    expect(r.validates).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/invalid/);
  });

  it("fails when the type is outside the expected family", () => {
    const r = scoreSpec(validLine, { family: "ranking" });
    expect(r.validates).toBe(true);
    expect(r.familyMatch).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/not in family/);
  });

  it("fails when warnings exceed maxWarnings", () => {
    const labelTitle = { ...validLine, title: "year" };
    const r = scoreSpec(labelTitle, {
      family: "change-over-time",
      maxWarnings: 0,
    });
    expect(r.validates).toBe(true);
    expect(r.guardrailsOk).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/warnings/);
  });

  it("passes a no-chart decision when family is none", () => {
    const r = scoreSpec(
      { decision: "no-chart", reason: "data too thin" },
      { family: "none" },
    );
    expect(r.pass).toBe(true);
  });

  it("fails when a chart is emitted but no-chart was expected", () => {
    const r = scoreSpec(validLine, { family: "none" });
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/no-chart/);
  });
});
