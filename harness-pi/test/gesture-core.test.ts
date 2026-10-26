import { describe, expect, it } from "bun:test";
import {
  applyFix,
  GestureRefusal,
  validateGestures,
} from "../craft/_shared/gesture-core.mjs";

// Drawn rows as the beats draw them (the units the plate prints), from the eval stories' frozen data.
const LISBOA = {
  rows: [
    { name: "Lisboa", value: 214 },
    { name: "Porto", value: 96 },
    { name: "Braga", value: 31 },
    { name: "Coimbra", value: 28 },
    { name: "Aveiro", value: 14 },
    { name: "Faro", value: 11 },
  ],
  claim: {
    takeaway:
      "Lisboa alone carries 214 of the 394 million trips these six Portuguese city networks recorded in 2025 — more than twice Porto's 96 million.",
    subject: "The subject is Lisboa, the network the article opens on.",
    comparison:
      "Porto's 96 million, and the 394 million all six networks carry between them.",
  },
};
const LISBOA_GESTURES = [
  { do: "highlight", mark: "Lisboa" },
  { do: "bracket", mark: "Lisboa", of: "whole", note: "214 of 394 million" },
  {
    do: "compare",
    marks: ["Lisboa", "Porto"],
    note: "more than twice Porto's 96 million",
  },
];

// China: the drawn rows are in Gt and the claim records shape none (no entity/versus fields).
const CHINA = {
  rows: [
    { name: "China", value: 12.29 },
    { name: "United States", value: 4.9 },
    { name: "India", value: 3.19 },
    { name: "Russia", value: 1.78 },
    { name: "Japan", value: 0.96 },
    { name: "Indonesia", value: 0.81 },
    { name: "Iran", value: 0.79 },
    { name: "Saudi Arabia", value: 0.69 },
    { name: "Germany", value: 0.57 },
    { name: "Turkey", value: 0.51 },
  ],
  claim: {
    takeaway:
      "China emitted more CO₂ in 2024 than the next five emitters together.",
    subject: "The subject is China, the country the article opens on.",
    comparison:
      "The next five emitters together: the United States, India, Russia, Japan and Indonesia.",
  },
};
const NEXT_FIVE = ["United States", "India", "Russia", "Japan", "Indonesia"];
const CHINA_GESTURES = [
  { do: "highlight", mark: "China" },
  { do: "bracket", marks: NEXT_FIVE, note: "the next five together: 11.6 Gt" },
  {
    do: "compare",
    marks: ["China"],
    of: NEXT_FIVE,
    note: "12.3 Gt against 11.6 Gt",
  },
];

// Polish beds per 1,000 residents (claim shape none), and safety incidents per 100,000 residents.
const BEDS = {
  rows: [
    { name: "Śląskie", value: 4.05 },
    { name: "Łódzkie", value: 4.02 },
    { name: "Mazowieckie", value: 3.88 },
    { name: "Lubelskie", value: 3.85 },
    { name: "Wielkopolskie", value: 3.7 },
    { name: "Dolnośląskie", value: 3.67 },
    { name: "Małopolskie", value: 3.54 },
    { name: "Pomorskie", value: 3.53 },
  ],
  claim: {
    takeaway:
      "Mazowieckie ma najwięcej łóżek szpitalnych w kraju, ale w przeliczeniu na mieszkańca jest dopiero trzecie — wyprzedzają je Śląskie i Łódzkie.",
    subject: "Mazowieckie",
    comparison:
      "pozostałe siedem województw w zamrożonej tabeli, a przede wszystkim Śląskie i Łódzkie",
  },
};
const SAFETY = {
  rows: [
    { name: "Sul", value: 233 },
    { name: "Centro", value: 205 },
    { name: "Leste", value: 185 },
    { name: "Oeste", value: 87 },
    { name: "Norte", value: 85 },
  ],
  claim: {
    takeaway:
      "Sul has the worst safety record per resident, not Centro: 233 incidents per 100,000 residents against Centro's 205, even though Centro's raw count of 412 is the highest in the city.",
    subject: "the incident rate per resident, not the raw count",
    comparison:
      "Sul's 233 incidents per 100,000 residents against Centro's 205 per 100,000",
    entity: "Sul",
    versus: "Centro",
  },
};

const check = (
  story: { rows: unknown; claim: unknown },
  gestures: unknown[],
  format = "static",
) =>
  validateGestures({
    gestures,
    rows: story.rows,
    family: "length",
    format,
    claim: story.claim,
  });

const refusal = (fn: () => unknown): GestureRefusal => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a refusal");
};

