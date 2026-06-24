// Guards the frame-deterministic contract that ALL THREE formats depend on:
// the same (layout, progress) -> same SVG path, regardless of who calls it
// (static at p=1, interactive at p=1, Remotion at p=frame/(N-1)).
import { describe, it, expect } from "bun:test";
import {
  computeChartLayout,
  revealLine,
  type ChartData,
  type Dims,
} from "../src/chart-geometry";
import sample from "../assets/sample-data/series.json";

const dims: Dims = {
  width: 840,
  height: 480,
  padding: { top: 64, right: 140, bottom: 52, left: 56 },
};

const data: ChartData = {
  xField: sample.xField,
  yField: sample.yField,
  xType: sample.xType as "time",
  points: sample.points,
};

describe("frame-deterministic reveal contract (shared by all 3 formats)", () => {
  const layout = computeChartLayout(data, dims);

  it("static and video-final-frame produce the identical full path", () => {
    const staticPath = revealLine(layout, 1); // static renders at p=1
    const videoFinal = revealLine(layout, 180 / (180 - 1)); // clamps to 1
    expect(videoFinal).toBe(staticPath);
  });

  it("is reproducible: rendering frame N twice gives the same path", () => {
    const frameProgress = (f) => f / (180 - 1);
    for (const f of [0, 45, 90, 135, 179]) {
      const a = revealLine(layout, frameProgress(f));
      const b = revealLine(layout, frameProgress(f));
      expect(a).toBe(b);
    }
  });

  it("never NaNs in any path coordinate across the whole timeline", () => {
    for (let f = 0; f < 180; f++) {
      const path = revealLine(layout, f / (180 - 1));
      expect(path.includes("NaN")).toBe(false);
    }
  });

  it("the sample dataset is a valid time series for the line chart", () => {
    expect(sample.points.length).toBeGreaterThanOrEqual(2);
    expect(layout.points).toHaveLength(sample.points.length);
  });
});
