/**
 * THE CHAIN SUPPLIES A FRAME. THE BEAT SUPPLIES THE CHOREOGRAPHY. THIS FILE HOLDS THE LINE BETWEEN.
 *
 * Ruling R-D of `docs/splash/2026-09-17-editorial-chain-spec.md`: a `deriveChoreography(type,
 * retained)` that computed a choreography would manufacture clones, which is the one thing this
 * effort exists to prevent — every one of the 160 proofs is its own piece, and that is the point
 * of them. So `choreographyFrame` returns the export's required SHAPE, the type's own gesture
 * VOCABULARY, the type's PROHIBITIONS and what the retained proposal CONSTRAINS. It returns no
 * cards, no shots, no stations and no rows, and the case below asserts that by walking the whole
 * returned object for a key that would hold one.
 *
 * `requiredAssertions` is the same division for precision (§1.4): the claim's grounding and shape
 * say WHAT must be asserted; which numbers satisfy it, at what rounding, in which unit, is read off
 * the subject's own data by the journalist. That read of `grounding` is the one L1 never had — the
 * verdict was recorded at G1 and then nothing downstream ever opened it.
 *
 * MUTATIONS, run and verified (task 3 of `docs/superpowers/plans/2026-09-17-editorial-chain.md`):
 *   - make `requiredAssertions` ignore `grounding` (always take the `supported` branch) → "should
 *     forbid asserting the claim's datum when the grounding is unverifiable" red.
 *   - make `parseGesture` split on whitespace rather than `+` → "should read a gesture cell as its
 *     atoms" red.
 *   - drop `→` from `parseGesture`'s separator class → "should read a sequence of atoms however the
 *     beat joins them" red (2026-09-17). Restored → green.
 *   - keep the bracketed gloss instead of dropping it → "should drop a gesture cell's bracketed
 *     gloss" red (2026-09-17). Restored → green.
 *   - have `choreographyFrame` carry the worked example's own cards into `constrains` → "should
 *     return no choreography of its own" red, naming the key.
 */
import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  choreographyFrame,
  requiredAssertions,
  parseGesture,
  parseTypeSheet,
} from "#shared/editorial/frame.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

const base = {
  format: "static",
  type: "bar",
  size: "landscape",
  claim: { shape: "comparison", grounding: "supported" },
  interaction: { kind: "none", promise: "A fixed chart." },
};
const sheet = { precisionToAssert: ["zero-baseline"] };

describe("parseGesture", () => {
  it("should read a gesture cell as its atoms", () => {
    expect(parseGesture("**split + rescale**")).toEqual(["split", "rescale"]);
    expect(parseGesture(" **pull back** ")).toEqual(["pull back"]);
    expect(parseGesture("compare + pull back")).toEqual([
      "compare",
      "pull back",
    ]);
  });

  it("should read the corpus's own way of writing no gesture at all", () => {
    expect(parseGesture("—")).toEqual([]);
    expect(parseGesture("")).toEqual([]);
    expect(parseGesture("–")).toEqual([]);
  });

  // THE PLAN NAMED ONE SEPARATOR; THE CORPUS WRITES FOUR. Six video beats join their gesture atoms
  // with an arrow rather than a plus — a sequence inside one shot rather than atoms playing
  // together — and one writes it in words. Read with `+` alone, `whole → split → stand` was one
  // atom five words long, which `assertNoProse` then refused as a sentence: correct about what it
  // was shown, wrong about the beat.
  it("should read a sequence of atoms however the beat joins them", () => {
    expect(parseGesture("**whole → split → stand + trace**")).toEqual([
      "whole",
      "split",
      "stand",
      "trace",
    ]);
    expect(parseGesture("fill -> filter")).toEqual(["fill", "filter"]);
    expect(parseGesture("**the floor rises**, then **name**")).toEqual([
      "the floor rises",
      "name",
    ]);
  });

  // A BRACKETED GLOSS IS THE JOURNALIST'S SENTENCE, NOT AN ATOM. `— (furniture)`, `— (stillness)`
  // and `the floor rises (filter as time)` are all real cells in the video corpus.
  it("should drop a gesture cell's bracketed gloss rather than carry it into a block", () => {
    expect(parseGesture("— (furniture)")).toEqual([]);
    expect(parseGesture("— (stillness)")).toEqual([]);
    expect(parseGesture("**the floor rises** (filter as time)")).toEqual(["the floor rises"]);
  });
});

