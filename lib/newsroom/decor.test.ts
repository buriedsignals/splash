import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decorEnv, installRoot, loadDecor, tryLoadDecor } from "./decor";
import { LEGACY_PREFLIGHT_FILE, LEGACY_RUNTIME_FILE } from "./migrate-decor";
import { NEWSROOM_STATE_FILE } from "./state";

function dir(): string {
  return mkdtempSync(join(tmpdir(), "decor-"));
}

// The readiness environment is INJECTED in these tests. Ambient process.env is not neutral
// here: install/runtimes/*.sh source the install's .env before launching the agent, so a
// shell that did would otherwise flip "missing" to "ready" and turn these assertions red on
// a real machine while staying green in CI.
const NO_ENV = { env: {} };

describe("loading the decor", () => {
  it("reads the saved state, its language and its readiness", () => {
    const d = dir();
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({
        schemaVersion: 1,
        runtime: "claude",
        uiLang: "de",
        capabilities: { "dw-chart": { enabled: true } },
      }),
    );
    const decor = loadDecor(d, NO_ENV);
    expect(decor.state.uiLang).toBe("de");
    expect(decor.language.ui).toBe("de");
    expect(decor.readiness.find((r) => r.id === "dw-chart")?.status).toBe(
      "missing",
    );
  });

  it("derives the legacy state on first read", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    expect(loadDecor(d, NO_ENV).state.runtime).toBe("goose");
    // Second read answers the same.
    expect(loadDecor(d, NO_ENV).state.runtime).toBe("goose");
  });

  it("answers on a bare directory instead of throwing", () => {
    const decor = loadDecor(dir(), NO_ENV);
    expect(decor.state.uiLang).toBe("en");
    expect(decor.language).toEqual({ ui: "en", content: "en" });
  });

  // C1: an install with a populated .env but no state file and no legacy file — a fresh
  // clone, a hand-written .env, or any install after P2 stops writing the legacy files.
  // It used to fall through to bare defaults: every capability disabled, every reason empty,
  // `blockers: []` while nothing was usable. The enablement default is what .env allows.
  it("enables what a FRESH install already has keys for, with no legacy file in sight", () => {
    const d = dir();
    writeFileSync(join(d, ".env"), 'DATAWRAPPER_API_TOKEN="dw-token"\n');
    const decor = loadDecor(d, { env: { DATAWRAPPER_API_TOKEN: "dw-token" } });
    expect(decor.state.capabilities["dw-chart"]?.enabled).toBe(true);
    expect(decor.readiness.find((r) => r.id === "dw-chart")?.status).toBe(
      "ready",
    );
    // A key-free engine is enabled too; a capability whose key is absent is not.
    expect(decor.state.capabilities["chart-native"]?.enabled).toBe(true);
    expect(decor.state.capabilities["map-native"]?.enabled).toBe(false);
    // And a capability only DECLARED is never enabled by anyone's keys.
    expect(decor.state.capabilities["embed-cms"]?.enabled).toBe(false);
  });

  // The other half of C1: with NO key anywhere, the fresh default must still not claim the
  // install is fine. The key-free engines are enabled (and usable); the rest are honestly
  // not enabled, which readiness reports as `disabled` — never as a silent `ready`.
  it("enables only the key-free engines when nothing is configured at all", () => {
    const decor = loadDecor(dir(), NO_ENV);
    const enabled = Object.entries(decor.state.capabilities)
      .filter(([, c]) => c.enabled)
      .map(([id]) => id)
      .sort();
    expect(enabled).toEqual(["chart-native", "image-native"]);
    expect(decor.readiness.find((r) => r.id === "dw-chart")?.status).toBe(
      "disabled",
    );
  });

  it("takes the deliverable language from the newsroom profile", () => {
    const d = dir();
    writeFileSync(
      join(d, "NEWSROOM-PROFILE.md"),
      [
        "---",
        'lang: "fr"',
        "source:",
        '  name: "A Newsroom"',
        "---",
        "",
        "# guide",
        "",
      ].join("\n"),
    );
    const decor = loadDecor(d, NO_ENV);
    expect(decor.language.content).toBe("fr");
  });

  it("reads .env from the install root, with the process environment winning", () => {
    const d = dir();
    writeFileSync(join(d, ".env"), 'DATAWRAPPER_API_TOKEN="from-file"\n');
    expect(decorEnv(d).DATAWRAPPER_API_TOKEN).toBe("from-file");
    process.env.DATAWRAPPER_API_TOKEN = "from-process";
    try {
      expect(decorEnv(d).DATAWRAPPER_API_TOKEN).toBe("from-process");
    } finally {
      delete process.env.DATAWRAPPER_API_TOKEN;
    }
  });
});

// I2: `loadDecor(dir)` is reachable from the host façade (`splash newsroom --dir <anything>`),
// where every argument is untrusted. It used to mkdir and write into whatever path it was
// handed. An explicit dir is now a pure read.
describe("an explicit directory is READ-ONLY", () => {
  it("writes nothing into a directory it was handed", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    const decor = loadDecor(d, NO_ENV);
    expect(decor.state.runtime).toBe("goose"); // derived…
    expect(existsSync(join(d, NEWSROOM_STATE_FILE))).toBe(false); // …never persisted
    expect(readdirSync(d)).toEqual([LEGACY_RUNTIME_FILE]);
  });

  it("does not create the directory it was pointed at", () => {
    const target = join(dir(), "does", "not", "exist");
    expect(loadDecor(target, NO_ENV).root).toBe(target);
    expect(existsSync(target)).toBe(false);
  });

  it("resolves the install root when given no directory at all", () => {
    expect(loadDecor(undefined, NO_ENV).root).toBe(installRoot());
  });
});

// C2: the legacy files still have live readers (install/bootstrap.sh reads .splash-runtime on
// every invocation) and live writers (install/configurator.ts, preflight.mjs). P1 absorbs
// them; P2 removes them, with their writers.
describe("the legacy files survive the absorption", () => {
  it("leaves .splash-runtime and .splash-preflight.json in place", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "codex\n");
    writeFileSync(join(d, LEGACY_PREFLIGHT_FILE), JSON.stringify({}));
    loadDecor(d, NO_ENV);
    expect(existsSync(join(d, LEGACY_RUNTIME_FILE))).toBe(true);
    expect(existsSync(join(d, LEGACY_PREFLIGHT_FILE))).toBe(true);
  });
});

// I3: the loop never throws, and `advance(run, dir)` resolves its decor in a DEFAULT
// PARAMETER — evaluated before the body, so a throw there escapes every bounded-failure path
// the driver owns.
describe("tryLoadDecor", () => {
  it("yields a neutral decor when the resolution fails, instead of throwing", () => {
    const decor = tryLoadDecor(() => {
      throw new Error("EROFS: read-only file system, mkdir '/Splash'");
    });
    expect(decor.readiness).toEqual([]);
    expect(decor.state.capabilities).toEqual({});
    expect(decor.language).toEqual({ ui: "en", content: "en" });
  });

  it("returns the real decor when the resolution succeeds", () => {
    const d = dir();
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({
        schemaVersion: 1,
        runtime: "goose",
        uiLang: "it",
        capabilities: {},
      }),
    );
    expect(tryLoadDecor(() => loadDecor(d, NO_ENV)).state.runtime).toBe(
      "goose",
    );
  });

  it("resolves this install without throwing, the shape the driver actually defaults to", () => {
    expect(() => tryLoadDecor()).not.toThrow();
    expect(tryLoadDecor().root).toBe(installRoot());
  });
});
