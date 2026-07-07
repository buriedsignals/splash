import { describe, it, expect } from "bun:test";
import { specToNativeConfig, type NativeSpec } from "../src/spec-to-config";

const base = {
  title: "Nurses wait longest for a first appointment",
  source: { name: "NHS 2025", url: "https://nhs.uk/x" },
  unit: "median wait (days)",
};

describe("specToNativeConfig — lollipop (single)", () => {
  it("maps category + value and threads highlight to highlightLabel (raw string)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "lollipop",
      data: "role,days\nNurse,31\nGP,12\nDentist,9",
      highlight: "Nurse",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("lollipop");
    expect(config.catField).toBe("role");
    expect(config.valField).toBe("days");
    expect(config.highlightLabel).toBe("Nurse");
  });

  it("omits highlightLabel when no highlight given, and never forwards baseColor", () => {
    const { config } = specToNativeConfig({
      ...base,
      nativeType: "lollipop",
      data: "role,days\nNurse,31\nGP,12",
      baseColor: "#009E73",
    });
    expect(config.highlightLabel).toBeUndefined();
    expect(config.baseColor).toBeUndefined();
  });
});
