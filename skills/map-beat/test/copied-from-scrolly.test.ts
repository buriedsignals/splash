import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The map engine is COPIED from the validated scrolly pilot (branch quality/scrolly), not merged
 * (owner, 2026-09-15). A copy that drifts from the file it was copied from is a fork nobody decided:
 * every copied file's sha256 is pinned in the manifest beside the commit it came from.
 */

const ROOT = join(import.meta.dir, "../../..");
const manifest = JSON.parse(
  readFileSync(join(ROOT, "shared/map-beat/COPIED-FROM.json"), "utf8"),
);

describe("the map engine copied from quality/scrolly", () => {
  it("should name its origin commit and at least the camera module and the mount", () => {
    expect(manifest.commit).toMatch(/^[0-9a-f]{8,40}$/);
    expect(Object.keys(manifest.files)).toEqual(
      expect.arrayContaining([
        "shared/map-beat/scrolly.mjs",
        "shared/map-beat/mount.mjs",
      ]),
    );
  });

  for (const [path, sha256] of Object.entries(
    manifest.files as Record<string, string>,
  ))
    it(`should keep ${path} byte-identical to the copied file`, () => {
      expect(
        createHash("sha256")
          .update(readFileSync(join(ROOT, path)))
          .digest("hex"),
      ).toBe(sha256);
    });

  it("should keep the root template's mount identical to the trunk's", () => {
    expect(
      readFileSync(
        join(
          ROOT,
          "skills/splash/assets/root-template/shared/map-beat/mount.mjs",
        ),
        "utf8",
      ),
    ).toBe(readFileSync(join(ROOT, "shared/map-beat/mount.mjs"), "utf8"));
  });
});
