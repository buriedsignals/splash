import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyFix, GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import { FAMILIES } from "../craft/_shared/gesture-registry.mjs";
import {
  crossing,
  readPoints,
  stageTime,
  timeModel,
  validateTime,
  zoomFactor,
} from "../craft/_shared/gesture-family-time.mjs";
import { composeTimeStatic } from "../craft/_shared/gesture-time-static.mjs";

// The four types' worked examples, read from their proofs' own data.csv (the readings the kits were measured on).
const PROOF = join(import.meta.dir, "..", "..", "proof");
function csv(dir: string) {
  const [head, ...lines] = readFileSync(join(PROOF, dir, "data.csv"), "utf8")
    .trim()
    .split(/\r?\n/);
  const cols = head.split(",");
  return lines.map((l) =>
    Object.fromEntries(l.split(",").map((c, i) => [cols[i], c])),
  );
}

const LINE = (() => {
  const points = readPoints(
    csv("co2-suisse")
      .filter((r) => Number(r.Year) >= 1950)
      .map((r) => ({
        series: "Suisse",
        t: Number(r.Year),
        value: Number(r["Annual CO₂ emissions"]) / 1e6,
      })),
  );
  return {
    model: timeModel({ variant: "line", points }),
    claim: {
      takeaway:
        "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967.",
    },
  };
})();
const AREA = (() => {
  const points = readPoints(
    csv("static-area-swiss-co2").map((r) => ({
      series: "CO₂",
      t: Number(r.Year),
      value: Number(r["Annual CO₂ emissions"]) / 1e6,
    })),
  );
  return {
    model: timeModel({ variant: "area-and-stacked-area", points }),
    claim: {
      takeaway: "La moitié du CO₂ suisse depuis 1858 a été émise après 1986",
    },
  };
})();
const LABELS: Record<string, string> = {
  Hydropower: "Hydraulique",
  Nuclear: "Nucléaire",
  Solar: "Solaire",
  Oil: "Pétrole",
  Gas: "Gaz",
  Bioenergy: "Bioénergie",
  "Other renewables": "Autres",
  Wind: "Éolien",
  Coal: "Charbon",
};
const STREAM = (() => {
  const rows = csv("static-streamgraph-swiss-electricity").filter(
    (r) => Number(r.Year) <= 2024,
  );
  const points = readPoints(
    Object.keys(LABELS).flatMap((k) =>
      rows.map((r) => ({
        series: LABELS[k],
        t: Number(r.Year),
        value: Number(r[k]),
      })),
    ),
  );
  return {
    model: timeModel({ variant: "streamgraph", points }),
    claim: {
      takeaway:
        "En 2016, le solaire est devenu la troisième source d’électricité suisse",
    },
  };
})();
const BUMP = (() => {
  const points = readPoints(
    csv("static-bump-emitter-rank")
      .filter(
        (r) =>
          /^[A-Z]{3}$/.test(r.Code) &&
          Number(r.Year) >= 1990 &&
          r["Annual CO₂ emissions"] !== "",
      )
      .map((r) => ({
        series: r.Entity,
        t: Number(r.Year),
        value: Number(r["Annual CO₂ emissions"]) / 1e6,
      })),
  );
  return {
    model: timeModel({ variant: "bump-ranking-over-time", points, slots: 10 }),
    claim: {
      takeaway:
        "L’Inde est passée du 8e au 3e rang mondial des émetteurs de CO2",
      entity: "India",
    },
  };
})();

const staticPlate = (t: { model: any; claim: any }, gestures: any[]) => {
  const v = validateTime({
    gestures,
    model: t.model,
    format: "static",
    claim: t.claim,
  });
  return composeTimeStatic({
    model: t.model,
    valid: v.gestures,
    format: (x: number) => x.toFixed(1),
    subject: v.subject,
  });
};
const refusalOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  return null;
};