describe("requiredAssertions", () => {
  it("should require the claim's own datum when the grounding is supported", () => {
    expect(requiredAssertions(base, sheet).map((r) => r.id)).toContain(
      "claim-datum",
    );
  });

  it("should forbid asserting the claim's datum when the grounding is unverifiable", () => {
    const out = requiredAssertions(
      { ...base, claim: { ...base.claim, grounding: "unverifiable" } },
      sheet,
    );
    expect(out.map((r) => r.id)).not.toContain("claim-datum");
    expect(out).toContainEqual({
      id: "rounding-widened",
      because: "grounding",
    });
  });

  it("should read an override the way gate 2 writes one, reason and all", () => {
    const out = requiredAssertions(
      {
        ...base,
        claim: {
          ...base.claim,
          grounding: 'overridden — "the register is a year behind"',
        },
      },
      sheet,
    );
    expect(out).toContainEqual({ id: "exactness-note", because: "grounding" });
  });

  it("should require both compared values for a comparison claim", () => {
    expect(requiredAssertions(base, sheet).map((r) => r.id)).toEqual(
      expect.arrayContaining([
        "claim-datum",
        "comparison-left",
        "comparison-right",
        "zero-baseline",
      ]),
    );
  });

  it("should require the rank's own position and the set size for the shapes gate 2 records as maximum and minimum", () => {
    const out = requiredAssertions(
      { ...base, claim: { ...base.claim, shape: "maximum" } },
      sheet,
    );
    expect(out.map((r) => r.id)).toEqual(
      expect.arrayContaining(["rank-position", "rank-set-size"]),
    );
  });

  it("should say where the assertion may land, differently for each of the four exports", () => {
    const placement = (format: string) =>
      requiredAssertions({ ...base, format }, sheet)
        .filter((r) => r.because === "format")
        .map((r) => r.id);
    const all = ["static", "web", "video", "scrolly"].map(placement);
    expect(all.flat()).toHaveLength(4);
    expect(new Set(all.flat()).size).toBe(4);
  });

  it("should refuse to guess a grounding nobody recorded", () => {
    expect(() =>
      requiredAssertions({ ...base, claim: { shape: "comparison" } }, sheet),
    ).toThrow(/grounding/);
  });

  it("should carry the type sheet's own owed rules through unchanged", () => {
    const out = requiredAssertions(base, {
      precisionToAssert: ["one-value-scale-from-zero"],
    });
    expect(out).toContainEqual({
      id: "one-value-scale-from-zero",
      because: "type-sheet",
    });
  });
});

