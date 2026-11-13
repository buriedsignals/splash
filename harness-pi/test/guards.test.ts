import { beforeAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyStoryboard,
  assertDrawsClaimColumn,
  assertHeadlineNumbersDrawn,
  assertLegibleLabels,
  assertNoAggregates,
  errorText,
  importBeat,
  legibleFormat,
  printable,
  runCheck,
} from "../craft/_shared/guards.mjs";

let beat: string;

beforeAll(() => {
  const story = mkdtempSync(join(tmpdir(), "splash-guards-"));
  beat = join(story, "beats", "1");
  mkdirSync(beat, { recursive: true });
  writeFileSync(
    join(story, "STORYBOARD.md"),
    `---\nclaimColumn: "co2_t"\n---\n`,
  );
  writeFileSync(
    join(beat, "data.json"),
    JSON.stringify({
      columns: [
        { name: "country", type: "text" },
        { name: "co2_t", type: "number" },
      ],
      rows: [
        ["A", 11_700_000_000],
        ["B", 4_900_000_000],
      ],
    }),
  );
});

describe("assertDrawsClaimColumn", () => {
  it("should accept the claim column drawn in a power-of-ten unit (tonnes as billions)", () => {
    expect(() => assertDrawsClaimColumn([11.7, 4.9], beat)).not.toThrow();
  });

  it("should refuse values the claim column does not hold at any one scale", () => {
    expect(() => assertDrawsClaimColumn([11.7, 3.2], beat)).toThrow(
      /draws values that column does not hold/,
    );
  });
});

describe("assertDrawsClaimColumn beside a comparison series", () => {
  const story = () => {
    const root = mkdtempSync(join(tmpdir(), "splash-claim-"));
    const dir = join(root, "beats", "1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(root, "STORYBOARD.md"),
      `---\nclaimColumn: "pedelec"\n---\n`,
    );
    writeFileSync(
      join(dir, "data.json"),
      JSON.stringify({
        columns: [
          { name: "year" },
          { name: "pedelec" },
          { name: "bicycle" },
          { name: "cars" },
        ],
        rows: [
          [2015, "36", "357", 1500],
          [2024, "195", "250", 1165],
          [2025, "214", "248", 1210],
        ],
      }),
    );
    return dir;
  };

  it("should accept the claim column drawn beside one other column of data.json (the storyboard's comparison)", () => {
    expect(() =>
      assertDrawsClaimColumn([36, 195, 214, 357, 250, 248], story()),
    ).not.toThrow();
  });

  it("should still refuse a plate that draws none of the claim column", () => {
    expect(() => assertDrawsClaimColumn([357, 250, 248], story())).toThrow(
      /draws values that column does not hold/,
    );
  });

  it("should still refuse values no column of data.json holds", () => {
    expect(() =>
      assertDrawsClaimColumn([36, 195, 214, 999, 888], story()),
    ).toThrow(/draws values that column does not hold \(999, 888\)/);
  });
});

describe("assertDrawsClaimColumn on a ratio", () => {
  const story = () => {
    const root = mkdtempSync(join(tmpdir(), "splash-ratio-"));
    const dir = join(root, "beats", "1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(root, "STORYBOARD.md"),
      `---\nclaimShape: "none"\nclaimRatio: "beds / people"\n---\n`,
    );
    writeFileSync(
      join(dir, "data.json"),
      JSON.stringify({
        columns: [{ name: "region" }, { name: "beds" }, { name: "people" }],
        rows: [
          ["A", 21400, 5510000],
          ["B", 17800, 4400000],
          ["C", 9800, 2440000],
        ],
      }),
    );
    return dir;
  };

  it("should accept the ratio drawn per 10,000, rounded", () => {
    expect(() =>
      assertDrawsClaimColumn([38.8, 40.5, 40.2], story()),
    ).not.toThrow();
  });

  it("should refuse the numerator drawn under a per-resident claim, naming the division", () => {
    expect(() => assertDrawsClaimColumn([21400, 17800, 9800], story())).toThrow(
      /beds divided by people.*21400/,
    );
  });
});

