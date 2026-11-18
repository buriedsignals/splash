import { describe, expect, it } from "bun:test";
import { readPoints, timeModel, validateTime } from "../craft/_shared/gesture-family-time.mjs";
import { scheduleTimeWeb } from "../craft/_shared/gesture-time-web.mjs";

// gx-streamgraph web (12B, mvg82, 2026-11-18): solar passed oil between the 2015 and 2016 readings; the control's
// line printed the interpolated crossing as a year, "× 2015,7" — a date no reading carries.
const points = readPoints([2014, 2015, 2016, 2017].flatMap((t, i) => [
  { series: "Solaire", t, value: [1.0, 1.12, 1.33, 1.6][i] },
  { series: "Pétrole", t, value: [1.3, 1.23, 1.28, 1.2][i] },
  { series: "Hydraulique", t, value: [35, 34, 34.6, 35][i] },
]));
const model = timeModel({ variant: "streamgraph", points });
const pieceOf = () => {
  const v = validateTime({
    gestures: [{ do: "compare", marks: ["Solaire", "Pétrole"] }],
    model,
    format: "web",
    claim: { takeaway: "Le solaire passe le pétrole" },
  });
  const { controls } = scheduleTimeWeb({ model, valid: v.gestures, format: (x: number) => x.toFixed(1).replace(".", ","), subject: v.subject });
  return controls.find((c: { kind?: string }) => c.kind === "crossing").pieces[0];
};

describe("the crossing a web compare names", () => {
  it("should name the two readings it falls between, not a fractional year", () => {
    expect(pieceOf()).toBe("× 2015–2016");
  });
});
