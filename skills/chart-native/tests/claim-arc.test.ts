import { describe, it, expect } from "bun:test";
import {
  narrativeBeatErrors,
  narrativeFallbackWarning,
  deriveChartStory,
} from "../src/chart-story";
import type { NativeSpec } from "../src/spec-to-config";

// A minimal line spec whose x column carries the anchors the beats use.
const lineSpec = (beats: unknown): NativeSpec =>
  ({
    nativeType: "line",
    title: "T",
    source: { name: "S" },
    unit: "%",
    data: "year,v\n2000,1\n2001,5\n2002,9\n2003,4\n",
    beats,
  }) as unknown as NativeSpec;

describe("claim-arc validation (narrativeBeatErrors)", () => {
  it("accepts a well-formed arc establish→build→turn→payoff", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "In 2000 it starts low." },
        { x: 2001, role: "build", text: "It climbs." },
        { x: 2002, role: "turn", text: "Then it peaks — the turn." },
        { x: 2003, role: "payoff", text: "And settles higher than it began." },
      ]),
    );
    expect(errs).toEqual([]);
  });

  it("rejects an arc that does not open on establish", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "build", text: "climbs" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /open.*establish/i.test(e))).toBe(true);
  });

  it("rejects an arc that does not close on payoff", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2001, role: "build", text: "climbs" },
      ]),
    );
    expect(errs.some((e) => /close.*payoff/i.test(e))).toBe(true);
  });

  it("rejects an arc with no build (no rising action)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /build/i.test(e))).toBe(true);
  });

  it("rejects more than one turn (a single Peak carries the story)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2001, role: "turn", text: "peak 1" },
        { x: 2002, role: "turn", text: "peak 2" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /turn|peak/i.test(e))).toBe(true);
  });

  it("rejects a half-arc (some beats have a role, some don't)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2001, text: "no role here" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /all.*role|half-arc/i.test(e))).toBe(true);
  });

  it("rejects a role beat with an empty claim (text)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2001, role: "build", text: "   " },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /claim|text/i.test(e))).toBe(true);
  });

  it("stays byte-identical for legacy anchor-only beats (no role) — no arc errors", () => {
    const errs = narrativeBeatErrors(lineSpec([{ x: 2000 }, { x: 2003 }]));
    expect(errs).toEqual([]);
  });

  it("still fails loud on a non-existent anchor (existing behaviour intact)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 1999, role: "establish", text: "sets" },
        { x: 2001, role: "build", text: "climbs" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /not found/i.test(e))).toBe(true);
  });

  it("rejects an arc with more than one establish (the scene is set once)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets first" },
        { x: 2001, role: "establish", text: "sets again" },
        { x: 2002, role: "build", text: "climbs" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /establish/i.test(e))).toBe(true);
    expect(errs.some((e) => /set once|more than one/i.test(e))).toBe(true);
  });

  it("rejects an arc with more than one payoff (the argument lands once)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2001, role: "build", text: "climbs" },
        { x: 2002, role: "payoff", text: "lands first" },
        { x: 2003, role: "payoff", text: "lands again" },
      ]),
    );
    expect(errs.some((e) => /payoff/i.test(e))).toBe(true);
    expect(errs.some((e) => /lands once|more than one/i.test(e))).toBe(true);
  });

  it("rejects a beat with a role outside the enum (establish/build/turn/payoff)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2001, role: "climax", text: "not a real role" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs.some((e) => /not one of|role/i.test(e))).toBe(true);
  });

  it("accepts a repeated `build` (multi-beat rising action is allowed)", () => {
    const errs = narrativeBeatErrors(
      lineSpec([
        { x: 2000, role: "establish", text: "sets" },
        { x: 2001, role: "build", text: "climbs" },
        { x: 2002, role: "build", text: "climbs more" },
        { x: 2003, role: "payoff", text: "lands" },
      ]),
    );
    expect(errs).toEqual([]);
  });
});

describe("deriveChartStory role threading (claim-arc, S2)", () => {
  it("threads a source beat's role onto the emitted ChartBeat, and uses its claim (text) as the copy verbatim", () => {
    const chartBeats = deriveChartStory(
      lineSpec([
        { x: 2000, role: "establish", text: "It starts low, in 2000." },
        { x: 2001, role: "build", text: "It climbs through 2001." },
        { x: 2003, role: "payoff", text: "And lands higher, by 2003." },
      ]),
    );
    const roledReveals = chartBeats.filter(
      (b) => b.kind === "reveal" && b.role !== undefined,
    );
    // (a) at least one emitted beat carries a role from a source beat
    const establishReveal = roledReveals.find((b) => b.role === "establish");
    expect(establishReveal).toBeDefined();
    // (b) that beat's copy is the source beat's claim (text) verbatim — not an
    // auto-generated "name — value" caption.
    expect(establishReveal?.copy).toBe("It starts low, in 2000.");

    const buildReveal = roledReveals.find((b) => b.role === "build");
    expect(buildReveal).toBeDefined();
    expect(buildReveal?.copy).toBe("It climbs through 2001.");

    const payoffReveal = roledReveals.find((b) => b.role === "payoff");
    expect(payoffReveal).toBeDefined();
    expect(payoffReveal?.copy).toBe("And lands higher, by 2003.");
  });
});

