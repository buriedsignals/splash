import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  decorEnv,
  installRoot,
  loadDecor,
  readDecorState,
  tryLoadDecor,
} from "./decor";
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
  // install is fine. The key-free capabilities are enabled (and usable) — the two engines and
  // zip, the universal delivery fallback, both need nothing from .env; the rest are honestly
  // not enabled, which readiness reports as `disabled` — never as a silent `ready`.
  it("enables only the key-free capabilities when nothing is configured at all", () => {
    const decor = loadDecor(dir(), NO_ENV);
    const enabled = Object.entries(decor.state.capabilities)
      .filter(([, c]) => c.enabled)
      .map(([id]) => id)
      .sort();
    expect(enabled).toEqual(["chart-native", "image-native", "zip"]);
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
    // A FRESH install (no state file yet) still resolves `ui` to "en" — only `content`
    // follows the profile's `lang:`. A migrated FR install keeps FR for both; that boundary
    // lives in the migration path, not here.
    expect(decor.language).toEqual({ ui: "en", content: "fr" });
  });

  it("the decor carries the house theme so the offer can judge what is renderable", () => {
    const d = dir();
    writeFileSync(
      join(d, "NEWSROOM-PROFILE.md"),
      ["---", 'theme: "#12233A"', "---", "", "# guide", ""].join("\n"),
    );
    const decor = loadDecor(d, NO_ENV);
    expect(decor.theme).toBe("#12233A");
  });

  it("an install with no profile has no theme, not a fabricated light one", () => {
    expect(loadDecor(dir(), NO_ENV).theme).toBeUndefined();
  });

  it("fills the credit template's {name} from the profile source", () => {
    const d = dir();
    writeFileSync(
      join(d, "NEWSROOM-PROFILE.md"),
      [
        "---",
        'credit: "Graphique : {name}"',
        "source:",
        '  name: "A Newsroom"',
        "---",
        "",
        "# guide",
        "",
      ].join("\n"),
    );
    expect(loadDecor(d, NO_ENV).profile.credit).toBe("Graphique : A Newsroom");
  });

  // A1: the substituted VALUE is nobody's business downstream — metadata.ts only trims, and
  // snippet.ts's brace guard reads the template, never what was put in it. An unfillable
  // template therefore used to reach metadata.json verbatim, and a reader saw "{name}".
  // Dropping it lands on the documented empty-credit state: "empty = derived from lang by the
  // producer" (brand-profile.ts:27), which is what a newsroom that declared no credit gets.
  it("drops a credit it cannot fill rather than shipping the template", () => {
    const d = dir();
    writeFileSync(
      join(d, "NEWSROOM-PROFILE.md"),
      ["---", 'credit: "Graphique : {name}"', "---", "", "# guide", ""].join(
        "\n",
      ),
    );
    expect(loadDecor(d, NO_ENV).profile.credit).toBeUndefined();
  });

  it("reads .env from the install root, with the process environment winning", () => {
    const d = dir();
    writeFileSync(join(d, ".env"), 'DATAWRAPPER_API_TOKEN="from-file"\n');
    // The ambient value is REMOVED first and restored after: a shell that sourced the real
    // .env (install/runtimes/*.sh does, before launching the agent) already carries this
    // exact variable, and it would win over the file — turning the first assertion red on a
    // real machine while staying green in CI. Same hazard the injected env closes elsewhere
    // in this file; here the seam under test IS the ambient merge, so it is staged instead.
    const ambient = process.env.DATAWRAPPER_API_TOKEN;
    try {
      delete process.env.DATAWRAPPER_API_TOKEN;
      expect(decorEnv(d).DATAWRAPPER_API_TOKEN).toBe("from-file");
      process.env.DATAWRAPPER_API_TOKEN = "from-process";
      expect(decorEnv(d).DATAWRAPPER_API_TOKEN).toBe("from-process");
    } finally {
      if (ambient === undefined) delete process.env.DATAWRAPPER_API_TOKEN;
      else process.env.DATAWRAPPER_API_TOKEN = ambient;
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

  // A4: the docstring promised "NOTHING is written" while the profile loader cached its parse
  // to brand.json on EVERY call — a read-only entry point dropping a file into an untrusted
  // path, which is the whole reason the explicit dir exists. The cache belongs to the install's
  // own root, where `loadDecor()` is allowed to persist; here the same profile is derived.
  it("derives the newsroom profile without dropping its cache in", () => {
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
    expect(decor.profile.source).toBe("A Newsroom"); // derived…
    expect(decor.language.content).toBe("fr");
    expect(readdirSync(d)).toEqual(["NEWSROOM-PROFILE.md"]); // …never cached
  });

  it("reads the brand.json cache when that is all the install has", () => {
    const d = dir();
    writeFileSync(
      join(d, "brand.json"),
      JSON.stringify({ palette: [], source: { name: "Cached Newsroom" } }),
    );
    expect(loadDecor(d, NO_ENV).profile.source).toBe("Cached Newsroom");
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
// every invocation). They no longer have writers (A3 retired the last one). The absorption
// must still not delete them: only the setup page does that, once it has written the decor
// they folded into.
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

  // The shape the driver actually defaults to: `tryLoadDecor()` called bare, resolving
  // `loadDecor()` at its own default (no `dir`). That default reads `installRoot()` — this
  // checkout's own root — so calling it bare here would make `bun test` depend on (and, on a
  // machine carrying a legacy `.splash-runtime` with no `newsroom.json` yet, migrate) the
  // real install. A neutral temp root stands in for it instead; the resolver function is the
  // one piece under test, not the real filesystem it would otherwise touch.
  it("resolves without throwing, the shape the driver actually defaults to", () => {
    const d = dir();
    expect(() => tryLoadDecor(() => loadDecor(d, NO_ENV))).not.toThrow();
    expect(tryLoadDecor(() => loadDecor(d, NO_ENV)).root).toBe(d);
  });
});

// P1 parked finding #3: the skill path (`export-code.mjs`) read `readNewsroomState(root).uiLang`
// straight, so a legacy FRENCH install printed ENGLISH until something happened to call
// `loadDecor` — the migration never fired on that path. It cannot simply call `loadDecor()`
// either: that WRITES newsroom.json, and an export script must not create state as a side
// effect. `readDecorState` is the read-only derivation, which is all a language lookup needs.
describe("readDecorState — the migration-aware read that writes nothing", () => {
  it("keeps a legacy FRENCH install in French, without creating newsroom.json", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    writeFileSync(
      join(d, "NEWSROOM-PROFILE.md"),
      ["---", 'lang: "fr"', "---", "", "# guide", ""].join("\n"),
    );
    const before = readdirSync(d).sort();

    const state = readDecorState(d, {});

    expect(state.uiLang).toBe("fr");
    expect(state.runtime).toBe("goose");
    expect(readdirSync(d).sort()).toEqual(before);
    expect(existsSync(join(d, NEWSROOM_STATE_FILE))).toBe(false);
  });

  it("prefers a saved state over the legacy files", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    writeFileSync(
      join(d, NEWSROOM_STATE_FILE),
      JSON.stringify({
        schemaVersion: 1,
        runtime: "codex",
        uiLang: "it",
        capabilities: {},
      }),
    );
    expect(readDecorState(d, {}).uiLang).toBe("it");
    expect(readDecorState(d, {}).runtime).toBe("codex");
  });

  it("answers English on a bare directory — the fresh-install default (#6)", () => {
    expect(readDecorState(dir(), {}).uiLang).toBe("en");
  });
});
