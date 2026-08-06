import { test, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { RUNTIMES } from "./configurator-core.ts";

test("the four CLI runtimes are verified (codex proven; gemini + goose enabled by decision)", () => {
  expect(RUNTIMES.claude.verified).toBe(true);
  expect(RUNTIMES.codex.verified).toBe(true); // proven end-to-end 2026-07-13 (discovery + nested skill invocation)
  expect(RUNTIMES.gemini.verified).toBe(true); // enabled by decision; Layer A proven, Layer B pending a paid tier
  expect(RUNTIMES.goose.verified).toBe(true); // enabled by decision; Layer A proven + drove the flow, Layer B cut by Gemini quota
});

// The two runtimes a journalist can use WITHOUT a terminal — installed once, launched from the
// Dock. Enabled by decision, exactly as gemini and goose were: Layer A (the app discovers the
// skills) is measured on the shipped bundle, Layer B (a visual comes OUT of the app) is not.
test("the two desktop runtimes are selectable", () => {
  expect(RUNTIMES["goose-desktop"]!.verified).toBe(true);
  expect(RUNTIMES["claude-desktop"]!.verified).toBe(true);
});

// A flag is allowed to be raised on a decision rather than a proof — that is this project's
// convention — but never in silence. The motive lives beside the flag, and this reads the source
// as text to keep it there: the same method docs/installer/bootstrap-sh.test.ts uses on the
// install scripts.
test("every raised flag says why, right where it is raised", () => {
  const src = readFileSync(
    join(import.meta.dir, "configurator-core.ts"),
    "utf8",
  );
  const lines = src.split("\n");
  for (const [i, line] of lines.entries()) {
    if (!/verified:\s*true/.test(line)) continue;
    const preamble = lines.slice(Math.max(0, i - 12), i).join("\n");
    expect(
      /proven|decision/i.test(preamble),
      `verified: true at line ${i + 1} carries no stated motive`,
    ).toBe(true);
  }
});

// An Anthropic key is written to .env for whoever picked Goose, and Codex and Gemini have no
// path for their own. The login belongs to the runtime that uses it — including the runtimes
// that need none, which own their account (the two desktop apps) or their own config (Goose).
test("each runtime declares its own login, or none", () => {
  expect(RUNTIMES.claude!.login?.name).toBe("ANTHROPIC_API_KEY");
  expect(RUNTIMES.codex!.login?.name).toBe("OPENAI_API_KEY");
  expect(RUNTIMES.gemini!.login?.name).toBe("GEMINI_API_KEY");
  for (const id of ["goose", "goose-desktop", "claude-desktop"])
    expect(RUNTIMES[id]!.login).toBeUndefined();
  // Every declared login is optional today: all three runtimes also accept a subscription or an
  // interactive sign-in at first launch.
  for (const rt of Object.values(RUNTIMES))
    if (rt.login) expect(rt.login.optional).toBe(true);
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
