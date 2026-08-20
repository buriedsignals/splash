/**
 * A TRAIT IS A CLAIM ABOUT A SKILL'S OWN FILES, AND THIS IS WHAT MAKES IT ONE.
 *
 * The catalogue used to reach skills by name, and a rule written on Tuesday reached whichever skills
 * were typed into it on Tuesday. `map-beat` ships the video genre and carries a timing contract, and
 * `reveal-completes` — written the previous evening — never reached it, because nobody typed it.
 *
 * Traits fix that only if a trait cannot be claimed or dropped at will. Each one is proved against
 * the skill's own files: claiming `bakes-a-plate` without a `bake-plate.mjs` fails, and — the
 * direction that matters — DROPPING a trait whose witness is still there fails too, because the
 * cheapest way out of a red cell would otherwise be to stop admitting what the skill is.
 */
import { describe, expect, it } from "bun:test";
import {
  PRODUCING_SKILLS,
  TRAITS,
  provenTraits,
  traitsOf,
} from "../../../scripts/traits.mjs";

describe("every producing skill declares what it is", () => {
  it("names only traits the vocabulary knows", () => {
    const known = new Set(TRAITS.map((trait) => trait.id));
    for (const skill of PRODUCING_SKILLS)
      for (const id of traitsOf(skill)) expect([...known]).toContain(id);
  });

  it("claims no trait its own files contradict", () => {
    for (const skill of PRODUCING_SKILLS) {
      const proven = new Set(provenTraits(skill));
      const unproven = traitsOf(skill).filter((id) => !proven.has(id));
      expect(`${skill} claims unproven: ${unproven.join(", ")}`).toBe(
        `${skill} claims unproven: `,
      );
    }
  });

  it("drops no trait its own files still prove — the escape hatch this closes", () => {
    for (const skill of PRODUCING_SKILLS) {
      const declared = new Set(traitsOf(skill));
      const hidden = provenTraits(skill).filter((id) => !declared.has(id));
      expect(`${skill} hides: ${hidden.join(", ")}`).toBe(`${skill} hides: `);
    }
  });

  it("gives every trait in the vocabulary a describing line a reader can disagree with", () => {
    for (const trait of TRAITS) {
      expect(trait.id).toMatch(/^[a-z][a-z-]+$/);
      expect(trait.describes.length).toBeGreaterThan(30);
    }
  });
});
