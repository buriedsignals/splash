import { describe, expect, it } from "bun:test";
import type { BrowserProbeResult } from "./probe";
import { NEWSROOM_CAPABILITIES } from "./capabilities";
import {
  capabilityReadiness,
  decorReadiness,
  readinessBlockers,
} from "./readiness";
import { DEFAULT_NEWSROOM_STATE, type NewsroomState } from "./state";

const ALL_DEPS_PRESENT = () => true;
// Every capability with `remotion` in criticalDeps (chart-native, map-native) also runs the
// browser probe. These tests are about env/deps/lastVerified, not the browser, so they pin it
// ready — exactly the DI pattern ALL_DEPS_PRESENT already establishes for resolveDep.
const ALL_BROWSERS_READY = (): BrowserProbeResult => ({
  status: "ready",
  executablePath: "/stub/chrome-headless-shell",
});
const BROWSER_MISSING = (): BrowserProbeResult => ({
  status: "missing",
  executablePath: "/stub/chrome-headless-shell",
});

function state(capabilities: NewsroomState["capabilities"]): NewsroomState {
  return { ...DEFAULT_NEWSROOM_STATE, capabilities };
}

const DW = NEWSROOM_CAPABILITIES["dw-chart"]!;
const MAP = NEWSROOM_CAPABILITIES["map-native"]!;
const CHART = NEWSROOM_CAPABILITIES["chart-native"]!;
// The declared-but-unbuilt exemplar. Was embed-cms until L3 built it (2026-07-27); embed-fly
// is now the only capability still waiting for its own tranche.
const UNBUILT = NEWSROOM_CAPABILITIES["embed-fly"]!;
// The destination whose non-secret provider identifiers live in newsroom.json, not in .env.
const S3 = NEWSROOM_CAPABILITIES["embed-s3"]!;

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
        {
          env: { [name]: "k" },
          resolveDep: ALL_DEPS_PRESENT,
          probeBrowser: ALL_BROWSERS_READY,
        },
      );
      expect(r.status).toBe("ready");
    }
  });

  it("is missing when a critical dependency is not installed", () => {
    const r = capabilityReadiness(
      CHART,
      state({ "chart-native": { enabled: true } }),
      {
        env: {},
        resolveDep: (pkg) => pkg !== "vite",
        probeBrowser: ALL_BROWSERS_READY,
      },
    );
    expect(r.status).toBe("missing");
    expect(r.reason).toContain("vite");
    expect(r.reason).toContain("installer");
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
      UNBUILT,
      state({ "embed-fly": { enabled: true } }),
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

  // The incident: package resolution reported chart-native/map-native "installed" while their
  // Remotion headless-shell browser had downloaded incompletely, so every video render died
  // with an unreadable subprocess dump. A capability whose criticalDeps carry "remotion" now
  // also runs the browser probe, gated the same way as any other critical dep.
  it("is missing when the Remotion browser has not finished downloading, with the actual remedy", () => {
    const r = capabilityReadiness(
      CHART,
      state({ "chart-native": { enabled: true } }),
      { env: {}, resolveDep: ALL_DEPS_PRESENT, probeBrowser: BROWSER_MISSING },
    );
    expect(r.status).toBe("missing");
    expect(r.reason).toContain("installer");
    expect(r.reason).toContain("browser");
  });

  it("is missing for map-native too — every criticalDep list carrying remotion is gated", () => {
    const r = capabilityReadiness(
      MAP,
      state({ "map-native": { enabled: true } }),
      {
        env: { VITE_MAPTILER_KEY: "k" },
        resolveDep: ALL_DEPS_PRESENT,
        probeBrowser: BROWSER_MISSING,
      },
    );
    expect(r.status).toBe("missing");
    expect(r.reason).toContain("installer");
    expect(r.reason).toContain("browser");
  });

  it("does not probe the browser at all for a capability whose criticalDeps never mention remotion", () => {
    let called = false;
    const r = capabilityReadiness(
      NEWSROOM_CAPABILITIES["image-native"]!,
      state({ "image-native": { enabled: true } }),
      {
        env: {},
        resolveDep: ALL_DEPS_PRESENT,
        probeBrowser: () => {
          called = true;
          return { status: "missing", executablePath: "x" };
        },
      },
    );
    expect(called).toBe(false);
    expect(r.status).toBe("ready");
  });

  // The setup page is the one screen whose promise is that there will be no terminal. Telling its
  // reader to `bun install` in a directory is both impossible for them and, since the installer
  // installs the dependencies itself, never their job in the first place.
  it("never tells the journalist to run a command", () => {
    const missing = capabilityReadiness(
      NEWSROOM_CAPABILITIES["image-native"]!,
      state({ "image-native": { enabled: true } }),
      { env: {}, resolveDep: () => false },
    );
    expect(missing.status).toBe("missing");
    expect(missing.reason).not.toContain("bun install");
    expect(missing.reason).toContain("installer");
  });

  it("is ready once the browser is fully extracted", () => {
    const r = capabilityReadiness(
      CHART,
      state({ "chart-native": { enabled: true } }),
      {
        env: {},
        resolveDep: ALL_DEPS_PRESENT,
        probeBrowser: ALL_BROWSERS_READY,
      },
    );
    expect(r.status).toBe("ready");
  });

  // A23: `ready` used to mean two different things depending on the capability. For an engine
  // it meant "usable right now"; for a destination whose provider identifiers live in
  // newsroom.json rather than in .env, it meant "its secrets are present" — so a newsroom that
  // had put its two S3 keys in .env read READY and was refused by the adapter at the moment of
  // delivery ("settings.endpoint is required"). Readiness now judges the same bag deliver()
  // hands the adapter.
  it("is missing while a destination's required settings are unfilled", () => {
    const r = capabilityReadiness(
      S3,
      state({ "embed-s3": { enabled: true } }),
      {
        env: {
          SPLASH_S3_ACCESS_KEY_ID: "id",
          SPLASH_S3_SECRET_ACCESS_KEY: "secret",
        },
        resolveDep: ALL_DEPS_PRESENT,
      },
    );
    expect(r.status).toBe("missing");
    // Named, and with the place they are set — the same remediation shape the adapter's own
    // refusal carries, arriving before the delivery instead of during it.
    for (const f of ["endpoint", "region", "bucket", "publicBaseUrl"])
      expect(r.reason).toContain(f);
    expect(r.reason).toContain("newsroom.json");
  });

  it("names only the settings still missing", () => {
    const r = capabilityReadiness(
      S3,
      state({
        "embed-s3": {
          enabled: true,
          settings: {
            endpoint: "https://s3.example.org",
            region: "auto",
            bucket: "newsroom",
          },
        },
      }),
      {
        env: {
          SPLASH_S3_ACCESS_KEY_ID: "id",
          SPLASH_S3_SECRET_ACCESS_KEY: "secret",
        },
        resolveDep: ALL_DEPS_PRESENT,
      },
    );
    expect(r.status).toBe("missing");
    expect(r.reason).toContain("publicBaseUrl");
    expect(r.reason).not.toContain("bucket");
  });

  it("is ready once the destination is fully configured", () => {
    const r = capabilityReadiness(
      S3,
      state({
        "embed-s3": {
          enabled: true,
          settings: {
            endpoint: "https://s3.example.org",
            region: "auto",
            bucket: "newsroom",
            publicBaseUrl: "https://cdn.example.org",
            // An OPTIONAL field left out must not hold readiness back.
          },
        },
      }),
      {
        env: {
          SPLASH_S3_ACCESS_KEY_ID: "id",
          SPLASH_S3_SECRET_ACCESS_KEY: "secret",
        },
        resolveDep: ALL_DEPS_PRESENT,
      },
    );
    expect(r.status).toBe("ready");
    expect(r.reason).toBe("");
  });

  it("asks for a missing credential before asking for a setting", () => {
    // Order matters for the sentence a newsroom reads: the key is where the provider account
    // is, the settings are where the bucket is. One instruction at a time.
    const r = capabilityReadiness(
      S3,
      state({ "embed-s3": { enabled: true } }),
      {
        env: {},
        resolveDep: ALL_DEPS_PRESENT,
      },
    );
    expect(r.status).toBe("missing");
    expect(r.reason).toContain("SPLASH_S3_ACCESS_KEY_ID");
    expect(r.reason).not.toContain("newsroom.json");
  });

  it("takes its environment from the caller, never from the process", () => {
    // The ambient value is RESTORED, not deleted — the same discipline decor.test.ts already
    // follows. bun test shares one process across files, so deleting it left every later file
    // running without a Datawrapper token: the moment a suite downstream of this one actually
    // produced a Datawrapper chart (lib/brain/acceptance.test.ts, once dw-chart became
    // loop-buildable), it failed with "DATAWRAPPER_API_TOKEN is not set" — green on its own,
    // red in the full run, for a reason nothing in it could explain.
    const ambient = process.env.DATAWRAPPER_API_TOKEN;
    process.env.DATAWRAPPER_API_TOKEN = "ambient-token-must-be-ignored";
    try {
      const r = capabilityReadiness(
        DW,
        state({ "dw-chart": { enabled: true } }),
        { env: {}, resolveDep: ALL_DEPS_PRESENT },
      );
      expect(r.status).toBe("missing");
    } finally {
      if (ambient === undefined) delete process.env.DATAWRAPPER_API_TOKEN;
      else process.env.DATAWRAPPER_API_TOKEN = ambient;
    }
  });
});

describe("the decor's readiness report", () => {
  it("reports every capability, and blockers exclude what is disabled", () => {
    const s = state({
      "dw-chart": { enabled: true },
      "chart-native": { enabled: true },
    });
    const all = decorReadiness(s, {
      env: {},
      resolveDep: ALL_DEPS_PRESENT,
      probeBrowser: ALL_BROWSERS_READY,
    });
    expect(all.length).toBe(Object.keys(NEWSROOM_CAPABILITIES).length);

    const blockers = readinessBlockers(all);
    expect(blockers.map((b) => b.id)).toEqual(["dw-chart"]);
    for (const b of blockers) expect(b.status).toBe("missing");
  });
});
