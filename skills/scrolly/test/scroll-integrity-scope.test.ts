import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  SCOPE_ENV_VAR,
  scopedBeatDir,
  scrolliesUnder,
} from "../scripts/scroll-integrity-scope.mjs";

/**
 * SCOPE_ENV_VAR SCOPES scroll-integrity.test.ts TO ONE BEAT.
 *
 * A synthetic `proof/`-shaped tree with three fake beats, two carrying real scrolly markup and one not —
 * proves `scrolliesUnder` sweeps every beat by default and only the named one when `scopedBeatDir` resolves
 * an env var, and that an unknown beat name refuses loudly rather than silently falling back to the full
 * sweep.
 */

const SCROLLY_HTML =
  '<html><body><div class="scrolly"><div class="scrolly-track"></div></div></body></html>';
const PLAIN_HTML = "<html><body>not a scrolly</body></html>";

const ROOT = mkdtempSync(join(tmpdir(), "scroll-integrity-scope-"));
const PROOF = join(ROOT, "proof");

beforeAll(() => {
  for (const [beat, sub, html] of [
    ["beat-a", "render", SCROLLY_HTML],
    ["beat-b", "renders", SCROLLY_HTML],
    ["beat-c", "render", PLAIN_HTML],
  ] as const) {
    const dir = join(PROOF, beat, sub);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "page.html"), html);
  }
});
afterAll(() => rmSync(ROOT, { recursive: true, force: true }));

describe("scopedBeatDir", () => {
  it("should return null when the env var is unset — the unscoped default", () => {
    expect(scopedBeatDir(PROOF, {})).toBeNull();
  });

  it("should resolve a bare beat name under the proof directory", () => {
    expect(scopedBeatDir(PROOF, { [SCOPE_ENV_VAR]: "beat-a" })).toBe(
      join(PROOF, "beat-a"),
    );
  });

  it("should refuse an unknown beat name by naming the env var and the value read", () => {
    expect(() =>
      scopedBeatDir(PROOF, { [SCOPE_ENV_VAR]: "beat-does-not-exist" }),
    ).toThrow(SCOPE_ENV_VAR);
    expect(() =>
      scopedBeatDir(PROOF, { [SCOPE_ENV_VAR]: "beat-does-not-exist" }),
    ).toThrow(/beat-does-not-exist/);
  });
});

describe("scrolliesUnder", () => {
  it("should sweep every beat's own scrolly render when no beat is scoped", () => {
    const files = scrolliesUnder(PROOF, null);
    expect(files).toEqual([
      join(PROOF, "beat-a", "render", "page.html"),
      join(PROOF, "beat-b", "renders", "page.html"),
    ]);
  });

  it("should sweep only the scoped beat's own render, not the others", () => {
    const files = scrolliesUnder(PROOF, join(PROOF, "beat-a"));
    expect(files).toEqual([join(PROOF, "beat-a", "render", "page.html")]);
  });

  it("should skip a page whose markup is not a scrolly, scoped or not", () => {
    expect(scrolliesUnder(PROOF, join(PROOF, "beat-c"))).toEqual([]);
  });
});
