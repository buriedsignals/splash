/**
 * A TREATMENT APPLIES TO THE DATA SHAPE IT CLAIMS, AND SAYS WHICH REGISTER IT WRITES INTO.
 *
 * The registry here carries exactly the treatments filed under `docs/design-base/treatments/`, and
 * that correspondence is itself tested below: a treatment in the code with no filed evidence is a
 * design decision somebody took without a reference, which is the whole thing this base exists to
 * stop. A filed treatment with no code is knowledge that never reached a pixel, which is how the
 * predecessor branch died.
 */
import { describe, it, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  TREATMENTS,
  beatFacts,
  applicableTreatments,
} from "../../../shared/chart-beat/treatments.mjs";
import { REGISTERS } from "../../../shared/chart-beat/registers.mjs";

const ROOT = join(import.meta.dirname, "..", "..", "..");
const FILED = join(ROOT, "docs", "design-base", "treatments");

/** A short series with a comparison set, and a long one without: the two shapes the filed
 *  treatments actually discriminate between. */
const THREE_MARKS = [
  { key: "no", label: "Norway", value: 8 },
  { key: "dk", label: "Denmark", value: 10 },
  { key: "se", label: "Sweden", value: 15 },
];
/** A paired beat: one entity, two observations, the shape the segment rule governs. */
const TWO_STATES = [
  { key: "2004", label: "2004", value: 41 },
  { key: "2022", label: "2022", value: 28 },
];
const SEVENTY_FIVE = Array.from({ length: 75 }, (_, i) => ({
  key: String(1950 + i),
  label: String(1950 + i),
  value: 10 + i * 0.3,
}));

