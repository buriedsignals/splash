import { describe, expect, it } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyStoryboard } from "../craft/_shared/guards.mjs";

const here = () => mkdtempSync(join(tmpdir(), "splash-nan-"));

// gx-locator scrolly, 12B (gx-locator-scrolly-seeded-osaurus-1794838887331): title form 3 was
// `Zaporizhzhia, ${format(biggest.mw)}` on objects that carry `value`; the plate's refusal said the form "drops the
// takeaway's claim" and never named the NaN.
describe("applyStoryboard on a beat whose printed words hold NaN or undefined", () => {
  it("should refuse a title form that prints NaN, naming its index", () => {
    expect(() => applyStoryboard({ title: ["Un titre", "Zaporizhzhia, NaN MW"] }, here())).toThrow(/title\[1\]: "Zaporizhzhia, NaN MW" prints NaN/);
  });
  it("should say where a NaN comes from", () => {
    expect(() => applyStoryboard({ title: ["Zaporizhzhia, NaN MW"] }, here())).toThrow(/key its object does not carry/);
  });
  it("should refuse a gesture note that prints undefined", () => {
    expect(() => applyStoryboard({ title: "Un titre", gestures: [{ do: "reveal", note: "undefined pays" }] }, here())).toThrow(/gestures\[0\]\.note: "undefined pays" prints undefined/);
  });
  it("should accept a word that only contains the letters", () => {
    expect(() => applyStoryboard({ title: "NaNa et Nanterre", standfirst: "indefinite" }, here())).not.toThrow();
  });
  // gx-lollipop web, 12B (gx-lollipop-web-seeded-osaurus-1794975050886): `limits:` written as a YAML list,
  // "- `a` - `b`", which JavaScript reads as a subtraction of two strings, so the page printed "NaN" twice.
  it("should refuse a text field that is the number NaN, showing the array it meant", () => {
    expect(() => applyStoryboard({ title: "Un titre", limits: NaN }, here())).toThrow(/limits is NaN: .* limits: \[`first form`, `shorter form`\]/);
  });
});
