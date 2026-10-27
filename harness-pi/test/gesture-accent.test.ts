import { describe, expect, it } from "bun:test";
import { GestureRefusal, implicitAccent, validateGestures } from "../craft/_shared/gesture-core.mjs";
import * as scrolly from "../craft/_shared/gesture-scrolly.mjs";
import * as statics from "../craft/_shared/gesture-static.mjs";
import * as video from "../craft/_shared/gesture-video.mjs";
import * as web from "../craft/_shared/gesture-web.mjs";

// The schedulers are plain JS: their states are read as data here.
const { stageScrolly } = scrolly as { stageScrolly: (input: object) => any };
const { scheduleVideo } = video as { scheduleVideo: (input: object) => any };
const { composeStatic } = statics as { composeStatic: (input: object) => any };
const { scheduleWeb } = web as { scheduleWeb: (input: object) => any };

const ROWS = [
  { name: "Lisboa", value: 214 },
  { name: "Porto", value: 96 },
  { name: "Braga", value: 31 },
  { name: "Coimbra", value: 28 },
  { name: "Aveiro", value: 14 },
  { name: "Faro", value: 11 },
];
const CLAIM = { takeaway: "Lisboa alone carries 214 of the 394 million trips these six Portuguese city networks recorded in 2025 — more than twice Porto's 96 million." };
/** The list a 12B scrolly wrote for Lisboa (U9): no highlight, so every bar stayed grey. */
const NO_HIGHLIGHT = [
  { do: "bracket", mark: "Lisboa", of: "whole", note: "394 million trips", card: "Lisboa alone carries 214 of the 394 million trips." },
  { do: "compare", marks: ["Lisboa", "Porto"], note: "more than twice Porto's 96 million", card: "More than twice Porto's 96 million." },
  { do: "pull-back", card: "The chart shows the relative ridership across six major city networks." },
];
const valid = (gestures: object[], format: string) => validateGestures({ gestures, rows: ROWS, family: "length", format, claim: CLAIM }).gestures;
const LISBOA = 0;

describe("implicitAccent", () => {
  it("should accent the first row a gesture acts on when no gesture highlights one", () => {
    expect(implicitAccent(valid(NO_HIGHLIGHT.slice(0, 2), "static"))).toBe("Lisboa");
  });

  it("should accent nothing of its own when a gesture highlights a row", () => {
    expect(implicitAccent(valid([{ do: "highlight", mark: "Porto" }, ...NO_HIGHLIGHT.slice(0, 1)], "static"))).toBeUndefined();
  });

  it("should give the static plate its subject in the accent", () => {
    expect(composeStatic({ gestures: valid(NO_HIGHLIGHT.slice(0, 2), "static"), rows: ROWS }).accent).toEqual(["Lisboa"]);
  });

  it("should give the web page its subject in the accent at rest", () => {
    expect(scheduleWeb({ gestures: valid(NO_HIGHLIGHT.slice(0, 2), "web"), rows: ROWS }).resting.accent).toEqual(["Lisboa"]);
  });

  it("should keep the subject in the accent on every scrolly card", () => {
    const staged = stageScrolly({ gestures: NO_HIGHLIGHT, rows: ROWS, claim: CLAIM, repair: true });
    expect(staged.scheduled.states.every((s: Record<string, number>) => s[`accent${LISBOA}`] === 1)).toBe(true);
  });

  it("should keep the subject in the accent through a video's events", () => {
    const { states } = scheduleVideo({ gestures: valid(NO_HIGHLIGHT.map(({ card, ...g }) => g), "video"), rows: ROWS });
    expect(states.slice(1).every((s: Record<string, number>) => s[`accent${LISBOA}`] === 1)).toBe(true);
  });
});

describe("a scrolly card whose picture shows no figure", () => {
  it("should be refused when it carries nothing of the takeaway", () => {
    let refusal: GestureRefusal | undefined;
    try {
      stageScrolly({ gestures: NO_HIGHLIGHT, rows: ROWS, claim: CLAIM });
    } catch (error) {
      refusal = error as GestureRefusal;
    }
    expect(refusal?.field).toBe("gestures[2].card");
  });

  it("should be repaired by appending the subject and its value", () => {
    const staged = stageScrolly({ gestures: NO_HIGHLIGHT, rows: ROWS, claim: CLAIM, repair: true });
    expect(staged.cards[2].prose.at(-1)).toContain("(Lisboa: 214)");
  });

  it("should offer a sentence with the subject, not the gesture's name, when the card is missing", () => {
    const [bracket, compare, { card, ...pullBack }] = NO_HIGHLIGHT;
    let refusal: GestureRefusal | undefined;
    try {
      stageScrolly({ gestures: [bracket, compare, pullBack], rows: ROWS, claim: CLAIM });
    } catch (error) {
      refusal = error as GestureRefusal;
    }
    expect(refusal?.fix).toEqual({ set: { index: 2, field: "card", value: "Lisboa: 214" } });
  });
});

