import { describe, it, expect } from "bun:test";
import { arcErrors, ARC_ROLES } from "./claim-arc";
import type { ArcRole } from "./claim-arc";

// Minimal beat shape arcErrors actually reads — engine-agnostic (no NarrativeBeat import).
const beat = (role: ArcRole | undefined, text: string | undefined) => ({
  role,
  text,
});

describe("core/claim-arc — arcErrors golden cases (parity with chart-native slice-1)", () => {
  it("accepts a well-formed arc establish→build→turn→payoff", () => {
    const errs = arcErrors([
      beat("establish", "sets the scene"),
      beat("build", "climbs"),
      beat("turn", "peaks — the turn"),
      beat("payoff", "lands higher"),
    ]);
    expect(errs).toEqual([]);
  });

  it("rejects an arc that does not open on establish", () => {
    const errs = arcErrors([beat("build", "climbs"), beat("payoff", "lands")]);
    expect(errs.some((e) => /establish/i.test(e))).toBe(true);
  });

  it("rejects an arc that does not close on payoff", () => {
    const errs = arcErrors([
      beat("establish", "sets"),
      beat("build", "climbs"),
    ]);
    expect(errs.some((e) => /payoff/i.test(e))).toBe(true);
  });

  it("rejects an arc with no build (no rising action)", () => {
    const errs = arcErrors([
      beat("establish", "sets"),
      beat("payoff", "lands"),
    ]);
    expect(errs.some((e) => /build/i.test(e))).toBe(true);
  });

  it("rejects more than one turn (a single Peak carries the story)", () => {
    const errs = arcErrors([
      beat("establish", "sets"),
      beat("turn", "peak 1"),
      beat("turn", "peak 2"),
      beat("payoff", "lands"),
    ]);
    expect(errs.some((e) => /turn|peak/i.test(e))).toBe(true);
  });

  it("rejects a half-arc (some beats have a role, some don't)", () => {
    const errs = arcErrors([
      beat("establish", "sets"),
      beat(undefined, "no role here"),
      beat("payoff", "lands"),
    ]);
    expect(errs.some((e) => /all.*role|half-arc/i.test(e))).toBe(true);
  });

  it("rejects a role beat with an empty claim (text)", () => {
    const errs = arcErrors([
      beat("establish", "sets"),
      beat("build", "   "),
      beat("payoff", "lands"),
    ]);
    expect(errs.some((e) => /claim|text/i.test(e))).toBe(true);
  });

  it("stays byte-identical for legacy anchor-only beats (no role) — no arc errors", () => {
    const errs = arcErrors([
      beat(undefined, undefined),
      beat(undefined, undefined),
    ]);
    expect(errs).toEqual([]);
  });

  it("rejects an arc with more than one establish (the scene is set once)", () => {
    const errs = arcErrors([
      beat("establish", "sets first"),
      beat("establish", "sets again"),
      beat("build", "climbs"),
      beat("payoff", "lands"),
    ]);
    expect(errs.some((e) => /establish/i.test(e))).toBe(true);
    expect(errs.some((e) => /set once|more than one/i.test(e))).toBe(true);
  });

  it("rejects an arc with more than one payoff (the argument lands once)", () => {
    const errs = arcErrors([
      beat("establish", "sets"),
      beat("build", "climbs"),
      beat("payoff", "lands first"),
      beat("payoff", "lands again"),
    ]);
    expect(errs.some((e) => /payoff/i.test(e))).toBe(true);
    expect(errs.some((e) => /lands once|more than one/i.test(e))).toBe(true);
  });

  it("rejects a beat with a role outside the enum (establish/build/turn/payoff)", () => {
    const errs = arcErrors([
      beat("establish", "sets"),
      beat("climax" as ArcRole, "not a real role"),
      beat("payoff", "lands"),
    ]);
    expect(errs.some((e) => /not one of|role/i.test(e))).toBe(true);
  });

  it("accepts a repeated `build` (multi-beat rising action is allowed)", () => {
    const errs = arcErrors([
      beat("establish", "sets"),
      beat("build", "climbs"),
      beat("build", "climbs more"),
      beat("payoff", "lands"),
    ]);
    expect(errs).toEqual([]);
  });

  it("exposes ARC_ROLES as the four canonical stages", () => {
    expect(ARC_ROLES).toEqual(["establish", "build", "turn", "payoff"]);
  });
});