describe("the Time-series family registers itself", () => {
  it("should register FAMILIES.time with its gestures at import", () => {
    expect((FAMILIES as any).time.gestures).toContain("trace");
  });
});

describe("line (proof/co2-suisse)", () => {
  const gestures = [
    { do: "highlight", mark: "Suisse" },
    { do: "name", mark: "1973", note: "pic de 1973 : 46,2 Mt" },
    {
      do: "compare",
      marks: ["2024", "1967"],
      note: "2024 : 32,1 Mt, sous les 32,5 Mt de 1967",
    },
  ];

  it("should land every declared gesture on the plate: the accent, the ringed peak and the rewound level", () => {
    const plate = staticPlate(LINE, gestures);
    expect([
      plate.accent,
      plate.points.map((p: any) => p.at.key),
      plate.levels.map((l: any) => [l.a.key, l.b.key]),
    ]).toEqual(["Suisse", ["1973"], [["2024", "1967"]]]);
  });

  it("should draw a different plate for each added gesture", () => {
    const states = [1, 2, 3].map((n) =>
      JSON.stringify(staticPlate(LINE, gestures.slice(0, n))),
    );
    expect(new Set(states).size).toBe(3);
  });

  it("should refuse a peak note whose figure the readings do not give", () => {
    expect(
      refusalOf(() =>
        staticPlate(LINE, [
          { do: "name", mark: "1973", note: "pic de 1973 : 52,0 Mt" },
        ]),
      )?.field,
    ).toBe("gestures[0].note");
  });

  it("should refuse a figure only the sum of every reading gives, at a power of ten", () => {
    const whole = LINE.model.marks.reduce((s: number, m: any) => s + m.value, 0);
    const note = `pic de 1973 : ${Math.round(whole / 1000)} Mt`;
    expect(refusalOf(() => staticPlate(LINE, [{ do: "name", mark: "1973", note }]))?.field).toBe("gestures[0].note");
  });

  it("should refuse a bracket on a line, and the fix should end on an accepted list", () => {
    const list = [
      { do: "highlight", mark: "Suisse" },
      { do: "bracket", marks: ["1990", "1991"] },
    ];
    const error = refusalOf(() =>
      validateTime({
        gestures: list,
        model: LINE.model,
        format: "static",
        claim: LINE.claim,
      }),
    )!;
    expect(
      validateTime({
        gestures: applyFix(list, error.fix),
        model: LINE.model,
        format: "static",
        claim: LINE.claim,
      }).gestures.length,
    ).toBe(1);
  });

  it("should refuse a name on a whole series, offering its last reading", () => {
    const error = refusalOf(() =>
      validateTime({
        gestures: [{ do: "name", mark: "Suisse" }],
        model: LINE.model,
        format: "static",
        claim: LINE.claim,
      }),
    )!;
    expect(error.fix).toEqual({
      set: { index: 0, field: "mark", value: "2024 · Suisse" },
    });
  });

  it("should refuse a zoom whose printed factor is not the factor applied, and offer the true one", () => {
    const factor = zoomFactor(LINE.model, ["1967 · Suisse", "2024 · Suisse"]);
    const error = refusalOf(() =>
      validateTime({
        gestures: [{ do: "zoom", marks: ["1967", "2024"], note: "×5" }],
        model: LINE.model,
        format: "web",
        claim: LINE.claim,
      }),
    )!;
    expect(error.fix).toEqual({
      set: { index: 0, field: "note", value: `×${factor.toFixed(0)}` },
    });
  });

  it("should give an all-resting web list a compare of the subject's last reading against its first", () => {
    const error = refusalOf(() =>
      validateTime({
        gestures: [{ do: "highlight", mark: "Suisse" }],
        model: LINE.model,
        format: "web",
        claim: LINE.claim,
      }),
    )!;
    const fixed = applyFix([{ do: "highlight", mark: "Suisse" }], error.fix);
    expect(
      validateTime({
        gestures: fixed,
        model: LINE.model,
        format: "web",
        claim: LINE.claim,
      }).gestures.map((g: any) => g.do),
    ).toEqual(["highlight", "compare"]);
  });

  it("should refuse a compare against the whole of a time series", () => {
    expect(
      refusalOf(() =>
        validateTime({
          gestures: [{ do: "compare", mark: "2024", of: "whole" }],
          model: LINE.model,
          format: "static",
          claim: LINE.claim,
        }),
      )?.fix,
    ).toEqual({ remove: 0 });
  });
});

