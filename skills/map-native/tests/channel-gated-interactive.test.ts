// Channel-gating lock (fix/channel-gated-produce, feedback→système; updated for the
// single-format-produce-export redesign): a produce run on a SOCIAL channel
// (social-vertical / social-feed) must NOT build the interactive output. Those
// channels' allowedFormats are [static, video] — no "interactive" — so shipping an
// interactive.html / interactive.png byproduct next to a social deliverable is a bug.
// This locks two facts so a future edit can't silently re-introduce the over-produce:
//   1. SEMANTIC: channel.ts forbids interactive on the social channels, allows it on
//      article-web — the invariant the producer's gate reads.
//   2. STRUCTURAL: produce.mjs's `case "interactive":` block opens with a fail-hard
//      guard clause (`if (!interactiveAllowed) { ...; process.exit(1); }`) BEFORE the
//      interactive Vite build (INTERACTIVE:"1") — not the pre-single-format shape
//      (a `if (interactiveAllowed) { ... }` wrapper). A future edit that hoists the
//      build above the guard (or drops the guard) must be caught.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isFormatAllowed } from "../../splash/src/channel";

const PRODUCE = join(import.meta.dir, "..", "scripts", "produce.mjs");

// Extracts the body of a `case "<name>": { ... }` block via balanced-brace matching
// (mirrors the pre-single-format stripGuardedBlocks's technique) — a textual, no-import
// probe of the real produce.mjs, same style as chart-native's video-render-size test.
function extractCase(source: string, caseName: string): string {
  const marker = `case "${caseName}": {`;
  const start = source.indexOf(marker);
  if (start === -1)
    throw new Error(`case "${caseName}" not found in produce.mjs`);
  let depth = 0;
  let i = start + marker.length - 1; // index of the opening `{`
  let end = -1;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) throw new Error(`unbalanced case "${caseName}" block`);
  return source.slice(start, end + 1);
}

const GUARD_RE =
  /if \(!interactiveAllowed\) \{[\s\S]*?process\.exit\(1\);\s*\}/;
const BUILD_LINE =
  'run("bunx", ["vite", "build"], { INTERACTIVE: "1", BUILD_OUT: interactiveDir });';

describe("channel-gated interactive: social channels forbid the interactive format", () => {
  it("channel.ts forbids interactive on the social channels and allows it on article-web", () => {
    expect(isFormatAllowed("social-vertical", "interactive")).toBe(false);
    expect(isFormatAllowed("social-feed", "interactive")).toBe(false);
    expect(isFormatAllowed("article-web", "interactive")).toBe(true);
  });
});

describe("channel-gated interactive: map-native produce.mjs guards the interactive build", () => {
  const source = readFileSync(PRODUCE, "utf-8");

  it("imports isFormatAllowed and derives interactiveAllowed from the channel", () => {
    expect(source).toMatch(
      /import\s*\{[^}]*\bisFormatAllowed\b[^}]*\}\s*from\s*["'][^"']*channel(\.ts)?["']/,
    );
    expect(source).toMatch(
      /const\s+interactiveAllowed\s*=\s*isFormatAllowed\(\s*channel\s*,\s*["']interactive["']\s*\)/,
    );
  });

  it('runs the interactive Vite build only AFTER a fail-hard "!interactiveAllowed" guard, inside case "interactive"', () => {
    const interactiveCase = extractCase(source, "interactive");
    const guardMatch = interactiveCase.match(GUARD_RE);
    expect(guardMatch).not.toBeNull();
    const buildIndex = interactiveCase.indexOf(BUILD_LINE);
    expect(buildIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeGreaterThan(
      guardMatch!.index! + guardMatch![0].length,
    );
  });

  it("is non-vacuous: hoisting the build above the guard is caught", () => {
    const interactiveCase = extractCase(source, "interactive");
    expect(interactiveCase).toContain(BUILD_LINE); // sanity: the real source has this line
    // Simulate the over-produce bug: move the interactive build ABOVE the guard so it
    // would run even when interactiveAllowed is false.
    const broken = BUILD_LINE + "\n" + interactiveCase.replace(BUILD_LINE, "");
    const guardMatch = broken.match(GUARD_RE);
    expect(guardMatch).not.toBeNull(); // the guard is still present in the broken copy
    const brokenBuildIndex = broken.indexOf(BUILD_LINE);
    expect(brokenBuildIndex).toBeLessThan(guardMatch!.index!); // now runs before the guard
  });
});
