import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  GestureRefusal,
  repairGestures,
  validateGestures,
} from "../craft/_shared/gesture-core.mjs";
import { admissible } from "../craft/_shared/gesture-registry.mjs";
import {
  countedTexts,
  countTextAt,
  EVENTS,
  scheduleVideo as schedule,
} from "../craft/_shared/gesture-video.mjs";
import { skillScriptFrom } from "../../shared/design-base/skill-script.mjs";

// The scheduler is plain JS: its states and plan are read as data here.
const scheduleVideo = schedule as (input: object) => any;

// The chart-video skill's own check, found as the kits find it (never copied, never edited).
const { assertEventStates } = await import(
  skillScriptFrom(
    import.meta.dirname,
    "chart-video",
    "scripts",
    "choreography.mjs",
  )
);

const CHECKOUT = resolve(import.meta.dirname, "..", "..");
const KIT = join(
  CHECKOUT,
  "harness-pi",
  "craft",
  "video",
  "bar-and-column.gestures",
);
// The kit's timing contract imports its type from `#shared`, which only a beat's root resolves: read it as data.
const { GESTURE_VIDEO_TIMING } = await import(join(KIT, "timing-contract.ts"));

const LISBOA = [
  { name: "Lisboa", value: 214 },
  { name: "Porto", value: 96 },
  { name: "Braga", value: 31 },
  { name: "Coimbra", value: 28 },
  { name: "Aveiro", value: 14 },
  { name: "Faro", value: 11 },
];
const LISBOA_CLAIM = {
  takeaway:
    "Lisboa alone carries 214 of the 394 million trips these six Portuguese city networks recorded in 2025 — more than twice Porto's 96 million.",
};
/** The list the 12B wrote for Lisboa in the U10 probe (run #1), unchanged. */
const LISBOA_GESTURES = [
  { do: "highlight", mark: "Lisboa" },
  {
    do: "compare",
    marks: ["Lisboa", "Porto"],
    note: "more than twice Porto's 96",
  },
  { do: "bracket", mark: "Lisboa", of: "whole", note: "214 of 394" },
];

const CHINA = [
  { name: "China", value: 12.29 },
  { name: "United States", value: 4.9 },
  { name: "India", value: 3.19 },
  { name: "Russia", value: 1.78 },
  { name: "Japan", value: 0.96 },
  { name: "Indonesia", value: 0.81 },
  { name: "Iran", value: 0.8 },
  { name: "Saudi Arabia", value: 0.69 },
];
const CHINA_CLAIM = {
  takeaway:
    "China emitted more CO₂ in 2024 than the next five emitters together.",
  subject: "The subject is China, the country the article opens on.",
  comparison:
    "The next five emitters together: the United States, India, Russia, Japan and Indonesia.",
};
const FIVE = ["United States", "India", "Russia", "Japan", "Indonesia"];
const CHINA_GESTURES = [
  { do: "highlight", mark: "China" },
  { do: "bracket", marks: FIVE, note: "The next five together: 11.64" },
  { do: "compare", marks: ["China", ...FIVE], note: "12.29 against 11.64" },
];

const validate = (
  gestures: object[],
  rows = LISBOA,
  claim: object = LISBOA_CLAIM,
) =>
  validateGestures({ gestures, rows, family: "length", format: "video", claim })
    .gestures;

const refusalOf = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a refusal");
};

