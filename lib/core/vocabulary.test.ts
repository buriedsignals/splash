import { describe, it, expect, test } from "bun:test";
import {
  CHANNELS,
  VERBS,
  VISUAL_FORMATS,
  isChannel,
  isVerb,
  isVisualFormat,
  DELIVERABLE_KIND,
} from "./vocabulary";
import type { Channel, VisualFormat } from "./vocabulary";

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

describe("VISUAL_FORMATS / CHANNELS — one declaration, type DERIVED from it", () => {
  it("declares the four visual formats and the three channels", () => {
    expect([...VISUAL_FORMATS]).toEqual([
      "static",
      "interactive",
      "video",
      "scrolly",
    ]);
    expect([...CHANNELS]).toEqual([
      "social-vertical",
      "social-feed",
      "article-web",
    ]);
  });

  // The compile-time half of the invariant: every union member must be assignable FROM the
  // array's element type and back. If someone widened the union without touching the array
  // (the drift these arrays exist to prevent), one of these two assignments stops compiling.
  it("keeps the array and the union in lockstep (compile-time)", () => {
    const fromArray: VisualFormat = VISUAL_FORMATS[0];
    const toArray: (typeof VISUAL_FORMATS)[number] = "scrolly" as VisualFormat;
    const chFromArray: Channel = CHANNELS[0];
    const chToArray: (typeof CHANNELS)[number] = "article-web" as Channel;
    expect([fromArray, toArray, chFromArray, chToArray].length).toBe(4);
  });

  it("guards accept every declared value and reject anything else", () => {
    for (const f of VISUAL_FORMATS) expect(isVisualFormat(f)).toBe(true);
    for (const c of CHANNELS) expect(isChannel(c)).toBe(true);
    expect(isVisualFormat("gif")).toBe(false);
    expect(isVisualFormat(undefined)).toBe(false);
    expect(isChannel("newsletter")).toBe(false);
    expect(isChannel(7)).toBe(false);
  });
});

test("every visual format has a deliverable kind — the map is TOTAL, not partial", () => {
  for (const f of VISUAL_FORMATS) expect(DELIVERABLE_KIND[f]).toBeDefined();
  expect(Object.keys(DELIVERABLE_KIND).sort()).toEqual(
    [...VISUAL_FORMATS].sort(),
  );
});

test("the three kinds separate an embeddable element, a motion asset and a narrative page", () => {
  expect(DELIVERABLE_KIND.static).toBe("element");
  expect(DELIVERABLE_KIND.interactive).toBe("element");
  expect(DELIVERABLE_KIND.video).toBe("motion");
  expect(DELIVERABLE_KIND.scrolly).toBe("page");
});
