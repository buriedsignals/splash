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
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import {
  GestureRefusal,
  validateGestures,
} from "../craft/_shared/gesture-core.mjs";
import { admissible } from "../craft/_shared/gesture-registry.mjs";
import { composeStatic } from "../craft/_shared/gesture-static.mjs";

const CHECKOUT = resolve(import.meta.dirname, "..", "..");
const KITS = join(CHECKOUT, "harness-pi", "craft", "static");
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

function compose(gestures: object[], rows = LISBOA, claim = LISBOA_CLAIM) {
  const validated = validateGestures({
    gestures,
    rows,
    family: "length",
    format: "static",
    claim,
  });
  // The scheduler is plain JS: its plate is read as data here.
  return composeStatic({ gestures: validated.gestures, rows }) as any;
}

describe("static scheduler", () => {
  it("should compose the accent, the bracket of the whole and the copy of Porto onto one plate", () => {
    const plate = compose([
      { do: "highlight", mark: "Lisboa" },
      { do: "bracket", mark: "Lisboa", of: "whole", note: "214 of 394" },
      {
        do: "compare",
        marks: ["Lisboa", "Porto"],
        note: "more than twice Porto's 96",
      },
    ]);
    expect({
      accent: plate.accent,
      bracket: plate.brackets.map((b: any) => [b.span, b.note]),
      copies: plate.copies.map((c: any) => [c.onto, c.value]),
    }).toEqual({
      accent: ["Lisboa"],
      bracket: [[LISBOA.map((r) => r.name), "214 of 394"]],
      copies: [["Lisboa", 96]],
    });
  });

  it("should keep every row a gesture writes on, so the row-dropping ladder never drops it", () => {
    const plate = compose([
      { do: "highlight", mark: "Lisboa" },
      { do: "annotate", mark: "Lisboa", note: "214" },
      { do: "compare", marks: ["Lisboa", "Faro"], note: "214 against 11" },
    ]);
    expect(plate.keep).toEqual(["Lisboa", "Faro"]);
  });

  it("should draw the plate in the order a reorder asks for", () => {
    const plate = compose([
      { do: "reorder", value: "ascending" },
      { do: "highlight", mark: "Lisboa" },
    ]);
    expect(plate.order).toEqual(LISBOA.map((r) => r.name).reverse());
  });

  it("should map every drawn gesture to the treatment that judges it", () => {
    const plate = compose([
      { do: "highlight", mark: "Lisboa" },
      { do: "bracket", mark: "Lisboa", of: "whole", note: "214 of 394" },
      { do: "pull-back" },
    ]);
    expect(plate.treatments.map((t: any) => [t.index, t.id])).toEqual([
      [0, "accent-marks-the-thread"],
      [1, "the-set-a-claim-adds-up-is-drawn-as-a-set"],
    ]);
  });

  it("should draw every bar whole when a rescale's top is below the tallest bar", () => {
    const plate = compose([
      { do: "rescale", value: 100 },
      { do: "highlight", mark: "Lisboa" },
    ]);
    expect(plate.top).toBe(214);
  });

  it("should write the row's value when an annotate has no words", () => {
    const plate = compose([{ do: "annotate", mark: "Lisboa" }]);
    expect(plate.notes.map((n: any) => n.text)).toEqual(["214"]);
  });

  it("should keep only the subject of a bracket of the whole, so the ladder may still drop other rows", () => {
    const plate = compose([
      { do: "bracket", mark: "Lisboa", of: "whole", note: "214 of 394" },
    ]);
    expect(plate.keep).toEqual(["Lisboa"]);
  });
});

describe("the static bar gesture kit", () => {
  it("should list exactly the admissible static Length gestures in its contract", () => {
    const contract = readFileSync(
      join(KITS, "bar-and-column.gestures", "CONTRACT.md"),
      "utf8",
    );
    const listed = [...contract.matchAll(/^\| `([a-z-]+)` \| (.+) \|$/gm)]
      .map((m) => [m[1], m[2]])
      .filter(
        ([d]) =>
          d in
          Object.fromEntries(
            admissible("length", "static").map((a: any) => [a.do, 1]),
          ),
      );
    expect(listed).toEqual(
      admissible("length", "static").map((a: any) => [a.do, a.meaning]),
    );
  });
});

// ── renders: a scratch story in the bench root, rendered as the harness renders a beat ─────────────

const BENCH = join(homedir(), ".splash-harness", "bench", "root");
const scratch: string[] = [];
afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

