import { beforeAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertLegibleLabels, assertNoAggregates, errorText, importBeat, legibleFormat, printable, runCheck } from "../craft/_shared/guards.mjs";

let beat: string;

beforeAll(() => {
  const story = mkdtempSync(join(tmpdir(), "splash-guards-"));
  beat = join(story, "beats", "1");
  mkdirSync(beat, { recursive: true });
  writeFileSync(join(story, "STORYBOARD.md"), `---\nclaimColumn: "co2_t"\n---\n`);
  writeFileSync(
    join(beat, "data.json"),
    JSON.stringify({ columns: [{ name: "country", type: "text" }, { name: "co2_t", type: "number" }], rows: [["A", 11_700_000_000], ["B", 4_900_000_000]] }),
  );
});

describe("assertDrawsClaimColumn", () => {
  it("should accept the claim column drawn in a power-of-ten unit (tonnes as billions)", () => {
    expect(() => assertDrawsClaimColumn([11.7, 4.9], beat)).not.toThrow();
  });

  it("should refuse values the claim column does not hold at any one scale", () => {
    expect(() => assertDrawsClaimColumn([11.7, 3.2], beat)).toThrow(/draws values that column does not hold/);
  });
});

describe("assertHeadlineNumbersDrawn", () => {
  it("should read a nineteenth-century year in the title as a year, not a figure", () => {
    expect(() => assertHeadlineNumbersDrawn("World population passed 8 billion, from 1 billion in 1858", [1, 8])).not.toThrow();
  });

  it("should still refuse a title whose figures are not drawn", () => {
    expect(() => assertHeadlineNumbersDrawn("Pedelec deaths rose from 36 to 214", [17, 60, 119])).toThrow(/the title states/);
  });
});

describe("applyStoryboard", () => {
  it("should refuse a beat.mjs with no default export, saying how to write one", () => {
    expect(() => applyStoryboard(undefined, beat)).toThrow(/beat\.mjs has no default export.*export default \{/);
  });
});

describe("assertLegibleLabels", () => {
  it("should refuse labels printed to the last tonne, asking for a readable unit", () => {
    const format = (v: number) => `${v.toLocaleString("en-US")} t`;
    expect(() => assertLegibleLabels([12_289_037_000, 4_904_120_000, 3_193_478_100], format)).toThrow(/billions .*unit/);
  });

  it("should accept a population printed in full", () => {
    const format = (v: number) => v.toLocaleString("en-US");
    expect(() => assertLegibleLabels([4_465_340, 4_312_005, 3_901_220], format)).not.toThrow();
  });
});

describe("errorText", () => {
  it("should spell out each error of a failed build with its line", async () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-build-"));
    writeFileSync(join(dir, "bad.mjs"), "const a = 1;\nconst a = 2;\nexport default {};\n");
    const error = await import(join(dir, "bad.mjs")).catch((e) => e);
    expect(errorText(error)).toMatch(/"a" has already been declared \(line 2: const a = 2;\)/);
  });
});

describe("assertHeadlineNumbersDrawn with signed values", () => {
  it("should read a loss stated without its sign against a negative drawn value", () => {
    expect(() => assertHeadlineNumbersDrawn("Beta lost 12 while Alpha gained 20", [20, -12])).not.toThrow();
  });
});

describe("assertHeadlineNumbersDrawn on negative values", () => {
  it("should refuse a title stating losses the negative drawn values do not hold", () => {
    expect(() => assertHeadlineNumbersDrawn("Beta fell 40 and Gamma fell 50", [-12, -30])).toThrow(/the title states/);
  });
});

