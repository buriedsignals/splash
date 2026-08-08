// The root template vendors the craft mechanism (render-still.mjs, inspect-render.mjs) so a
// fresh Splash root is self-contained after install — see PROOF.md §1 and TRIAL-THREE-BEATS.md
// §4 ("the toolkit is not portable"). Vendoring means a physical copy, not a symlink (a symlink
// into this repository would break the moment the root template is copied anywhere else) or a
// workspace dependency (which would require the journalist's root to be a member of this
// repository's workspace, i.e. to have this repository checked out at all — exactly what the
// gap is about). A physical copy can drift silently from the skill's own canonical scripts if
// one is edited and the other is not. This test is the guard against that: it does not care what
// the content IS, only that the two copies AGREE.
import { describe, it, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const CANONICAL_DIR = join(
  import.meta.dirname,
  "..",
  "..",
  "twin-chart-beat",
  "scripts",
);
const VENDORED_DIR = join(
  import.meta.dirname,
  "..",
  "assets",
  "root-template",
  "shared",
  "twin-chart-beat",
);

describe("root-template/shared/twin-chart-beat — vendored copy stays byte-identical to the canonical scripts", () => {
  for (const name of ["render-still.mjs", "inspect-render.mjs"]) {
    it(`should match twin-chart-beat/scripts/${name} exactly`, async () => {
      const canonical = await readFile(join(CANONICAL_DIR, name), "utf8");
      const vendored = await readFile(join(VENDORED_DIR, name), "utf8");
      expect(vendored).toBe(canonical);
    });
  }
});

const LIVE_SHARED = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "shared",
  "twin-chart-beat",
);

describe("twin/shared — the repository's own live shared/, so proof stories import the way a real beat does", () => {
  for (const name of ["render-still.mjs", "inspect-render.mjs"]) {
    it(`should carry ${name}, byte-identical to the canonical script`, async () => {
      expect(existsSync(join(LIVE_SHARED, name))).toBe(true);
      const canonical = await readFile(join(CANONICAL_DIR, name), "utf8");
      const live = await readFile(join(LIVE_SHARED, name), "utf8");
      expect(live).toBe(canonical);
    });
  }

  it("should be reachable through the #shared specifier declared in package.json", async () => {
    const pkg = JSON.parse(
      await readFile(
        join(import.meta.dirname, "..", "..", "..", "package.json"),
        "utf8",
      ),
    );
    expect(pkg.imports?.["#shared/*"]).toBe("./shared/*");
  });
});