describe("a still plate's one row", () => {
  const PL = [
    { name: "Śląskie", value: 405 },
    { name: "Łódzkie", value: 402 },
    { name: "Mazowieckie", value: 388 },
    { name: "Lubelskie", value: 385 },
  ];
  const claim = { takeaway: "Mazowieckie ma najwięcej łóżek szpitalnych w kraju, ale w przeliczeniu na mieszkańca jest dopiero trzecie — wyprzedzają je Śląskie i Łódzkie." };
  /** The list a 12B wrote for the Polish beds (U9): one name and two compares, all on Mazowieckie. */
  const LIST = [
    { do: "highlight", mark: "Mazowieckie" },
    { do: "name", mark: "Mazowieckie", note: "Najwięcej łóżek całkowicie" },
    { do: "compare", marks: ["Mazowieckie", "Śląskie"], note: "Śląskie ma wyższy wskaźnik" },
    { do: "compare", marks: ["Mazowieckie", "Łódzkie"] },
  ];
  const compose = (list: object[]) => () => composeStatic({ gestures: validateGestures({ gestures: list, rows: PL, family: "length", format: "static", claim }).gestures, rows: PL, format: (v: number) => String(Math.round(v)) });
  const refusalOf = (list: object[]) => {
    try {
      compose(list)();
    } catch (error) {
      return error as GestureRefusal;
    }
  };

  it("should refuse a second note on the row, keeping the gesture", () => {
    expect(refusalOf(LIST.slice(0, 3))?.fix).toEqual({ set: { index: 2, field: "note", value: undefined } });
  });

  it("should refuse a second compare's copy in the row's band", () => {
    expect(refusalOf([LIST[0], { ...LIST[2], note: undefined }, LIST[3]])?.fix).toEqual({ remove: 2 });
  });

  it("should not count a note that only repeats the printed value", () => {
    expect(compose([{ do: "name", mark: "Mazowieckie", note: "388" }, LIST[2]])).not.toThrow();
  });
});

describe("a scrolly compare card stating a gap", () => {
  const CO2 = [
    { name: "China", value: 12289.037 },
    { name: "United States", value: 4904.1 },
    { name: "India", value: 3193.5 },
  ];
  const claim = { takeaway: "China emitted more CO₂ in 2024 than the next two emitters together.", comparison: "United States, India" };
  /** The card a 12B China scrolly shipped (U9), on two rows instead of five. */
  const card = "China's emissions were 12,289.037 million tonnes, which is 12,289.037 more than the 8,097.6 million tonnes from the next two emitters combined.";
  it("should be refused and repaired to the gap its picture draws", () => {
    const staged = stageScrolly({ gestures: [{ do: "highlight", mark: "China", card: "China: 12,289.037." }, { do: "compare", marks: ["China", "United States", "India"], card }], rows: CO2, claim, repair: true });
    expect(staged.cards[1].prose.at(-1)).toContain("which is 4,191.437 more than");
  });
});

describe("a scrolly card stating another rows' sum", () => {
  const CO2 = [
    { name: "China", value: 12289 },
    { name: "United States", value: 4904 },
    { name: "India", value: 3194 },
    { name: "Russia", value: 1781 },
  ];
  const claim = { takeaway: "China emitted more CO₂ in 2024 than the next three emitters together.", comparison: "United States, India, Russia" };
  it("should be repaired to its picture's own figure, not to the nearest row", () => {
    const staged = stageScrolly({ gestures: [{ do: "highlight", mark: "China", card: "China: 12,289." }, { do: "name", mark: "United States", card: "The next three combined for 9,879." }], rows: CO2, claim, repair: true });
    expect(staged.cards[1].prose.join(" ")).not.toContain("12,289");
  });
});
