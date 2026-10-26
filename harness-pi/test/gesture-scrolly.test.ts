import { afterAll, describe, expect, it } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import {
  GestureRefusal,
  validateGestures,
} from "../craft/_shared/gesture-core.mjs";
import { admissible } from "../craft/_shared/gesture-registry.mjs";
import * as scrolly from "../craft/_shared/gesture-scrolly.mjs";

// The scheduler is plain JS: its states, plan and cards are read as data here.
const { driveSource, scheduleScrolly, selectRows, stageScrolly } = scrolly as {
  driveSource: () => string;
  scheduleScrolly: (input: object) => any;
  selectRows: (input: object) => any;
  stageScrolly: (input: object) => any;
};

const CHECKOUT = resolve(import.meta.dirname, "..", "..");
const KIT = join(
  CHECKOUT,
  "harness-pi",
  "craft",
  "scrolly",
  "bar-and-column.gestures",
);
const SHARED = join(CHECKOUT, "harness-pi", "craft", "_shared");

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
/** The list the 12B wrote for Lisboa (U10 probe run #1, U11 static run), each with its card's prose. */
const LISBOA_GESTURES = [
  {
    do: "highlight",
    mark: "Lisboa",
    card: "Lisboa's network carried 214 million trips in 2025, the longest bar of the six.",
  },
  {
    do: "bracket",
    mark: "Lisboa",
    of: "whole",
    note: "214 of 394 million",
    card: "Of the 394 million trips the six networks recorded, 214 million were Lisboa's.",
  },
  {
    do: "compare",
    marks: ["Lisboa", "Porto"],
    note: "more than twice Porto's 96 million",
    card: "Laid against Porto's 96 million, Lisboa's 214 million is more than twice as long.",
  },
];

const CHINA_CLAIM = {
  takeaway:
    "China emitted more CO₂ in 2024 than the next five emitters together.",
  subject: "The subject is China, the country the article opens on.",
  comparison:
    "The next five emitters together: the United States, India, Russia, Japan and Indonesia.",
};
/** China's rows in million tonnes, as the 12B drew them in the U11 video run: every country of the source. */
const CHINA = (() => {
  const lines = readFileSync(
    join(CHECKOUT, "stories", "stress-v-top-emitters", "source", "data.csv"),
    "utf8",
  )
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.split(","));
  return lines
    .filter((c) => /^[A-Z]{3}$/.test(c[1]))
    .map((c) => ({ name: c[0], value: Number(c[3]) / 1e6 }))
    .sort((a, b) => b.value - a.value);
})();
const FIVE = ["United States", "India", "Russia", "Japan", "Indonesia"];
/** The list the 12B wrote for China in the U11 video run, each with its card's prose. */
const CHINA_GESTURES = [
  {
    do: "highlight",
    mark: "China",
    card: "China emitted 12289.0 million tonnes of CO₂ in 2024.",
  },
  {
    do: "compare",
    marks: ["China", ...FIVE],
    note: "China (12289.0) vs. next five (11652.2)",
    card: "The next five emitters together reach 11652.2 million tonnes: less than China alone.",
  },
  {
    do: "pull-back",
    card: "Back to the whole ranking: China leads, far ahead of the rest.",
  },
];

const refusalOf = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    if (error instanceof GestureRefusal) return error;
    throw error;
  }
  throw new Error("expected a refusal");
};

const format = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

const stage = (
  gestures: object[],
  rows = LISBOA,
  claim: object = LISBOA_CLAIM,
  repair = false,
) => stageScrolly({ gestures, rows, claim, format, repair });

