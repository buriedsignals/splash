import { test, expect } from "bun:test";

test("splash agent module exports a default agent definition", async () => {
  const mod = await import("../src/agents/splash.ts");
  expect(mod.default).toBeDefined();
  // defineAgent@1.0.0-beta.9 returns an opaque AgentDefinition object
  // (`{ __flueAgentDefinition: true, initialize(...) }`), not a callable
  // factory — verified against the installed @flue/runtime types.
  expect(typeof mod.default).toBe("object");
  expect(
    (mod.default as { __flueAgentDefinition?: true }).__flueAgentDefinition,
  ).toBe(true);
});

test("model id comes from SPLASH_FLUE_MODEL and is never hardcoded", async () => {
  const src = await Bun.file(
    new URL("../src/agents/splash.ts", import.meta.url),
  ).text();
  expect(src).toContain("SPLASH_FLUE_MODEL");
  // Must be a default via `??`, not a literal assignment (`= 'local/apertus-8b';`).
  expect(src).not.toMatch(/=\s*['"]local\/apertus-8b['"]\s*;/);
});
