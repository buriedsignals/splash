import { describe, expect, it } from "bun:test";
import {
  callsLocaleHelper,
  localeReachViolations,
  numberPaintSites,
  staleExemptions,
} from "./locale-reach";

const BLIND = `const fmt = (v: number) => v.toFixed(1);\nreturn fmt(x);\n`;
const SEEING = `import { localizeNumberString } from "./locale";\nconst f = (v: number) => localizeNumberString(v.toFixed(1), lang);\n`;
// Task 8's extracted helper — chart-native's ten uniform value-label call sites bind
// THIS one instead of repeating its body. The guard must recognise it as a real sink.
const SEEING_VALUE_LABEL = `import { localizeValueLabel } from "./locale";\nconst fmt = (v: number) => localizeValueLabel(v, config.lang);\n`;

describe("the locale-reach drift guard", () => {
  it("sees a number painted without a locale helper", () => {
    expect(numberPaintSites(BLIND)).toHaveLength(1);
    expect(callsLocaleHelper(BLIND)).toBe(false);
    expect(
      localeReachViolations([{ path: "a.tsx", source: BLIND }], { exempt: [] }),
    ).toHaveLength(1);
  });

  it("says nothing about a number that goes through one", () => {
    expect(callsLocaleHelper(SEEING)).toBe(true);
    expect(
      localeReachViolations([{ path: "b.tsx", source: SEEING }], {
        exempt: [],
      }),
    ).toEqual([]);
  });

  it("recognises localizeValueLabel (task 8's chart-native helper) as a real sink", () => {
    expect(callsLocaleHelper(SEEING_VALUE_LABEL)).toBe(true);
    expect(
      localeReachViolations([{ path: "c.tsx", source: SEEING_VALUE_LABEL }], {
        exempt: [],
      }),
    ).toEqual([]);
  });

  it("honours a named exemption", () => {
    expect(
      localeReachViolations([{ path: "a.tsx", source: BLIND }], {
        exempt: ["a.tsx"],
      }),
    ).toEqual([]);
  });

  it("reports an exemption that no longer applies, so the debt list cannot rot", () => {
    expect(
      staleExemptions([{ path: "b.tsx", source: SEEING }], {
        exempt: ["b.tsx"],
      }),
    ).toEqual(["b.tsx"]);
  });
});
