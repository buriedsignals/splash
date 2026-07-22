import { describe, it, expect } from "bun:test";
import {
  narrativeBeatErrors,
  narrativeFallbackWarning,
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
