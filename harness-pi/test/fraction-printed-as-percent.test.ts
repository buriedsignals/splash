import { describe, expect, it } from "bun:test";
import { assertPercentScale, recordPrinted } from "../craft/_shared/guards.mjs";

// gx-small-multiples web, Qwen3.5-9B (gx-small-multiples-web-seeded-osaurus-qwen-1794853147113): y returned
// low-carbon / total, a fraction, and format printed it with "%": Sweden 1,0 %, Poland 0,3 % instead of 98 % and 30 %.
// Every guard passed: the takeaway ("all sixteen rose") holds on fractions too.
function printing(values: number[], extra: object = {}) {
  const beat: any = { format: (v: number) => `${String(v).replace(".", ",")} %`, ...extra };
  recordPrinted(beat);
  for (const v of values) beat.format(v);
  return () => assertPercentScale();
}

describe("a share printed as a percentage", () => {
  it("should be refused when every printed value is a fraction of one", () => {
    expect(printing([0.98, 0.3, 0.61, 0.45])).toThrow(/× 100|\* 100|100 \*/);
  });
  it("should pass when the values are already percentages", () => {
    expect(printing([98, 30, 61, 0.4])).not.toThrow();
  });
  it("should pass for percentages that are all small", () => {
    expect(printing([0.11, 0.2, 0.4])).not.toThrow();
  });
  it("should pass when the format does not print a percent sign", () => {
    const beat: any = { format: (v: number) => `${v} TWh` };
    recordPrinted(beat);
    for (const v of [0.98, 0.3, 0.61]) beat.format(v);
    expect(() => assertPercentScale()).not.toThrow();
  });
  it("should pass when format itself multiplies the fraction by 100", () => {
    const beat: any = { format: (v: number) => `${Math.round(v * 100)} %` };
    recordPrinted(beat);
    for (const v of [0.98, 0.3, 0.61]) beat.format(v);
    expect(() => assertPercentScale()).not.toThrow();
  });
});
