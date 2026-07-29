import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { scrollySpecErrors } from "./manifest";

describe("the scrolly CLI does not bypass the validator", () => {
  // Measured twice (spec C §5 D27-d and the chore/motion-narrative-grid grid pass): an
  // `arcBeats` pushed through `bun scripts/produce.mjs` was accepted and then silently
  // dropped — none of the three authored sentences reached the page, the salience walk
  // shipped instead. The rule was never missing: mapNativeConfigErrors validates arcBeats
  // (validate-config.ts:216, :352) and the five incapable types refuse it BY NAME (:411,
  // :499, :623, :742, :875). Only this entry point never asked.
  it("should refuse an arcBeats plan on a type that cannot carry one", () => {
    const errors = scrollySpecErrors({
      type: "route",
      title: "T",
      altInsight: "alt",
      source: { name: "S" },
      arcBeats: [{ region: "FR", role: "context", text: "x" }],
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(" ")).toContain("arcBeats");
  });

  it("should be the function the CLI calls, not a copy", () => {
    const cli = readFileSync(
      join(import.meta.dir, "..", "scripts", "produce.mjs"),
      "utf8",
    );
    expect(cli).toContain("scrollySpecErrors");
    // and it must run BEFORE the vite build, not after
    expect(cli.indexOf("scrollySpecErrors")).toBeLessThan(
      cli.indexOf('"vite", "build"'),
    );
  });
});
