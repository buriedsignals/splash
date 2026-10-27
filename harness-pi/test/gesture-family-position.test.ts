// The Position family (craft/gestures/GRAMMAR.md §4 F3): dumbbell, slope, dot strip, beeswarm, box plot. Each type's
// worked example (its kit's beat.example.mjs over its seed's data.json) is staged through the core and every format's
// scheduler; the family's own rules are each held by a test that a mutation of the rule turns red.
import { describe, expect, it } from "bun:test";
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as coreModule from "../craft/_shared/gesture-core.mjs";
import * as registryModule from "../craft/_shared/gesture-registry.mjs";
import * as familyModule from "../craft/_shared/gesture-family-position.mjs";
import * as staticModule from "../craft/_shared/gesture-position-static.mjs";
import * as webModule from "../craft/_shared/gesture-position-web.mjs";

// The modules are plain JavaScript: their inferred types are narrower than what they return, so they are read as any.
const { applyFix, GestureRefusal, repairGestures, validateGestures } = coreModule as any;
const { FAMILIES } = registryModule as any;
const { createPosition, deltaOf, modelOf, positionHooks, summarize } = familyModule as any;
const { composeStaticPosition } = staticModule as any;
const { assertWebHasAControl, scheduleWebPosition } = webModule as any;

const HARNESS = join(import.meta.dirname, "..");
const TYPES: string[] = [
  "dumbbell-range-plot",
  "slope-slopegraph",
  "dot-strip",
  "beeswarm",
  "box-plot",
];

