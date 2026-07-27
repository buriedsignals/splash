import { test, expect, describe } from "bun:test";
import { verifyBeats, type AuthoredBeat } from "./verify-beats";
import { suggestBeats, type SuggestedBeat } from "./beats";

const SEA_ICE =
  "year,extent\n1979,7.0\n1995,6.1\n2003,6.1\n2007,4.3\n2012,3.6\n2020,3.9\n2025,4.3";

const PLAN: SuggestedBeat[] = suggestBeats({
  nativeType: "line",
  dataCsv: SEA_ICE,
  valueUnit: "million km²",
}).beats;

/** The plan, authored in the journalist's own words — the shape the guard must let through. */
function authored(texts: string[]): AuthoredBeat[] {
  return PLAN.map((b, i) => ({ id: b.id, role: b.role, text: texts[i]! }));
}

const FAITHFUL = authored([
  "En 1979, la banquise de septembre couvrait encore 7 millions de km².",
  "En 1995 le recul est déjà engagé : 6,1.",
  "Le décrochage de 2007 ramène la surface à 4,3.",
  "Trente ans plus tard, rien n'est revenu : 4,3 encore.",
]);

// The plan the guard is tested against is the REAL one suggestBeats picks — the salient points
// of this series are 1979, 1995, 2007 and 2025, and every fixture below is written against
// those. A fixture invented around plausible-looking years (2012, the record low, which the
// salience pass does NOT pick) is how a grounding test ends up proving nothing.
test("the plan is the four salient years of this series", () => {
  expect(PLAN.map((b) => b.anchor.value)).toEqual([
    "1979",
    "1995",
    "2007",
    "2025",
  ]);
});

describe("verifyBeats — the plan that came back is still the plan", () => {
  test("accepts a faithfully authored plan", () => {
    expect(() => verifyBeats(FAITHFUL, PLAN)).not.toThrow();
  });

  test("refuses a reordered plan, naming both orders", () => {
    const swapped = [FAITHFUL[1]!, FAITHFUL[0]!, FAITHFUL[2]!, FAITHFUL[3]!];
    expect(() => verifyBeats(swapped, PLAN)).toThrow(/order changed/);
  });

  test("refuses a dropped beat with the SAME refusal as a reorder", () => {
    expect(() => verifyBeats(FAITHFUL.slice(0, 3), PLAN)).toThrow(
      /order changed/,
    );
    expect(() => verifyBeats([], PLAN)).toThrow(/order changed/);
  });

  test("refuses an invented id, naming it", () => {
    const extra = [
      ...FAITHFUL.slice(0, 3),
      { id: "beat-99", role: "payoff" as const, text: "Et voilà." },
    ];
    expect(() => verifyBeats(extra, PLAN)).toThrow(/beat-99/);
  });

  test("an authored beat has no anchor field — the coordinate cannot be moved at all", () => {
    // Structural, not checked: the authoring turn has nowhere to put an anchor, exactly as
    // confirm-angle's named slots leave the host nowhere to put a manifest path.
    const withAnchor: AuthoredBeat = {
      ...FAITHFUL[0]!,
      // @ts-expect-error `anchor` is not part of AuthoredBeat — the shape refuses it
      anchor: { kind: "x", value: "2012" },
    };
    expect(withAnchor.id).toBe("beat-1");
  });
});

describe("verifyBeats — the arc stays well formed", () => {
  test("refuses a blank claim (no beat ships that nobody authored)", () => {
    const blank = FAITHFUL.map((b, i) => (i === 2 ? { ...b, text: "  " } : b));
    expect(() => verifyBeats(blank, PLAN)).toThrow(/claim/);
  });

  test("refuses two payoffs", () => {
    const two = FAITHFUL.map((b, i) =>
      i === 2 ? { ...b, role: "payoff" as const } : b,
    );
    expect(() => verifyBeats(two, PLAN)).toThrow(/argument lands once/);
  });

  test("refuses a plan with no build between establish and payoff", () => {
    const noBuild = FAITHFUL.map((b, i) =>
      i === 1 || i === 2 ? { ...b, role: "turn" as const } : b,
    );
    expect(() => verifyBeats(noBuild, PLAN)).toThrow(/build/);
  });

  test("ACCEPTS the journalist naming the turn — the draft deliberately did not", () => {
    expect(PLAN.some((b) => b.role === "turn")).toBe(false);
    const withTurn = FAITHFUL.map((b, i) =>
      i === 2 ? { ...b, role: "turn" as const } : b,
    );
    expect(() => verifyBeats(withTurn, PLAN)).not.toThrow();
  });
});

describe("verifyBeats — claim grounding", () => {
  const cite = (i: number, text: string) =>
    FAITHFUL.map((b, k) => (k === i ? { ...b, text } : b));

  test("refuses a number that is in neither the beat's facts nor the plan's", () => {
    expect(() =>
      verifyBeats(cite(2, "La surface tombe à 2,1 millions de km²."), PLAN),
    ).toThrow(/2\.1/);
  });

  test("accepts the beat's own value, written with a French decimal comma", () => {
    expect(() =>
      verifyBeats(cite(2, "2007 : 4,3 millions de km²."), PLAN),
    ).not.toThrow();
  });

  test("refuses ANOTHER beat's value on this beat — grounding is per beat", () => {
    // 6.1 is beat-2's value; asserting it on the 2007 beat is a claim this data does not make.
    expect(() =>
      verifyBeats(cite(2, "En 2007 la surface est de 6,1."), PLAN),
    ).toThrow(/6\.1/);
  });

  test("accepts a computed plan fact — the change since the first point", () => {
    // shared.change = -2.7, shared.changePercent = -38.57
    expect(() =>
      verifyBeats(cite(3, "2,7 millions de km² de moins qu'en 1979."), PLAN),
    ).not.toThrow();
    expect(() =>
      verifyBeats(cite(3, "Une chute de 38,57 % depuis 1979."), PLAN),
    ).not.toThrow();
  });

  test("accepts a decimal rounding of a computed fact", () => {
    // -38.57 rounded to 1 decimal is -38.6, to 0 decimals -39
    expect(() =>
      verifyBeats(cite(3, "Une chute de 38,6 % depuis 1979."), PLAN),
    ).not.toThrow();
    expect(() =>
      verifyBeats(cite(3, "Une chute de 39 % depuis 1979."), PLAN),
    ).not.toThrow();
  });

  test("REFUSES a significant-figure rounding — 40 is not 38.57", () => {
    expect(() =>
      verifyBeats(cite(3, "Une chute de près de 40 % depuis 1979."), PLAN),
    ).toThrow(/40/);
  });

  test("lets one beat cite ANOTHER beat's anchor — the connective tissue of a story", () => {
    expect(() =>
      verifyBeats(
        cite(3, "Le recul entamé en 1995 ne s'est jamais inversé."),
        PLAN,
      ),
    ).not.toThrow();
  });

  test("does not read a thousands separator as two numbers", () => {
    const bar = suggestBeats({
      nativeType: "bar",
      dataCsv: "canton,primes\nGenève,8000\nVaud,7100\nZurich,6400\nUri,3200",
    }).beats;
    const ok: AuthoredBeat[] = bar.map((b, i) => ({
      id: b.id,
      role: b.role,
      text: i === 0 ? "Genève paie 8 000 francs." : "Une prime plus basse.",
    }));
    expect(() => verifyBeats(ok, bar)).not.toThrow();
  });
});
