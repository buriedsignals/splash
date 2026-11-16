import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { errorText } from "../craft/_shared/guards.mjs";

// gx-small-multiples web, Qwen3.5-9B (gx-small-multiples-web-seeded-osaurus-qwen-1794849434087): codes from "code",
// rows filtered on "entity", so every series was empty; the refusal was only "undefined is not an object
// (evaluating 'p.series[p.series.length - 1].value')", with no line.
async function loadError(body: string) {
  const dir = mkdtempSync(join(tmpdir(), "splash-empty-"));
  writeFileSync(join(dir, "beat.mjs"), `const rows = [["Austria", "AUT"]];\nconst panels = ["AUT"].map((code) => ({ series: rows.filter((r) => r[0] === code) }));\n${body}\nexport default {};\n`);
  try {
    await import(join(dir, "beat.mjs"));
  } catch (e) {
    return errorText(e);
  }
  throw new Error("beat.mjs loaded");
}

describe("a read of the last element of an empty array in beat.mjs", () => {
  it("should name the array as empty", async () => {
    expect(await loadError("const last = panels.map((p) => p.series[p.series.length - 1].value);")).toContain("p.series is empty");
  });
  it("should name the beat.mjs line and its text", async () => {
    expect(await loadError("const last = panels.map((p) => p.series[p.series.length - 1].value);")).toContain('beat.mjs line 3: "const last');
  });
  it("should name the first element read the same way", async () => {
    expect(await loadError("const first = panels.map((p) => p.series[0].value);")).toContain("p.series is empty");
  });
});

describe("any other TypeError thrown by beat.mjs", () => {
  it("should name the beat.mjs line", async () => {
    expect(await loadError("const n = panels[0].missing.length;")).toContain("beat.mjs line 3");
  });
});

describe("an error thrown in render-beat.mjs", () => {
  it("should not be attributed to beat.mjs", async () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-render-"));
    writeFileSync(join(dir, "render-beat.mjs"), "\nconst a = undefined;\nexport const n = a.b;\n");
    let text = "";
    try {
      await import(join(dir, "render-beat.mjs"));
    } catch (e) {
      text = errorText(e);
    }
    expect(text).not.toContain("beat.mjs line");
  });
});