const csv = (slug: string) =>
  readFileSync(join(CHECKOUT, "stories", slug, "source", "data.csv"), "utf8")
    .trim()
    .split(/\r?\n/)
    .map((l) => l.split(","));

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
const LISBOA_DATA = (() => {
  const [head, ...rows] = csv("stress-p-transport-ridership");
  return {
    columns: head.map((name, i) => ({
      name,
      type: i === 0 ? "string" : "number",
    })),
    rows: rows.map((r) => r.map((c, i) => (i === 0 ? c : Number(c)))),
  };
})();
const LIMITS = LISBOA_STORYBOARD.match(/^limits: "(.*)"$/m)![1];

const lisboaBeat = (gestures: string) => `
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
  gestures: ${gestures},
  format: (v) => String(v),
  title: ${JSON.stringify(LISBOA_CLAIM.takeaway)},
  limits: [${JSON.stringify(`Million trips in 2025. ${LIMITS}`)}, "Million trips in 2025."],
  source: "",
  alt: (drawn) => \`Bars of \${drawn.length} city networks by trips in 2025; Lisboa leads with \${lisboa.value} million of \${total}.\`,
  check() {
    if (lisboa.value !== 214 || total !== 394) throw new Error(\`Lisboa carries \${lisboa.value} of \${total} million trips, not 214 of 394\`);
    if (!(lisboa.value > 2 * porto.value)) throw new Error(\`Lisboa \${lisboa.value} is no longer more than twice Porto \${porto.value}\`);
  },
};
`;

const LISBOA_GESTURES = `[
    { do: "highlight", mark: "Lisboa" },
    { do: "bracket", mark: "Lisboa", of: "whole", note: "214 of 394" },
    { do: "compare", marks: ["Lisboa", "Porto"], note: "more than twice Porto's 96 million" },
  ]`;

const CHINA_STORYBOARD = [
  `takeaway: "La Chine a émis plus de CO2 en 2024 que les cinq pays suivants réunis"`,
  `subject: "La Chine"`,
  `comparison: "Les cinq pays suivants réunis : États-Unis, Inde, Russie, Japon, Indonesia"`,
  `limits: "none"`,
  `credit: "Source : Global Carbon Budget 2025, via Our World in Data · données 2024"`,
  `language: "fr"`,
].join("\n");
const CHINA_DATA = {
  columns: [
    { name: "country", type: "string" },
    { name: "value", type: "number" },
  ],
  rows: csv("stress-v-top-emitters")
    .slice(1)
    .filter((c) => /^[A-Z]{3}$/.test(c[1]))
    .map((c) => [c[0], Math.round(Number(c[3]) / 1e8) / 10] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10),
};

/** The per-type kit's own worked example, with its fields made into a gesture beat. */
const chinaBeat = (gestures: string, limits?: string) =>
  readFileSync(join(KITS, "bar-and-column", "beat.example.mjs"), "utf8")
    .replace(
      /  subject: subject\.name,\n  comparison: [^\n]*\n  comparisonSum,\n  comparisonNote: [^\n]*\n/,
      `  gestures: ${gestures},\n`,
    )
    .replace(
      /  limits: \[[\s\S]*?\n  \],\n/,
      limits ? `  limits: [${JSON.stringify(limits)}],\n` : "$&",
    );

function render(
  name: string,
  kit: string,
  storyboard: string,
  data: object,
  beat: string,
  size = "landscape",
  env: Record<string, string> = {},
) {
  const dir = join(BENCH, "stories", `zz-g4-test-${name}-${process.pid}`);
  scratch.push(dir);
  const at = join(dir, "beats", "1");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(at, { recursive: true });
  writeFileSync(
    join(dir, "PALETTE.md"),
    `---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: newsroom\n---\n`,
  );
  writeFileSync(join(dir, "STORYBOARD.md"), `---\n${storyboard}\n---\n`);
  writeFileSync(
    join(at, "BRIEF.md"),
    `---\ntype: column\nformat: static\nmedium: chart\n---\n`,
  );
  for (const f of readdirSync(join(KITS, kit)))
    cpSync(join(KITS, kit, f), join(at, f));
  for (const f of readdirSync(SHARED)) cpSync(join(SHARED, f), join(at, f));
  writeFileSync(join(at, "data.json"), JSON.stringify(data));
  writeFileSync(join(at, "beat.mjs"), beat);
  const run = Bun.spawnSync(
    ["bun", join(at, "render-beat.mjs"), "--size", size],
    { cwd: BENCH, stdout: "pipe", stderr: "pipe", env: { ...process.env, ...env } },
  );
  const output = `${run.stdout.toString()}${run.stderr.toString()}`;
  const renders = join(at, "renders");
  const svgFile = existsSync(renders)
    ? readdirSync(renders).find((f) => f.endsWith(".svg"))
    : undefined;
  const svg = svgFile ? readFileSync(join(renders, svgFile), "utf8") : "";
  return { exitCode: run.exitCode, output, svg };
}

