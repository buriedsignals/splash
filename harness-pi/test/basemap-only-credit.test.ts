import { describe, expect, it } from "bun:test";
// @ts-expect-error untyped kit module
import { refuseBasemapOnlyCredit } from "../craft/_shared/source-forms.mjs";

// gx-proportional-symbol video (Qwen3.5-9B, mvq70): the last form was « © MapTiler © OpenStreetMap » alone; the
// longer forms found no corner of open sea, so the video credited the basemap and never the data.
const FORMS = [
  "Source : WRI Global Power Plant Database v1.3.0 · fond de carte MapTiler (dataviz) · © MapTiler © OpenStreetMap",
  "WRI · fond de carte MapTiler (dataviz) · © MapTiler © OpenStreetMap",
  "© MapTiler © OpenStreetMap",
];

describe("a credit form that names only the basemap", () => {
  it("should refuse it, giving a form that keeps the data's source", () => {
    expect(() => refuseBasemapOnlyCredit(FORMS)).toThrow(/source\[2\].*names only the basemap.*"WRI · © MapTiler © OpenStreetMap"/);
  });

  it("should pass forms that all name the data", () => {
    expect(() => refuseBasemapOnlyCredit(FORMS.slice(0, 2))).not.toThrow();
  });

  it("should take the data's name from the shortest form before it", () => {
    expect(() =>
      refuseBasemapOnlyCredit(["Source : Ember, via OWID · © MapTiler © OpenStreetMap", "© MapTiler © OpenStreetMap"]),
    ).toThrow(/"Ember, via OWID · © MapTiler © OpenStreetMap"/);
  });
});
