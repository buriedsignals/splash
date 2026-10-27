import { describe, expect, it } from "bun:test";
import {
  applyFix,
  figuresIn,
  GestureRefusal,
  repairGestures,
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

describe("superlatives", () => {
  it("should refuse a note calling a row highest when another row is higher", () => {
    const r = refusal(() => check(SAFETY, [{ do: "annotate", mark: "Centro", note: "Highest rate (205)" }]));
    expect(r.field).toBe("gestures[0].note");
    expect(r.message).toMatch(/Sul/);
  });

  it("should accept a note calling the third row third", () => {
    expect(check(BEDS, [{ do: "name", mark: "Mazowieckie", note: "third, at 3.88" }]).gestures).toHaveLength(1);
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

describe("repairGestures", () => {
  it("should repair a broken Lisboa video list into an accepted one, keeping the model's gestures and listing each repair", () => {
    const broken = [{ do: "highlight", mark: "Lisbon" }, { ...LISBOA_GESTURES[1], note: "214 of 400 million" }];
    const { gestures, repairs } = repairGestures({ gestures: broken, rows: LISBOA.rows, family: "length", format: "video", claim: LISBOA.claim });
    expect(() => check(LISBOA, gestures, "video")).not.toThrow();
    expect(gestures[0]).toEqual({ do: "highlight", mark: "Lisboa" });
    expect(repairs.length).toBe(3);
  });

  it("should leave an accepted list untouched", () => {
    const { gestures, repairs } = repairGestures({ gestures: LISBOA_GESTURES, rows: LISBOA.rows, family: "length", format: "static", claim: LISBOA.claim });
    expect(gestures).toEqual(LISBOA_GESTURES);
    expect(repairs).toEqual([]);
  });
});

describe("signs and formats", () => {
  const CHANGE = {
    rows: [
      { name: "Alpha", value: 20 },
      { name: "Beta", value: -12 },
    ],
    claim: { takeaway: "Beta lost 12 while Alpha gained 20.", subject: "Beta", comparison: "Alpha" },
  };

  it("should accept a note stating a negative value with its sign", () => {
    expect(check(CHANGE, [{ do: "annotate", mark: "Beta", note: "-12" }]).gestures).toHaveLength(1);
  });

  it("should refuse a note giving a negative row the wrong sign", () => {
    expect(refusal(() => check(CHANGE, [{ do: "annotate", mark: "Beta", note: "+15" }])).field).toBe("gestures[0].note");
  });

  it("should not admit a zoom on a still plate", () => {
    const r = refusal(() => check(LISBOA, [{ do: "zoom", marks: ["Aveiro", "Faro"], note: "×15" }], "static"));
    expect(r.field).toBe("gestures[0].do");
  });
});

describe("units and scales in notes", () => {
  // The China video run: rows in tonnes, the note in Gt, the unit glued to the figure.
  const TONNES = {
    rows: CHINA.rows.map((r) => ({ name: r.name, value: Math.round(r.value * 1e9) })),
    claim: CHINA.claim,
  };
  const FIVE = ["United States", "India", "Russia", "Japan", "Indonesia"];

  it("should read a figure glued to its unit and match it at a power-of-ten scale", () => {
    const note = "China's 12.29Gt vs 11.64Gt for the next five";
    expect(check(TONNES, [{ do: "compare", marks: ["China", ...FIVE], note }]).gestures).toHaveLength(1);
  });

  it("should still refuse a false figure glued to its unit, with a fix that keeps the unit", () => {
    const r = refusal(() => check(TONNES, [{ do: "compare", marks: ["China", ...FIVE], note: "China's 15Gt vs 11.64Gt" }]));
    expect(r.field).toBe("gestures[0].note");
    expect(r.fix.set.value).toMatch(/^China's 12Gt vs 11\.64Gt$/);
  });
});

describe("a note stating a figure of its row's other columns", () => {
  const RATES = [
    { name: "Sul", value: 233 },
    { name: "Centro", value: 205 },
    { name: "Leste", value: 185 },
  ];
  const takeaway = "Sul has the worst safety record per resident, not Centro: 233 incidents per 100,000 residents against Centro's 205, even though Centro's raw count of 412 is the highest in the city.";
  const gestures = [{ do: "highlight", mark: "Sul" }, { do: "annotate", mark: "Centro", note: "412 raw incidents" }];

  it("should be accepted when data.json holds that figure for the row", () => {
    expect(() => validateGestures({ gestures, rows: RATES, family: "length", format: "static", claim: { takeaway, facts: { Centro: [412, 201000] } } })).not.toThrow();
  });

  it("should be refused when no column of the row holds it", () => {
    expect(() => validateGestures({ gestures, rows: RATES, family: "length", format: "static", claim: { takeaway, facts: { Centro: [400, 201000] } } })).toThrow(/states 412/);
  });
});

describe("a percent in a compare note", () => {
  const RATES = [
    { name: "Śląskie", value: 405 },
    { name: "Łódzkie", value: 402 },
    { name: "Mazowieckie", value: 388 },
    { name: "Lubelskie", value: 385 },
  ];
  const takeaway = "Mazowieckie ma najwięcej łóżek szpitalnych w kraju, ale w przeliczeniu na mieszkańca jest dopiero trzecie — wyprzedzają je Śląskie i Łódzkie.";
  const compare = (note: string) => [{ do: "compare", marks: ["Mazowieckie", "Łódzkie"], note }];

  it("should be refused when it is the subject's share of the whole, not the gap", () => {
    expect(() => validateGestures({ gestures: compare("Mazowieckie ma o 13% mniej łóżek na mieszkańca niż Łódzkie"), rows: RATES, family: "length", format: "static", claim: { takeaway } })).toThrow(/states 13/);
  });

  it("should drop the note when the stated percent is far from the gap, not offer the gap in the unit", () => {
    let refusal: GestureRefusal | undefined;
    try {
      validateGestures({ gestures: compare("o 13% mniej niż Łódzkie"), rows: RATES, family: "length", format: "static", claim: { takeaway } });
    } catch (error) {
      refusal = error as GestureRefusal;
    }
    expect(refusal?.fix).toEqual({ set: { index: 0, field: "note", value: undefined } });
  });

  it("should be accepted when it states the gap", () => {
    expect(() => validateGestures({ gestures: compare("o 3,5% mniej niż Łódzkie"), rows: RATES, family: "length", format: "static", claim: { takeaway } })).not.toThrow();
  });
});

describe("several rows written as one string", () => {
  const ROWS = [
    { name: "China", value: 12.3 },
    { name: "United States", value: 4.9 },
    { name: "India", value: 3.2 },
    { name: "Russia", value: 1.8 },
    { name: "Japan", value: 1.0 },
    { name: "Indonesia", value: 0.8 },
    { name: "Korea, Republic of", value: 0.6 },
  ];
  const claim = { takeaway: "China emitted more CO₂ in 2024 than the next five emitters together.", comparison: "United States, India, Russia, Japan, Indonesia; Korea, Republic of" };
  const run = (g: object) => validateGestures({ gestures: [{ do: "highlight", mark: "China" }, g], rows: ROWS, family: "length", format: "scrolly", claim }).gestures[1];

  it("should read a comma-joined mark as those rows", () => {
    expect(run({ do: "bracket", mark: "United States,India,Russia,Japan,Indonesia", note: "11.7" }).marks).toEqual(["United States", "India", "Russia", "Japan", "Indonesia"]);
  });

  it("should read a listed string in of as those rows", () => {
    expect(run({ do: "compare", mark: "China", of: "United States, India, Russia, Japan and Indonesia", note: "12.3 against 11.7" }).of).toEqual(["United States", "India", "Russia", "Japan", "Indonesia"]);
  });

  it("should keep a row whose own name has a comma as one row", () => {
    expect(run({ do: "annotate", mark: "Korea, Republic of", note: "0.6" }).marks).toEqual(["Korea, Republic of"]);
  });
});

describe("a figure with a magnitude suffix", () => {
  const ROWS = [
    { name: "China", value: 12_289_000_000 },
    { name: "United States", value: 4_904_000_000 },
  ];
  const claim = { takeaway: "China emitted more CO₂ in 2024 than the United States." };
  it("should read 12B as twelve billion beside a figure written in full", () => {
    expect(() => validateGestures({ gestures: [{ do: "compare", marks: ["China", "United States"], note: "12B, against 4,904,000,000 tonnes" }], rows: ROWS, family: "length", format: "static", claim })).not.toThrow();
  });

  it("should still refuse a suffixed figure the rows do not give", () => {
    expect(() => validateGestures({ gestures: [{ do: "name", mark: "China", note: "15B tonnes" }], rows: ROWS, family: "length", format: "static", claim })).toThrow(/states 15/);
  });
});

describe("a note figure far from anything the gesture draws", () => {
  const PER_MILLION = [
    { name: "Śląskie", value: 4045 },
    { name: "Łódzkie", value: 4016 },
    { name: "Mazowieckie", value: 3884 },
  ];
  const claim = { takeaway: "Mazowieckie ma najwięcej łóżek szpitalnych w kraju, ale w przeliczeniu na mieszkańca jest dopiero trzecie — wyprzedzają je Śląskie i Łódzkie." };
  const refusalOf = (note: string) => {
    try {
      validateGestures({ gestures: [{ do: "compare", marks: ["Mazowieckie", "Łódzkie"], note }], rows: PER_MILLION, family: "length", format: "static", claim });
    } catch (error) {
      return error as GestureRefusal;
    }
  };

  it("should offer the gap in the unit, never the percent gap, for a figure stated as a gap", () => {
    expect(refusalOf("o 4,3 łóżka na mln mieszkańców mniej niż Łódzkie")?.fix).toEqual({ set: { index: 0, field: "note", value: "o 132,0 łóżka na mln mieszkańców mniej niż Łódzkie" } });
  });

  it("should drop a note whose figure is far from anything drawn and not stated as a gap", () => {
    expect(refusalOf("Mazowieckie: 9,1")?.fix).toEqual({ set: { index: 0, field: "note", value: undefined } });
  });

  it("should still offer the near figure when one is close", () => {
    expect(refusalOf("o 130 łóżek mniej niż Łódzkie")?.fix).toEqual({ set: { index: 0, field: "note", value: "o 132 łóżek mniej niż Łódzkie" } });
  });
});

describe("a compare's percent and its direction", () => {
  const ROWS = [
    { name: "China", value: 12.3 },
    { name: "United States", value: 4.9 },
  ];
  const claim = { takeaway: "China emitted more CO₂ in 2024 than the United States." };
  const check = (note: string) => () => validateGestures({ gestures: [{ do: "compare", marks: ["China", "United States"], note }], rows: ROWS, family: "length", format: "static", claim });

  it("should refuse 60% more when 60 % is how far the other row falls short", () => {
    expect(check("China emitted 60% more")).toThrow(/states 60/);
  });

  it("should accept 151% more for the subject's own gap", () => {
    expect(check("China emitted 151% more")).not.toThrow();
  });

  it("should accept 60% less said of the other row's shortfall", () => {
    expect(check("the United States emitted 60% less")).not.toThrow();
  });
});

describe("a bracket whose words name the rows it should span", () => {
  const ROWS = [
    { name: "China", value: 12.3 },
    { name: "United States", value: 4.9 },
    { name: "India", value: 3.2 },
    { name: "Russia", value: 1.8 },
  ];
  const claim = { takeaway: "China emitted more CO₂ in 2024 than the next three emitters together.", comparison: "United States, India, Russia" };
  it("should offer the rows its card names when it spans one of them", () => {
    let refusal: GestureRefusal | undefined;
    try {
      validateGestures({ gestures: [{ do: "bracket", mark: "United States", of: "whole", note: "Next 3", card: "The United States, India and Russia together emitted 9.9 billion tonnes." }], rows: ROWS, family: "length", format: "scrolly", claim });
    } catch (error) {
      refusal = error as GestureRefusal;
    }
    expect(refusal?.fix).toEqual({ set: { index: 0, value: { do: "bracket", note: "Next 3", card: "The United States, India and Russia together emitted 9.9 billion tonnes.", marks: ["United States", "India", "Russia"] } } });
  });
});

describe("a figure stated as a gap", () => {
  const ROWS = [
    { name: "China", value: 12289.037 },
    { name: "United States", value: 4904.1 },
    { name: "India", value: 3193.5 },
  ];
  const claim = { takeaway: "China emitted more CO₂ in 2024 than the next two emitters together.", comparison: "United States, India" };
  const note = (text: string) => () => validateGestures({ gestures: [{ do: "compare", marks: ["China", "United States", "India"], note: text }], rows: ROWS, family: "length", format: "static", claim });

  it("should refuse a row's own value written as the gap", () => {
    expect(note("12,289 more than the 8,098 of the next two")).toThrow(/as a gap.*4,191/);
  });

  it("should accept the gap", () => {
    expect(note("4,191 more than the next two")).not.toThrow();
  });

  it("should not read a value followed by more than twice as a gap", () => {
    expect(() => validateGestures({ gestures: [{ do: "compare", marks: ["China", "United States"], note: "12,289 is more than twice the 4,904 of the United States" }], rows: ROWS, family: "length", format: "static", claim: { takeaway: "China emitted more CO₂ than the United States." } })).not.toThrow();
  });
});

describe("a note stating a true figure of other rows", () => {
  const ROWS = [
    { name: "China", value: 12289 },
    { name: "United States", value: 4904 },
    { name: "India", value: 3194 },
    { name: "Russia", value: 1781 },
    { name: "Japan", value: 962 },
    { name: "Indonesia", value: 812 },
  ];
  const claim = { takeaway: "China emitted more CO₂ in 2024 than the next five emitters together.", comparison: "United States, India, Russia, Japan, Indonesia" };
  const refusalOf = (gesture: object) => {
    try {
      validateGestures({ gestures: [gesture], rows: ROWS, family: "length", format: "static", claim });
    } catch (error) {
      return error as GestureRefusal;
    }
  };

  it("should drop the note rather than swap the next five's sum for China's nearby value", () => {
    expect(refusalOf({ do: "bracket", mark: "China", of: "whole", note: "the next five together: 11,653" })?.fix).toEqual({ set: { index: 0, field: "note", value: undefined } });
  });

  it("should accept the sum of a bracket's of-list", () => {
    expect(refusalOf({ do: "bracket", mark: "China", of: ["United States", "India", "Russia", "Japan", "Indonesia"], note: "12,289 against 11,653" })).toBeUndefined();
  });
});

describe("the post-measurement defects", () => {
  const ROWS = [
    { name: "Sul", value: 233 },
    { name: "Centro", value: 205 },
    { name: "Leste", value: 185 },
  ];
  const claim = { takeaway: "Sul has the worst safety record per resident, not Centro: 233 against Centro's 205, though Centro's raw count of 412 is the highest.", facts: { Centro: [412, 201000], Sul: [205, 88000] } };

  it("should read a list given as mark as the gesture's marks", () => {
    expect(validateGestures({ gestures: [{ do: "filter", mark: ["Sul", "Centro"] }], rows: ROWS, family: "length", format: "scrolly", claim }).gestures[0].marks).toEqual(["Sul", "Centro"]);
  });

  it("should refuse a rule at another column's figure, removing it", () => {
    let refusal: GestureRefusal | undefined;
    try {
      validateGestures({ gestures: [{ do: "highlight", mark: "Sul" }, { do: "reference", value: 412, note: "Centro's raw count: 412" }], rows: ROWS, family: "length", format: "static", claim });
    } catch (error) {
      refusal = error as GestureRefusal;
    }
    expect(refusal?.fix).toEqual({ remove: 1 });
  });
});

describe("Rémy's decisions of 2026-10-28", () => {
  const PL = [
    { name: "Śląskie", value: 405 },
    { name: "Łódzkie", value: 402 },
    { name: "Mazowieckie", value: 388 },
  ];
  const takeaway = "Mazowieckie ma najwięcej łóżek szpitalnych w kraju, ale w przeliczeniu na mieszkańca jest dopiero trzecie — wyprzedzają je Śląskie i Łódzkie.";
  const run = (gestures: object[], claim: object) => () => validateGestures({ gestures, rows: PL, family: "length", format: "static", claim: { takeaway, ...claim } });

  it("should refuse a bracket over a rate, whose rows do not add up", () => {
    expect(run([{ do: "bracket", mark: "Mazowieckie", of: "whole" }], {})).toThrow(/rates do not add up/);
  });

  it("should refuse a Polish superlative on a row the drawn measure ranks third", () => {
    expect(run([{ do: "annotate", mark: "Mazowieckie", note: "Najwięcej łóżek" }], {})).toThrow(/calls Mazowieckie the highest/);
  });

  it("should accept it when another column of the data ranks the row first", () => {
    expect(run([{ do: "annotate", mark: "Mazowieckie", note: "Najwięcej łóżek" }], { facts: { "Śląskie": [17800], "Łódzkie": [9800], Mazowieckie: [21400] } })).not.toThrow();
  });
});

describe("a note's scale", () => {
  const ROWS = [
    { name: "Śląskie", value: 4.05 },
    { name: "Mazowieckie", value: 3.88 },
  ];
  const claim = { takeaway: "Mazowieckie is behind Śląskie per resident." };
  it("should refuse a figure ten times the drawn value", () => {
    expect(() => validateGestures({ gestures: [{ do: "compare", marks: ["Mazowieckie", "Śląskie"], note: "Śląskie ma 40 łóżek" }], rows: ROWS, family: "length", format: "static", claim })).toThrow(/states 40/);
  });
});

describe("a unit base in a note", () => {
  it("should not read the base after na as a figure", () => {
    expect(figuresIn("o 1,62 łóżka mniej na 10 tys.").map((n) => n.value)).toEqual([1.62]);
  });

  it("should still read a figure after a word that is not a base preposition", () => {
    expect(figuresIn("Lisboa: 214 of 394").map((n) => n.value)).toEqual([214, 394]);
  });
});

describe("the family interface (phase 2)", () => {
  const LINE = [
    { name: "2015 · Lisboa", value: 180, key: "2015", series: "Lisboa" },
    { name: "2025 · Lisboa", value: 214, key: "2025", series: "Lisboa" },
    { name: "2015 · Porto", value: 90, key: "2015", series: "Porto" },
    { name: "2025 · Porto", value: 96, key: "2025", series: "Porto" },
  ];
  const claim = { takeaway: "Lisboa grew to 214 by 2025 while Porto stayed near 96." };

  it("should resolve a series name to every mark it holds", () => {
    expect(validateGestures({ gestures: [{ do: "highlight", mark: "Lisboa" }], rows: LINE, family: "length", format: "static", claim }).gestures[0].marks).toEqual(["2015 · Lisboa", "2025 · Lisboa"]);
  });

  it("should resolve a key to every mark at that key", () => {
    expect(validateGestures({ gestures: [{ do: "highlight", mark: "2025" }], rows: LINE, family: "length", format: "static", claim }).gestures[0].marks).toEqual(["2025 · Lisboa", "2025 · Porto"]);
  });

  it("should resolve a mark written as an object to the key it names", () => {
    expect(validateGestures({ gestures: [{ do: "highlight", mark: { t: 2025 } }], rows: LINE, family: "length", format: "static", claim }).gestures[0].marks).toEqual(["2025 · Lisboa", "2025 · Porto"]);
  });

  it("should read a mark the 12B wrapped in its own quotes", () => {
    expect(validateGestures({ gestures: [{ do: "highlight", mark: '"2025 · Lisboa"' }], rows: LINE, family: "length", format: "static", claim }).gestures[0].marks).toEqual(["2025 · Lisboa"]);
  });

  it("should fix every wrong entry of a marks list in one refusal", () => {
    let fix: { set?: { value?: unknown } } = {};
    try {
      validateGestures({ gestures: [{ do: "compare", marks: ["2025 · Lisbon", "2015 · Lisboa", "2025 · Portto"] }], rows: LINE, family: "length", format: "static", claim });
    } catch (error) {
      fix = (error as GestureRefusal).fix;
    }
    expect(fix.set?.value).toEqual(["2025 · Lisboa", "2015 · Lisboa", "2025 · Porto"]);
  });

  it("should admit a figure a family hook draws", () => {
    const hooks = { figures: (g: { do: string }) => (g.do === "annotate" ? [34] : []) };
    expect(() => validateGestures({ gestures: [{ do: "annotate", mark: "2025 · Lisboa", note: "+34 since 2015" }], rows: LINE, family: "length", format: "static", claim, hooks })).not.toThrow();
  });

  it("should let a family hook refuse a conflict", () => {
    const hooks = { refuse: () => { throw new GestureRefusal("gestures[0]", "a gap in the series cannot be traced: drop it", { remove: 0 }); } };
    expect(() => validateGestures({ gestures: [{ do: "highlight", mark: "Lisboa" }], rows: LINE, family: "length", format: "static", claim, hooks })).toThrow(/gap in the series/);
  });
});

describe("the core for the phase-2 families", () => {
  it("should not take the subject from a code inside a longer word", () => {
    const rows = [{ name: "ITA", value: 40 }, { name: "CZE", value: 60 }];
    const v = validateGestures({ gestures: [{ do: "annotate", mark: "CZE", note: "60" }], rows, family: "length", format: "static", claim: { takeaway: "CZE leads, per 1,000 habitants." } });
    expect(v.gestures[0].subject).toBe("CZE");
  });

  it("should admit a percentage a family hook draws", () => {
    const rows = [{ name: "A", value: 10 }, { name: "B", value: 20 }];
    const hooks = { figures: () => [34.7] };
    expect(() => validateGestures({ gestures: [{ do: "filter", marks: ["A"], note: "34,7 %" }], rows, family: "length", format: "static", claim: { takeaway: "A is small." }, hooks })).not.toThrow();
  });

  it("should take the claim's entity from a group a mark belongs to", () => {
    const rows = [{ name: "site 1", value: 6000, group: "Nuclear" }, { name: "site 2", value: 300, group: "Coal" }];
    expect(validateGestures({ gestures: [{ do: "highlight", mark: "site 1" }], rows, family: "length", format: "static", claim: { takeaway: "Nuclear dominates." } }).entities).toContain("site 1");
  });
});

describe("a row whose name ends in punctuation", () => {
  it("should be found in the claim", () => {
    const rows = [{ name: "Autres renouv.", value: 40 }, { name: "Gaz", value: 60 }];
    expect(validateGestures({ gestures: [{ do: "highlight", mark: "Autres renouv." }], rows, family: "length", format: "static", claim: { takeaway: "Autres renouv. ont doublé." } }).entities).toContain("Autres renouv.");
  });
});

describe("numbers inside names", () => {
  const BANDS = [
    { name: "60-64 · women", value: 1200, key: "60-64", series: "women" },
    { name: "60-64 · men", value: 1100, key: "60-64", series: "men" },
    { name: "2023 · China", value: 12.3, key: "2023", series: "China" },
    { name: "2023 · India", value: 3.2, key: "2023", series: "India" },
  ];

  it("should not read an age band's digits in a note as figures", () => {
    expect(() => validateGestures({ gestures: [{ do: "annotate", mark: "60-64 · women", note: "60-64: 1200 women" }], rows: BANDS, family: "length", format: "static", claim: { takeaway: "More women than men at 60-64." } })).not.toThrow();
  });

  it("should not make every mark of a year the claim's because the takeaway names the year", () => {
    const v = validateGestures({ gestures: [{ do: "highlight", mark: "2023 · China" }], rows: BANDS, family: "length", format: "static", claim: { takeaway: "China emitted most in 2023." } });
    expect(v.entities).not.toContain("2023 · India");
  });
});

describe("a takeaway that names no drawn row", () => {
  const CLOUD = [{ name: "A", value: 82 }, { name: "B", value: 61 }, { name: "C", value: 75 }];
  const claim = { takeaway: "Above $30,000 a year, life expectancy spreads by 14 years, not 41." };
  it("should accept a pull-back when another gesture states the takeaway's figure", () => {
    expect(() => validateGestures({ gestures: [{ do: "reference", value: 75, note: "14 years" }, { do: "pull-back" }], rows: CLOUD, family: "length", format: "static", claim, hooks: { figures: () => [14] } })).not.toThrow();
  });
});

describe("French superlatives", () => {
  const ROWS = [{ name: "A", value: 10 }, { name: "B", value: 5 }];
  it("should read le plus faible as the lowest", () => {
    expect(() => validateGestures({ gestures: [{ do: "annotate", mark: "B", note: "le plus faible" }], rows: ROWS, family: "length", format: "static", claim: { takeaway: "B is behind A." } })).not.toThrow();
  });
});