describe("choreographyFrame", () => {
  it("should map each export's format onto the declared shape that export owes", () => {
    const shapeOf = (format: string) =>
      choreographyFrame({ ...base, format }, sheet).shape;
    expect(shapeOf("static")).toBe("frame");
    expect(shapeOf("web")).toBe("pointer");
    expect(shapeOf("video")).toBe("time");
    expect(shapeOf("scrolly")).toBe("scroll");
  });

  it("should carry what the retained proposal constrains, and name the export it frames", () => {
    const frame = choreographyFrame(
      {
        ...base,
        format: "scrolly",
        size: null,
        interaction: { kind: "scroll", promise: "…" },
      },
      sheet,
    );
    expect(frame.export).toBe("scrolly");
    expect(frame.constrains).toEqual({
      interactionKind: "scroll",
      size: null,
      cardsMin: null,
    });
  });

  it("should return no choreography of its own", () => {
    const frame = choreographyFrame(
      { ...base, format: "scrolly" },
      {
        ...sheet,
        gestures: ["pull back"],
        prohibitions: [
          {
            id: "no-slideshow",
            says: "replay the static plate's states as a slideshow",
          },
        ],
        workedExample: "proof/scrolly-bar-top-emitters-2024/",
        cards: [{ card: 1, gesture: [], changes: ["rows"] }],
        shots: [{ shot: "establish" }],
      },
    );
    const forbidden = /(^|\.)(cards|shots|stations|controls|rows)$/;
    const paths: string[] = [];
    (function walk(value: unknown, path: string) {
      if (Array.isArray(value))
        value.forEach((v, i) => walk(v, `${path}[${i}]`));
      else if (value && typeof value === "object")
        for (const [k, v] of Object.entries(value)) {
          const next = path ? `${path}.${k}` : k;
          if (forbidden.test(next)) paths.push(next);
          walk(v, next);
        }
    })(frame, "");
    expect(paths).toEqual([]);
    expect(frame.workedExample).toBe("proof/scrolly-bar-top-emitters-2024/");
  });

  it("should hand on the sheet's vocabulary and prohibitions rather than a vocabulary of its own", () => {
    const frame = choreographyFrame(
      { ...base, format: "scrolly" },
      {
        gestures: ["reveal in order", "pull back"],
        prohibitions: [
          {
            id: "no-slideshow",
            says: "replay the static plate's states as a slideshow",
          },
        ],
        precisionToAssert: [],
      },
    );
    expect(frame.vocabulary).toEqual(["reveal in order", "pull back"]);
    expect(frame.prohibitions).toEqual([
      {
        id: "no-slideshow",
        says: "replay the static plate's states as a slideshow",
      },
    ]);
  });
});

describe("parseTypeSheet", () => {
  // Read-only, on a sheet this task does not touch: scrolly's 40 already carry the four sections.
  const text = readFileSync(
    join(ROOT, "skills/scrolly/references/types/bar-and-column.md"),
    "utf8",
  );

  it("should read a real type sheet's four sections", () => {
    const parsed = parseTypeSheet(text);
    expect(parsed.gestures.length).toBeGreaterThanOrEqual(3);
    expect(parsed.gestures[0].toLowerCase()).toContain("reveal in order");
    expect(parsed.prohibitions.length).toBeGreaterThanOrEqual(2);
    expect(parsed.prohibitions[0].says).toContain("slideshow");
    expect(parsed.precisionToAssert).toContain(
      "one value scale from zero across every card",
    );
    expect(parsed.workedExample).toContain(
      "proof/scrolly-bar-top-emitters-2024/",
    );
  });

  it("should read a prohibition's checkable id where the sheet files one, and no id where it does not", () => {
    // All 160 sheets file ids now; `every-prohibition-carries-a-checkable-id.test.ts` is the census.
    // What is asserted here is the READER: an id where the sheet writes one, `null` where it does not.
    expect(parseTypeSheet(text).prohibitions.every((p) => p.id !== null)).toBe(
      true,
    );
    expect(
      parseTypeSheet("## A choreography must NOT\n- overlap two pictures\n")
        .prohibitions,
    ).toEqual([{ id: null, says: "overlap two pictures" }]);
    const withIds = parseTypeSheet(
      "## Scroll gestures\n- **Pull back** — the whole stands\n\n" +
        "## A choreography must NOT\n- `no-slideshow` — replay the static plate's states\n" +
        "- `no-popping` — pop marks in groups\n\n## Precision to assert\n- one scale from zero\n",
    );
    expect(withIds.prohibitions.map((p) => p.id)).toEqual([
      "no-slideshow",
      "no-popping",
    ]);
    expect(withIds.prohibitions[0].says).toBe(
      "replay the static plate's states",
    );
  });
});
