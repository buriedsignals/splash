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
import { applyFix, GestureRefusal } from "../craft/_shared/gesture-core.mjs";
import { admissible, WEB_RESTING } from "../craft/_shared/gesture-registry.mjs";
import * as web from "../craft/_shared/gesture-web.mjs";
import { contractText } from "../src/craft-kit.ts";

// The scheduler is plain JS: its resting state, controls and declaration are read as data here.
const { stageWeb, WEB_CONTROLS } = web as {
  stageWeb: (input: object) => any;
  WEB_CONTROLS: Record<string, { atom: string; mechanism: string }>;
};

const CHECKOUT = resolve(import.meta.dirname, "..", "..");
const KIT = join(
  CHECKOUT,
  "harness-pi",
  "craft",
  "web",
  "bar-and-column.gestures",
);
const SHARED = join(CHECKOUT, "harness-pi", "craft", "_shared");

/** chart-web's own repertoire, read from the skill (a dynamic path, so the typecheck does not walk the skill). */
const PLAN_MODULE = join(
  CHECKOUT,
  "skills",
  "chart-web",
  "assets",
  "interaction-plan.ts",
);
const { GESTURES } = (await import(PLAN_MODULE)) as {
  GESTURES: Record<string, string>;
};

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
/** The list the 12B wrote for Lisboa (U10 probe run #1, U11 static run). */
const LISBOA_GESTURES = [
  { do: "highlight", mark: "Lisboa" },
  { do: "bracket", mark: "Lisboa", of: "whole", note: "214 of 394 million" },
  {
    do: "compare",
    marks: ["Lisboa", "Porto"],
    note: "more than twice Porto's 96 million",
  },
];

const stage = (gestures: object[], extra: object = {}) =>
  stageWeb({ gestures, rows: LISBOA, claim: LISBOA_CLAIM, ...extra });

describe("web scheduler", () => {
  it("should give the Lisboa list a resting state plus controls whose declared atoms are all chart-web gestures", () => {
    const { scheduled, interaction } = stage(LISBOA_GESTURES);
    expect({
      accent: scheduled.resting.accent,
      controls: scheduled.controls.map((c: { do: string }) => c.do),
      unknown: interaction.controls
        .map((c: { gesture: string }) => c.gesture)
        .filter((g: string) => !(g in GESTURES)),
    }).toEqual({
      accent: ["Lisboa"],
      controls: ["bracket", "compare"],
      unknown: [],
    });
  });

  it("should map every Length gesture a web page cannot rest to a chart-web atom", () => {
    const controlled = admissible("length", "web")
      .map((a: { do: string }) => a.do)
      .filter((d: string) => !WEB_RESTING.has(d));
    expect(
      controlled.filter((d: string) => !(WEB_CONTROLS[d]?.atom in GESTURES)),
    ).toEqual([]);
  });

  it("should declare exactly one control per non-resting gesture, in story order, after the marks' own reading", () => {
    const gestures = [
      { do: "highlight", mark: "Lisboa" },
      { do: "filter", marks: ["Lisboa", "Porto"] },
      { do: "name", mark: "Porto" },
      { do: "zoom", mark: "Porto", note: "×2.2" },
      {
        do: "compare",
        marks: ["Lisboa", "Porto"],
        note: "more than twice Porto's 96 million",
      },
    ];
    const { interaction } = stage(gestures);
    expect(
      interaction.controls.map((c: { gesture: string; parameter: string }) => [
        c.gesture,
        c.parameter.match(/gestures\[(\d)\]/)?.[1] ?? null,
      ]),
    ).toEqual([
      ["ask-a-mark", null],
      ["filter-to-a-subset", "1"],
      ["zoom-and-pan", "3"],
      ["toggle-a-comparison", "4"],
    ]);
  });

  it("should give every declared control a question, a change, and the resting and gesture pictures to pick from", () => {
    const { interaction } = stage(LISBOA_GESTURES);
    expect(
      interaction.controls
        .slice(1)
        .every(
          (c: {
            question: string;
            readerPicks: string[];
            authorPicked: string;
          }) =>
            c.question.endsWith("?") &&
            c.readerPicks.join() === "rest,on" &&
            c.authorPicked === "on",
        ),
    ).toBe(true);
  });

  it("should print, under each control, a reading the resting page does not hold", () => {
    const { scheduled } = stage(LISBOA_GESTURES);
    expect(
      scheduled.controls.map((c: { pieces: string[] }) => c.pieces[0]),
    ).toEqual(["214 / 394 = 54.3 %", "214 / 96 = 2.2 ×"]);
  });

  it("should give the value scale the headroom of its tallest state, the whole a bracket stacks", () => {
    expect(stage(LISBOA_GESTURES).scheduled.hi).toBe(394);
  });

  it("should refuse a gesture with no web control, naming the formats that draw it, and drop it on repair", () => {
    const { compare, ...withoutCompare } = WEB_CONTROLS;
    let refusal: unknown;
    try {
      stage(LISBOA_GESTURES, { controls: withoutCompare });
    } catch (error) {
      refusal = error;
    }
    const repaired = stage(LISBOA_GESTURES, {
      controls: withoutCompare,
      repair: true,
    });
    expect({
      refused: refusal instanceof GestureRefusal,
      field: (refusal as GestureRefusal).field,
      names: /static or video/.test((refusal as Error).message),
      dropped: applyFix(LISBOA_GESTURES, (refusal as GestureRefusal).fix).map(
        (g: { do: string }) => g.do,
      ),
      repaired: repaired.gestures.map((g: { do: string }) => g.do),
    }).toEqual({
      refused: true,
      field: "gestures[2].do",
      names: true,
      dropped: ["highlight", "bracket"],
      repaired: ["highlight", "bracket"],
    });
  });

  it("should refuse a reorder into the order the rows already hold, as a control that changes nothing", () => {
    expect(() =>
      stage([
        { do: "highlight", mark: "Lisboa" },
        { do: "reorder", value: "descending" },
      ]),
    ).toThrow(
      /gestures\[1\]: reorder asks for the order the rows already hold/,
    );
  });

  it("should refuse a zoom whose printed factor is not the zoom's, with the factor that works", () => {
    expect(() =>
      stage([
        { do: "highlight", mark: "Lisboa" },
        { do: "zoom", mark: "Porto", note: "×3" },
      ]),
    ).toThrow(
      /gestures\[1\]\.note: prints the factor 3, but zooming onto Porto enlarges the scale ×2\.23/,
    );
  });

  it("should draw forty rows with long names and negative values without refusing, stating the rest", () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({
      name: `${i === 0 ? "Lisboa" : `The Very Long Name Of Network Number ${i}`}`,
      value: i === 39 ? -350 : 300 - i * 7,
    }));
    const { drawn, rest, scheduled } = stageWeb({
      gestures: [
        { do: "highlight", mark: "Lisboa" },
        { do: "bracket", mark: "Lisboa", of: "whole" },
      ],
      rows,
      claim: { takeaway: "Lisboa leads the forty networks." },
    });
    expect([
      drawn.length,
      rest.count,
      drawn[0].name,
      scheduled.lo < 0,
    ]).toEqual([12, 28, "Lisboa", true]);
  });
});

