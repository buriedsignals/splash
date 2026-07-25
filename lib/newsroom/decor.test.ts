import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decorEnv, loadDecor } from "./decor";
import { LEGACY_RUNTIME_FILE } from "./migrate-decor";
import { NEWSROOM_STATE_FILE } from "./state";

function dir(): string {
  return mkdtempSync(join(tmpdir(), "decor-"));
}

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
    const decor = loadDecor(d);
    expect(decor.state.uiLang).toBe("de");
    expect(decor.language.ui).toBe("de");
    expect(decor.readiness.find((r) => r.id === "dw-chart")?.status).toBe(
      "missing",
    );
  });

  it("runs the legacy migration once, on first read", () => {
    const d = dir();
    writeFileSync(join(d, LEGACY_RUNTIME_FILE), "goose\n");
    expect(loadDecor(d).state.runtime).toBe("goose");
    expect(existsSync(join(d, LEGACY_RUNTIME_FILE))).toBe(false);
    expect(existsSync(join(d, NEWSROOM_STATE_FILE))).toBe(true);
    // Second read touches nothing and answers the same.
    expect(loadDecor(d).state.runtime).toBe("goose");
  });

  it("answers on a bare directory instead of throwing", () => {
    const decor = loadDecor(dir());
    expect(decor.state.uiLang).toBe("en");
    expect(decor.language).toEqual({ ui: "en", content: "en" });
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
    const decor = loadDecor(d);
    expect(decor.language).toEqual({ ui: "en", content: "fr" });
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
