import { describe, it, expect } from "bun:test";
import {
  specToNativeConfig,
  UnsupportedNativeType,
  type NativeSpec,
} from "../src/spec-to-config";

const base = {
  title: "Brazil runs on renewables while most big economies still lag",
  source: { name: "Ember 2025", url: "https://ourworldindata.org/x" },
  unit: "share of electricity from renewables, 2024 (%)",
};

describe("specToNativeConfig — lang threading", () => {
  const spec: NativeSpec = {
    ...base,
    nativeType: "bar",
    data: "country,share\nBrazil,87.3\nIndia,19.8",
  };
  it("threads spec.lang onto the produced config (any type, single injection point)", () => {
    const { config } = specToNativeConfig({ ...spec, lang: "fr" });
    expect(config.lang).toBe("fr");
  });
  it("omits lang when not supplied (default English at render time)", () => {
    const { config } = specToNativeConfig(spec);
    expect(config.lang).toBeUndefined();
  });
});

describe("specToNativeConfig — altInsight threading (WCAG 1.1.1)", () => {
  const spec: NativeSpec = {
    ...base,
    nativeType: "bar",
    data: "country,share\nBrazil,87.3\nIndia,19.8",
  };
  it("threads spec.altInsight onto the produced config (any type, single injection point)", () => {
    const { config } = specToNativeConfig({
      ...spec,
      altInsight:
        "Brazil runs on renewables while most big economies still lag.",
    });
    expect(config.altInsight).toBe(
      "Brazil runs on renewables while most big economies still lag.",
    );
  });
  it("omits altInsight when not supplied (the produce gate then fails hard)", () => {
    const { config } = specToNativeConfig(spec);
    expect("altInsight" in config).toBe(false);
  });
});

describe("specToNativeConfig — bar", () => {
  const spec: NativeSpec = {
    ...base,
    nativeType: "bar",
    data: "country,share\nBrazil,87.3\nIndia,19.8\nCanada,64.3",
    sort: "desc",
    highlight: "Brazil",
  };
  it("maps CSV → catField/valField + parsed rows", () => {
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("bar");
    expect(config.catField).toBe("country");
    expect(config.valField).toBe("share");
    expect((config.rows as unknown[]).length).toBe(3);
    expect((config.rows as Record<string, unknown>[])[0].share).toBe(87.3);
  });
  it("resolves a highlight category to its index AFTER the sort", () => {
    const { config } = specToNativeConfig(spec);
    // sorted desc: Brazil(87.3), Canada(64.3), India(19.8) → Brazil is index 0
    expect(config.highlightIndex).toBe(0);
  });
  it("omits highlightIndex when no highlight is given", () => {
    const { config } = specToNativeConfig({ ...spec, highlight: undefined });
    expect(config.highlightIndex).toBeUndefined();
  });
});

describe("specToNativeConfig — line", () => {
  it("infers a temporal x axis from year-like first column", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "line",
      data: "year,rate\n2018,5.1\n2019,4.8\n2020,6.2",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("line");
    expect(config.xField).toBe("year");
    expect(config.yField).toBe("rate");
    expect(config.xType).toBe("time");
    // directLabel defaults to the value column as a DISPLAY label — capitalised via
    // seriesLabelFromColumn ("rate" → "Rate"), not the raw lowercase header (the 'shops' leak fix).
    expect(config.directLabel).toBe("Rate");
  });
  it("uses a linear x axis for non-temporal first column", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "line",
      data: "dose,response\n10,2.1\n20,3.4\n30,5.0",
    };
    expect(specToNativeConfig(spec).config.xType).toBe("linear");
  });
  it("falls back (UnsupportedNativeType) on a wide multi-series CSV instead of silently keeping the last column", () => {
    // year is numeric (an x column) plus FOUR numeric series → a native line can
    // only draw one; the old mapper silently dropped USA/China/India and rendered
    // EU alone. Fail loud so the orchestrator routes to dw-chart (multi-line).
    const spec: NativeSpec = {
      ...base,
      nativeType: "line",
      data: "year,USA,China,India,EU\n2018,5.1,4.8,2.1,3.3\n2019,5.4,5.2,2.4,3.6",
    };
    expect(() => specToNativeConfig(spec)).toThrow(UnsupportedNativeType);
  });
  it("still maps a single-series line (one value column beyond the x axis) unchanged", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "line",
      data: "year,rate\n2018,5.1\n2019,4.8\n2020,6.2",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("line");
    expect(config.xField).toBe("year");
    expect(config.yField).toBe("rate");
  });
});

describe("specToNativeConfig — scatter", () => {
  it("uses the two numeric columns for x/y and the category as label", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "scatter",
      data: "school,spend,score\nNorthgate,5200,72\nEastfield,3100,58",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("scatter");
    expect(config.xField).toBe("spend");
    expect(config.yField).toBe("score");
    expect(config.labelField).toBe("school");
  });
});

describe("specToNativeConfig — scatter axis labels", () => {
  it("humanizes raw snake_case column headers into the axis titles (never ships them verbatim)", () => {
    // the shipped bug: xLabel/yLabel rendered literally as "pib_par_habitant" / "esperance_vie"
    const spec: NativeSpec = {
      ...base,
      nativeType: "scatter",
      data: "pays,pib_par_habitant,esperance_vie\nNigeria,2200,55\nJapon,40000,84",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.xLabel).toBe("Pib par habitant");
    expect(config.yLabel).toBe("Esperance vie");
  });

  it("passes an explicit spec.xLabel / spec.yLabel through UNCHANGED (the suggester's human label wins)", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "scatter",
      data: "pays,pib_par_habitant,esperance_vie\nNigeria,2200,55\nJapon,40000,84",
      xLabel: "PIB par habitant (USD)",
      yLabel: "Espérance de vie (années)",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.xLabel).toBe("PIB par habitant (USD)");
    expect(config.yLabel).toBe("Espérance de vie (années)");
  });

  it("leaves an already-human (spaced) column header alone", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "scatter",
      // header already carries a spaced, reader-facing label
      data: "school,school spend,exam score\nNorthgate,5200,72\nEastfield,3100,58",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.xLabel).toBe("school spend");
    expect(config.yLabel).toBe("exam score");
  });
});

