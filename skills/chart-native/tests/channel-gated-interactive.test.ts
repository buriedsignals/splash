// Channel-gating lock (fix/channel-gated-produce, feedback→système): a produce run on a
// SOCIAL channel (social-vertical / social-feed) must NOT build the interactive output.
// Those channels' allowedFormats are [static, video] — no "interactive" — so shipping an
// interactive.html / interactive.png byproduct next to a social deliverable is a bug
// (confirmed: a social-vertical video case dropped both as byproducts). This locks two
// facts so a future edit can't silently re-introduce the over-produce:
//   1. SEMANTIC: channel.ts forbids interactive on the social channels, allows it on
//      article-web — the invariant the producer's gate reads.
//   2. STRUCTURAL: produce.mjs only ever runs the interactive Vite build (INTERACTIVE:"1")
//      inside an `if (interactiveAllowed)` block, where interactiveAllowed derives from
//      isFormatAllowed(channel, "interactive"). Strip every guarded block and the
//      interactive build must vanish from the remainder.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isFormatAllowed } from "../../atelier/src/channel";

const PRODUCE = join(import.meta.dir, "..", "scripts", "produce.mjs");

// Remove every `if (interactiveAllowed) { ... }` block (balanced-brace match) so what
// remains is the code that runs on EVERY channel. The interactive Vite build must not
// survive this strip — if it does, it runs unconditionally (the over-produce bug).
function stripGuardedBlocks(source: string): string {
  const GUARD = "if (interactiveAllowed) {";
  let out = source;
  for (;;) {
    const start = out.indexOf(GUARD);
    if (start === -1) break;
    // Walk from the guard's opening brace, counting braces to its balanced close.
    let depth = 0;
    let i = start + GUARD.length - 1; // index of the opening `{`
    let end = -1;
    for (; i < out.length; i++) {
      if (out[i] === "{") depth++;
      else if (out[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) throw new Error("unbalanced if (interactiveAllowed) block");
    out = out.slice(0, start) + out.slice(end + 1);
  }
  return out;
}

describe("channel-gated interactive: social channels forbid the interactive format", () => {
  it("channel.ts forbids interactive on the social channels and allows it on article-web", () => {
    expect(isFormatAllowed("social-vertical", "interactive")).toBe(false);
    expect(isFormatAllowed("social-feed", "interactive")).toBe(false);
    expect(isFormatAllowed("article-web", "interactive")).toBe(true);
  });
});

describe("channel-gated interactive: chart-native produce.mjs guards the interactive build", () => {
  const source = readFileSync(PRODUCE, "utf-8");

  it("imports isFormatAllowed and derives interactiveAllowed from the channel", () => {
    expect(source).toMatch(
      /import\s*\{[^}]*\bisFormatAllowed\b[^}]*\}\s*from\s*["'][^"']*channel(\.ts)?["']/,
    );
    expect(source).toMatch(
      /const\s+interactiveAllowed\s*=\s*isFormatAllowed\(\s*channel\s*,\s*["']interactive["']\s*\)/,
    );
  });

  it("only runs the interactive Vite build inside an if (interactiveAllowed) block", () => {
    // Sanity: the real source DOES build interactive (guarded).
    expect(source).toContain('INTERACTIVE: "1"');
    // After removing every guarded block, the interactive build must be gone.
    const stripped = stripGuardedBlocks(source);
    expect(stripped).not.toContain('INTERACTIVE: "1"');
  });

  it("is non-vacuous: an unguarded interactive build survives the strip and fails", () => {
    // Simulate the over-produce bug: move the interactive build out of its guard so it
    // runs unconditionally. The strip must now leave it behind.
    const broken = source.replace(
      /if \(interactiveAllowed\) \{\n  run\("bunx", \["vite", "build"\], \{ INTERACTIVE: "1" \}\);/,
      'run("bunx", ["vite", "build"], { INTERACTIVE: "1" });\nif (interactiveAllowed) {',
    );
    expect(broken).not.toBe(source); // the replace matched
    expect(stripGuardedBlocks(broken)).toContain('INTERACTIVE: "1"');
  });
});
