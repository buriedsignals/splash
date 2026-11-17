// gx-dot-strip video, Qwen3.5-9B (mvq36, 2026-11-17): { do: "pull-back", mark: null } was refused as the row "null",
// with "Suède" offered in its place — a fix that names a row pull-back never takes. A null mark names no row.
import { describe, expect, it } from "bun:test";
import { validateGestures } from "../craft/_shared/gesture-core.mjs";

const rows = [
  { name: "Lisboa", value: 214 },
  { name: "Porto", value: 96 },
  { name: "Braga", value: 31 },
];
const claim = { takeaway: "Lisboa carries 214 million trips, more than twice Porto's 96 million." };
const check = (gestures: any[]) => {
  try {
    validateGestures({ gestures, rows, family: "length", format: "video", claim });
    return "";
  } catch (e) {
    return (e as Error).message;
  }
};

describe("a gesture written with a null mark", () => {
  it("should not take null for a row's name", () => {
    expect(check([{ do: "highlight", mark: "Lisboa" }, { do: "highlight", mark: "Porto" }, { do: "pull-back", mark: null }])).not.toContain('"null"');
  });
  it("should not take null marks for a row's name", () => {
    expect(check([{ do: "highlight", mark: "Lisboa" }, { do: "highlight", mark: "Porto" }, { do: "pull-back", marks: null }])).not.toContain('"null"');
  });
});
