import { describe, expect, it } from "bun:test";
import { regionPopupHtml } from "./region-popup";

describe("regionPopupHtml — the one string both choropleth renderers hover", () => {
  // THE DEFECT A REAL RUN SHIPPED. A word unit must not glue itself to the number; the legend
  // on the same render already spaced it, so the two disagreed on one screen.
  it("spaces a WORD unit — the case that showed the defect", () => {
    expect(regionPopupHtml("Genève", 157, "détenus / 100 000 hab.", "fr")).toBe(
      "<strong>Genève \u2014 157 détenus / 100 000 hab.</strong>",
    );
  });

  // …and the case that HID it for so long: with "%" the bug and the fix print the same bytes in
  // English, which is why every earlier review passed over the line.
  // NARROW NO-BREAK SPACE (U+202F) and the em dash are written as escapes on purpose: they
  // are invisible in a diff, and an assertion nobody can see the difference in is one nobody
  // can maintain.
  it("keeps a short unit tight in English, and narrow-spaced in French", () => {
    expect(regionPopupHtml("Zurich", 16, "%", "en")).toBe(
      "<strong>Zurich \u2014 16%</strong>",
    );
    expect(regionPopupHtml("Zurich", 16, "%", "fr")).toBe(
      "<strong>Zurich \u2014 16\u202F%</strong>",
    );
  });

  it("localizes the number and survives a missing unit or a string value", () => {
    expect(regionPopupHtml("Vaud", 1234.5, undefined, "fr")).toBe(
      "<strong>Vaud \u2014 1\u202F234,5</strong>",
    );
    expect(regionPopupHtml("Jura", "n/a", "", "fr")).toBe(
      "<strong>Jura \u2014 n/a</strong>",
    );
  });
});
