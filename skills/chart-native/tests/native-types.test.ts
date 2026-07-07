import { describe, it, expect } from "bun:test";
import { NATIVE_TYPES, REMOTION_PREFIX } from "../src/native-types";
import {
  AUDIT_REGISTRY,
  INTERACTIVE_REGISTRY,
} from "../src/component-registry";

describe("NATIVE_TYPES canonical list", () => {
  it("has unique ids", () => {
    const ids = NATIVE_TYPES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("ids exactly match the Remotion prefix keys (no render-path drift)", () => {
    const ids = [...NATIVE_TYPES.map((e) => e.id)].sort();
    const prefixKeys = Object.keys(REMOTION_PREFIX).sort();
    expect(ids).toEqual(prefixKeys);
  });
  it("every entry is well-formed", () => {
    for (const e of NATIVE_TYPES) {
      expect(["A", "B"]).toContain(e.family);
      expect([
        "single",
        "wide",
        "paired",
        "distribution",
        "structural",
      ]).toContain(e.shape);
      if (e.deferred !== undefined)
        expect(e.deferred.trim().length).toBeGreaterThan(0);
    }
  });
  it("keeps the four legacy reachable types non-deferred", () => {
    for (const id of ["line", "bar", "scatter", "pie"]) {
      const e = NATIVE_TYPES.find((x) => x.id === id);
      expect(e?.deferred).toBeUndefined();
    }
  });
});

describe("component registries match the canonical list", () => {
  const ids = [...NATIVE_TYPES.map((e) => e.id)].sort();
  it("AUDIT_REGISTRY keys === NATIVE_TYPES ids", () => {
    expect(Object.keys(AUDIT_REGISTRY).sort()).toEqual(ids);
  });
  it("INTERACTIVE_REGISTRY keys === NATIVE_TYPES ids", () => {
    expect(Object.keys(INTERACTIVE_REGISTRY).sort()).toEqual(ids);
  });
});
