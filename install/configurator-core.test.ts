import { test, expect } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { RUNTIMES } from "./configurator-core.ts";

test("the four CLI runtimes are verified (codex proven; gemini + goose enabled by decision)", () => {
  expect(RUNTIMES.claude.verified).toBe(true);
  expect(RUNTIMES.codex.verified).toBe(true); // proven end-to-end 2026-07-13 (discovery + nested skill invocation)
  expect(RUNTIMES.gemini.verified).toBe(true); // enabled by decision; Layer A proven, Layer B pending a paid tier
  expect(RUNTIMES.goose.verified).toBe(true); // enabled by decision; Layer A proven + drove the flow, Layer B cut by Gemini quota
});

test("goose-desktop is registered but NOT yet verified — Layer B is unproven", () => {
  expect(RUNTIMES["goose-desktop"]).toBeDefined();
  expect(RUNTIMES["goose-desktop"]!.label).toBe("Goose Desktop");
  // Flipped to true ONLY once a visual comes out of the app — see docs/installer/
  // goose-desktop-proof.md. A product decision is not a proof, and this project already carries
  // two runtimes marked verified by decision rather than by evidence.
  expect(RUNTIMES["goose-desktop"]!.verified).toBe(false);
});

// The setup page dispatches on the key: bootstrap.sh sources install/runtimes/<key>.sh. A key with
// no module behind it selects an install that dies at the dispatch, and nothing else would catch it.
test("every registered runtime key has a module file of the same name", () => {
  for (const key of Object.keys(RUNTIMES)) {
    expect({
      key,
      module: existsSync(join(import.meta.dir, "runtimes", `${key}.sh`)),
    }).toEqual({ key, module: true });
  }
});
