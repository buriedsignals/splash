import { describe, it, expect } from "bun:test";
import { VERBS, isVerb } from "./vocabulary";

describe("VERBS — the closed verb vocabulary", () => {
  it("declares exactly the four contract verbs, in order", () => {
    expect([...VERBS]).toEqual(["render", "capture", "review", "publish"]);
  });

  it("accepts a declared verb", () => {
    for (const v of VERBS) expect(isVerb(v)).toBe(true);
  });

  it("rejects an undeclared operation — this is what 'bounded verbs' means", () => {
    expect(isVerb("fetch-data")).toBe(false);
    expect(isVerb("")).toBe(false);
    expect(isVerb(undefined)).toBe(false);
    expect(isVerb(42)).toBe(false);
  });
});
