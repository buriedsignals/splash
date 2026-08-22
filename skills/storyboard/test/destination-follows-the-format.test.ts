import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mutateStoryboard } from "../scripts/storyboard.mjs";

// A `destination` — screen or print — is a fact about a STATIC beat and about nothing else. A beat
// that was static and is now web carries an answer to a question its format no longer asks, and a
// stale answer nobody wrote is a stale answer whether or not a gate refuses it loudly.
function storyboardWith(fields: string): string {
  const dir = mkdtempSync(join(tmpdir(), "sb-"));
  const path = join(dir, "STORYBOARD.md");
  writeFileSync(
    path,
    `---\nlanguage: "en"\nslots:\n  - id: 1\n    medium: chart\n${fields}\n---\n\nprose\n`,
  );
  return path;
}

describe("a format change and the destination it unsays", () => {
  it("should clear a recorded destination when the format changes", async () => {
    const path = storyboardWith('    format: static\n    destination: print');
    await mutateStoryboard(path, { slot: { id: 1, fields: { format: "web" } } });
    expect(readFileSync(path, "utf8")).not.toContain("destination: print");
  });

  it("should leave a destination alone when the format is not touched", async () => {
    const path = storyboardWith('    format: static\n    destination: print');
    await mutateStoryboard(path, { slot: { id: 1, fields: { chosen: "Slope" } } });
    expect(readFileSync(path, "utf8")).toContain("destination: print");
  });

  it("should refuse to record a format and a destination in one call", async () => {
    const path = storyboardWith("    format: static");
    await expect(
      mutateStoryboard(path, { slot: { id: 1, fields: { format: "static", destination: "print" } } }),
    ).rejects.toThrow(/gate 2c separately/);
  });
});