describe("video scheduler", () => {
  it("should schedule Lisboa's three gestures into distinct reference, reveal, subject and conclusion states that assertEventStates accepts", () => {
    const { states } = scheduleVideo({
      gestures: validate(LISBOA_GESTURES),
      rows: LISBOA,
    });
    assertEventStates(states, EVENTS);
    const distinct = new Set(
      states.slice(1, 5).map((s: object) => JSON.stringify(s)),
    );
    expect(distinct.size).toBe(4);
  });

  it("should refuse a two-gesture list once, naming how many gestures to add", () => {
    const { repairs } = repairGestures({
      gestures: LISBOA_GESTURES.slice(0, 2),
      rows: LISBOA,
      family: "length",
      format: "video",
      claim: LISBOA_CLAIM,
    });
    expect([repairs.length, /add 1\b/.test(repairs[0])]).toEqual([1, true]);
  });

  it("should refuse a four-gesture list, naming the fourth as the one to drop", () => {
    const refusal = refusalOf(() =>
      validate([...LISBOA_GESTURES, { do: "name", mark: "Porto" }]),
    );
    expect([refusal.field, /fourth/.test(refusal.message)]).toEqual([
      "gestures[3]",
      true,
    ]);
  });

  it("should refuse a zoom in third position, naming pull-back for the conclusion", () => {
    const refusal = refusalOf(() =>
      validate([
        LISBOA_GESTURES[0],
        LISBOA_GESTURES[1],
        { do: "zoom", marks: ["Porto", "Braga"], note: "×2.2" },
      ]),
    );
    expect([refusal.field, /pull-back/.test(refusal.message)]).toEqual([
      "gestures[2]",
      true,
    ]);
  });

  it("should schedule China's three gestures with a hold equal to its conclusion", () => {
    const { states } = scheduleVideo({
      gestures: validate(CHINA_GESTURES, CHINA, CHINA_CLAIM),
      rows: CHINA,
    });
    expect(states[5]).toEqual(states[4]);
  });

  it("should measure every text the bracket's count passes through", () => {
    const format = {
      decimals: 1,
      small: 2,
      below: 0.995,
      decimal: ".",
      group: ",",
    };
    const unit = (t: string) => `${t} Gt`;
    const scheduled = scheduleVideo({
      gestures: validate(CHINA_GESTURES, CHINA, CHINA_CLAIM),
      rows: CHINA,
    });
    const props = { ...scheduled, timing: GESTURE_VIDEO_TIMING, format };
    const measured = new Set(countedTexts(scheduled.plan, format).map(unit));
    const bracket = scheduled.plan.find(
      (p: { do: string }) => p.do === "bracket",
    );
    const shown = new Set<string>();
    for (let frame = 0; frame < GESTURE_VIDEO_TIMING.total; frame++) {
      const text = countTextAt(props, bracket, frame);
      if (text !== null) shown.add(unit(text));
    }
    expect([
      shown.size > 1,
      [...shown].filter((t) => !measured.has(t)),
    ]).toEqual([true, []]);
  });

  it("should release a zoom at a conclusion that is not a pull-back, so the last picture is the whole chart on its first scale", () => {
    const { states } = scheduleVideo({
      gestures: validate([
        { do: "zoom", marks: ["Porto", "Braga"], note: "×2.2" },
        { do: "highlight", mark: "Lisboa" },
        { do: "annotate", mark: "Lisboa", note: "214" },
      ]),
      rows: LISBOA,
    });
    expect([states[2].hi, [states[4].lo, states[4].hi]]).toEqual([
      96,
      [states[1].lo, states[1].hi],
    ]);
  });

  it("should refuse a zoom whose note prints a factor the zoom does not apply, giving the factor that works", () => {
    const refusal = refusalOf(() =>
      scheduleVideo({
        gestures: validate([
          { do: "zoom", marks: ["Porto", "Braga"], note: "×5" },
          { do: "highlight", mark: "Lisboa" },
          { do: "pull-back" },
        ]),
        rows: LISBOA,
      }),
    );
    expect([refusal.field, (refusal.fix as any).set.value]).toEqual([
      "gestures[0].note",
      "×2",
    ]);
  });

  it("should refuse a reorder into the order the rows already hold, as a gesture that changes nothing", () => {
    const refusal = refusalOf(() =>
      scheduleVideo({
        gestures: validate([
          { do: "reorder", value: "descending" },
          { do: "highlight", mark: "Lisboa" },
          { do: "pull-back" },
        ]),
        rows: LISBOA,
      }),
    );
    expect([refusal.field, refusal.fix]).toEqual([
      "gestures[0]",
      { remove: 0 },
    ]);
  });

  it("should schedule zero and negative values on a zero baseline without refusing", () => {
    const rows = [
      { name: "Alpha", value: 30 },
      { name: "Gamma", value: 0 },
      { name: "Beta", value: -12 },
    ];
    const { states } = scheduleVideo({
      gestures: validate(
        [
          { do: "highlight", mark: "Beta" },
          { do: "annotate", mark: "Beta", note: "the only loss" },
          { do: "pull-back" },
        ],
        rows,
        { takeaway: "Beta is the only one that lost points" },
      ),
      rows,
    });
    expect([states[1].lo, states[1].hi]).toEqual([-12, 30]);
  });
});

describe("the video bar gesture kit", () => {
  it("should list exactly the admissible video Length gestures in its contract", () => {
    const contract = readFileSync(join(KIT, "CONTRACT.md"), "utf8");
    const known = new Set(
      admissible("length", "video").map((a: { do: string }) => a.do),
    );
    const listed = [...contract.matchAll(/^\| `([a-z-]+)` \| (.+) \|$/gm)]
      .map((m) => [m[1], m[2]])
      .filter(([d]) => known.has(d));
    expect(listed).toEqual(
      admissible("length", "video").map(
        (a: { do: string; meaning: string }) => [a.do, a.meaning],
      ),
    );
  });
});