describe("area-and-stacked-area (proof/static-area-swiss-co2)", () => {
  const total = AREA.model.marks.reduce((s: number, m: any) => s + m.value, 0);
  let running = 0;
  const cut = AREA.model.marks.find(
    (m: any) => (running += m.value) >= total / 2,
  )!.t;
  const after = AREA.model.marks.filter((m: any) => m.t > cut);
  const share =
    (after.reduce((s: number, m: any) => s + m.value, 0) / total) * 100;

  it("should bracket the years after the cut with their true share of the whole surface", () => {
    const plate = staticPlate(AREA, [
      {
        do: "bracket",
        marks: after.map((m: any) => m.key),
        of: "whole",
        note: `${after.length} ans après ${cut} : ${share.toFixed(1)} % du total`,
      },
    ]);
    expect([
      plate.brackets[0].from,
      plate.brackets[0].to,
      Number(plate.brackets[0].share.toFixed(1)),
    ]).toEqual([cut + 1, 2024, Number(share.toFixed(1))]);
  });

  it("should refuse a bracket share the surface does not give", () => {
    expect(
      refusalOf(() =>
        staticPlate(AREA, [
          {
            do: "bracket",
            marks: after.map((m: any) => m.key),
            of: "whole",
            note: "60,0 % du total",
          },
        ]),
      )?.field,
    ).toBe("gestures[0].note");
  });

  it("should stand the area on zero", () => {
    expect(AREA.model.domain[0]).toBe(0);
  });
});

describe("streamgraph (proof/static-streamgraph-swiss-electricity)", () => {
  it("should solve the solar/oil crossing between the two readings it falls between, by linear interpolation", () => {
    const [c] = crossing(STREAM.model, "Solaire", "Pétrole");
    const read = (s: string, t: number) => STREAM.model.read(s, t);
    const d0 = read("Solaire", 2015) - read("Pétrole", 2015);
    const d1 = read("Solaire", 2016) - read("Pétrole", 2016);
    expect(c.t).toBeCloseTo(2015 + d0 / (d0 - d1), 9);
  });

  it("should ring every solved crossing when two series are compared", () => {
    const plate = staticPlate(STREAM, [
      { do: "highlight", mark: "Solaire" },
      { do: "compare", marks: ["Solaire", "Pétrole"] },
    ]);
    expect(plate.crossings[0].crossings.length).toBe(
      crossing(STREAM.model, "Solaire", "Pétrole").length,
    );
  });

  it("should accept 'third' on solar in 2016, where it ranks third among the sources", () => {
    expect(
      validateTime({
        gestures: [
          { do: "annotate", mark: "2016 · Solaire", note: "third source" },
        ],
        model: STREAM.model,
        format: "static",
        claim: STREAM.claim,
      }).gestures.length,
    ).toBe(1);
  });

  it("should refuse 'third' on solar in 2015, where it does not rank third", () => {
    expect(STREAM.model.rankAt(2015, "Solaire")).not.toBe(3);
    expect(
      refusalOf(() =>
        validateTime({
          gestures: [
            { do: "annotate", mark: "2015 · Solaire", note: "third source" },
          ],
          model: STREAM.model,
          format: "static",
          claim: STREAM.claim,
        }),
      )?.field,
    ).toBe("gestures[0].note");
  });

  it("should refuse a reference rule on a streamgraph, which has no value axis", () => {
    expect(
      refusalOf(() =>
        validateTime({
          gestures: [
            { do: "reference", value: 2, note: "2 TWh" },
            { do: "highlight", mark: "Solaire" },
          ],
          model: STREAM.model,
          format: "static",
          claim: STREAM.claim,
        }),
      )?.fix,
    ).toEqual({ remove: 0 });
  });
});