const texts = (svg: string) =>
  [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) =>
    m[1].replace(/&#x27;|&#39;|&apos;/g, "'").replace(/&amp;/g, "&"),
  );

describe.skipIf(!existsSync(join(BENCH, "package.json")))(
  "the static bar gesture kit, rendered",
  () => {
    it("should state both the share of the whole and the Porto ratio on Lisboa's plate", () => {
      const { output, svg } = render(
        "lisboa",
        "bar-and-column.gestures",
        LISBOA_STORYBOARD,
        LISBOA_DATA,
        lisboaBeat(LISBOA_GESTURES),
      );
      expect([
        output.includes("rendered renders/"),
        ["214 of 394", "more than twice Porto's 96 million"].filter((note) => texts(svg).includes(note)),
      ]).toEqual([true, ["214 of 394", "more than twice Porto's 96 million"]]);
    });

    it("should print China's bracket with the same words as the per-type kit", () => {
      const perType = render(
        "china-per-type",
        "bar-and-column",
        CHINA_STORYBOARD,
        CHINA_DATA,
        readFileSync(join(KITS, "bar-and-column", "beat.example.mjs"), "utf8"),
      );
      const gestures = render(
        "china-gestures",
        "bar-and-column.gestures",
        CHINA_STORYBOARD,
        CHINA_DATA,
        chinaBeat(`[
    { do: "highlight", mark: "Chine" },
    { do: "bracket", marks: comparison.map((r) => r.name), note: \`Les cinq suivants réunis : \${fr(comparisonSum)}\` },
  ]`),
      );
      const bracketText = (svg: string) =>
        texts(svg).filter((t) => t.startsWith("Les cinq suivants"));
      expect(bracketText(gestures.svg)).toEqual(bracketText(perType.svg));
      expect(bracketText(gestures.svg)).toHaveLength(1);
    });

    it("should keep the sixth bar an annotation is written on when the plate is narrow", () => {
      const long =
        "CO2 territorial annuel, en milliards de tonnes, hors émissions importées dans les biens échangés et hors changements d'usage des sols. Les dix premiers émetteurs mondiaux de 2024, classés du plus grand au plus petit ; les chiffres sont arrondis au dixième de milliard de tonnes, si bien que deux pays peuvent afficher la même valeur. Les territoires et regroupements régionaux ne sont pas comptés comme des pays.";
      const without = render(
        "sixth-without",
        "bar-and-column.gestures",
        CHINA_STORYBOARD,
        CHINA_DATA,
        chinaBeat(`[{ do: "highlight", mark: "Chine" }]`, long),
        "square",
      );
      const annotated = render(
        "sixth-annotated",
        "bar-and-column.gestures",
        CHINA_STORYBOARD,
        CHINA_DATA,
        chinaBeat(
          `[{ do: "highlight", mark: "Chine" }, { do: "annotate", mark: "Indonesia", note: "Indonesia : 0,8" }]`,
          long,
        ),
        "square",
      );
      expect([
        texts(without.svg).includes("Indonesia"),
        texts(annotated.svg).filter((t) => t.includes("Indonesia")).sort(),
      ]).toEqual([false, ["Indonesia", "Indonesia : 0,8"]]);
    });

    it("should refuse on the takeaway check, before any gesture check, when Lisboa is 150", () => {
      const data = structuredClone(LISBOA_DATA);
      data.rows.find((r) => r[0] === "Lisboa")![1] = 150;
      const { exitCode, output, svg } = render(
        "lisboa-150",
        "bar-and-column.gestures",
        LISBOA_STORYBOARD,
        data,
        lisboaBeat(LISBOA_GESTURES),
      );
      expect([
        exitCode,
        /Lisboa carries 150 of 330/.test(output),
        /gestures\[/.test(output),
        svg,
      ]).toEqual([1, true, false, ""]);
    });

    it("should repair a refused gesture with its own fix when SPLASH_GESTURE_REPAIR=1", () => {
      const { output, svg } = render(
        "lisboa-repair",
        "bar-and-column.gestures",
        LISBOA_STORYBOARD,
        LISBOA_DATA,
        lisboaBeat(LISBOA_GESTURES.replace("214 of 394", "214 of 390")),
        "landscape",
        { SPLASH_GESTURE_REPAIR: "1" },
      );
      expect([
        /REPAIRED gestures: gestures\[1\]\.note → .*214 of 394/.test(output),
        texts(svg).includes("214 of 394"),
      ]).toEqual([true, true]);
    });

    it("should adapt to forty rows with long names: rows, the gesture's row kept, the remainder stated", () => {
      const rows = Array.from({ length: 40 }, (_, i) => [`Municipality of Santa Maria number ${i + 1}`, 400 - i * 7]);
      const story = [
        `takeaway: "Municipality of Santa Maria number 30 recorded 197 cases"`,
        `limits: "none"`,
        `credit: "Test data"`,
        `language: "en"`,
      ].join("\n");
      const beat = `
import { readFileSync } from "node:fs";
import { join } from "node:path";
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const rows = data.rows.map((r) => ({ name: r[0], value: r[1] }));
export default {
  eyebrow: "Test", rows,
  gestures: [{ do: "highlight", mark: "Municipality of Santa Maria number 30" }, { do: "annotate", mark: "Municipality of Santa Maria number 30", note: "197 cases" }],
  format: (v) => String(v),
  title: "Municipality of Santa Maria number 30 recorded 197 cases",
  limits: ["Cases."], source: "", alt: (d) => \`\${d.length} bars\`,
  check() { if (rows[29].value !== 197) throw new Error("row 30 is not 197"); },
};`;
      const { exitCode, output, svg } = render(
        "forty",
        "bar-and-column.gestures",
        story,
        { columns: [{ name: "place", type: "string" }, { name: "cases", type: "number" }], rows },
        beat,
      );
      const shown = texts(svg).join(" ").match(/(\d+) \/ 40/);
      expect([
        exitCode,
        /pitch/.test(output),
        texts(svg).includes("197 cases"),
        texts(svg).includes("Municipality of Santa Maria number 30"),
        Boolean(shown && Number(shown[1]) < 40),
      ]).toEqual([0, true, true, true, true]);
    });

    it("should draw negative values from zero without refusing", () => {
      // The takeaway and note state no figure: the shared headline guard and the core's note check read
      // numbers without their sign (reported), so this test holds the kit's geometry alone.
      const story = [`takeaway: "Beta is the only one that lost points"`, `limits: "none"`, `credit: "Test data"`, `language: "en"`].join("\n");
      const beat = `
import { readFileSync } from "node:fs";
import { join } from "node:path";
const data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));
const rows = data.rows.map((r) => ({ name: r[0], value: r[1] }));
export default {
  eyebrow: "Test", rows,
  gestures: [{ do: "highlight", mark: "Beta" }, { do: "annotate", mark: "Beta", note: "the only loss" }],
  format: (v) => String(v),
  title: "Beta is the only one that lost points",
  limits: ["Points."], source: "", alt: (d) => \`\${d.length} bars\`,
  check() { if (rows.find((r) => r.name === "Beta").value !== -12) throw new Error("Beta is not -12"); },
};`;
      const { exitCode, svg } = render(
        "negative",
        "bar-and-column.gestures",
        story,
        { columns: [{ name: "name", type: "string" }, { name: "change", type: "number" }], rows: [["Alpha", 30], ["Gamma", 8], ["Delta", 0], ["Beta", -12]] },
        beat,
      );
      expect([exitCode, texts(svg).includes("-12"), texts(svg).includes("the only loss")]).toEqual([0, true, true]);
    });

    it("should print a gesture refusal with its field and the value that works", () => {
      const { exitCode, output } = render(
        "lisboa-wrong-note",
        "bar-and-column.gestures",
        LISBOA_STORYBOARD,
        LISBOA_DATA,
        lisboaBeat(LISBOA_GESTURES.replace("214 of 394", "214 of 390")),
      );
      expect([
        exitCode,
        output
          .match(/REFUSED — gestures\[1\]\.note: .*/)?.[0]
          .includes('"214 of 394"'),
      ]).toEqual([1, true]);
    });
  },
);
