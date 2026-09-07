/**
 * A DIRECTION IS MEASURED AGAINST THE FLOORS BEFORE IT IS OFFERED.
 *
 * The design base opens the colour surface deliberately (spec §9): a direction carries its own
 * ground and its own accent, taken from a published piece rather than from the newsroom's palette.
 * That is the owner's decision, and it is exactly the decision that can ship an unreadable beat.
 * A dark ground with a luminous accent is a design; it is not a design until it is measured.
 *
 * Nothing here re-derives a floor. `colour.mjs` holds the three numbers, and a test that re-typed
 * them as literals would be the duplication this tree's own ratchet exists to catch — a floor in
 * two places drifts, and the copy in the test would be the one nobody updates.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  contrast,
  TEXT_CONTRAST_MIN,
  LARGE_TEXT_CONTRAST_MIN,
  NON_TEXT_CONTRAST_MIN,
} from "../../../shared/chart-beat/colour.mjs";
import { deriveFurniture } from "../../../shared/chart-beat/render-still.mjs";
import { REGISTERS } from "../../../shared/chart-beat/registers.mjs";
import { readDirection } from "../../../scripts/design-base/read-direction.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const FILED = join(ROOT, "docs", "design-base", "directions");

/** SC 1.4.3, relaxed at large sizes. The two numbers come from `colour.mjs`, never from here. */
function textFloor(size: number, weight: number): number {
  return size >= 24 || (size >= 18.66 && weight >= 700)
    ? LARGE_TEXT_CONTRAST_MIN
    : TEXT_CONTRAST_MIN;
}

function directions() {
  if (!existsSync(FILED)) return [];
  return readdirSync(FILED)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({ file: f, direction: readDirection(join(FILED, f)) }));
}

/** The three ink roles resolved against this direction's own ground. `ink` and `muted` are derived
 *  — never literals — which is what keeps a dark direction legible without any record naming one. */
function inksOf(direction) {
  const furniture = deriveFurniture(direction.ground);
  return {
    ink: furniture.ink,
    muted: furniture.muted,
    accent: direction.accent,
  };
}

describe("every filed direction", () => {
  it("should define all six registers", () => {
    for (const { file, direction } of directions())
      expect(Object.keys(direction.registers).sort(), file).toEqual(
        [...REGISTERS].sort(),
      );
  });

  it("should set every register above its own text floor on its own ground", () => {
    for (const { file, direction } of directions()) {
      const inks = inksOf(direction);
      for (const name of REGISTERS) {
        const register = direction.registers[name];
        const ratio = contrast(inks[register.ink], direction.ground);
        const floor = textFloor(register.size, register.weight);
        expect(
          ratio,
          `${file} ${name}: ${register.ink} on ${direction.ground} is ${ratio.toFixed(2)}:1, floor ${floor}`,
        ).toBeGreaterThanOrEqual(floor);
      }
    }
  });

  it("should keep the accent above the non-text floor as a mark", () => {
    // SC 1.4.11 on a series stroke is a DIFFERENT question from the same hue read as a label, which
    // the test above asks. `visual-system.md` records six separate fixes for collapsing the two.
    for (const { file, direction } of directions()) {
      const ratio = contrast(direction.accent, direction.ground);
      expect(
        ratio,
        `${file} accent as a mark: ${ratio.toFixed(2)}:1 on ${direction.ground}`,
      ).toBeGreaterThanOrEqual(NON_TEXT_CONTRAST_MIN);
    }
  });

  it("should carry a ground and an accent that are real colours", () => {
    for (const { file, direction } of directions()) {
      expect(direction.ground, `${file} ground`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(direction.accent, `${file} accent`).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("should name the reference it was measured from, and never invent one", () => {
    const known = new Set(
      existsSync(join(ROOT, "docs", "design-base", "references"))
        ? readdirSync(join(ROOT, "docs", "design-base", "references")).flatMap(
            (family) =>
              readdirSync(
                join(ROOT, "docs", "design-base", "references", family),
              ),
          )
        : [],
    );
    for (const { file, direction } of directions()) {
      expect(direction.measuredFrom, `${file} names no reference`).toBeTruthy();
      expect(
        known.has(direction.measuredFrom),
        `${file} cites ${direction.measuredFrom}`,
      ).toBe(true);
    }
  });
});
