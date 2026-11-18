import { describe, expect, it } from "bun:test";
import { validateGestures } from "../craft/_shared/gesture-core.mjs";

// gx-slope-slopegraph web and video (12B, mvg79/mvg80, 2026-11-18): the storyboard said subject "La Finlande", but
// recorded no claimEntity; the core took the first row its takeaway names ("… un seul a doublé la France") as the
// subject, so France carried the accent and Finland, the row the title is about, stayed grey in both formats.
const rows = [
  { name: "Finlande", value: 95.3 },
  { name: "France", value: 94.9 },
  { name: "Espagne", value: 76.7 },
];
const takeaway =
  "Les 16 pays ont tous gagné du bas-carbone depuis 2000 — un seul a doublé la France";
const subjectOf = (claim: Record<string, string>) =>
  validateGestures({
    gestures: [{ do: "name", mark: "France", note: "94,9" }],
    rows,
    family: "length",
    format: "static",
    claim,
  }).gestures[0].subject;

describe("the subject a beat's accent goes to", () => {
  it("should be the storyboard's subject when no claim entity is recorded", () => {
    expect(
      subjectOf({
        takeaway,
        subject: "La Finlande",
        comparison: "La France, que la Finlande a dépassée",
      }),
    ).toBe("Finlande");
  });

  it("should still be the recorded claim entity first", () => {
    expect(
      subjectOf({ takeaway, subject: "La Finlande", entity: "Espagne" }),
    ).toBe("Espagne");
  });

  it("should fall back to the takeaway when the subject names no drawn row", () => {
    expect(subjectOf({ takeaway, subject: "Les pays européens" })).toBe(
      "France",
    );
  });
});