describe("treatment applicability", () => {
  it("should offer the printed value only where every mark can carry one", () => {
    expect(
      applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id),
    ).toContain("value-on-the-mark");
    // Seventy-five annual readings cannot each hold a label without collision, and a treatment
    // that claimed otherwise would hand the arbiter seventy-five requests to drop.
    expect(
      applicableTreatments(beatFacts(SEVENTY_FIVE)).map((t) => t.id),
    ).not.toContain("value-on-the-mark");
  });

  it("should offer the neutral comparison only when the beat actually carries one", () => {
    const withContext = beatFacts(THREE_MARKS, {
      comparisonSet: ["Chechnya", "Vietnam"],
    });
    expect(applicableTreatments(withContext).map((t) => t.id)).toContain(
      "context-in-neutral-at-the-subject-scale",
    );
    expect(
      applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id),
    ).not.toContain("context-in-neutral-at-the-subject-scale");
  });

  it("should offer the depicting mark only when the beat supplies one", () => {
    const drawn = beatFacts(THREE_MARKS, {
      unitMark: "<path d='M0 0 L10 10' />",
    });
    expect(applicableTreatments(drawn).map((t) => t.id)).toContain(
      "mark-depicts-its-subject",
    );
    // There is no drawing of a megatonne. Without a supplied mark the treatment does not apply,
    // and the encoding falls back to a plain unit shape.
    expect(
      applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id),
    ).not.toContain("mark-depicts-its-subject");
  });

  it("should permit joining two observations only when both states are named", () => {
    // THE RULE THAT REPLACED A REFUSED ONE. `two-points-are-not-a-line` said: with exactly two
    // observations, do not draw a line, because a line invents a trajectory the data does not
    // contain. Re-checked on the corrected corpus, FOUR independent publications draw the segment —
    // Ferdio straight, ABC straight, Reuters as a sloping roofline, Information is Beautiful curved.
    // A rule contradicted by four desks is not a rule, and waiting for a second publication to file
    // it (METHOD correction 4) was waiting for evidence that had already arrived against it.
    //
    // What those four desks actually obey is this: the danger was never the segment, it is an
    // unlabelled axis underneath it. Name both states at the marks and there is nothing between them
    // for anything to have happened on.
    const paired = beatFacts(TWO_STATES, { states: ["2004", "2022"] });
    expect(applicableTreatments(paired).map((t) => t.id)).toContain(
      "segment-between-two-named-states",
    );
  });

  it("should refuse the segment where the states are not named", () => {
    // Two dots and a line with nothing saying what either end IS: exactly the reading the refused
    // treatment was right to fear, and the only one it was right about.
    // A pair with ONE end unnamed is the case that matters, and the one a first version of these
    // facts could not express: counting only the named states made this beat look like a single
    // observation, so the naming half of the rule went untested and a mutation removing it stayed
    // green. States are counted as declared; naming is asked separately.
    const unnamed = beatFacts(TWO_STATES, { states: ["2004", ""] });
    expect(applicableTreatments(unnamed).map((t) => t.id)).not.toContain(
      "segment-between-two-named-states",
    );
    expect(
      applicableTreatments(beatFacts(TWO_STATES)).map((t) => t.id),
    ).not.toContain("segment-between-two-named-states");
  });

  it("should refuse the segment where a continuous axis runs between the two states", () => {
    // A time axis between 2004 and 2022 is a promise that the years in between are on the plot. A
    // segment across it says the change was linear, which is the invention the refused treatment
    // named. Ferdio's own `viz19` fails this from inside the desk that supplies five references
    // which pass.
    const spanned = beatFacts(TWO_STATES, {
      states: ["2004", "2022"],
      continuousAxis: true,
    });
    expect(applicableTreatments(spanned).map((t) => t.id)).not.toContain(
      "segment-between-two-named-states",
    );
  });

  it("should refuse the segment on a series that is not a pair", () => {
    const three = beatFacts(THREE_MARKS, { states: ["2004", "2013", "2022"] });
    expect(applicableTreatments(three).map((t) => t.id)).not.toContain(
      "segment-between-two-named-states",
    );
  });

  it("should offer the net change only where the beat declares two levels to span", () => {
    // THE PRECISION A DIRECTED RENDER WAS MISSING, and it was found the way `crossing-marked` was:
    // by rendering a beat through the base and looking at what the plate did not say. The German
    // bridge's title asserts 143 TWh de moins; the plate carried 639.2 and 496.0 and nothing else,
    // in all three directions at once. The value is one the beat's own arithmetic already holds —
    // `render-directions.mjs` replays it to check the bridge reconciles — and it was thrown away.
    const bridge = beatFacts(THREE_MARKS, { levels: [639.2, 496] });
    expect(applicableTreatments(bridge).map((t) => t.id)).toContain(
      "net-change-between-declared-levels",
    );
    expect(bridge.netChange).toBeCloseTo(-143.2, 5);
  });

  it("should refuse the net change where there is nothing to span", () => {
    // One level is a number, not a distance. A beat that states where it ended without stating
    // where it began has no net change to draw, and inventing an origin is the failure the whole
    // derived kind exists to avoid.
    for (const levels of [[], [496]])
      expect(
        applicableTreatments(beatFacts(THREE_MARKS, { levels })).map((t) => t.id),
      ).not.toContain("net-change-between-declared-levels");
  });

  it("should name the band where two mirrored halves change places", () => {
    // THE PRECISION A MIRRORED BEAT WAS MISSING. A pyramid's whole shape is two halves trading
    // places somewhere up the scale, and no reference in the family names where — measured on the
    // Swiss beat, men lead every band to 55-59 and women every band from 60-64, and the two bars at
    // the crossing differ by 841 people out of 585 263, about a third of a pixel.
    const swiss = beatFacts(THREE_MARKS, {
      mirrored: [
        { key: "0-4", left: 222640, right: 211390 },
        { key: "55-59", left: 341000, right: 339000 },
        { key: "60-64", left: 292211, right: 293052 },
        { key: "65-69", left: 244000, right: 251000 },
      ],
    });
    expect(swiss.mirrorCrossingKey).toBe("60-64");
    expect(applicableTreatments(swiss).map((t) => t.id)).toContain(
      "mirrored-halves-cross-at-a-named-band",
    );
  });

  it("should refuse the crossing where the same half leads throughout", () => {
    // A shape whose halves never change places has no crossing, and naming one would be an
    // assertion the data does not carry.
    const never = beatFacts(THREE_MARKS, {
      mirrored: [
        { key: "a", left: 10, right: 8 },
        { key: "b", left: 12, right: 9 },
        { key: "c", left: 14, right: 11 },
      ],
    });
    expect(never.mirrorCrossingKey).toBeNull();
    expect(applicableTreatments(never).map((t) => t.id)).not.toContain(
      "mirrored-halves-cross-at-a-named-band",
    );
  });

  it("should name the halves in words only where the beat is mirrored", () => {
    const mirrored = beatFacts(THREE_MARKS, {
      mirrored: [
        { key: "a", left: 1, right: 2 },
        { key: "b", left: 3, right: 4 },
      ],
    });
    expect(applicableTreatments(mirrored).map((t) => t.id)).toContain("name-each-half-in-words");
    expect(applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id)).not.toContain(
      "name-each-half-in-words",
    );
  });

  it("should state the share on the side of a threshold the beat declares", () => {
    // THE PRECISION A DISTRIBUTION WAS MISSING. The title asserts six in ten countries under four
    // tonnes; the plate drew a median at 3.1 and neither the line nor the share. Both are in the
    // beat's own numbers, and the threshold is DECLARED because a distribution has no natural cut.
    const spread = beatFacts(THREE_MARKS, {
      observations: [0.3, 1.5, 2.2, 3.9, 4.1, 12, 30],
      threshold: 4,
    });
    expect(spread.countBelowThreshold).toBe(4);
    expect(spread.shareBelowThreshold).toBeCloseTo(4 / 7, 5);
    expect(applicableTreatments(spread).map((t) => t.id)).toContain(
      "share-on-the-declared-side-of-a-threshold",
    );
  });

  it("should refuse the share where the beat declares no threshold", () => {
    // A renderer that picked its own cut would be asserting an editorial judgement the beat has not
    // made. Readings without a declared level carry no share to state.
    const noCut = beatFacts(THREE_MARKS, { observations: [1, 2, 3] });
    expect(noCut.shareBelowThreshold).toBeNull();
    expect(applicableTreatments(noCut).map((t) => t.id)).not.toContain(
      "share-on-the-declared-side-of-a-threshold",
    );
  });

  it("should name bins by both edges only where the beat declares bins", () => {
    const binned = beatFacts(THREE_MARKS, {
      bins: [
        { lo: 0, hi: 4, count: 5 },
        { lo: 4, hi: 8, count: 2, open: true },
      ],
    });
    expect(binned.hasOpenTopBin).toBe(true);
    expect(applicableTreatments(binned).map((t) => t.id)).toContain(
      "bin-named-by-both-edges-and-an-open-top",
    );
    expect(applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id)).not.toContain(
      "bin-named-by-both-edges-and-an-open-top",
    );
  });

  it("should state the spread on each side of a break the beat declares", () => {
    // THE PRECISION A CLOUD WAS MISSING. The title asserted that beyond $30,000 income buys far
    // less life expectancy; the plate drew 165 dots and neither the line nor either band. Below the
    // break, 124 countries across 41.1 years; above it, 41 across 13.9 — three times narrower,
    // which is what the sentence means, and it was never on the plate.
    const cloud = beatFacts(THREE_MARKS, {
      pairs: [
        { x: 1000, y: 55 },
        { x: 5000, y: 70 },
        { x: 20000, y: 80 },
        { x: 40000, y: 79 },
        { x: 90000, y: 83 },
      ],
      breakAt: 30000,
    });
    expect(cloud.spreadEachSideOfBreak!.below.range).toBeCloseTo(25, 5);
    expect(cloud.spreadEachSideOfBreak!.above.range).toBeCloseTo(4, 5);
    expect(applicableTreatments(cloud).map((t) => t.id)).toContain(
      "declared-break-with-the-spread-on-each-side",
    );
  });

  it("should refuse the break where one side of it is empty", () => {
    // A break past every reading is not a break: there is no second band to compare, and stating
    // one would be a comparison against nothing.
    const oneSided = beatFacts(THREE_MARKS, {
      pairs: [
        { x: 1000, y: 55 },
        { x: 5000, y: 70 },
      ],
      breakAt: 30000,
    });
    expect(oneSided.spreadEachSideOfBreak).toBeNull();
    expect(applicableTreatments(oneSided).map((t) => t.id)).not.toContain(
      "declared-break-with-the-spread-on-each-side",
    );
  });

  it("should separate an apparatus label from its qualifier only where the beat declares one", () => {
    const qualified = beatFacts(THREE_MARKS, { qualifiedApparatus: ["PIB par habitant"] });
    expect(applicableTreatments(qualified).map((t) => t.id)).toContain(
      "apparatus-is-one-size-and-weight-separates-it",
    );
    expect(applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id)).not.toContain(
      "apparatus-is-one-size-and-weight-separates-it",
    );
  });

  it("should draw the entities that left, not only the ones that stayed", () => {
    // THE PRECISION A RANKING WAS MISSING, and the old plate gave the tell itself: it drew the six
    // countries in the top ten every year, said so in its subtitle, and then carried a caption
    // naming in prose the two it had discarded. Sixteen countries held a place at some point;
    // drawing six is a 62 % loss the reader cannot see.
    const churned = beatFacts(THREE_MARKS, {
      membership: [
        { key: "1990", members: ["a", "b", "gone"] },
        { key: "2000", members: ["a", "b", "new"] },
      ],
    });
    expect(churned.entitiesEver).toBe(4);
    expect(churned.entitiesThroughout).toBe(2);
    expect(applicableTreatments(churned).map((t) => t.id)).toContain("exits-are-drawn");
  });

  it("should refuse the exits treatment where nobody left", () => {
    // A ranking whose membership never changes has no exits, and marking their absence would be
    // drawing a fact the data does not carry.
    const stable = beatFacts(THREE_MARKS, {
      membership: [
        { key: "1990", members: ["a", "b"] },
        { key: "2000", members: ["b", "a"] },
      ],
    });
    expect(stable.entitiesEver).toBe(stable.entitiesThroughout);
    expect(applicableTreatments(stable).map((t) => t.id)).not.toContain("exits-are-drawn");
  });

  it("should attach the rank to the entry wherever the beat is a ranking over states", () => {
    const ranking = beatFacts(THREE_MARKS, {
      membership: [
        { key: "1990", members: ["a", "b"] },
        { key: "2000", members: ["b", "a"] },
      ],
    });
    expect(applicableTreatments(ranking).map((t) => t.id)).toContain("rank-is-printed-on-the-entry");
    expect(applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id)).not.toContain(
      "rank-is-printed-on-the-entry",
    );
  });

  it("should let the axis go where every bar is labelled, and keep it where they cannot be", () => {
    const few = beatFacts(THREE_MARKS, { groups: [{ key: "a", bars: 2 }, { key: "b", bars: 2 }] });
    expect(applicableTreatments(few).map((t) => t.id)).toContain(
      "every-bar-labelled-lets-the-axis-go",
    );
    // Seventy-five BARS cannot each carry a number, so the axis is the only way a magnitude can be
    // read — the same floor `value-on-the-mark` faces, measured against the same evidence.
    const many = beatFacts(SEVENTY_FIVE, { bars: 75 });
    expect(applicableTreatments(many).map((t) => t.id)).not.toContain(
      "every-bar-labelled-lets-the-axis-go",
    );
  });

  it("should draw a group boundary only where groups hold more than one bar", () => {
    const grouped = beatFacts(THREE_MARKS, {
      groups: [{ key: "a", bars: 2 }, { key: "b", bars: 2 }],
    });
    expect(applicableTreatments(grouped).map((t) => t.id)).toContain("the-group-boundary-is-drawn");
    // One bar per group is not grouped: there is no boundary a reader could mistake for a gap.
    const single = beatFacts(THREE_MARKS, {
      groups: [{ key: "a", bars: 1 }, { key: "b", bars: 1 }],
    });
    expect(applicableTreatments(single).map((t) => t.id)).not.toContain(
      "the-group-boundary-is-drawn",
    );
  });

  it("should choose the order only where the categories declare no sequence of their own", () => {
    const free = beatFacts(THREE_MARKS, {
      groups: [{ key: "a", bars: 2 }, { key: "b", bars: 2 }],
    });
    expect(applicableTreatments(free).map((t) => t.id)).toContain("order-is-chosen-from-the-answer");
    // A date order or a declared accounting order IS the argument, and resorting it destroys one.
    const sequenced = beatFacts(THREE_MARKS, {
      groups: [{ key: "a", bars: 2 }, { key: "b", bars: 2 }],
      declaredSequence: "calendar",
    });
    expect(applicableTreatments(sequenced).map((t) => t.id)).not.toContain(
      "order-is-chosen-from-the-answer",
    );
  });

  it("should offer the accent rule on every beat, because it is a floor rather than an option", () => {
    for (const facts of [beatFacts(THREE_MARKS), beatFacts(SEVENTY_FIVE)])
      expect(applicableTreatments(facts).map((t) => t.id)).toContain(
        "accent-marks-the-thread",
      );
  });

  it("should name, for every offered treatment, a register that exists", () => {
    const facts = beatFacts(THREE_MARKS, {
      comparisonSet: ["Vietnam"],
      unitMark: "<circle r='3' />",
    });
    const offered = applicableTreatments(facts);
    expect(offered.length).toBeGreaterThan(0);
    for (const treatment of offered) {
      expect(treatment.draws.length, treatment.id).toBeGreaterThan(0);
      for (const register of treatment.draws)
        expect(REGISTERS, treatment.id).toContain(register);
    }
  });

  it("should return treatments in a stable order, highest priority first", () => {
    const facts = beatFacts(THREE_MARKS, {
      comparisonSet: ["Vietnam"],
      unitMark: "<circle r='3' />",
    });
    const priorities = applicableTreatments(facts).map((t) => t.priority);
    expect([...priorities].sort((a, b) => b - a)).toEqual(priorities);
  });

  it("should hold exactly the treatments the corpus has filed, in both directions", () => {
    if (!existsSync(FILED)) return;
    const filed = readdirSync(FILED)
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, ""))
      .sort();
    const coded = TREATMENTS.map((t) => t.id).sort();
    // A treatment in code with no filed evidence is a decision taken without a reference.
    // A filed treatment with no code is knowledge that never reached a pixel.
    expect(coded).toEqual(filed);
  });

  it("should agree with each filed record about which registers it writes into", () => {
    if (!existsSync(FILED)) return;
    for (const treatment of TREATMENTS) {
      const record = readFileSync(join(FILED, `${treatment.id}.md`), "utf8");
      const declared = (record.match(/^- draws:\s*(.+)$/m)?.[1] ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .sort();
      expect(declared, treatment.id).toEqual([...treatment.draws].sort());
    }
  });

  it("should offer the three deviation treatments only where the values fall on both sides of zero", () => {
    // The diverging family's whole grammar rests on one fact and it is a fact about the DATA, not
    // about the chart type someone chose: a zero rule painted over the bars, a value beyond the
    // growing tip, and a second hue bought for the sign all assume there are two signs to tell
    // apart. A one-signed field drawn this way is a bar chart with a decorative complication.
    const deviations = [
      { key: "hr", label: "Croatia", value: 0.03 },
      { key: "cy", label: "Cyprus", value: -0.52 },
      { key: "lu", label: "Luxembourg", value: -20.48 },
    ];
    const offered = applicableTreatments(beatFacts(deviations)).map((t) => t.id);
    expect(offered).toContain("zero-rule-painted-over-the-bars");
    expect(offered).toContain("value-beyond-the-growing-tip-in-ink");
    expect(offered).toContain("sign-is-direction-and-hue-only-doubles-it");

    // THREE_MARKS is all positive — the same three rows with the rise removed.
    const oneSigned = applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id);
    expect(oneSigned).not.toContain("zero-rule-painted-over-the-bars");
    expect(oneSigned).not.toContain("value-beyond-the-growing-tip-in-ink");
    expect(oneSigned).not.toContain("sign-is-direction-and-hue-only-doubles-it");
  });

  it("should not offer a value beyond the tip where the beat carries no marks to label", () => {
    // The other half of that treatment's predicate. A beat can diverge about zero and still have
    // nothing to print a number on — the value rides a mark or it rides nothing.
    const marksome = beatFacts([
      { key: "a", label: "A", value: 1 },
      { key: "b", label: "B", value: -1 },
    ]);
    expect(applicableTreatments(marksome).map((t) => t.id)).toContain(
      "value-beyond-the-growing-tip-in-ink",
    );
    expect(marksome.markCount).toBeGreaterThan(0);

    const markless = { ...marksome, markCount: 0 };
    expect(applicableTreatments(markless).map((t) => t.id)).not.toContain(
      "value-beyond-the-growing-tip-in-ink",
    );
  });

  it("should offer the two bar rules to a ranking of bars and to no line", () => {
    // The predicates were filed group-shaped by the family they were harvested from, and the
    // evidence under them is not: Ferdio's six bars have no groups, and ONS's twelve COICOP
    // divisions are one series. A ten-column ranking states its bars and gets both rules.
    const ranking = applicableTreatments(beatFacts(THREE_MARKS, { bars: 10 })).map((t) => t.id);
    expect(ranking).toContain("every-bar-labelled-lets-the-axis-go");
    expect(ranking).toContain("order-is-chosen-from-the-answer");

    // A reading is not a bar. Seventy-five points on a line get neither, and that is the whole
    // reason the fix is a fact about bars rather than a looser predicate.
    const line = applicableTreatments(beatFacts(SEVENTY_FIVE, { continuousAxis: true })).map(
      (t) => t.id,
    );
    expect(line).not.toContain("every-bar-labelled-lets-the-axis-go");
    expect(line).not.toContain("order-is-chosen-from-the-answer");
  });

  it("should bracket a claim's set only where that set is a run of the marks", () => {
    // "China is more than the next five put together" names ranks 2 to 6 — a run, so a bracket can
    // name it. The same claim about a scattered three would need each member marked, and gets no
    // bracket rather than a wrong one.
    const ranked = [
      { key: "cn", label: "China", value: 12.3 },
      { key: "us", label: "United States", value: 4.9 },
      { key: "in", label: "India", value: 3.2 },
      { key: "ru", label: "Russia", value: 1.8 },
    ];
    const run = beatFacts(ranked, {
      subject: "China",
      comparisonSet: [{ key: "us" }, { key: "in" }, { key: "ru" }],
    });
    expect(run.comparisonIsContiguous).toBe(true);
    expect(applicableTreatments(run).map((t) => t.id)).toContain(
      "the-set-a-claim-adds-up-is-drawn-as-a-set",
    );

    const scattered = beatFacts(ranked, {
      subject: "China",
      comparisonSet: [{ key: "us" }, { key: "ru" }],
    });
    expect(scattered.comparisonIsContiguous).toBe(false);
    expect(applicableTreatments(scattered).map((t) => t.id)).not.toContain(
      "the-set-a-claim-adds-up-is-drawn-as-a-set",
    );

    // And a member the data does not carry is not a set at all.
    const stale = beatFacts(ranked, { comparisonSet: [{ key: "us" }, { key: "br" }] });
    expect(stale.comparisonIsContiguous).toBe(false);
  });

  it("should offer the distribution rules to a beat that draws summaries, and to no other", () => {
    // A box, a band, an interval: a mark standing for readings the reader cannot see. Two of the
    // three rules need nothing else; the third needs the readings themselves.
    const decades = beatFacts(THREE_MARKS, {
      summaries: [
        { key: "1970s", n: 10 },
        { key: "2020s", n: 5 },
      ],
      observations: Array.from({ length: 15 }, (_, i) => 4 + i * 0.3),
    });
    const offered = applicableTreatments(decades).map((t) => t.id);
    expect(offered).toContain("the-distribution-is-furniture-and-the-case-is-ink");
    expect(offered).toContain("every-band-names-its-own-statistic");
    expect(offered).toContain("the-sample-is-drawn-beside-its-own-summary");

    const noSummaries = applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id);
    expect(noSummaries).not.toContain("the-distribution-is-furniture-and-the-case-is-ink");
    expect(noSummaries).not.toContain("every-band-names-its-own-statistic");
    expect(noSummaries).not.toContain("the-sample-is-drawn-beside-its-own-summary");
  });

  it("should not offer to draw a sample it cannot draw", () => {
    // The rule answers `boxplot.md`'s named failure — five points and five thousand draw the same
    // rectangle — but past a few dozen readings per summary the dots are a smear, not a sample.
    const drawable = beatFacts(THREE_MARKS, {
      summaries: [{ key: "a", n: 20 }],
      observations: Array.from({ length: 20 }, (_, i) => i),
    });
    expect(applicableTreatments(drawable).map((t) => t.id)).toContain(
      "the-sample-is-drawn-beside-its-own-summary",
    );

    const smear = beatFacts(THREE_MARKS, {
      summaries: [{ key: "a", n: 4000 }],
      observations: Array.from({ length: 4000 }, (_, i) => i),
    });
    expect(applicableTreatments(smear).map((t) => t.id)).not.toContain(
      "the-sample-is-drawn-beside-its-own-summary",
    );
    // And a summary whose readings the beat does not carry cannot draw them either.
    const noReadings = beatFacts(THREE_MARKS, { summaries: [{ key: "a", n: 20 }] });
    expect(applicableTreatments(noReadings).map((t) => t.id)).not.toContain(
      "the-sample-is-drawn-beside-its-own-summary",
    );
  });

  it("should offer the radar rules only to a beat with spokes enough to close a polygon", () => {
    // `references/types/radar.md`: "a radar needs at least three axes to draw a polygon at all;
    // two variables is a scatter plot, not a radar wearing extra decoration."
    const radar = beatFacts(THREE_MARKS, {
      spokes: [{ key: "wind" }, { key: "solar" }, { key: "nuclear" }],
    });
    const offered = applicableTreatments(radar).map((t) => t.id);
    expect(offered).toContain("a-radius-is-not-read-by-eye");
    expect(offered).toContain("the-grid-is-circles-and-the-ceiling-is-drawn");
    expect(offered).toContain("the-benchmark-is-captioned");

    const two = applicableTreatments(
      beatFacts(THREE_MARKS, { spokes: [{ key: "wind" }, { key: "solar" }] }),
    ).map((t) => t.id);
    expect(two).not.toContain("a-radius-is-not-read-by-eye");
    expect(two).not.toContain("the-grid-is-circles-and-the-ceiling-is-drawn");
    expect(two).not.toContain("the-benchmark-is-captioned");
  });

  it("should offer the flow rules to a beat that draws flows, and keep conservation for the plates that need it", () => {
    const flows = [
      { from: "Nuclear", to: "France", value: 380 },
      { from: "Nuclear", to: "Sweden", value: 50 },
      { from: "Coal", to: "Germany", value: 106 },
    ];
    const offered = applicableTreatments(beatFacts(THREE_MARKS, { flows })).map((t) => t.id);
    expect(offered).toContain("every-node-carries-its-own-total");
    expect(offered).toContain("the-neutral-is-the-largest-area");
    expect(offered).toContain("ribbons-are-translucent-so-crossings-are-honest");
    // Every flow here is well over 1 % of the total, so nothing is at risk of being dropped.
    expect(offered).not.toContain("conservation-is-kept-visible");

    const withAHairline = applicableTreatments(
      beatFacts(THREE_MARKS, { flows: [...flows, { from: "Oil", to: "Norway", value: 0.4 }] }),
    ).map((t) => t.id);
    expect(withAHairline).toContain("conservation-is-kept-visible");

    const noFlows = applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id);
    for (const id of [
      "every-node-carries-its-own-total",
      "the-neutral-is-the-largest-area",
      "ribbons-are-translucent-so-crossings-are-honest",
      "conservation-is-kept-visible",
    ])
      expect(noFlows).not.toContain(id);
  });

  it("should offer the variable-width rules only where a width carries a quantity", () => {
    const columns = beatFacts(THREE_MARKS, {
      widths: [
        { key: "France", value: 561.8 },
        { key: "Germany", value: 496 },
        { key: "Switzerland", value: 78.4 },
      ],
    });
    const offered = applicableTreatments(columns).map((t) => t.id);
    expect(offered).toContain("the-width-dimension-is-named-on-the-plate");
    expect(offered).toContain("a-narrow-cell-degrades-its-label-rather-than-dropping-it");
    expect(columns.smallestWidthShare).toBeCloseTo(78.4 / 1136.2, 4);

    const plain = applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id);
    expect(plain).not.toContain("the-width-dimension-is-named-on-the-plate");
    expect(plain).not.toContain("a-narrow-cell-degrades-its-label-rather-than-dropping-it");
  });

  it("should offer the span rules to a beat with durations, and the open-end rule only where one is open", () => {
    const closed = beatFacts(THREE_MARKS, {
      spans: [
        { key: "Canada", from: 1990, to: 2016 },
        { key: "Ukraine", from: 1990, to: 1995 },
      ],
    });
    expect(applicableTreatments(closed).map((t) => t.id)).toContain("both-dates-in-the-row-label");
    expect(applicableTreatments(closed).map((t) => t.id)).not.toContain("an-open-span-says-it-is-open");
    expect(closed.interruptedRows).toBe(0);

    const withOpen = beatFacts(THREE_MARKS, {
      spans: [
        { key: "Canada", from: 1990, to: 2016 },
        { key: "India", from: 1990, to: null },
        { key: "Italy", from: 1990, to: 1990 },
        { key: "Italy", from: 1992, to: 2005 },
      ],
    });
    expect(applicableTreatments(withOpen).map((t) => t.id)).toContain("an-open-span-says-it-is-open");
    expect(withOpen.openSpanCount).toBe(1);
    // A row drawn in two pieces is a row with a gap, and a gap is a finding.
    expect(withOpen.interruptedRows).toBe(1);

    expect(applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id)).not.toContain(
      "both-dates-in-the-row-label",
    );
  });

  it("should offer the bullet rules where a measure carries a comparative state", () => {
    const rows = [
      { key: "pl", label: "Poland", value: 31.1 },
      { key: "de", label: "Germany", value: 58.6 },
      { key: "fr", label: "France", value: 94.9 },
    ];
    const withMarkers = beatFacts(rows, {
      markers: [
        { key: "pl", value: 13.8 },
        { key: "de", value: 43.8 },
        { key: "fr", value: 92.2 },
      ],
      scaleCeiling: 100,
    });
    const offered = applicableTreatments(withMarkers).map((t) => t.id);
    expect(offered).toContain("the-target-is-named-on-the-line-that-draws-it");
    expect(offered).toContain("the-track-runs-the-full-scale-so-the-remainder-is-legible");
    expect(offered).toContain("two-states-of-one-measure-are-one-hue-at-two-chromas");
    expect(offered).toContain("the-verdict-is-written-as-a-derived-number");

    // An OPEN scale gets no full-width track: it would be a claim about a maximum nobody stated.
    const open = applicableTreatments(
      beatFacts(rows, { markers: [{ key: "pl", value: 13.8 }] }),
    ).map((t) => t.id);
    expect(open).not.toContain("the-track-runs-the-full-scale-so-the-remainder-is-legible");
    // And a verdict on SOME rows is a plate that looks complete and is not.
    expect(open).not.toContain("the-verdict-is-written-as-a-derived-number");
    expect(open).toContain("the-target-is-named-on-the-line-that-draws-it");

    const bare = applicableTreatments(beatFacts(rows)).map((t) => t.id);
    for (const id of [
      "the-target-is-named-on-the-line-that-draws-it",
      "the-track-runs-the-full-scale-so-the-remainder-is-legible",
      "two-states-of-one-measure-are-one-hue-at-two-chromas",
      "the-verdict-is-written-as-a-derived-number",
    ])
      expect(bare).not.toContain(id);
  });

  it("should offer the stacked-layer rules, and the axis refusal only where the baseline is free", () => {
    const layers = [
      { key: "hydro", peak: 44.9 },
      { key: "nuclear", peak: 26.4 },
      { key: "solar", peak: 5.7 },
    ];
    const free = beatFacts(THREE_MARKS, { layers, freeBaseline: true });
    const offered = applicableTreatments(free).map((t) => t.id);
    expect(offered).toContain("a-band-is-named-inside-itself-or-it-is-texture");
    expect(offered).toContain("a-free-baseline-forbids-a-value-axis");
    expect(offered).toContain("the-layer-order-is-the-argument");

    // A stack that sits on zero keeps its axis: the refusal is about the free baseline, not about
    // stacking.
    const grounded = applicableTreatments(beatFacts(THREE_MARKS, { layers })).map((t) => t.id);
    expect(grounded).toContain("a-band-is-named-inside-itself-or-it-is-texture");
    expect(grounded).not.toContain("a-free-baseline-forbids-a-value-axis");

    // Two layers are a comparison, not a stack whose order can hide a crossing.
    const two = applicableTreatments(
      beatFacts(THREE_MARKS, { layers: layers.slice(0, 2), freeBaseline: true }),
    ).map((t) => t.id);
    expect(two).not.toContain("the-layer-order-is-the-argument");

    const none = applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id);
    expect(none).not.toContain("a-band-is-named-inside-itself-or-it-is-texture");
  });

  it("should offer the diverging-stack rules by the shape of the stack", () => {
    const both = beatFacts(THREE_MARKS, { sides: { left: 3, right: 5, centre: "Nuclear" } });
    const offered = applicableTreatments(both).map((t) => t.id);
    expect(offered).toContain("the-ramp-deepens-outward");
    expect(offered).toContain("the-neutral-straddles-the-centre");

    // One level on a side is not a ramp.
    const thin = applicableTreatments(
      beatFacts(THREE_MARKS, { sides: { left: 1, right: 5, centre: "Nuclear" } }),
    ).map((t) => t.id);
    expect(thin).not.toContain("the-ramp-deepens-outward");
    expect(thin).toContain("the-neutral-straddles-the-centre");

    // And a stack with nothing in the middle has no neutral to straddle.
    const noCentre = applicableTreatments(
      beatFacts(THREE_MARKS, { sides: { left: 3, right: 5 } }),
    ).map((t) => t.id);
    expect(noCentre).toContain("the-ramp-deepens-outward");
    expect(noCentre).not.toContain("the-neutral-straddles-the-centre");
  });

  it("should offer the grid rules by cell count, and the missing-cell rule only where the grid has holes", () => {
    const cells = Array.from({ length: 366 }, (_, i) => ({ key: `d${i}`, value: i % 30 }));
    const full = beatFacts(THREE_MARKS, { cells });
    const offered = applicableTreatments(full).map((t) => t.id);
    expect(offered).toContain("a-sequential-grid-is-one-hue-cluster");
    expect(offered).toContain("the-key-prints-its-breaks-in-the-data-s-units");
    expect(offered).not.toContain("a-missing-cell-is-drawn-as-missing");

    const holed = applicableTreatments(
      beatFacts(THREE_MARKS, { cells, impossibleCells: 6 }),
    ).map((t) => t.id);
    expect(holed).toContain("a-missing-cell-is-drawn-as-missing");

    // A handful of cells is a table, not a grid on a ramp.
    const few = applicableTreatments(
      beatFacts(THREE_MARKS, { cells: cells.slice(0, 8), impossibleCells: 2 }),
    ).map((t) => t.id);
    expect(few).not.toContain("a-sequential-grid-is-one-hue-cluster");
    expect(few).not.toContain("a-missing-cell-is-drawn-as-missing");
    expect(few).not.toContain("the-key-prints-its-breaks-in-the-data-s-units");
  });

  it("should offer the paired rules, and the too-close rule only where a gap nearly vanishes", () => {
    const wide = beatFacts(THREE_MARKS, {
      subject: "Norway",
      pairs: [
        { key: "pl", from: 74.7, to: 79.7 },
        { key: "us", from: 76.6, to: 79.1 },
        { key: "no", from: 78.8, to: 83.4 },
      ],
    });
    const offered = applicableTreatments(wide).map((t) => t.id);
    expect(offered).toContain("the-connector-is-either-furniture-or-the-mark");
    expect(offered).toContain("the-subject-is-ringed-not-recoloured");
    expect(offered).not.toContain("a-pair-too-close-to-draw-is-written");

    // One pair that barely moves against a plate whose range is 8.7 years.
    const tight = applicableTreatments(
      beatFacts(THREE_MARKS, {
        pairs: [
          { key: "pl", from: 74.7, to: 79.7 },
          { key: "xx", from: 79.0, to: 79.1 },
          { key: "no", from: 78.8, to: 83.4 },
        ],
      }),
    ).map((t) => t.id);
    expect(tight).toContain("a-pair-too-close-to-draw-is-written");

    const none = applicableTreatments(beatFacts(THREE_MARKS)).map((t) => t.id);
    expect(none).not.toContain("the-connector-is-either-furniture-or-the-mark");
    expect(none).not.toContain("a-pair-too-close-to-draw-is-written");
    // No subject named, so nothing to ring: the emphasis rule needs a beat that says what it is
    // about, which is the point of it.
    expect(none).not.toContain("the-subject-is-ringed-not-recoloured");
  });
});