describe("assertHeadlineNumbersDrawn", () => {
  it("should read a nineteenth-century year in the title as a year, not a figure", () => {
    expect(() =>
      assertHeadlineNumbersDrawn(
        "World population passed 8 billion, from 1 billion in 1858",
        [1, 8],
      ),
    ).not.toThrow();
  });

  it("should still refuse a title whose figures are not drawn", () => {
    expect(() =>
      assertHeadlineNumbersDrawn(
        "Pedelec deaths rose from 36 to 214",
        [17, 60, 119],
      ),
    ).toThrow(/the title states/);
  });
});

describe("applyStoryboard", () => {
  it("should refuse a beat.mjs with no default export, saying how to write one", () => {
    expect(() => applyStoryboard(undefined, beat)).toThrow(
      /beat\.mjs has no default export.*export default \{/,
    );
  });

  // gx-bullet web (Qwen3.5-9B, 2026-11-13): detail(r) read r.parts, which the kit never passes; three renders refused
  // with a bare "undefined is not an object (evaluating 'r.parts.map')" and the session stopped on the same failure.
  it("should name the field and the keys it receives when a beat function reads one the kit never passes", () => {
    const b = {
      detail: (r: { parts: string[] }) => r.parts.map(String).join(", "),
    };
    applyStoryboard(b, mkdtempSync(join(tmpdir(), "splash-fn-")));
    expect(() =>
      b.detail({ name: "Pologne", before: 1, after: 2 } as never),
    ).toThrow(
      /detail\(…\) failed: .*parts.*detail receives \{ name, before, after \}/,
    );
  });

  it("should leave a check's own refusal word for word", () => {
    const b = {
      check() {
        throw new Error("the biggest gain is France's, not Poland's");
      },
    };
    applyStoryboard(b, mkdtempSync(join(tmpdir(), "splash-fn-")));
    expect(() => b.check()).toThrow(
      /^the biggest gain is France's, not Poland's$/,
    );
  });

  // gx-proportional-symbol web (Qwen3.5-9B, 2026-11-13): the takeaway's "d’un" was typed "d'un", three renders
  // refused a difference the model cannot see, and the session stopped on the same failure.
  it("should take a title that differs from the takeaway only by its apostrophes, and print the journalist's own", () => {
    const root = mkdtempSync(join(tmpdir(), "splash-quote-"));
    const dir = join(root, "beats", "1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(root, "STORYBOARD.md"),
      `---\ntakeaway: "Un tiers d’Europe, « en bas »"\n---\n`,
    );
    const b: Record<string, unknown> = {
      title: ['Un tiers d\'Europe, "en bas"', "court"],
    };
    applyStoryboard(b, dir);
    expect(b.title).toEqual(["Un tiers d’Europe, « en bas »", "court"]);
  });

  // gx-bullet web (Qwen3.5-9B, 2026-11-13): the credit line ended "· as of 2025-06-26" on a French plate.
  it("should date the credit in the story's language", () => {
    const root = mkdtempSync(join(tmpdir(), "splash-asof-"));
    const dir = join(root, "beats", "1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(root, "STORYBOARD.md"),
      `---\nlanguage: fr\ncredit: "Ember"\neffectiveDate: 2025-06-26\n---\n`,
    );
    const b: Record<string, unknown> = { source: "x" };
    applyStoryboard(b, dir);
    expect(b.source).toBe("Ember · données au 26/06/2025");
  });

  // gx-bullet video (Qwen3.5-9B, 2026-11-13): the beat gave two source forms for the one-line credit; the credit
  // replaced them with ONE dated string too long for the line, and every render refused.
  it("should keep the credit as forms, dated first, when the beat gives forms", () => {
    const root = mkdtempSync(join(tmpdir(), "splash-forms-"));
    const dir = join(root, "beats", "1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(root, "STORYBOARD.md"),
      `---\nlanguage: fr\ncredit: "Ember"\neffectiveDate: 2025-06-26\n---\n`,
    );
    const b: Record<string, unknown> = { source: ["a long form of the source", "a shorter form"] };
    applyStoryboard(b, dir);
    expect(b.source).toEqual(["Ember · données au 26/06/2025", "Ember"]);
  });

  // gx-bullet video (Qwen3.5-9B, 2026-11-13): the journalist's credit was too long for the line with its date, the
  // beat's own shorter forms were dropped, and the plate printed the credit undated; the refusal's advice (add a
  // shorter form to source) could never take effect.
  it("should keep the beat's own shorter forms, dated, before the undated credit", () => {
    const root = mkdtempSync(join(tmpdir(), "splash-forms-"));
    const dir = join(root, "beats", "1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(root, "STORYBOARD.md"),
      `---\nlanguage: fr\ncredit: "Ember, Energy Institute"\neffectiveDate: 2025-06-26\n---\n`,
    );
    const b: Record<string, unknown> = {
      source: ["Ember, Energy Institute", "Ember"],
    };
    applyStoryboard(b, dir);
    expect(b.source).toEqual([
      "Ember, Energy Institute · données au 26/06/2025",
      "Ember · données au 26/06/2025",
      "Ember, Energy Institute",
      "Ember",
    ]);
  });

  it("should carry the basemap attribution on every source form", () => {
    const root = mkdtempSync(join(tmpdir(), "splash-forms-"));
    const dir = join(root, "beats", "1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(root, "STORYBOARD.md"),
      `---\nlanguage: fr\ncredit: "Ember"\neffectiveDate: 2025-06-26\n---\n`,
    );
    const b: Record<string, unknown> = { source: ["a long form of the source", "a shorter form"] };
    applyStoryboard(b, dir, { basemap: "©MapTiler" });
    expect(b.source).toEqual([
      "Ember · données au 26/06/2025 · ©MapTiler",
      "Ember · ©MapTiler",
    ]);
  });

  // stress-p (E4B, 2026-11-12): French gesture notes on an English plate; only the title's shorter forms were held.
  const english = () => {
    const root = mkdtempSync(join(tmpdir(), "splash-lang-"));
    const dir = join(root, "beats", "1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(root, "STORYBOARD.md"), `---\nlanguage: en\n---\n`);
    return dir;
  };

  it("should refuse a gesture note written in another language than the story's, naming where it is", () => {
    const beat = {
      eyebrow: "Urban transport",
      gestures: [
        { do: "compare", note: "Plus de deux fois les 96 millions pour Porto" },
      ],
    };
    expect(() => applyStoryboard(beat, english())).toThrow(
      /gestures\[0\]\.note.*"Plus de deux fois.*\(en\)/,
    );
  });

  it("should accept a row name copied from the data, whatever its language", () => {
    const dir = english();
    writeFileSync(
      join(dir, "data.json"),
      JSON.stringify({
        columns: [{ name: "country" }, { name: "v" }],
        rows: [["Saint-Vincent-et-les-Grenadines et les autres", 1]],
      }),
    );
    const beat = {
      gestures: [
        {
          do: "highlight",
          mark: "Saint-Vincent-et-les-Grenadines et les autres",
        },
      ],
    };
    expect(() => applyStoryboard(beat, dir)).not.toThrow();
  });

  it("should refuse a short note whose only function word is another language's", () => {
    const beat = {
      gestures: [
        { do: "compare", note: "214 contra 96" },
        { do: "bracket", note: "de 394" },
      ],
    };
    expect(() => applyStoryboard(beat, english())).toThrow(
      /gestures\[0\]\.note is "214 contra 96".*gestures\[1\]\.note is "de 394"/,
    );
  });

  it("should accept a short note that names a place with a particle", () => {
    const beat = { gestures: [{ do: "compare", note: "Rio de Janeiro: 96" }] };
    expect(() => applyStoryboard(beat, english())).not.toThrow();
  });

  it("should accept a short note in the story's language", () => {
    const beat = {
      gestures: [
        { do: "compare", note: "214 against 96" },
        { do: "bracket", note: "of 394" },
      ],
    };
    expect(() => applyStoryboard(beat, english())).not.toThrow();
  });

  it("should accept a note in the story's language that names a foreign place", () => {
    const beat = {
      eyebrow: "Urban transport",
      gestures: [
        { do: "compare", note: "More than twice Rio de Janeiro's trips" },
      ],
    };
    expect(() => applyStoryboard(beat, english())).not.toThrow();
  });
});

describe("applyStoryboard on the title's shorter forms", () => {
  const TAKEAWAY =
    "All 16 countries cleaned up their own electricity, yet France lost 11.8 points";
  const storyIn = (language: string) => {
    const story = mkdtempSync(join(tmpdir(), "splash-language-"));
    const dir = join(story, "beats", "1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(story, "STORYBOARD.md"),
      `---\ntakeaway: "${TAKEAWAY}"\nlanguage: ${language}\n---\n`,
    );
    return dir;
  };

  it("should refuse a shorter form written in another language than the storyboard's", () => {
    const b = {
      title: [TAKEAWAY, "Tous plus propres chez eux, plus légers en Europe"],
    };
    expect(() => applyStoryboard(b, storyIn("en"))).toThrow(
      /title's shorter forms must be in the storyboard's language \(en\)/,
    );
  });

  it("should refuse a shorter standfirst form written in another language, naming where it is", () => {
    const b = {
      title: [TAKEAWAY],
      limits: [
        "Sixteen countries only, 2015 to 2024.",
        "As viagens de transporte são mais do que em 2024.",
      ],
    };
    expect(() => applyStoryboard(b, storyIn("en"))).toThrow(
      /limits\[1\] is "As viagens de transporte/,
    );
  });

  it("should name every foreign string of the plate in one refusal, not one per render", () => {
    const b = {
      title: [
        TAKEAWAY,
        "Lisboa em 2025: mais de duas vezes Porto e um quarto das viagens",
      ],
      limits: [
        "Sixteen countries only, 2015 to 2024.",
        "As viagens de transporte são mais do que em 2024.",
      ],
      eyebrow: "Transporte urbano em Portugal e as suas redes",
    };
    expect(() => applyStoryboard(b, storyIn("en"))).toThrow(
      /title\[1\].*limits\[1\].*eyebrow/s,
    );
  });

  it("should accept shorter forms in the storyboard's language", () => {
    const b = {
      title: [TAKEAWAY, "All 16 cleaner at home, France lighter in Europe"],
    };
    expect(() => applyStoryboard(b, storyIn("en"))).not.toThrow();
  });

  it("should accept French shorter forms under a French storyboard", () => {
    const b = {
      title: [
        "Les seize ont tous progressé",
        "Tous plus propres chez eux, plus légers en Europe",
      ],
    };
    const dir = storyIn("fr");
    writeFileSync(
      join(dir, "..", "..", "STORYBOARD.md"),
      `---\ntakeaway: "Les seize ont tous progressé"\nlanguage: fr\n---\n`,
    );
    expect(() => applyStoryboard(b, dir)).not.toThrow();
  });
});

describe("assertLegibleLabels", () => {
  it("should refuse labels printed to the last tonne, asking for a readable unit", () => {
    const format = (v: number) => `${v.toLocaleString("en-US")} t`;
    expect(() =>
      assertLegibleLabels(
        [12_289_037_000, 4_904_120_000, 3_193_478_100],
        format,
      ),
    ).toThrow(/billions .*unit/);
  });

  it("should accept a population printed in full", () => {
    const format = (v: number) => v.toLocaleString("en-US");
    expect(() =>
      assertLegibleLabels([4_465_340, 4_312_005, 3_901_220], format),
    ).not.toThrow();
  });
});

describe("errorText", () => {
  // gx-bullet video (Qwen3.5-9B, 2026-11-13): three renders refused "no form wraps into 1 lines of 1715.686274509804px
  // in Open Sans 30px", naming neither the field nor a length that fits.
  it("should name source and a length that fits when no credit form fits the video's line", () => {
    expect(
      errorText(
        new Error(
          "no form wraps into 1 lines of 1715.686274509804px in Open Sans 30px",
        ),
      ),
    ).toMatch(/^source: .*1 line of 1716px.*about 103 characters/);
  });

  it("should spell out each error of a failed build with its line", async () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-build-"));
    writeFileSync(
      join(dir, "bad.mjs"),
      "const a = 1;\nconst a = 2;\nexport default {};\n",
    );
    const error = await import(join(dir, "bad.mjs")).catch((e) => e);
    expect(errorText(error)).toMatch(
      /"a" has already been declared \(line 2: const a = 2;\)/,
    );
  });
});

describe("assertHeadlineNumbersDrawn with signed values", () => {
  it("should read a loss stated without its sign against a negative drawn value", () => {
    expect(() =>
      assertHeadlineNumbersDrawn(
        "Beta lost 12 while Alpha gained 20",
        [20, -12],
      ),
    ).not.toThrow();
  });
});

describe("assertHeadlineNumbersDrawn on negative values", () => {
  it("should refuse a title stating losses the negative drawn values do not hold", () => {
    expect(() =>
      assertHeadlineNumbersDrawn("Beta fell 40 and Gamma fell 50", [-12, -30]),
    ).toThrow(/the title states/);
  });
});

describe("assertNoAggregates", () => {
  const story = () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-agg-"));
    writeFileSync(
      join(dir, "data.json"),
      JSON.stringify({
        columns: [
          { name: "Entity", type: "text" },
          { name: "Code", type: "text" },
          { name: "co2", type: "number" },
        ],
        rows: [
          ["China", "CHN", 12.29],
          ["Russia", "RUS", 1.78],
          ["Africa (GCP)", "", 1.5],
          ["World", "OWID_WRL", 38],
          ["Japan", "JPN", 0.96],
          ["Kosovo", "OWID_KOS", 0.008],
        ],
      }),
    );
    return dir;
  };

  it("should refuse a drawn row that is an aggregate, naming it and the code column", () => {
    expect(() =>
      assertNoAggregates(["China", "Africa (GCP)", "Japan"], story()),
    ).toThrow(/Africa \(GCP\).*aggregate.*Code/);
  });

  it("should accept rows that all carry a country code", () => {
    expect(() =>
      assertNoAggregates(["China", "Russia", "Japan"], story()),
    ).not.toThrow();
  });

  it("should accept Kosovo, which OWID codes OWID_KOS for want of an ISO code", () => {
    expect(() =>
      assertNoAggregates(["China", "Kosovo"], story()),
    ).not.toThrow();
  });
});

