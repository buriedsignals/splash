// A component test can never see a MISSING call site — map-frame-locale.test.tsx "proves" the
// credit renders by passing the prop itself. This is a source scan, because the defect is
// structural: MapFrame is rendered somewhere that does not hand it the credit.
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "..", "src");

function tsxFilesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith(".tsx"))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

describe("every MapFrame call site passes the geo credit", () => {
  const files = tsxFilesUnder(SRC).filter((f) => !f.endsWith(".test.tsx"));
  const callers = files.filter(
    (f) =>
      /<MapFrame[\s>]/.test(readFileSync(f, "utf8")) &&
      !f.endsWith("MapFrame.tsx"),
  );

  it("should find MapFrame call sites at all (an empty scan must never pass)", () => {
    expect(callers.length).toBeGreaterThanOrEqual(4);
  });

  for (const f of callers) {
    it(`should pass geoCredit in ${f.split("/").pop()}`, () => {
      expect(readFileSync(f, "utf8")).toMatch(/geoCredit=\{/);
    });
  }
});
