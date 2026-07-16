// preflight.test.ts — the per-engine readiness manifest. Pure: env and dep resolution are
// injected, so these tests never depend on the machine's real .env or node_modules.
import { describe, expect, it } from "bun:test";
import {
  ENGINE_REQUIREMENTS,
  enginePreflightStatus,
  preflightFindings,
} from "../src/preflight";

const ALL_SET = {
  DATAWRAPPER_API_TOKEN: "dw-token",
  VITE_MAPTILER_KEY: "mt-key",
  REMOTION_MAPTILER_KEY: "mt-key",
};
const resolves = () => true;
const neverResolves = () => false;

describe("preflightFindings", () => {
  it("should return no findings for dw-chart when the DW token is set", () => {
    expect(
      preflightFindings("dw-chart", { env: ALL_SET, resolveDep: resolves }),
    ).toEqual([]);
  });

  it("should name DATAWRAPPER_API_TOKEN, its purpose and /splash/.env when missing for dw-chart", () => {
    const findings = preflightFindings("dw-chart", {
      env: {},
      resolveDep: resolves,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("env");
    expect(findings[0].message).toContain("DATAWRAPPER_API_TOKEN");
    expect(findings[0].message).toContain("/splash/.env");
    expect(findings[0].message).toContain("datawrapper.de");
  });

  it("should accept EITHER MapTiler prefix for map-native (mirror rule)", () => {
    const onlyRemotion = { REMOTION_MAPTILER_KEY: "mt-key" };
    const envFindings = preflightFindings("map-native", {
      env: onlyRemotion,
      resolveDep: resolves,
    }).filter((f) => f.kind === "env");
    expect(envFindings).toEqual([]);
  });

  it("should flag map-native deps when remotion/react do not resolve (Tom's crash class)", () => {
    const findings = preflightFindings("map-native", {
      env: ALL_SET,
      resolveDep: neverResolves,
    });
    expect(findings.some((f) => f.kind === "deps")).toBe(true);
    expect(findings.find((f) => f.kind === "deps")!.message).toContain(
      "bun install",
    );
  });

  it("should treat an empty-string env var as missing", () => {
    const findings = preflightFindings("dw-chart", {
      env: { DATAWRAPPER_API_TOKEN: "  " },
      resolveDep: resolves,
    });
    expect(findings).toHaveLength(1);
  });

  it("should cover every producer in the manifest", () => {
    for (const producer of [
      "dw-chart",
      "chart-native",
      "map-dw",
      "map-native",
      "scrolly",
    ] as const) {
      expect(ENGINE_REQUIREMENTS[producer]).toBeDefined();
    }
  });
});

describe("enginePreflightStatus (tri-state, Spotlight A2)", () => {
  const NOW = "2026-07-16T12:00:00Z";
  it("should be green with an empty reason when everything resolves", () => {
    expect(
      enginePreflightStatus("dw-chart", {
        env: ALL_SET,
        resolveDep: resolves,
        now: NOW,
      }),
    ).toEqual({ status: "green", checkedAt: NOW, reason: "" });
  });
  it("should be yellow (journalist-fixable) on a missing key", () => {
    const s = enginePreflightStatus("dw-chart", {
      env: {},
      resolveDep: resolves,
      now: NOW,
    });
    expect(s.status).toBe("yellow");
    expect(s.reason).toContain("DATAWRAPPER_API_TOKEN");
  });
  it("should be red on unresolved deps, even when keys are set (install problem beats key problem)", () => {
    const s = enginePreflightStatus("map-native", {
      env: ALL_SET,
      resolveDep: neverResolves,
      now: NOW,
    });
    expect(s.status).toBe("red");
    expect(s.reason).toContain("bun install");
  });
});