describe("assertNoAggregates when the storyboard names the aggregate", () => {
  const story = () => {
    const root = mkdtempSync(join(tmpdir(), "splash-agg-named-"));
    const dir = join(root, "beats", "1");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(root, "STORYBOARD.md"),
      `---\ntakeaway: "Africa accounts for about two-thirds of the world's recorded wildfires, and the World count has fallen."\n---\n`,
    );
    writeFileSync(
      join(dir, "data.json"),
      JSON.stringify({
        columns: [
          { name: "entity", type: "text" },
          { name: "code", type: "text" },
          { name: "events", type: "number" },
        ],
        rows: [
          ["Angola", "AGO", 9],
          ["Chad", "TCD", 4],
          ["Peru", "PER", 2],
          ["Mali", "MLI", 1],
          ["Laos", "LAO", 3],
          ["Chile", "CHL", 2],
          ["Africa", "OWID_AFR", 13],
          ["Asia", "OWID_ASI", 3],
          ["World", "", 20],
        ],
      }),
    );
    return dir;
  };

  it("should accept the aggregates the takeaway names (Africa, World)", () => {
    expect(() =>
      assertNoAggregates(["Africa", "World"], story()),
    ).not.toThrow();
  });

  it("should still refuse an aggregate the storyboard does not name", () => {
    expect(() =>
      assertNoAggregates(["Angola", "Chad", "Asia"], story()),
    ).toThrow(/"Asia" is an aggregate/);
  });

  it("should accept a plate drawn only from aggregates (every continent stacked), which mixes no country among them", () => {
    expect(() => assertNoAggregates(["Africa", "Asia"], story())).not.toThrow();
  });

  it("should name, in the refusal, the aggregates the storyboard does name, to take as data.json holds them", () => {
    expect(() => assertNoAggregates(["Peru", "Asia"], story())).toThrow(
      /storyboard names \("Africa", "World"\) as data.json holds them/,
    );
  });
});

