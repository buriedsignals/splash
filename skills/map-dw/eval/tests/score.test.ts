import { describe, it, expect } from "bun:test";
import { scoreMapSpec } from "../score";

const good = {
  mapType: "choropleth",
  basemap: "world-2019",
  mapKeyAttr: "DW_STATE_CODE",
  regionKey: "code",
  valueColumn: "value",
  data: "code,value\nFRA,10\nSWE,70",
  title: "Sweden leads western Europe on this measure",
  altInsight: "Sweden highest at 70, France lowest at 10",
};

describe("scoreMapSpec", () => {
  it("passes a valid, key-bound spec on a known basemap", () => {
    const r = scoreMapSpec(good, { basemap: "world-2019", maxWarnings: 0 });
    expect(r.validates).toBe(true);
    expect(r.basemapKnown).toBe(true);
    expect(r.keyBound).toBe(true);
    expect(r.conformanceOk).toBe(true);
    expect(r.pass).toBe(true);
  });

  it("fails and notes an invalid spec", () => {
    const r = scoreMapSpec(
      { ...good, altInsight: "" },
      { basemap: "world-2019" },
    );
    expect(r.validates).toBe(false);
    expect(r.pass).toBe(false);
    expect(r.notes.join()).toMatch(/invalid/);
  });

  it("fails when the basemap is not in the known allowlist", () => {
    const r = scoreMapSpec(
      { ...good, basemap: "narnia-2030" },
      { basemap: "narnia-2030" },
    );
    expect(r.basemapKnown).toBe(false);
    expect(r.pass).toBe(false);
  });

  it("fails when keys are not bound to the data", () => {
    const r = scoreMapSpec(
      { ...good, regionKey: "iso" },
      { basemap: "world-2019" },
    );
    expect(r.keyBound).toBe(false);
    expect(r.pass).toBe(false);
  });

  it("fails conformance when a label-like title exceeds maxWarnings", () => {
    const r = scoreMapSpec(
      { ...good, title: "value" },
      { basemap: "world-2019", maxWarnings: 0 },
    );
    expect(r.validates).toBe(true);
    expect(r.conformanceOk).toBe(false);
    expect(r.pass).toBe(false);
  });
});