describe("assertNoAggregates", () => {
  const story = () => {
    const dir = mkdtempSync(join(tmpdir(), "splash-agg-"));
    writeFileSync(
      join(dir, "data.json"),
      JSON.stringify({
        columns: [{ name: "Entity", type: "text" }, { name: "Code", type: "text" }, { name: "co2", type: "number" }],
        rows: [["China", "CHN", 12.29], ["Russia", "RUS", 1.78], ["Africa (GCP)", "", 1.5], ["World", "OWID_WRL", 38], ["Japan", "JPN", 0.96], ["Kosovo", "OWID_KOS", 0.008]],
      }),
    );
    return dir;
  };

  it("should refuse a drawn row that is an aggregate, naming it and the code column", () => {
    expect(() => assertNoAggregates(["China", "Africa (GCP)", "Japan"], story())).toThrow(/Africa \(GCP\).*aggregate.*Code/);
  });

  it("should accept rows that all carry a country code", () => {
    expect(() => assertNoAggregates(["China", "Russia", "Japan"], story())).not.toThrow();
  });

  it("should accept Kosovo, which OWID codes OWID_KOS for want of an ISO code", () => {
    expect(() => assertNoAggregates(["China", "Kosovo"], story())).not.toThrow();
  });
});

describe("importBeat", () => {
  const beatWith = (source: string) => {
    const dir = join(beat, "..", `import-${Math.random().toString(36).slice(2)}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "data.json"), JSON.stringify({ columns: [{ name: "city", type: "text" }, { name: "trips", type: "number" }], rows: [["Lisboa", 214], ["Porto", 96]] }));
    writeFileSync(join(dir, "beat.mjs"), source);
    return dir;
  };

  it("should refuse a beat that types its rows instead of reading data.json", async () => {
    const dir = beatWith(`export default { rows: [{ name: "Lisboa", value: 214 }] };`);
    await expect(importBeat(dir)).rejects.toThrow(/types its rows instead of reading data\.json/);
  });

  it("should answer a beat that misreads data.json with its real columns and a first row", async () => {
    const dir = beatWith(
      `import { readFileSync } from "node:fs"; import { join } from "node:path";\nconst data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));\nexport default { lisboa: data.find((r) => r.name === "Lisboa").value };`,
    );
    await expect(importBeat(dir)).rejects.toThrow(/columns are "city", "trips" .*\["Lisboa",214\].*col\("city"\).*col\("trips"\)/);
  });

  it("should return the beat when it reads data.json", async () => {
    const dir = beatWith(
      `import { readFileSync } from "node:fs"; import { join } from "node:path";\nconst data = JSON.parse(readFileSync(join(import.meta.dirname, "data.json"), "utf8"));\nexport default { rows: data.rows.map((r) => ({ name: r[0], value: r[1] })) };`,
    );
    expect((await importBeat(dir)).rows[0]).toEqual({ name: "Lisboa", value: 214 });
  });
});

describe("printable", () => {
  it("should unwrap a template written in plain quotes", () => {
    expect(printable({ gestures: [{ do: "compare", note: "more than twice Porto's ${96} million" }] }).gestures[0].note).toBe("more than twice Porto's 96 million");
  });

  it("should coerce a number where words are expected", () => {
    expect(printable({ title: ["Lisboa", 214], source: 2025 })).toEqual({ title: ["Lisboa", "214"], source: "2025" });
  });
});

describe("legibleFormat", () => {
  const pl = (v: number) => new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 }).format(v);
  it("should add the decimals that keep close values apart, in the beat's decimal mark", () => {
    expect([4.05, 4.02, 3.88, 3.85].map(legibleFormat([4.05, 4.02, 3.88, 3.85], pl))).toEqual(["4,05", "4,02", "3,88", "3,85"]);
  });

  it("should keep the beat's format when its labels already differ", () => {
    expect(legibleFormat([214, 96, 31], pl)).toBe(pl);
  });
});

describe("assertLegibleLabels on rounded rows", () => {
  it("should refuse rows that were rounded until they tie", () => {
    expect(() => assertLegibleLabels([4, 4, 4, 4, 4, 4, 4, 4], String)).toThrow(/rounded before drawing/);
  });

  it("should accept whole numbers that differ", () => {
    expect(() => assertLegibleLabels([214, 96, 31, 28, 14, 11], String)).not.toThrow();
  });
});

describe("runCheck", () => {
  it("should say an inverted check() may be the bug", () => {
    expect(() => runCheck({ check() { throw new Error("Mazowieckie is rank 3"); } })).toThrow(/check\(\) is inverted/);
  });
});