describe("importBeat", () => {
  const beatWith = (source: string) => {
    const dir = join(
      beat,
      "..",
      `import-${Math.random().toString(36).slice(2)}`,
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "data.json"),
      JSON.stringify({
        columns: [
          { name: "city", type: "text" },
          { name: "trips", type: "number" },
        ],
        rows: [
          ["Lisboa", 214],
          ["Porto", 96],
        ],
      }),
    );
    writeFileSync(join(dir, "beat.mjs"), source);
    return dir;
  };

  it("should refuse a beat that types its rows instead of reading data.json", async () => {
    const dir = beatWith(
      `export default { rows: [{ name: "Lisboa", value: 214 }] };`,
    );
    await expect(importBeat(dir)).rejects.toThrow(
      /types its rows instead of reading data\.json/,
    );
  });

  it("should answer a beat that misreads data.json with its real columns and a first row", async () => {
    const dir = beatWith(
      `import { readFileSync } from "node:fs"; import { join } from "node:path";\nconst data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));\nexport default { lisboa: data.find((r) => r.name === "Lisboa").value };`,
    );
    await expect(importBeat(dir)).rejects.toThrow(
      /columns are "city", "trips" .*\["Lisboa",214\].*col\("city"\).*col\("trips"\)/,
    );
  });

  it("should return the beat when it reads data.json", async () => {
    const dir = beatWith(
      `import { readFileSync } from "node:fs"; import { join } from "node:path";\nconst data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));\nexport default { rows: data.rows.map((r) => ({ name: r[0], value: r[1] })) };`,
    );
    expect((await importBeat(dir)).rows[0]).toEqual({
      name: "Lisboa",
      value: 214,
    });
  });
});