describe("scrolly scheduler", () => {
  it("should give the Lisboa list one card per gesture plus the limits card, every state distinct", () => {
    const { scheduled } = stage(LISBOA_GESTURES);
    const distinct = new Set(
      scheduled.states.map((s: object) => JSON.stringify(s)),
    );
    expect([scheduled.states.length, distinct.size]).toEqual([4, 4]);
  });

  it("should give every card the same numeric fields, as the scroll interpolates them", () => {
    const { scheduled } = stage(LISBOA_GESTURES);
    const keys = scheduled.states.map((s: object) =>
      Object.entries(s)
        .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
        .map(([k]) => k)
        .join(","),
    );
    expect(new Set(keys).size).toBe(1);
  });

  it("should return the whole chart on the limits card: every row back, the first scale", () => {
    const { scheduled } = stage([
      {
        do: "filter",
        marks: ["Lisboa", "Porto"],
        card: "Lisboa, 214 million, and Porto.",
      },
      { do: "highlight", mark: "Lisboa", card: "Lisboa: 214 million trips." },
    ]);
    const last = scheduled.states.at(-1);
    expect([scheduled.states[0].back2, last.back2, [last.lo, last.hi]]).toEqual(
      [1, 0, [scheduled.states[0].lo, scheduled.states[0].hi]],
    );
  });

  it("should schedule China's list over every country, keeping its marks and stating the rest", () => {
    const { scheduled, drawn, rest } = stage(
      CHINA_GESTURES,
      CHINA,
      CHINA_CLAIM,
    );
    const names = drawn.map((r: { name: string }) => r.name);
    expect([
      scheduled.states.length,
      ["China", ...FIVE].every((n) => names.includes(n)),
      rest.count,
      drawn.length + rest.count,
    ]).toEqual([4, true, CHINA.length - drawn.length, CHINA.length]);
  });

  it("should keep every gesture's row among forty rows with long names, and state the remainder", () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({
      name: `Municipality of Santa Maria number ${i + 1}`,
      value: 400 - i * 7,
    }));
    const { drawn, rest } = selectRows({
      rows,
      gestures: [{ marks: ["Municipality of Santa Maria number 30"] }],
    });
    expect([
      drawn.some((r: { name: string }) => r.name.endsWith(" 30")),
      rest.count > 0,
      drawn.length + rest.count,
    ]).toEqual([true, true, 40]);
  });

  it("should schedule zero and negative values on a zero baseline without refusing", () => {
    const rows = [
      { name: "Alpha", value: 30 },
      { name: "Gamma", value: 0 },
      { name: "Beta", value: -12 },
    ];
    const { scheduled } = stage(
      [
        { do: "highlight", mark: "Beta", card: "Beta lost 12 points." },
        {
          do: "annotate",
          mark: "Beta",
          note: "the only loss",
          card: "Beta, at -12, is the only loss.",
        },
      ],
      rows,
      { takeaway: "Beta is the only one that lost points" },
    );
    expect([scheduled.states[0].lo, scheduled.states[0].hi]).toEqual([-12, 30]);
  });

  it("should refuse a card that says twice while its picture shows the bracket over the whole, naming the card", () => {
    const gestures = structuredClone(LISBOA_GESTURES);
    gestures[1].card =
      "Lisboa carries 214 million trips, more than twice Porto's 96 million.";
    const refusal = refusalOf(() => stage(gestures));
    expect([refusal.field, /\bcard 2\b/.test(refusal.message)]).toEqual([
      "gestures[1].card",
      true,
    ]);
  });

  it("should refuse a card that does not state the figure its picture shows, naming the figure", () => {
    const gestures = structuredClone(LISBOA_GESTURES);
    gestures[0].card = "Lisboa's network carried the most trips in 2025.";
    const refusal = refusalOf(() => stage(gestures));
    expect([refusal.field, /\b214\b/.test(refusal.message)]).toEqual([
      "gestures[0].card",
      true,
    ]);
  });

  it("should refuse a card stating a number the rows do not give, with the figure that works", () => {
    const gestures = structuredClone(LISBOA_GESTURES);
    gestures[1].card = "Of the 390 million trips, 214 million were Lisboa's.";
    const refusal = refusalOf(() => stage(gestures));
    expect([refusal.field, (refusal.fix as any).set.value]).toEqual([
      "gestures[1].card",
      "Of the 394 million trips, 214 million were Lisboa's.",
    ]);
  });

  it("should refuse a gesture with no card, as each card is a gesture's prose", () => {
    const gestures = structuredClone(LISBOA_GESTURES) as object[];
    delete (gestures[2] as { card?: string }).card;
    expect(refusalOf(() => stage(gestures)).field).toBe("gestures[2].card");
  });

  it("should repair a refused list with each refusal's own fix, reporting every repair", () => {
    const gestures = structuredClone(LISBOA_GESTURES);
    gestures[1].note = "214 of 390 million";
    gestures[1].card =
      "Lisboa carries 214 million trips, more than twice Porto's 96 million.";
    const { gestures: repaired, repairs } = stage(
      gestures,
      LISBOA,
      LISBOA_CLAIM,
      true,
    );
    expect([
      repairs.map((r: { field: string }) => r.field),
      repaired[1].note,
      /twice/.test(repaired[1].card),
    ]).toEqual([
      ["gestures[1].note", "gestures[1].card"],
      "214 of 394 million",
      false,
    ]);
  });

  it("should refuse a zoom whose printed factor is not the zoom's", () => {
    const refusal = refusalOf(() =>
      stage([
        { do: "highlight", mark: "Lisboa", card: "Lisboa: 214 million." },
        {
          do: "zoom",
          marks: ["Porto", "Braga"],
          note: "×5",
          card: "Porto's 96 million, closer.",
        },
      ]),
    );
    expect([refusal.field, (refusal.fix as any).set.value]).toEqual([
      "gestures[1].note",
      "×2",
    ]);
  });
});

describe("the scrolly drive", () => {
  it("should be emitted as one function, with no import, that parses on its own", () => {
    const source = driveSource();
    const imports = new Bun.Transpiler({ loader: "js" }).scan(source).imports;
    const drive = new Function(`return (${source});`)();
    expect([
      imports.length,
      /\bimport\b/.test(source),
      typeof drive,
      drive.name,
    ]).toEqual([0, false, "function", "applyGestureState"]);
  });

  it("should paint nothing and throw nothing on a root without its carrier", () => {
    const drive = new Function(`return (${driveSource()});`)();
    expect(
      drive({ querySelector: () => null }, {}, { resized: true }),
    ).toBeUndefined();
  });
});