describe("bump-ranking-over-time (proof/static-bump-emitter-rank)", () => {
  it("should draw only readings inside the slots, valued by their rank", () => {
    expect(
      BUMP.model.marks.every((m: any) => m.value >= 1 && m.value <= 10),
    ).toBe(true);
  });

  it("should rewind India's 1990 rank to 2024 on a compare", () => {
    const plate = staticPlate(BUMP, [
      { do: "highlight", mark: "India" },
      {
        do: "compare",
        marks: ["2024 · India", "1990 · India"],
        note: "5 places",
      },
    ]);
    expect([plate.levels[0].a.value, plate.levels[0].b.value]).toEqual([3, 8]);
  });

  it("should refuse a rank the readings do not give", () => {
    expect(
      refusalOf(() =>
        staticPlate(BUMP, [
          { do: "name", mark: "2024 · India", note: "rank 2" },
        ]),
      )?.field,
    ).toBe("gestures[0].note");
  });

  it("should refuse a bracket over ranks", () => {
    expect(
      refusalOf(() =>
        validateTime({
          gestures: [
            { do: "bracket", marks: ["2023 · India", "2024 · India"] },
          ],
          model: BUMP.model,
          format: "static",
          claim: BUMP.claim,
        }),
      )?.fix,
    ).toEqual({ remove: 0 });
  });
});

describe("gaps are marked, never refused", () => {
  const points = readPoints([
    ...[2010, 2011, 2012, 2013, 2014].map((t) => ({
      series: "Alpha",
      t,
      value: t === 2012 ? null : t - 2000,
    })),
    ...[2010, 2011, 2012, 2013, 2014].map((t) => ({
      series: "Beta",
      t,
      value: 30 - (t - 2010) * 4,
    })),
  ]);

  it("should record a line's missing reading as a bridged gap", () => {
    expect(timeModel({ variant: "line", points }).gaps).toEqual([
      { series: "Alpha", from: 2011, to: 2013, keys: ["2012"], bridged: true },
    ]);
  });

  it("should record a stack's missing layer as a gap of the whole stack", () => {
    expect(
      timeModel({ variant: "area-and-stacked-area", points }).gaps.map(
        (g: any) => g.keys,
      ),
    ).toEqual([["2012"]]);
  });

  it("should stage a beat whose series has a gap", () => {
    const model = timeModel({ variant: "line", points });
    expect(
      stageTime({
        gestures: [{ do: "highlight", mark: "Alpha" }],
        model,
        format: "static",
        claim: { takeaway: "Alpha rose" },
      }).gestures.length,
    ).toBe(1);
  });

  it("should refuse two readings for one series at one time, naming the fix", () => {
    expect(() =>
      readPoints([
        { series: "A", t: 2010, value: 1 },
        { series: "A", t: 2010, value: 2 },
      ]),
    ).toThrow(/ONE reading per series per time/);
  });
});

describe("the claim's series", () => {
  const points = readPoints(
    ["Alpha", "Beta", "Gamma"].flatMap((s, k) =>
      [2010, 2011, 2012].map((t) => ({
        series: s,
        t,
        value: 10 * (k + 1) + (t - 2010),
      })),
    ),
  );
  const model = timeModel({ variant: "line", points });
  const claim = { takeaway: "Alpha overtook nobody, but Beta stayed above it" };

  it("should accept a highlight on the series the takeaway names", () => {
    expect(
      validateTime({
        gestures: [{ do: "highlight", mark: "Alpha" }],
        model,
        format: "static",
        claim,
      }).subject,
    ).toBe("Alpha");
  });

  it("should refuse a highlight on a series the takeaway does not name", () => {
    expect(
      refusalOf(() =>
        validateTime({
          gestures: [{ do: "highlight", mark: "Gamma" }],
          model,
          format: "static",
          claim,
        }),
      )?.fix,
    ).toEqual({ remove: 0 });
  });
});

