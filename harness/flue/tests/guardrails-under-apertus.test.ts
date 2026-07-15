import { test, expect } from "bun:test";
import { resolve } from "node:path";
import { HARNESS_ROOT } from "../src/lib/roles.ts";

// Import the REAL existing validator the producers already run.
const { isFormatAllowed } = await import(
  resolve(HARNESS_ROOT, "skills/splash/src/channel.ts")
);

test("a disallowed channel×format decision is rejected fail-hard regardless of which model proposed it", () => {
  // social-vertical must never be interactive (existing rule). If Apertus proposes it, the code stops it.
  expect(isFormatAllowed("social-vertical", "interactive")).toBe(false);
  expect(isFormatAllowed("article-web", "static")).toBe(true);
});
