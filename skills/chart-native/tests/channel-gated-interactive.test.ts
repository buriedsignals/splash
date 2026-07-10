// Channel-gating lock (fix/channel-gated-produce, feedback→système; re-shaped for the
// single-format-produce-export redesign — produce.mjs now dispatches on a `switch
// (format)` rather than always attempting both static+interactive): a produce run
// requesting the "interactive" format on a SOCIAL channel (social-vertical /
// social-feed) must NOT build the interactive output. Those channels' allowedFormats
// are [static, video] — no "interactive" — so shipping an interactive.html /
// interactive.png byproduct next to a social deliverable is a bug (confirmed: a
// social-vertical video case dropped both as byproducts). This locks two facts so a
// future edit can't silently re-introduce the over-produce:
//   1. SEMANTIC: channel.ts forbids interactive on the social channels, allows it on
//      article-web — the invariant the producer's gate reads.
//   2. STRUCTURAL: produce.mjs only ever runs the interactive Vite build
//      (run("bunx", ["vite", "build"], { INTERACTIVE: "1" })) inside an
//      `if (interactiveAllowed)` block, where interactiveAllowed derives from
//      isFormatAllowed(channel, "interactive"). Strip every guarded block and the
//      interactive build must vanish from the remainder. The match is on the full
//      call shape (not a bare `INTERACTIVE: "1"` substring) because
//      `SKIP_INTERACTIVE: "1"` (the static case's snap-proof env, unrelated) contains
//      `INTERACTIVE: "1"` as a literal substring — a bare toContain would false-fail.
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isFormatAllowed } from "../../atelier/src/channel";

const PRODUCE = join(import.meta.dir, "..", "scripts", "produce.mjs");

// The real Vite-build-with-INTERACTIVE=1 call — the one line that must never run
// unconditionally. Whitespace-flexible so it matches regardless of indentation depth
// (the switch/case nesting shifts it, unlike the pre-refactor flat `if` block).
const BUILD_CALL_RE =
  /run\(\s*"bunx",\s*\["vite",\s*"build"\],\s*\{\s*INTERACTIVE:\s*"1"\s*\}\s*\);/;

// Remove every `if (interactiveAllowed) { ... }` block (balanced-brace match) so what
// remains is the code that runs on EVERY channel/format. The interactive Vite build
// must not survive this strip — if it does, it runs unconditionally (the over-produce
// bug).
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
    expect(source).toMatch(BUILD_CALL_RE);
    // After removing every guarded block, the interactive build must be gone.
    const stripped = stripGuardedBlocks(source);
    expect(stripped).not.toMatch(BUILD_CALL_RE);
  });

  it("is non-vacuous: an unguarded interactive build survives the strip and fails", () => {
    // Simulate the over-produce bug: append an UNGUARDED copy of the real vite-build
    // call outside any if (interactiveAllowed) block. The strip must leave it behind —
    // proving stripGuardedBlocks isn't vacuously stripping everything.
    const match = source.match(BUILD_CALL_RE);
    expect(match).not.toBeNull();
    const broken = `${source}\n${match![0]}\n`;
    expect(stripGuardedBlocks(broken)).toMatch(BUILD_CALL_RE);
  });
});
