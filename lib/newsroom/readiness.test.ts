import { describe, expect, it } from "bun:test";
import { NEWSROOM_CAPABILITIES } from "./capabilities";
import {
  capabilityReadiness,
  decorReadiness,
  readinessBlockers,
} from "./readiness";
import { DEFAULT_NEWSROOM_STATE, type NewsroomState } from "./state";

const ALL_DEPS_PRESENT = () => true;

function state(capabilities: NewsroomState["capabilities"]): NewsroomState {
  return { ...DEFAULT_NEWSROOM_STATE, capabilities };
}

const DW = NEWSROOM_CAPABILITIES["dw-chart"]!;
const MAP = NEWSROOM_CAPABILITIES["map-native"]!;
const CHART = NEWSROOM_CAPABILITIES["chart-native"]!;
const CMS = NEWSROOM_CAPABILITIES["embed-cms"]!;

describe("capability readiness", () => {
  it("is ready when enabled, keyed and installed", () => {
    const r = capabilityReadiness(
      DW,
      state({ "dw-chart": { enabled: true } }),
      {
        env: { DATAWRAPPER_API_TOKEN: "t" },
        resolveDep: ALL_DEPS_PRESENT,
      },
    );
    expect(r.status).toBe("ready");
    expect(r.reason).toBe("");
  });

  it("is missing, with newsroom-language remediation, when a key is absent", () => {
    const r = capabilityReadiness(
      DW,
      state({ "dw-chart": { enabled: true } }),
      {
        env: {},
        resolveDep: ALL_DEPS_PRESENT,
      },
    );
    expect(r.status).toBe("missing");
    expect(r.reason).toContain(DW.label);
    expect(r.help.join(" ")).toContain("app.datawrapper.de");
  });

  it("accepts either member of an alternatives group", () => {
    for (const name of ["VITE_MAPTILER_KEY", "REMOTION_MAPTILER_KEY"]) {
      const r = capabilityReadiness(
        MAP,
        state({ "map-native": { enabled: true } }),
        { env: { [name]: "k" }, resolveDep: ALL_DEPS_PRESENT },
      );
      expect(r.status).toBe("ready");
    }
  });

  it("is missing when a critical dependency is not installed", () => {
    const r = capabilityReadiness(
      CHART,
      state({ "chart-native": { enabled: true } }),
      { env: {}, resolveDep: (pkg) => pkg !== "vite" },
    );
    expect(r.status).toBe("missing");
    expect(r.reason).toContain("vite");
    expect(r.reason).toContain("bun install");
  });

  it("is unverified when the last live check could not reach the provider", () => {
    const r = capabilityReadiness(
      DW,
      state({
        "dw-chart": {
          enabled: true,
          lastVerified: {
            at: "2026-07-24T09:00:00.000Z",
            result: "unreachable",
          },
        },
      }),
      { env: { DATAWRAPPER_API_TOKEN: "t" }, resolveDep: ALL_DEPS_PRESENT },
    );
    // Unreachable is NOT invalid: a valid key behind a corporate proxy must not be condemned.
    expect(r.status).toBe("unverified");
  });

  it("is missing when the provider actively rejected the credential", () => {
    const r = capabilityReadiness(
      DW,
      state({
        "dw-chart": {
          enabled: true,
          lastVerified: { at: "2026-07-24T09:00:00.000Z", result: "rejected" },
        },
      }),
      { env: { DATAWRAPPER_API_TOKEN: "t" }, resolveDep: ALL_DEPS_PRESENT },
    );
    expect(r.status).toBe("missing");
    expect(r.reason).toContain("rejected");
  });

  it("is disabled — never red — when the newsroom did not enable it", () => {
    const r = capabilityReadiness(DW, DEFAULT_NEWSROOM_STATE, {
      env: {},
      resolveDep: ALL_DEPS_PRESENT,
    });
    expect(r.status).toBe("disabled");
  });

  it("is disabled for a capability that is only declared", () => {
    const r = capabilityReadiness(
      CMS,
      state({ "embed-cms": { enabled: true } }),
      { env: {}, resolveDep: ALL_DEPS_PRESENT },
    );
    expect(r.status).toBe("disabled");
    expect(r.reason).toContain("not available yet");
  });

  it("names the variable, never its value — a reason cannot leak a credential", () => {
    const secret = "dw-token-must-never-be-quoted";
    const r = capabilityReadiness(
      DW,
      state({
        "dw-chart": {
          enabled: true,
          lastVerified: { at: "2026-07-24T09:00:00.000Z", result: "rejected" },
        },
      }),
      { env: { DATAWRAPPER_API_TOKEN: secret }, resolveDep: ALL_DEPS_PRESENT },
    );
    expect(r.reason).not.toContain(secret);
    expect(r.help.join(" ")).not.toContain(secret);
  });

  it("takes its environment from the caller, never from the process", () => {
    process.env.DATAWRAPPER_API_TOKEN = "ambient-token-must-be-ignored";
    try {
      const r = capabilityReadiness(
        DW,
        state({ "dw-chart": { enabled: true } }),
        { env: {}, resolveDep: ALL_DEPS_PRESENT },
      );
      expect(r.status).toBe("missing");
    } finally {
      delete process.env.DATAWRAPPER_API_TOKEN;
    }
  });
});

describe("the decor's readiness report", () => {
  it("reports every capability, and blockers exclude what is disabled", () => {
    const s = state({
      "dw-chart": { enabled: true },
      "chart-native": { enabled: true },
    });
    const all = decorReadiness(s, { env: {}, resolveDep: ALL_DEPS_PRESENT });
    expect(all.length).toBe(Object.keys(NEWSROOM_CAPABILITIES).length);

    const blockers = readinessBlockers(all);
    expect(blockers.map((b) => b.id)).toEqual(["dw-chart"]);
    for (const b of blockers) expect(b.status).toBe("missing");
  });
});
