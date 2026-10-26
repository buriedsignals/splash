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
