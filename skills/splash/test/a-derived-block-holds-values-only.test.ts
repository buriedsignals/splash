/**
 * A BRIEF SECTION CARRIES A BLOCK OF VALUES, AND THE GUARD READS THAT BLOCK — NEVER THE PROSE.
 *
 * The defect this exists for is a design that was written down and then refused (spec
 * `docs/splash/2026-09-17-editorial-chain-spec.md`, ruling R-C). The first draft held each BRIEF
 * section byte-identical to what a generator renders. That hands a generator authority over
 * sentences a journalist may legitimately reword, in any language; it makes rewording a beat a
 * test failure, which creates pressure to exempt beats rather than fix them; and with the 160
 * catalogue proofs exempted it would have left the guard exercised on nothing at all.
 *
 * So the record is a fenced JSON block whose info string names it — ```json splash:choreography —
 * parsed out of what the section already declares. `JSON.parse` needs no grammar, so key order,
 * indentation and line wrapping cannot fail a beat. And `assertNoProse` makes "the tests never
 * compare sentences" a property of the FORMAT rather than a convention somebody has to remember:
 * every string in a block is an identifier from a type's vocabulary (`pull back`, `ask-a-mark`,
 * `establish`) or a datum id, and a sentence is refused at the moment it would be written.
 *
 * MUTATIONS, run and verified (task 1 of `docs/superpowers/plans/2026-09-17-editorial-chain.md`):
 *   - raise `isProse`'s word ceiling from 4 to 400 → "should refuse a sentence inside a block" red.
 *   - let `readDerivedBlock` return the first of several matches instead of throwing → "should
 *     refuse a section that carries two blocks of the same name" red.
 *   - delete `skills/splash/assets/root-template/shared/editorial/derived.mjs` → `carried-copies`
 *     red on the missing canonical copy.
 */
import { describe, it, expect } from "bun:test";
import {
  DERIVED_BLOCKS,
  renderDerivedBlock,
  readDerivedBlock,
  assertNoProse,
} from "#shared/editorial/derived.mjs";

describe("the derived block", () => {
  it("should survive a round trip through markdown prose", () => {
    const value = {
      kind: "scroll",
      cards: [{ card: 1, gesture: [], changes: ["rows"] }],
    };
    const text = `## The choreography\n\nAny prose at all.\n\n${renderDerivedBlock("choreography", value)}\n\nMore prose.\n`;
    expect(readDerivedBlock(text, "choreography")).toEqual(value);
  });

  it("should refuse a section that carries two blocks of the same name", () => {
    const one = renderDerivedBlock("precision", {
      rounding: { unit: "Mt", digits: 1 },
    });
    expect(() => readDerivedBlock(`${one}\n${one}`, "precision")).toThrow(
      /two splash:precision blocks/,
    );
  });

  it("should refuse a sentence inside a block", () => {
    expect(() =>
      assertNoProse({
        cards: [{ gesture: ["the ten grow into rows, one per country."] }],
      }),
    ).toThrow(/cards\[0\]\.gesture\[0\]/);
  });

  it("should refuse a phrase that runs past four words even where it punctuates nothing", () => {
    expect(() =>
      assertNoProse({ cards: [{ changes: ["the ten grow into rows"] }] }),
    ).toThrow(/cards\[0\]\.changes\[0\]/);
  });

  it("should refuse to write a block that holds a sentence, rather than write it and complain later", () => {
    expect(() =>
      renderDerivedBlock("precision", {
        asserts: ["China emitted 11.9 Gt in 2024."],
      }),
    ).toThrow(/asserts\[0\]/);
  });

  it("should name the section when a block it was asked for is absent", () => {
    expect(() =>
      readDerivedBlock(
        "## Precision\n\nProse and nothing else.\n",
        "precision",
      ),
    ).toThrow(/no splash:precision block/);
  });

  it("should keep an identifier, a datum id and a short gesture out of the prose rule", () => {
    expect(() =>
      assertNoProse({
        gesture: ["pull back"],
        asserts: ["china-2024", "five-sum"],
      }),
    ).not.toThrow();
  });

  it("should hold the two block names the chain knows and no third", () => {
    expect(DERIVED_BLOCKS).toEqual(["precision", "choreography"]);
    expect(() => renderDerivedBlock("choreograhpy", {})).toThrow(
      /choreograhpy/,
    );
  });
});
