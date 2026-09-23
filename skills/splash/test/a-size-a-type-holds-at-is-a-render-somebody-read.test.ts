/**
 * A TYPE IS OPENED AT A SIZE BY A RENDER SOMEBODY READ, NEVER BY AN OPINION.
 *
 * `type-at-size.mjs` refuses portrait and square for any type whose behaviour at a tall or square frame
 * nobody has measured — and it is right to, because the probe it cites proved that no clipping or collision
 * counter in this project can tell a good tall render from a destroyed one. Measured again on 2026-09-23,
 * with the gate lifted: all thirty-five static beats rendered at 1080x1080 and not one of their own
 * assertions fired, while `column` printed « ChineÉtats-UnisInde », `beeswarm` squashed its distribution
 * into a strip and `boxplot` printed eight decade labels through each other.
 *
 * So the only thing that opens a size for a type is a render that was OPENED AND READ, and
 * `MEASURED_HOLDS` records which file that was. This holds the record to two things a later reader needs:
 * the file is still there to disagree with, and it is a render at the size it is offered as evidence for.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MEASURED_HOLDS,
  formForSize,
} from "#shared/chart-beat/type-at-size.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");

/** `[size, type, path]` for every entry the record carries. */
function held(): [string, string, string][] {
  return Object.entries(MEASURED_HOLDS).flatMap(([size, byType]) =>
    Object.entries(byType as Record<string, string>).map(
      ([type, path]) => [size, type, path] as [string, string, string],
    ),
  );
}

describe("a size a type holds at", () => {
  it("records the sizes this toolchain exports and nothing else", () => {
    expect(Object.keys(MEASURED_HOLDS).sort()).toEqual(["portrait", "square"]);
  });

  it("names a render that is still in the tree", () => {
    const missing = held()
      .filter(([, , path]) => !existsSync(join(ROOT, path)))
      .map(([size, type, path]) => `${type} at ${size}: ${path}`);
    expect(missing).toEqual([]);
  });

  it("names a render at the size it is evidence for", () => {
    const wrong = held()
      .filter(([size, , path]) => !path.includes(`-${size}.`))
      .map(([size, type, path]) => `${type} at ${size}: ${path}`);
    expect(wrong).toEqual([]);
  });

  it("is what makes the type answer `as-is` at that size, and nothing else does", () => {
    for (const [size, type] of held())
      expect(formForSize(type, size).verdict).toBe("as-is");
    // And a type with no record is still refused, so the record is the only door. Both controls are
    // now a type this corpus does not draw: every type it DOES draw has been read at both sizes, so
    // a drawn type can no longer serve as the control. That is the record finished, not weakened.
    expect(formForSize("sunburst", "square").verdict).toBe("refuse");
    // Portrait now holds for every type this corpus draws, so the second control is a type the
    // corpus does not draw at all — the record has to be the door for a stranger too.
    expect(formForSize("sunburst", "portrait").verdict).toBe("refuse");
  });

  it("says why every other type was turned down, so the next pass starts from what was seen", () => {
    const source = readFileSync(
      join(ROOT, "shared", "chart-beat", "type-at-size.mjs"),
      "utf8",
    );
    for (const named of [
      "column",
      "beeswarm",
      "connected-scatter",
      "parallel-coordinates",
      "boxplot",
    ])
      expect(source).toContain(named);
  });
});