/** A type's worked example, imported over its seed's data.json, with the claim the seed's storyboard records. */
async function example(slug: string, format = "static") {
  const dir = mkdtempSync(join(tmpdir(), `pos-${slug}-`));
  copyFileSync(
    join(HARNESS, "eval", "seeds", `gx-${slug}`, "beats", "1", "data.json"),
    join(dir, "data.json"),
  );
  copyFileSync(
    join(HARNESS, "craft", format, `${slug}.gestures`, "beat.example.mjs"),
    join(dir, "beat.mjs"),
  );
  const { default: beat } = await import(join(dir, "beat.mjs"));
  const front = (
    await Bun.file(
      join(HARNESS, "eval", "seeds", `gx-${slug}`, "STORYBOARD.md"),
    ).text()
  ).split("---")[1];
  const field = (k: string) =>
    front.match(new RegExp(`^${k}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1];
  const model = modelOf(slug, beat);
  const facts: Record<string, number[]> = {};
  for (const r of model.rows as any[])
    facts[r.name] =
      r.from !== undefined
        ? [r.from, r.to]
        : r.stats
          ? [r.stats.median, r.stats.q1, r.stats.q3]
          : [r.value];
  const claim = {
    takeaway: field("takeaway"),
    subject: field("subject"),
    comparison: field("comparison"),
    entity: field("claimEntity"),
    versus: field("claimVersus"),
    facts,
    unit: beat.unit,
  };
  const format_ = beat.format as (v: number) => string;
  return { beat, model, claim, format: format_, delta: deltaOf(format_) };
}

const validate = (ex: any, gestures: any[], format = "static") =>
  validateGestures({
    gestures,
    rows: ex.model.core,
    family: "position",
    format,
    claim: ex.claim,
    hooks: positionHooks(ex.model),
  });

const refusalOf = (fn: () => unknown): any => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  return null;
};

describe("the Position family registers itself", () => {
  it("should register position as a non-additive family without bracket or count", () => {
    expect(FAMILIES.position.additive).toBe(false);
    expect(
      FAMILIES.position.gestures.filter(
        (g: string) => g === "bracket" || g === "count",
      ),
    ).toEqual([]);
  });
});

describe.each(TYPES)("%s, static", (slug) => {
  it("should stage the worked example on one plate, every declared gesture landing", async () => {
    const ex = await example(slug);
    const { gestures } = validate(ex, ex.beat.gestures);
    const plate = composeStaticPosition({
      gestures,
      model: ex.model,
      format: ex.format,
      delta: ex.delta,
      domain: ex.beat.domain,
    });
    const rest = plate.position.rest();
    expect(plate.position.equal(plate.state, rest)).toBe(false);
    const landed = gestures.every((g: any) =>
      g.do === "highlight"
        ? g.marks.every(
            (m: string) =>
              plate.state.accent.includes(m) || plate.state.rings.includes(m),
          )
        : g.do === "name"
          ? plate.state.rings.includes(g.marks[0])
          : g.do === "compare"
            ? plate.state.compares.some((c: any) => c.subject === g.marks[0])
            : g.do === "reference"
              ? plate.state.references.some(
                  (r: any) => r.value === Number(g.value),
                )
              : g.do === "filter"
                ? plate.state.back.length > 0
                : g.do === "annotate"
                  ? plate.notes.some(
                      (n: any) => n.index === gestures.indexOf(g),
                    )
                  : true,
    );
    expect(landed).toBe(true);
  });

  it("should refuse a note whose number the rows do not give", async () => {
    const ex = await example(slug);
    const i = ex.beat.gestures.findIndex((g: any) =>
      /\d/.test(String(g.note ?? "")),
    );
    const false_ = structuredClone(ex.beat.gestures);
    false_[i].note = String(false_[i].note).replace(
      /\d+([.,]\d+)?/,
      (m: string) =>
        String(Number(m.replace(",", ".")) * 3 + 7).replace(".", ","),
    );
    const refusal = refusalOf(() => validate(ex, false_));
    expect(refusal?.field).toBe(`gestures[${i}].note`);
  });
});

describe.each(TYPES)("%s, web", (slug) => {
  it("should give every control a state distinct from the resting page", async () => {
    const ex = await example(slug, "web");
    const { gestures, entities } = validate(ex, ex.beat.gestures, "web");
    const { resting, controls, position } = scheduleWebPosition({
      gestures,
      model: ex.model,
      format: ex.format,
      delta: ex.delta,
      domain: ex.beat.domain,
      entities,
    });
    expect(controls.length).toBeGreaterThan(0);
    expect(
      controls.every((c: any) => !position.equal(c.state, resting.state)),
    ).toBe(true);
  });
});

describe("the family's own rules", () => {
  it("should refuse a compare against the whole, and its fix should be accepted", async () => {
    const ex = await example("dumbbell-range-plot");
    const list = [{ do: "compare", mark: "Pologne", of: "whole" }];
    const refusal = refusalOf(() => validate(ex, list));
    expect(refusal).not.toBeNull();
    expect(
      refusalOf(() => validate(ex, applyFix(list, refusal!.fix))),
    ).toBeNull();
  });

  it("should compare paired rows by their change, not by a level", async () => {
    const ex = await example("dumbbell-range-plot");
    // Poland gained 5.0, the United States 2.5: the gap is 2.5 years of gain (their 2023 levels are 1.0 apart).
    expect(
      refusalOf(() =>
        validate(ex, [
          {
            do: "compare",
            marks: ["Pologne", "États-Unis"],
            note: "2,5 ans de plus",
          },
        ]),
      ),
    ).toBeNull();
  });

  it("should refuse a reorder where a mark's place is its value", async () => {
    const ex = await example("slope-slopegraph");
    expect(
      refusalOf(() =>
        validate(ex, [
          { do: "highlight", mark: "Finlande" },
          { do: "reorder", value: "descending" },
        ]),
      )?.field,
    ).toBe("gestures[1].do");
  });

  it("should accept a reorder of a dumbbell's rows", async () => {
    const ex = await example("dumbbell-range-plot");
    expect(
      refusalOf(() =>
        validate(ex, [
          { do: "highlight", mark: "Pologne" },
          { do: "reorder", value: "ascending" },
        ]),
      ),
    ).toBeNull();
  });

  it("should accept a percent a row draws, stated on that row", async () => {
    const ex = await example("slope-slopegraph");
    const to = (ex.model.rows as any[]).find((r) => r.name === "France").to;
    const note = `${to.toFixed(1).replace(".", ",")} % en 2024`;
    expect(
      refusalOf(() => validate(ex, [{ do: "name", mark: "France", note }])),
    ).toBeNull();
  });

  it("should accept a box's median stated on its group and refuse another group's", async () => {
    const ex = await example("box-plot");
    const s = (ex.model.rows as any[]).find(
      (r) => r.name === "années 1970",
    ).stats;
    const other = (ex.model.rows as any[]).find(
      (r) => r.name === "années 1950",
    ).stats;
    const two = (v: number) => v.toFixed(2).replace(".", ",");
    expect(
      refusalOf(() =>
        validate(ex, [
          {
            do: "name",
            mark: "années 1970",
            note: `médiane ${two(s.median)} t`,
          },
        ]),
      ),
    ).toBeNull();
    expect(
      refusalOf(() =>
        validate(ex, [
          {
            do: "name",
            mark: "années 1970",
            note: `médiane ${two(other.median)} t`,
          },
        ]),
      ),
    ).not.toBeNull();
  });

  it("should compute a group's quartiles as the per-type box plot does (type-7)", () => {
    const s = summarize([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect([s.q1, s.median, s.q3]).toEqual([3.25, 5.5, 7.75]);
  });

  it("should draw a field statistic only on the row that holds it", async () => {
    const ex = await example("box-plot");
    const rows = ex.model.rows as any[];
    const spread = Math.max(...rows.map((r) => r.stats.median)) - Math.min(...rows.map((r) => r.stats.median));
    const note = `écart des médianes : ${spread.toFixed(2).replace(".", ",")} t`;
    // The spread of the medians is held by the peak decade (the highest median), not by another decade.
    expect(refusalOf(() => validate(ex, [{ do: "name", mark: "années 1970", note }]))).toBeNull();
    expect(refusalOf(() => validate(ex, [{ do: "highlight", mark: "années 1970" }, { do: "name", mark: "années 2010", note }]))).not.toBeNull();
  });

  it("should state a reference's share of the field's size above it", async () => {
    const ex = await example("beeswarm");
    const people = (ex.model.rows as any[]).reduce((s, r) => s + r.size, 0);
    const share =
      ((ex.model.rows as any[])
        .filter((r) => r.value > 20)
        .reduce((s, r) => s + r.size, 0) /
        people) *
      100;
    const at = (v: number) => [
      {
        do: "reference",
        value: 20,
        note: `20 t : ${v.toFixed(1).replace(".", ",")} % de l’humanité`,
      },
    ];
    expect(refusalOf(() => validate(ex, at(share)))).toBeNull();
    expect(refusalOf(() => validate(ex, at(share + 15)))).not.toBeNull();
  });

  it("should repair a web list with no control by adding a compare, ending on an accepted list", async () => {
    const ex = await example("dumbbell-range-plot", "web");
    let list: any[] = [{ do: "highlight", mark: "Pologne" }];
    const refusal = refusalOf(() =>
      assertWebHasAControl(list, ex.model, ex.claim),
    );
    expect((refusal?.fix as any).add.gesture.do).toBe("compare");
    list = applyFix(list, refusal!.fix);
    expect(refusalOf(() => validate(ex, list, "web"))).toBeNull();
  });

  it("should refuse a zoom whose state prints no factor (no-let-camera-magnification)", async () => {
    const ex = await example("beeswarm");
    const position = createPosition({ model: ex.model });
    const zoomed = position.window(position.rest(), ["Qatar", "Bahrain"]);
    expect(() => position.invariants([position.rest(), zoomed])).toThrow(
      /without printing/,
    );
    expect(() =>
      position.invariants([
        position.rest(),
        position.with(zoomed, { factorPrinted: true }),
      ]),
    ).not.toThrow();
  });

  it("should repair a video list of two to three gestures without proposing a count", async () => {
    const ex = await example("dumbbell-range-plot");
    const { gestures, repairs } = repairGestures({
      gestures: [{ do: "highlight", mark: "Pologne" }, { do: "pull-back" }],
      rows: ex.model.core,
      family: "position",
      format: "video",
      claim: ex.claim,
      hooks: positionHooks(ex.model),
    });
    expect(gestures.length).toBe(3);
    expect(gestures.some((g: any) => g.do === "count")).toBe(false);
    expect(repairs.length).toBeGreaterThan(0);
  });
});

describe.each(TYPES)("%s, video and scrolly", (slug) => {
  it("should give each video event its own state and each scrolly card its own picture", async () => {
    const video = (await import("../craft/_shared/gesture-position-video.mjs")) as any;
    const scrolly = (await import("../craft/_shared/gesture-position-scrolly.mjs")) as any;
    const ex = await example(slug, "scrolly");
    const { gestures, entities } = validate(ex, ex.beat.gestures.map(({ card, ...g }: any) => g), "scrolly");
    const { cards, position } = scrolly.scheduleScrollyPosition({ gestures, model: ex.model, format: ex.format, delta: ex.delta, domain: ex.beat.domain, entities });
    expect(cards.length).toBe(gestures.length + 1);
    expect(cards.every((c: any, k: number) => k === 0 || k === gestures.length || !position.equal(c, cards[k - 1]) || gestures[k]?.note)).toBe(true);
    const v = video.scheduleVideoPosition({ gestures: gestures.slice(0, 3), model: ex.model, format: ex.format, delta: ex.delta, domain: ex.beat.domain, entities });
    expect(position.equal(v.states.establish, v.states.reference)).toBe(false);
    expect(v.states.hold).toBe(v.states.conclusion);
  });
});
