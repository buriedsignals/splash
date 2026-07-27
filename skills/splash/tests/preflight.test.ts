// preflight.test.ts — the per-engine readiness manifest. Pure: env and dep resolution are
// injected, so these tests never depend on the machine's real .env or node_modules.
import { describe, expect, it } from "bun:test";
import { NEWSROOM_CAPABILITIES } from "../../../lib/newsroom/capabilities";
import { envUpdates } from "../../../install/preflight/serialize";
import {
  EMBED_DELIVERY_ENV,
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

  // The same incident readiness.ts's probe was written for, on the OTHER consumer: a stalled
  // fetch leaves a partial download unextracted while `remotion` itself still resolves, and
  // every dependent video render then dies mid-production with an unreadable subprocess dump.
  // Package resolution cannot see it, so the production-time gate has to ask the filesystem.
  const browserReady = () => ({
    status: "ready" as const,
    executablePath: "/x/shell",
  });
  const browserMissing = () => ({
    status: "missing" as const,
    executablePath: "/x/shell",
  });

  it("should flag chart-native's Remotion browser when it is missing though every package resolves", () => {
    const findings = preflightFindings("chart-native", {
      env: ALL_SET,
      resolveDep: resolves,
      probeBrowser: browserMissing,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].kind).toBe("deps");
    expect(findings[0].message).toContain("remotion browser ensure");
    expect(findings[0].message).toContain("skills/chart-native");
  });

  it("should flag map-native's Remotion browser too — the probe follows the dep, not the engine", () => {
    const findings = preflightFindings("map-native", {
      env: ALL_SET,
      resolveDep: resolves,
      probeBrowser: browserMissing,
    });
    expect(
      findings.filter((f) => f.message.includes("remotion browser ensure")),
    ).toHaveLength(1);
  });

  it("should stay clean when the browser is there", () => {
    expect(
      preflightFindings("chart-native", {
        env: ALL_SET,
        resolveDep: resolves,
        probeBrowser: browserReady,
      }),
    ).toEqual([]);
  });

  it("should not probe the browser for an engine that does not render video", () => {
    // scrolly's criticalDeps carry react+vite, no remotion: a missing headless shell is not
    // its problem, and reporting it would send a journalist to fix an unrelated install.
    expect(
      preflightFindings("scrolly", {
        env: ALL_SET,
        resolveDep: resolves,
        probeBrowser: browserMissing,
      }),
    ).toEqual([]);
  });

  it("should say `bun install` rather than the browser when remotion itself is missing", () => {
    // One instruction at a time: an unresolved package is fixed by an install, and the browser
    // question cannot even be asked meaningfully until the package it belongs to is there.
    const findings = preflightFindings("chart-native", {
      env: ALL_SET,
      resolveDep: neverResolves,
      probeBrowser: browserMissing,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("bun install");
    expect(findings[0].message).not.toContain("remotion browser ensure");
  });

  it("should be red on a missing browser — an install problem, not a key problem", () => {
    const s = enginePreflightStatus("chart-native", {
      env: ALL_SET,
      resolveDep: resolves,
      probeBrowser: browserMissing,
      now: "2026-07-27T12:00:00Z",
    });
    expect(s.status).toBe("red");
    expect(s.reason).toContain("remotion browser ensure");
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

// Single source of truth with the installer: every env var the manifest (or the embed
// delivery form) names must be one the installer's configurator actually writes.
describe("installer parity", () => {
  it("should only require env vars the setup page actually writes", () => {
    // Every field the capability registry declares, filled in: what the setup page would write
    // for a newsroom that configured everything. The MapTiler mirror is the serializer's job,
    // which is precisely why this parity is asserted against it rather than against a list.
    const credentials: Record<string, string> = {};
    for (const cap of Object.values(NEWSROOM_CAPABILITIES))
      for (const field of cap.settingsFields ?? [])
        credentials[field.name] = "x";
    const writtenNames = new Set(
      Object.keys(
        envUpdates({
          runtime: "claude",
          uiLang: "en",
          anthropic: "x",
          enabled: [],
          credentials,
        }),
      ),
    );
    const required = new Set<string>(EMBED_DELIVERY_ENV);
    for (const req of Object.values(ENGINE_REQUIREMENTS))
      for (const group of req.env) for (const name of group) required.add(name);
    for (const name of required) expect(writtenNames.has(name)).toBe(true);
  });
});

// C5 — image-native's readiness manifest: no env keys (prep + build are local; the
// scrolly host's own entry already guards its key), sharp is the critical dep (the
// native binary Tom's crash class is made of).
describe("preflightFindings — image-native (C5)", () => {
  it("should be clean when sharp resolves (no env required)", () => {
    expect(
      preflightFindings("image-native", { env: {}, resolveDep: resolves }),
    ).toEqual([]);
  });

  it("should flag deps when sharp does not resolve, pointing at bun install", () => {
    const findings = preflightFindings("image-native", {
      env: ALL_SET,
      resolveDep: neverResolves,
    });
    expect(findings.some((f) => f.kind === "deps")).toBe(true);
    expect(findings.find((f) => f.kind === "deps")!.message).toContain(
      "skills/image-native",
    );
  });
});