describe("printable", () => {
  it("should unwrap a template written in plain quotes", () => {
    expect(
      printable({
        gestures: [
          { do: "compare", note: "more than twice Porto's ${96} million" },
        ],
      }).gestures[0].note,
    ).toBe("more than twice Porto's 96 million");
  });

  it("should coerce a number where words are expected", () => {
    expect(printable({ title: ["Lisboa", 214], source: 2025 })).toEqual({
      title: ["Lisboa", "214"],
      source: "2025",
    });
  });
});

describe("legibleFormat", () => {
  const pl = (v: number) =>
    new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(v);
  it("should add the decimals that keep close values apart, in the beat's decimal mark", () => {
    expect(
      [4.05, 4.02, 3.88, 3.85].map(legibleFormat([4.05, 4.02, 3.88, 3.85], pl)),
    ).toEqual(["4,05", "4,02", "3,88", "3,85"]);
  });

  it("should keep the beat's format when its labels already differ", () => {
    expect(legibleFormat([214, 96, 31], pl)).toBe(pl);
  });

  // Osaurus runs 36 and 38 (2026-11-11): a compact format collapsed whole counts, and the end labels printed "406220.0".
  it("should write whole counts whole, grouped, when a compact format collapses them", () => {
    const compact = (v: number) =>
      new Intl.NumberFormat("en", { notation: "compact" }).format(v);
    const counts = [406220, 406100, 406300, 68716, 68790, 68700, 67532, 67500];
    expect(legibleFormat(counts, compact)(406220)).toBe("406,220");
  });

  it("should group with a space, not a comma, when the compact format writes a decimal comma", () => {
    const compact = (v: number) =>
      new Intl.NumberFormat("fr", { notation: "compact" }).format(v);
    const shares = [
      406220.4, 406100.2, 406300.1, 68716.5, 68790.5, 68700.5, 67532.5, 67500.5,
    ];
    expect(legibleFormat(shares, compact)(406220.4)).toBe("406\u202f220,4");
  });
});