describe("validateGestures", () => {
  it("should accept Lisboa's highlight, share bracket and Porto comparison", () => {
    expect(check(LISBOA, LISBOA_GESTURES).gestures).toHaveLength(3);
  });

  it("should refuse a bracket note whose figure is false, naming the field and the computed total", () => {
    const r = refusal(() =>
      check(LISBOA, [
        LISBOA_GESTURES[0],
        { ...LISBOA_GESTURES[1], note: "214 of 400 million" },
        LISBOA_GESTURES[2],
      ]),
    );
    expect(r.field).toBe("gestures[1].note");
    expect(r.message).toMatch(/394/);
  });

  it("should refuse a gesture on a row the takeaway does not touch", () => {
    const r = refusal(() =>
      check(LISBOA, [...LISBOA_GESTURES, { do: "name", mark: "Braga" }]),
    );
    expect(r.field).toBe("gestures[3]");
    expect(r.message).toMatch(/Lisboa.*Porto|Porto.*Lisboa/);
  });

  it("should accept China's gestures through the subject and comparison answers when no claim fields are recorded", () => {
    expect(check(CHINA, CHINA_GESTURES).gestures).toHaveLength(3);
  });

  it("should accept a highlight on the Polish subject found in the takeaway text", () => {
    expect(
      check(BEDS, [{ do: "highlight", mark: "Mazowieckie" }]).gestures,
    ).toHaveLength(1);
  });

  it("should check a note against the drawn rate, not the raw count", () => {
    expect(
      check(SAFETY, [
        {
          do: "compare",
          marks: ["Sul", "Centro"],
          note: "233 against Centro's 205 per 100,000",
        },
      ]).gestures,
    ).toHaveLength(1);
  });

  it("should refuse a misspelt mark, naming the closest drawn row", () => {
    const r = refusal(() =>
      check(LISBOA, [{ do: "highlight", mark: "Lisbon" }]),
    );
    expect(r.field).toBe("gestures[0].mark");
    expect(r.message).toMatch(/Lisboa/);
  });

  it("should refuse a trace on the Length family, listing the admissible gestures", () => {
    const r = refusal(() => check(LISBOA, [{ do: "trace", mark: "Lisboa" }]));
    expect(r.field).toBe("gestures[0].do");
    expect(r.message).toMatch(/highlight.*bracket|bracket.*highlight/);
  });

  it("should refuse a second rescale as a conflict, naming the second", () => {
    const r = refusal(() =>
      check(LISBOA, [
        { do: "rescale", value: 250 },
        { do: "rescale", value: 300 },
      ]),
    );
    expect(r.field).toBe("gestures[1]");
  });

  it("should refuse a highlight that leaves the picture as it was", () => {
    const r = refusal(() =>
      check(LISBOA, [LISBOA_GESTURES[0], LISBOA_GESTURES[0]]),
    );
    expect(r.field).toBe("gestures[1]");
  });

  it("should refuse a video with two gestures, naming how many to add", () => {
    const r = refusal(() =>
      check(LISBOA, LISBOA_GESTURES.slice(0, 2), "video"),
    );
    expect(r.field).toBe("gestures");
    expect(r.message).toMatch(/three/);
  });

  it("should refuse a zoom in a video's conclusion, naming pull-back", () => {
    const r = refusal(() =>
      check(
        LISBOA,
        [
          LISBOA_GESTURES[0],
          LISBOA_GESTURES[1],
          { do: "zoom", marks: ["Lisboa", "Porto"], note: "×2" },
        ],
        "video",
      ),
    );
    expect(r.field).toBe("gestures[2]");
    expect(r.message).toMatch(/pull-back/);
  });
});

describe("refusal chain", () => {
  // Every refusal carries a fix; applying the fixes in turn must end on an accepted list without revisiting one.
  // Seeded with the per-type bar video's trap on Lisboa (4 → 5 → 6 → "too few members").
  const seeds: [
    string,
    { rows: unknown; claim: unknown },
    unknown[],
    string,
  ][] = [
    [
      "Lisboa video, two gestures",
      LISBOA,
      LISBOA_GESTURES.slice(0, 2),
      "video",
    ],
    [
      "Lisboa video, four gestures",
      LISBOA,
      [...LISBOA_GESTURES, { do: "pull-back" }],
      "video",
    ],
    [
      "Lisboa, false total",
      LISBOA,
      [{ ...LISBOA_GESTURES[1], note: "214 of 400 million" }],
      "static",
    ],
    [
      "Lisboa, misspelt and off-claim",
      LISBOA,
      [
        { do: "highlight", mark: "Lisbon" },
        { do: "name", mark: "Braga" },
      ],
      "static",
    ],
    [
      "Lisboa video, zoom last",
      LISBOA,
      [
        LISBOA_GESTURES[0],
        LISBOA_GESTURES[1],
        { do: "zoom", marks: ["Lisboa"], note: "×2" },
      ],
      "video",
    ],
    [
      "China, false sum",
      CHINA,
      [
        CHINA_GESTURES[0],
        { ...CHINA_GESTURES[1], note: "the next five together: 13 Gt" },
      ],
      "static",
    ],
    [
      "China video, trace",
      CHINA,
      [CHINA_GESTURES[0], { do: "trace", mark: "China" }, CHINA_GESTURES[2]],
      "video",
    ],
    [
      "beds, unknown gesture",
      BEDS,
      [{ do: "spotlight", mark: "Mazowieckie" }],
      "static",
    ],
    [
      "safety, rescale after compare",
      SAFETY,
      [
        { do: "compare", marks: ["Sul", "Centro"], note: "233 against 205" },
        { do: "rescale", value: 300 },
      ],
      "static",
    ],
  ];
  for (const [name, story, gestures, format] of seeds) {
    it(`should end on an accepted list without revisiting one: ${name}`, () => {
      let list = structuredClone(gestures);
      const seen = new Set<string>();
      for (let step = 0; step < 12; step++) {
        const key = JSON.stringify(list);
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        try {
          check(story, list, format);
          return;
        } catch (error) {
          if (!(error instanceof GestureRefusal)) throw error;
          list = applyFix(list, error.fix);
        }
      }
      throw new Error(
        `no accepted list within 12 fixes: ${JSON.stringify(list)}`,
      );
    });
  }
});
