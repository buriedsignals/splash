// A GROUND THAT CANNOT CARRY TEXT IS A CONVERSATION, NOT A WALL.
//
// Before this, a newsroom whose house colour could not carry legible furniture met `produce`'s
// engine refusal — a conformance dump, in English, naming hex values and a WCAG ratio, with no
// way forward except editing NEWSROOM-PROFILE.md and guessing. The newsroom is told what happens
// to the text on their map, offered two grounds that work, and asked. Keeping theirs is one of
// the answers, and it is RECORDED — the same way a confirmed takeaway is — so a shipped
// illegible ground traces to a person who chose it.
import { describe, expect, it } from "bun:test";
import { chooseGround, groundGate } from "./ground";
import type { RunManifest } from "./manifest";
import { RunManifestSchema } from "./manifest";
import type { BrandProfile } from "../../skills/splash/src/brand-profile";

const LEGIBLE: BrandProfile = { palette: ["#d5121e"], theme: "#0A5C36" };
const ILLEGIBLE: BrandProfile = { palette: ["#d5121e"], theme: "#717171" };

const run = (ground?: RunManifest["ground"]): RunManifest =>
  RunManifestSchema.parse({
    runId: "r",
    schemaVersion: 7,
    route: "embed",
    channel: "article-web",
    input: {},
    elements: [],
    events: [],
    ...(ground ? { ground } : {}),
  });

describe("the gate produce puts in front of a house ground", () => {
  it("lets an install with no house style through untouched", () => {
    const g = groundGate("map-native", undefined, undefined);
    expect(g.ok).toBe(true);
    if (g.ok) expect(g.house).toBeUndefined();
  });

  it("lets a legible house ground through as the newsroom declared it", () => {
    const g = groundGate("map-native", LEGIBLE, undefined);
    expect(g.ok).toBe(true);
    if (g.ok) expect(g.house).toBe(LEGIBLE);
  });

  it("stops on an illegible one and asks, in the newsroom's language", () => {
    const g = groundGate("map-native", ILLEGIBLE, undefined, "fr");
    expect(g.ok).toBe(false);
    if (g.ok) return;
    // What happens to the TEXT, in French, with no jargon and no field names.
    expect(g.message).toContain("#717171");
    expect(g.message.toLowerCase()).toContain("lire");
    expect(g.message).not.toContain("WCAG");
    expect(g.message).not.toContain("4.5");
    expect(g.message).not.toContain("themeBg");
    expect(g.message).not.toContain("contrast");
    // …and it carries both alternatives plus the right to keep theirs.
    expect(g.message).toContain("a)");
    expect(g.message).toContain("b)");
    expect(g.message).toContain("c)");
  });

  it("never asks a Datawrapper build, which paints on its own white", () => {
    for (const producer of ["dw-chart", "map-dw"]) {
      const g = groundGate(producer, ILLEGIBLE, undefined, "fr");
      expect(g.ok).toBe(true);
      if (g.ok) expect(g.house).toBe(ILLEGIBLE);
    }
  });

  it("asks in English when that is the newsroom's language", () => {
    const g = groundGate("map-native", ILLEGIBLE, undefined, "en");
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.message.toLowerCase()).toContain("read");
  });
});

describe("the answer, once recorded", () => {
  it("keeps the newsroom's own colour when they say keep it", () => {
    const r = chooseGround(run(), ILLEGIBLE, "keep");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.ground).toMatchObject({
      declared: "#717171",
      decision: "keep",
      applied: "#717171",
    });
    const g = groundGate("map-native", ILLEGIBLE, r.value.ground);
    expect(g.ok).toBe(true);
    // The engine is told the ground was accepted, so it produces instead of refusing — and its
    // own concern still fires, which is what keeps "kept as chosen" from meaning "unnoticed".
    if (g.ok) expect(g.house?.themeAccepted).toBe(true);
  });

  it("builds on the replacement when they take one", () => {
    const r = chooseGround(run(), ILLEGIBLE, "#0A5C36");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.ground).toMatchObject({
      declared: "#717171",
      decision: "replace",
      applied: "#0A5C36",
    });
    const g = groundGate("map-native", ILLEGIBLE, r.value.ground);
    expect(g.ok).toBe(true);
    if (g.ok) {
      expect(g.house?.theme).toBe("#0A5C36");
      expect(g.house?.themeAccepted).toBeUndefined();
    }
  });

  it("refuses a replacement that cannot carry text either, and says why", () => {
    const r = chooseGround(run(), ILLEGIBLE, "#8A6D3B");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("#8A6D3B");
  });

  it("refuses something that is not a colour", () => {
    expect(chooseGround(run(), ILLEGIBLE, "midnight").ok).toBe(false);
  });

  it("refuses a decision about a ground that has nothing wrong with it", () => {
    expect(chooseGround(run(), LEGIBLE, "keep").ok).toBe(false);
  });

  it("survives the manifest schema, so the decision is on disk and not in memory", () => {
    const r = chooseGround(run(), ILLEGIBLE, "keep");
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(RunManifestSchema.parse(r.value).ground?.decision).toBe("keep");
  });
});

describe("an override belongs to the colour it was given for", () => {
  it("asks again when the newsroom has since changed its ground", () => {
    const kept = chooseGround(run(), ILLEGIBLE, "keep");
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    const moved: BrandProfile = { palette: ["#d5121e"], theme: "#8A6D3B" };
    const g = groundGate("map-native", moved, kept.value.ground);
    expect(g.ok).toBe(false);
  });
});