describe("specToNativeConfig — scatter highlights → annotate", () => {
  // The journalist/② names the story points via `highlights`; the scatter renderer
  // labels the points named in `annotate`. The mapper must carry highlights across —
  // otherwise ScatterChart falls back to labelling ONLY the max-y outlier (the bug:
  // a 3-highlight scatter shipped with a single label).
  const data =
    "country,gdp,life\nJapan,40000,84\nQatar,62000,80\nNigeria,2000,55\nBrazil,8000,76";
  it("maps spec.highlights (multi-value) onto config.annotate so EVERY requested point is labelled", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "scatter",
      data,
      highlights: ["Japan", "Qatar", "Nigeria"],
    };
    const { config } = specToNativeConfig(spec);
    expect(config.annotate).toEqual(["Japan", "Qatar", "Nigeria"]);
  });
  it("falls back to the single `highlight` when `highlights` is absent", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "scatter",
      data,
      highlight: "Qatar",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.annotate).toEqual(["Qatar"]);
  });
  it("omits annotate when neither highlights nor highlight is given (default: headline outlier only)", () => {
    const spec: NativeSpec = { ...base, nativeType: "scatter", data };
    const { config } = specToNativeConfig(spec);
    expect(config.annotate).toBeUndefined();
  });
});

describe("specToNativeConfig — pie", () => {
  it("maps to labelField/valueField", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "pie",
      data: "source,gwh\nHydro,420\nWind,180\nSolar,90",
    };
    const { type, config } = specToNativeConfig(spec);
    expect(type).toBe("pie");
    expect(config.labelField).toBe("source");
    expect(config.valueField).toBe("gwh");
  });
});

describe("specToNativeConfig — baseColor threading", () => {
  const barSpec: NativeSpec = {
    ...base,
    nativeType: "bar",
    data: "country,share\nBrazil,87.3\nIndia,19.8",
  };
  it("threads baseColor into bar config when provided", () => {
    const { config } = specToNativeConfig({ ...barSpec, baseColor: "#009E73" });
    expect(config.baseColor).toBe("#009E73");
  });
  it("omits baseColor from bar config when absent", () => {
    const { config } = specToNativeConfig(barSpec);
    expect(config.baseColor).toBeUndefined();
  });
  it("threads baseColor into line config when provided", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "line",
      data: "year,rate\n2018,5.1\n2019,4.8",
      baseColor: "#009E73",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.baseColor).toBe("#009E73");
  });
  it("threads baseColor into scatter config when provided", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "scatter",
      data: "school,spend,score\nNorthgate,5200,72\nEastfield,3100,58",
      baseColor: "#009E73",
    };
    const { config } = specToNativeConfig(spec);
    expect(config.baseColor).toBe("#009E73");
  });

  // Every native type that renders a SUBJECT-COLOURED single mark must forward
  // spec.baseColor so a declared non-blue subject renders in its own hue instead of
  // silently falling back to the default Okabe-Ito blue. Multi-hue types
  // (categorical/diverging/role/two-side palettes) legitimately ignore it and are
  // covered by their own mapper tests.
  const subjectHueTypes: { nativeType: string; data: string }[] = [
    { nativeType: "waffle", data: "group,share\nAffected,42\nOther,58" },
    { nativeType: "treemap", data: "sector,value\nHousing,120\nTransport,80" },
    { nativeType: "histogram", data: "minutes\n8\n12\n15\n19\n22\n31" },
    {
      nativeType: "dot-strip",
      data: "region,value\nNorth,5\nNorth,7\nSouth,3",
    },
    { nativeType: "boxplot", data: "group,value\nA,1\nA,9\nB,4\nB,6" },
    { nativeType: "violin", data: "group,value\nA,1\nA,9\nB,4\nB,6" },
    {
      nativeType: "connected-scatter",
      data: "year,spend,score\n2019,10,50\n2020,20,60\n2021,30,72",
    },
    {
      nativeType: "fan",
      data: "year,actual,central,lo50,hi50,lo90,hi90\n2020,3,,,,,\n2021,,4,3.5,4.5,3,5",
    },
    { nativeType: "lollipop", data: "role,days\nNurse,31\nGP,12\nDentist,9" },
    { nativeType: "radial-bar", data: "hour,trips\n0,5\n1,3\n2,8" },
  ];
  for (const { nativeType, data } of subjectHueTypes) {
    it(`threads baseColor into ${nativeType} config when provided`, () => {
      const { config } = specToNativeConfig({
        ...base,
        nativeType,
        data,
        baseColor: "#CC79A7",
      });
      expect(config.baseColor).toBe("#CC79A7");
    });
    it(`omits baseColor from ${nativeType} config when absent`, () => {
      const { config } = specToNativeConfig({ ...base, nativeType, data });
      expect(config.baseColor).toBeUndefined();
    });
  }
});

describe("specToNativeConfig — unsupported", () => {
  it("throws UnsupportedNativeType for a type the mapper doesn't cover", () => {
    const spec: NativeSpec = {
      ...base,
      nativeType: "sankey",
      data: "a,b\n1,2",
    };
    expect(() => specToNativeConfig(spec)).toThrow(UnsupportedNativeType);
  });
});
