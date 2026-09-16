/**
 * THE HARVEST READS; IT DOES NOT WRITE ANY BEAT'S CONTENT.
 *
 * `scripts/migrate-briefs.mjs --harvest` parses each beat's own declaration into its two value
 * blocks. This guards the two readers that are the harvest's own rather than an export skill's,
 * and the one property the whole migration rests on: an insertion that leaves the beat's prose and
 * its table byte-for-byte as they were.
 *
 * `symbolicStatesFrom`, AND WHY IT EXISTS BESIDE `declaredStatesFrom`. A scrolly's `changes` are
 * READ from the beat's own per-card states — the comparison `assertStates` already performs. 26 of
 * the 40 write those states as numeric literals and `declaredStatesFrom`
 * (`skills/scrolly/scripts/choreography.mjs`) parses them. The other 14 write identifiers
 * (`reach: LAST`, `year: STOPS[0]`), which no JSON reader can evaluate and which the harvest may
 * not evaluate either — importing a beat's runner RENDERS it. So each field is read as its own
 * source text, with one exception that is not cosmetic: a numeric literal is coerced to a NUMBER,
 * because `changesPerCard` recognises the card-note counter as the field whose value is the card's
 * own index on every card, and `"0"` is not `0`. Left as text, `note` entered every card's
 * `changes` and `no-replay-static-plate` became unenforceable — every card would report a change.
 *
 * MUTATIONS RUN (2026-09-17, task 12)
 *   - dropped the numeric coercion from `symbolicStatesFrom` → RED on "should read a numeric state
 *     field as a number". Restored → green.
 *   - narrowed its pattern back to `const STATES` → RED on "should read a beat that names its
 *     states STATES_RAW"; two scrolly map beats stop migrating. Restored → green.
 *   - made `insertBlock` append at the end of the file instead of at the end of the section → RED
 *     on "should insert a block inside the section it belongs to". Restored → green.
 */
import { describe, expect, it } from "bun:test";
// @ts-expect-error — the repository's own tooling is ESM JavaScript.
import {
  insertBlock,
  symbolicStatesFrom,
} from "../../../scripts/migrate-briefs.mjs";
// @ts-expect-error — as above.
import { renderDerivedBlock } from "../../../shared/editorial/derived.mjs";

describe("the harvest's own readers", () => {
  it("should read a numeric state field as a number, so the card counter stays recognisable", () => {
    const states = symbolicStatesFrom(
      "const STATES = [\n { reach: LAST, note: 0 },\n { reach: peak.year, note: 1 },\n];",
    );
    expect(states).toEqual([
      { reach: "LAST", note: 0 },
      { reach: "peak.year", note: 1 },
    ]);
  });

  it("should read a beat that names its states STATES_RAW", () => {
    expect(
      symbolicStatesFrom("const STATES_RAW = [\n { a: 0 },\n { a: 1 },\n];"),
    ).toEqual([{ a: 0 }, { a: 1 }]);
  });

  it("should return null rather than guess when a beat declares no states at all", () => {
    expect(symbolicStatesFrom("const something = 1;")).toBeNull();
  });
});

describe("inserting a block", () => {
  const brief = [
    "---",
    "format: scrolly",
    "---",
    "",
    "# Beat",
    "",
    "## The choreography",
    "",
    "The journalist's own paragraph.",
    "",
    "| card | gesture |",
    "| --- | --- |",
    "| 1 | — |",
    "",
    "## Precision",
    "",
    "- **Every sentence is asserted**",
    "",
  ].join("\n");

  it("should insert a block inside the section it belongs to", () => {
    const block = renderDerivedBlock("choreography", {
      kind: "scroll",
      cards: [],
    });
    const out = insertBlock(brief, "choreography", block);
    expect(out.indexOf(block)).toBeGreaterThan(out.indexOf("| 1 | — |"));
    expect(out.indexOf(block)).toBeLessThan(out.indexOf("## Precision"));
  });

  it("should leave every line the journalist wrote exactly as it was", () => {
    const block = renderDerivedBlock("precision", {
      kind: "scroll",
      asserts: [],
    });
    const out = insertBlock(brief, "precision", block);
    for (const line of brief.split("\n").filter((l) => l.trim() !== ""))
      expect(out.split("\n")).toContain(line);
  });
});