describe("assertLegibleLabels on rounded rows", () => {
  it("should refuse rows that were rounded until they tie", () => {
    expect(() => assertLegibleLabels([4, 4, 4, 4, 4, 4, 4, 4], String)).toThrow(
      /rounded before drawing/,
    );
  });

  it("should accept whole numbers that differ", () => {
    expect(() =>
      assertLegibleLabels([214, 96, 31, 28, 14, 11], String),
    ).not.toThrow();
  });
});

describe("runCheck", () => {
  it("should say an inverted check() may be the bug", () => {
    expect(() =>
      runCheck({
        check() {
          throw new Error("Mazowieckie is rank 3");
        },
      }),
    ).toThrow(/check\(\) is inverted/);
  });
});

describe("runCheck on a figure that only rounds", () => {
  it("should ask for a tolerance when both sides print the same figure", () => {
    expect(() =>
      runCheck({
        check: () => {
          throw new Error("share is 99.5%, expected 99.5%");
        },
      }),
    ).toThrow(/compare with a tolerance/);
  });

  it("should keep the inverted-condition hint otherwise", () => {
    expect(() =>
      runCheck({
        check: () => {
          throw new Error("rank 3");
        },
      }),
    ).toThrow(/check\(\) is inverted/);
  });
});

describe("assertHeadlineNumbersDrawn, strict", () => {
  const lisboa = [150, 96, 31, 28, 14, 11];

  it("should refuse a title stating a figure the drawn rows no longer give", () => {
    expect(() =>
      assertHeadlineNumbersDrawn(
        "Lisboa alone carries 214 of the 394 million trips — more than twice Porto's 96 million.",
        lisboa,
        "bars",
      ),
    ).toThrow(/title states 214, 394/);
  });

  it("should accept a gap between two drawn values", () => {
    expect(() =>
      assertHeadlineNumbersDrawn(
        "Lisboa leads Porto by 54 million trips",
        lisboa,
        "bars",
      ),
    ).not.toThrow();
  });

  it("should accept a round figure for the drawn values' total, whatever follows them", () => {
    expect(() =>
      assertHeadlineNumbersDrawn(
        "72 réacteurs sur 8 900 centrales",
        [3884, 2317, 2070, 498, 72, 51, 8, 100, 500, 7],
        "groups",
      ),
    ).not.toThrow();
  });
});