describe("the scrolly bar gesture kit", () => {
  it("should list exactly the admissible scrolly Length gestures in its contract", () => {
    const contract = readFileSync(join(KIT, "CONTRACT.md"), "utf8");
    const known = new Set(
      admissible("length", "scrolly").map((a: { do: string }) => a.do),
    );
    const listed = [...contract.matchAll(/^\| `([a-z-]+)` \| (.+) \|$/gm)]
      .map((m) => [m[1], m[2]])
      .filter(([d]) => known.has(d));
    expect(listed).toEqual(
      admissible("length", "scrolly").map(
        (a: { do: string; meaning: string }) => [a.do, a.meaning],
      ),
    );
  });
});

// ── refusals through the kit's own runner: a scratch story in the bench root, refused before any browser ──

const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const LISBOA_STORYBOARD = readFileSync(
  join(CHECKOUT, "stories", "stress-p-transport-ridership", "STORYBOARD.md"),
  "utf8",
)
  .split("---")[1]
  .split("\n")
  .filter((l) =>
    /^(takeaway|subject|comparison|limits|credit|effectiveDate|language):/.test(
      l,
    ),
  )
  .join("\n");
const LIMITS = LISBOA_STORYBOARD.match(/^limits: "(.*)"$/m)![1];
const LISBOA_DATA = {
  columns: [
    { name: "city", type: "string" },
    { name: "trips_millions", type: "number" },
  ],
  rows: LISBOA.map((r) => [r.name, r.value]),
};

const lisboaBeat = (gestures: object[]) => `
import { readFileSync } from "node:fs";
import { join } from "node:path";
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const at = (n) => data.columns.findIndex((c) => c.name === n);
const rows = data.rows.map((r) => ({ name: r[at("city")], value: r[at("trips_millions")] })).sort((a, b) => b.value - a.value);
const total = rows.reduce((s, r) => s + r.value, 0);
const lisboa = rows.find((r) => r.name === "Lisboa");
const porto = rows.find((r) => r.name === "Porto");
export default {
  eyebrow: "Transport · Portugal",
  rows,
  gestures: ${JSON.stringify(gestures)},
  unit: "million trips, 2025",
  format: (v) => String(v),
  title: ${JSON.stringify(LISBOA_CLAIM.takeaway)},
  limits: ${JSON.stringify(LIMITS)},
  source: "",
  alt: \`Bars of six city networks by trips in 2025; Lisboa leads with \${lisboa.value} million of \${total}.\`,
  check() {
    if (lisboa.value !== 214 || total !== 394) throw new Error(\`Lisboa carries \${lisboa.value} of \${total} million trips, not 214 of 394\`);
    if (!(lisboa.value > 2 * porto.value)) throw new Error(\`Lisboa \${lisboa.value} is no longer more than twice Porto \${porto.value}\`);
  },
};
`;

function run(name: string, data: object, beat: string) {
  const dir = join(BENCH, "stories", `zz-g6-test-${name}-${process.pid}`);
  scratch.push(dir);
  const at = join(dir, "beats", "1");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(at, { recursive: true });
  writeFileSync(
    join(dir, "PALETTE.md"),
    `---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: newsroom\n---\n`,
  );
  writeFileSync(join(dir, "STORYBOARD.md"), `---\n${LISBOA_STORYBOARD}\n---\n`);
  for (const f of readdirSync(KIT)) cpSync(join(KIT, f), join(at, f));
  for (const f of readdirSync(SHARED)) cpSync(join(SHARED, f), join(at, f));
  writeFileSync(join(at, "data.json"), JSON.stringify(data));
  writeFileSync(join(at, "beat.mjs"), beat);
  const out = Bun.spawnSync(["bun", join(at, "render-beat.mjs")], {
    cwd: BENCH,
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    exitCode: out.exitCode,
    output: `${out.stdout.toString()}${out.stderr.toString()}`,
    renders: existsSync(join(at, "renders")),
  };
}

describe.skipIf(!existsSync(join(BENCH, "package.json")))(
  "the scrolly bar gesture kit, refusing",
  () => {
    it("should refuse on the takeaway check, before any gesture check, when Lisboa is 150", () => {
      const data = structuredClone(LISBOA_DATA);
      data.rows[0][1] = 150;
      const { exitCode, output, renders } = run(
        "lisboa-150",
        data,
        lisboaBeat(LISBOA_GESTURES),
      );
      expect([
        exitCode,
        /REFUSED — .*Lisboa carries 150 of 330/.test(output),
        /gestures\[/.test(output),
        renders,
      ]).toEqual([1, true, false, false]);
    });

    it("should print a card refusal with its field and the card it names", () => {
      const gestures = structuredClone(LISBOA_GESTURES);
      gestures[1].card =
        "Lisboa carries 214 million trips, more than twice Porto's 96 million.";
      const { exitCode, output, renders } = run(
        "lisboa-twice",
        LISBOA_DATA,
        lisboaBeat(gestures),
      );
      expect([
        exitCode,
        /REFUSED — gestures\[1\]\.card: card 2\b/.test(output),
        renders,
      ]).toEqual([1, true, false]);
    });
  },
);