describe("flagged salience fallback (narrativeFallbackWarning)", () => {
  const spec = (beats?: unknown) =>
    ({
      nativeType: "line",
      title: "T",
      source: { name: "S" },
      unit: "%",
      data: "year,v\n2000,1\n2001,9\n",
      ...(beats ? { beats } : {}),
    }) as unknown as NativeSpec;

  it("warns when a line scrolly has no confirmed beats (salience fallback)", () => {
    const w = narrativeFallbackWarning(spec());
    expect(w).not.toBeNull();
    expect(w).toMatch(/auto-picked|salience|not.*confirmed|argument/i);
  });

  it("does not warn when beats are confirmed", () => {
    expect(
      narrativeFallbackWarning(
        spec([
          { x: 2000, role: "establish", text: "low" },
          { x: 2001, role: "build", text: "up" },
          { x: 2001, role: "payoff", text: "lands" },
        ]),
      ),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ★ THE VIDEO SURFACE — every type carries a walk now, and each is validated at ITS grain.
//
// While `bar` was the only walk-capable video, this whole surface was unreachable and the
// scrolly-only list was harmless. It stopped being harmless the moment 41 types opened.
// ---------------------------------------------------------------------------
describe("narrativeBeatErrors — the VIDEO surface, per grain", () => {
  // A spec carries its DATA as csv — the mappers parse it. Building `rows` by hand made
  // `specToNativeConfig` throw, and the throw is swallowed (the producer validator's job), so
  // every one of these tests passed while checking nothing. Caught by writing a refusal test
  // first and watching it stay green.
  const spec = (nativeType: string, beats: unknown[]) =>
    ({
      nativeType,
      title: "t",
      altInsight: "a",
      source: { name: "S" },
      unit: "u",
      data: "region,value\nGenève,12\nVaud,8\nValais,5\n",
      beats,
    }) as unknown as NativeSpec;

  it("accepts an anchored NON-BAR video walk — lollipop names its subjects", () => {
    expect(
      narrativeBeatErrors(
        spec("lollipop", [
          { category: "Vaud", role: "establish", text: "Vaud ouvre." },
          { category: "Valais", role: "build", text: "Le Valais suit." },
          { category: "Genève", role: "payoff", text: "Genève ferme." },
        ]),
        "video",
      ),
    ).toEqual([]);
  });

  it("still refuses an anchor the data does not carry, and names the valid ones", () => {
    const errs = narrativeBeatErrors(
      spec("lollipop", [
        { category: "Atlantide", role: "establish", text: "nulle part" },
        { category: "Valais", role: "build", text: "Le Valais suit." },
        { category: "Genève", role: "payoff", text: "Genève ferme." },
      ]),
      "video",
    );
    expect(errs.length).toBe(1);
    expect(errs[0]!).toContain("Atlantide");
    expect(errs[0]!).toContain("Genève");
  });

  it("refuses an anchor a SEQUENCED type cannot honour — never accepts then ignores it", () => {
    const errs = narrativeBeatErrors(
      spec("pie", [
        { category: "Vaud", role: "establish", text: "Vaud d'abord." },
        { role: "build", text: "Puis ceci." },
        { role: "payoff", text: "Et le point." },
      ]),
      "video",
    );
    expect(errs.length).toBe(1);
    // ROUTED: it names the act that resolves it, and why.
    expect(errs[0]!).toMatch(/Drop the `category` anchor and keep the sentence/);
    expect(errs[0]!).toMatch(/order written/);
  });

  it("accepts a SEQUENCED walk that is only sentences — the shape that type can render", () => {
    expect(
      narrativeBeatErrors(
        spec("pie", [
          { role: "establish", text: "D'abord ceci." },
          { role: "build", text: "Puis cela." },
          { role: "payoff", text: "Et le point." },
        ]),
        "video",
      ),
    ).toEqual([]);
  });


  // ★ THE ANCHOR FIELD IS NOT `catField` FOR EVERY TYPE. A dumbbell names its rows by
  // `labelField`, a pyramid by `bandField`, a radial bar by `categoryField`. While `bar` was
  // alone the hard-coded `catField` was right by accident; reading it from the registry is what
  // makes it right on purpose — and this is the test that can tell the difference.
  it("resolves the anchor by the type's OWN field — dumbbell names rows by labelField", () => {
    const paired = (beats: unknown[]) =>
      ({
        nativeType: "dumbbell",
        title: "t",
        altInsight: "a",
        source: { name: "S" },
        unit: "u",
        data: "region,2000,2020\nGenève,12,20\nVaud,8,14\nValais,5,9\n",
        beats,
      }) as unknown as NativeSpec;
    expect(
      narrativeBeatErrors(
        paired([
          { category: "Vaud", role: "establish", text: "Vaud ouvre." },
          { category: "Valais", role: "build", text: "Le Valais suit." },
          { category: "Genève", role: "payoff", text: "Genève ferme." },
        ]),
        "video",
      ),
    ).toEqual([]);
    // …and an unknown one is still named, against the right column.
    const errs = narrativeBeatErrors(
      paired([
        { category: "Atlantide", role: "establish", text: "nulle part" },
        { category: "Valais", role: "build", text: "Le Valais suit." },
        { category: "Genève", role: "payoff", text: "Genève ferme." },
      ]),
      "video",
    );
    expect(errs.length).toBe(1);
    expect(errs[0]!).toContain("Vaud");
  });

  it("the SCROLLY surface is unchanged — a lollipop scrolly is still refused", () => {
    const errs = narrativeBeatErrors(
      spec("lollipop", [
        { category: "Vaud", role: "establish", text: "Vaud ouvre." },
        { category: "Valais", role: "build", text: "Le Valais suit." },
        { category: "Genève", role: "payoff", text: "Genève ferme." },
      ]),
    );
    expect(errs.length).toBe(1);
    expect(errs[0]!).toContain("chart scrollies only");
  });
});