// ── the format schedulers, one list per type on its proof data ─────────────────────────────────────────
import * as timeWeb from "../craft/_shared/gesture-time-web.mjs";
import * as timeVideo from "../craft/_shared/gesture-time-video.mjs";
import * as timeScrolly from "../craft/_shared/gesture-time-scrolly.mjs";
const { scheduleTimeWeb } = timeWeb as any;
const { scheduleTimeVideo } = timeVideo as any;
const { checkTimeCards, scheduleTimeScrolly } = timeScrolly as any;
import { pictureOf } from "../craft/_shared/gesture-family-time.mjs";

const fmt = (x: number) => x.toFixed(1);
const CASES: [string, { model: any; claim: any }, any[]][] = [
  ["line", LINE, [{ do: "trace", mark: "1973" }, { do: "name", mark: "1973" }, { do: "compare", marks: ["2024", "1967"] }]],
  ["area-and-stacked-area", AREA, [{ do: "reveal" }, { do: "name", mark: "1973" }, { do: "bracket", marks: AREA.model.marks.filter((m: any) => m.t > 1986).map((m: any) => m.key), of: "whole" }]],
  ["streamgraph", STREAM, [{ do: "reveal" }, { do: "highlight", mark: "Solaire" }, { do: "compare", marks: ["Solaire", "Pétrole"] }]],
  ["bump-ranking-over-time", BUMP, [{ do: "reveal" }, { do: "highlight", mark: "India" }, { do: "compare", marks: ["2024 · India", "1990 · India"] }]],
];

describe.each(CASES)("format schedulers — %s", (_name, t, gestures) => {
  const valid = (format: string) => validateTime({ gestures, model: t.model, format, claim: t.claim });

  it("should give the web page at least one reader control, each its own picture", () => {
    const v = valid("web");
    const s = scheduleTimeWeb({ model: t.model, valid: v.gestures, format: fmt, subject: v.subject });
    expect(s.controls.length).toBeGreaterThan(0);
  });

  it("should schedule the video's three gestures into distinct event states", () => {
    const v = valid("video");
    const { accent, items } = (pictureOf as any)(t.model, v.gestures, { format: fmt, subject: v.subject });
    const s = scheduleTimeVideo({ items, accent, series: t.model.series, t0: t.model.t0, t1: t.model.t1 });
    expect(new Set(s.states.slice(1, 5).map((x: any) => JSON.stringify(x))).size).toBe(4);
  });

  it("should give the scrolly one distinct state per card, then the closing card", () => {
    const v = valid("scrolly");
    const s = scheduleTimeScrolly({ model: t.model, valid: v.gestures, format: fmt, subject: v.subject });
    expect(new Set(s.states.map((x: any) => JSON.stringify(x))).size).toBe(gestures.length + 1);
  });
});

describe("scrolly cards", () => {
  it("should refuse a card stating a figure the readings do not give", () => {
    const list = [{ do: "name", mark: "1973", card: "En 1973, la Suisse émet 99,9 Mt." }];
    const v = validateTime({ gestures: list, model: LINE.model, format: "scrolly", claim: LINE.claim });
    const s = scheduleTimeScrolly({ model: LINE.model, valid: v.gestures, format: fmt, subject: v.subject });
    expect(refusalOf(() => checkTimeCards({ model: LINE.model, valid: v.gestures, plan: s.plan, format: fmt, subject: v.subject }))?.field).toBe("gestures[0].card");
  });
});