// r8 on Osaurus (2026-11-11): the inside-built-up-areas series (17 to 119) drawn under "214 ... against 36 in 2015";
// told to "read its other columns", the 12B rewrote the beat for 25 minutes.
describe("assertHeadlineNumbersDrawn, locating the stated figure", () => {
  const data = join(
    import.meta.dirname,
    "fixtures",
    "headline-locate",
    "data.json",
  );
  const title = "214 pedelec riders were killed in 2025 against 36 in 2015.";
  const inside = [17, 30, 45, 60, 80, 119];
  it("should name the column and the row that hold the stated figure", () => {
    expect(() =>
      assertHeadlineNumbersDrawn(title, inside, "line", data),
    ).toThrow(
      /214 is data.json's column "Getoetete_Pedelecs_ab_2014" in the row where Ortschaft = "Innerhalb und außerhalb von Ortschaften", Jahr = "?2025/,
    );
  });
});

// gx-connected-scatter on Osaurus (2026-11-11): 64 TWh readings made "11.8" the gap of two of them, and a plot of
// bioenergy against other renewables passed under a title about France's share.
describe("assertHeadlineNumbersDrawn among many marks", () => {
  const twh: number[] = JSON.parse(
    readFileSync(
      join(import.meta.dirname, "fixtures/headline-pairs/scatter-twh.json"),
      "utf8",
    ),
  );
  it("should refuse a figure that is only the gap of two unrelated marks", () => {
    expect(() =>
      assertHeadlineNumbersDrawn(
        "France lost 11.8 points of weight in Europe's low-carbon total",
        twh,
        "points",
        "/nonexistent",
      ),
    ).toThrow(/11\.8/);
  });
  it("should still accept a change between two of a few marks", () => {
    expect(() =>
      assertHeadlineNumbersDrawn(
        "Deaths rose by 178, from 36 to 214",
        [36, 61, 90, 214],
        "points",
        "/nonexistent",
      ),
    ).not.toThrow();
  });
});

describe("assertHeadlineNumbersDrawn on a computed figure", () => {
  it("should say a figure no cell holds is computed, and to draw the computed measure", () => {
    const dir = mkdtempSync(join(tmpdir(), "computed-"));
    writeFileSync(
      join(dir, "data.json"),
      JSON.stringify({ columns: [{ name: "twh" }], rows: [[10], [40], [55]] }),
    );
    expect(() =>
      assertHeadlineNumbersDrawn(
        "France lost 11.8 points",
        [10, 40, 55],
        "points",
        join(dir, "data.json"),
      ),
    ).toThrow(/in no cell of data\.json: it is computed/);
  });
});

// gx-connected-scatter batch 3 (2026-11-12): Germany's 11.71-point move stood in for France's 11.8-point loss.
describe("assertHeadlineNumbersDrawn at the precision the title writes", () => {
  it("should refuse a figure written to one decimal that no mark rounds to", () => {
    expect(() =>
      assertHeadlineNumbersDrawn(
        "France lost 11.8 points",
        [17.8, 47.3, 11.0, 61.0, 11.71],
        "points",
        "/nonexistent",
      ),
    ).toThrow(/11\.8/);
  });
  it("should accept a figure written to one decimal that a mark rounds to", () => {
    expect(() =>
      assertHeadlineNumbersDrawn(
        "France lost 11.8 points",
        [17.8, 47.3, 11.0, 61.0, 11.76],
        "points",
        "/nonexistent",
      ),
    ).not.toThrow();
  });
});