describe("the web bar gesture kit", () => {
  it("should list exactly the admissible web Length gestures in the contract the craft session reads", async () => {
    const contract = await contractText(KIT, "web");
    const known = new Set(
      admissible("length", "web").map((a: { do: string }) => a.do),
    );
    const listed = [...contract.matchAll(/^\| `([a-z-]+)` \| (.+) \|$/gm)]
      .map((m) => [m[1], m[2]])
      .filter(([d]) => known.has(d!));
    expect(listed).toEqual(
      admissible("length", "web").map((a: { do: string; meaning: string }) => [
        a.do,
        a.meaning,
      ]),
    );
  });
});

// ── through the kit's own runner: a scratch story in the bench root ───────────────────────────────────

const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const LISBOA_STORYBOARD = readFileSync(
  join(CHECKOUT, "stories", "stress-p-transport-ridership", "STORYBOARD.md"),
  "utf8",
)
  .split("---")[1]!
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
/** Lisboa's list with a note on the resting highlight, so the resting page carries words of its own. */
const RESTING_NOTE = "214 million trips, the largest network";
const BEAT_GESTURES = [
  { do: "highlight", mark: "Lisboa", note: RESTING_NOTE },
  ...LISBOA_GESTURES.slice(1),
];

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
  restLabel: "The ranking alone",
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
  const dir = join(BENCH, "stories", `zz-g7-test-${name}-${process.pid}`);
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
  const renders = join(at, "renders");
  const page = existsSync(renders)
    ? readdirSync(renders).find((f) => f.endsWith(".html"))
    : undefined;
  return {
    exitCode: out.exitCode,
    output: `${out.stdout.toString()}${out.stderr.toString()}`,
    renders: existsSync(renders),
    html: page ? readFileSync(join(renders, page), "utf8") : "",
  };
}

describe.skipIf(!existsSync(join(BENCH, "package.json")))(
  "the web bar gesture kit, rendered",
  () => {
    it("should serve, before any script runs, the resting page with its note and its accent, and pass verify-web", () => {
      const { exitCode, output, html } = run(
        "lisboa",
        LISBOA_DATA,
        lisboaBeat(BEAT_GESTURES),
      );
      const served = html.replace(/<script[\s\S]*?<\/script>/g, "");
      const accent = served.match(/--accent:\s*(#[0-9A-Fa-f]{6})/)?.[1];
      const resting =
        served.match(/<svg[^>]*data-plate="0"[\s\S]*?<\/svg>/)?.[0] ?? "";
      const accented = [
        ...resting.matchAll(/<rect data-mark="p0-(r\d+)"[^>]*fill="([^"]+)"/g),
      ]
        .filter((m) => m[2] === accent)
        .map((m) => m[1]);
      expect({
        exitCode,
        verified:
          /verify-web \(chart-web\): \d+ checks passed/.test(output) &&
          /look at: /.test(output),
        note: served.includes(RESTING_NOTE),
        accented,
        hiddenByDefault:
          /\[data-plate\]:not\(\[data-plate="0"\]\) \{ display: none; \}/.test(
            served,
          ),
      }).toEqual({
        exitCode: 0,
        verified: true,
        note: true,
        accented: ["r1"],
        hiddenByDefault: true,
      });
    }, 240_000);

    it("should refuse the render, before any gesture check, when data.json makes the title false", () => {
      const data = structuredClone(LISBOA_DATA);
      data.rows[0]![1] = 150;
      const { exitCode, output, renders } = run(
        "lisboa-150",
        data,
        lisboaBeat(BEAT_GESTURES),
      );
      expect([
        exitCode,
        /REFUSED — .*Lisboa carries 150 of 330/.test(output),
        /gestures\[/.test(output),
        renders,
      ]).toEqual([1, true, false, false]);
    });

    it("should print a gesture refusal with its field and a value that works", () => {
      const gestures = structuredClone(BEAT_GESTURES);
      gestures[1]!.note = "214 of 400 million";
      const { exitCode, output, renders } = run(
        "lisboa-400",
        LISBOA_DATA,
        lisboaBeat(gestures),
      );
      expect([
        exitCode,
        /REFUSED — gestures\[1\]\.note: states 400, .*"214 of 394 million"/.test(
          output,
        ),
        renders,
      ]).toEqual([1, true, false]);
    });
  },
);
