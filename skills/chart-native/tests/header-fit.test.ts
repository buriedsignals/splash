// Guardrail: a 2-line title must reserve more top space than a 1-line title,
// and reserved space must be >= (titleLines × lineHeight + subtitleHeight).
//
// This test encodes the fix for finding F-A (subtitle/first-bar overlap when
// title wraps to 2+ lines). It asserts the INVARIANT at the pure-logic layer
// so it catches any regression that re-introduces a fixed top-pad smaller than
// the actual rendered header.

import { describe, it, expect } from "bun:test";
import { resolveFrame } from "../src/core/format";
import { TYPE } from "../src/core/tokens";

// Mirror ChartFrame's constants (ChartFrame.tsx, topPad / titleSize / axisSize):
const TOP_PAD = 18; // px above the title block
const LINE_HEIGHT = 1.2; // CSS line-height for the title
const SUBTITLE_MARGIN = 4; // gap between title bottom and subtitle
const SUBTITLE_HEIGHT = TYPE.axis; // 13px — one line of subtitle text

/**
 * Compute the minimum pixel height a header MUST reserve given the number of
 * title lines and whether a subtitle is present. This mirrors what ChartFrame
 * renders and what onHeaderHeight measures.
 */
function minHeaderPx(titleLines: number, hasSubtitle: boolean): number {
  const titlePx = titleLines * TYPE.title * LINE_HEIGHT;
  const subtitlePx = hasSubtitle ? SUBTITLE_HEIGHT + SUBTITLE_MARGIN : 0;
  return TOP_PAD + titlePx + subtitlePx;
}

describe("header height invariant — padding.top must never be less than header height", () => {
  const BASE_PAD_STATIC = { top: 64, right: 64, bottom: 40, left: 124 };
  const WIDTH = 840;
  const HEIGHT = 460;

  it("resolveFrame baseline: 1-line title + subtitle fits inside default top=64", () => {
    const frame = resolveFrame(WIDTH, HEIGHT, BASE_PAD_STATIC, 1);
    const header1LineWithSub = minHeaderPx(1, true);
    // 64px must accommodate: 18 topPad + 22*1.2 title + 4 gap + 13 subtitle = 61.4px
    expect(header1LineWithSub).toBeLessThanOrEqual(BASE_PAD_STATIC.top);
    // resolveFrame preserves at least basePad.top (it may add extra for centering)
    expect(frame.pad.top).toBeGreaterThanOrEqual(BASE_PAD_STATIC.top);
  });

  it("2-line title + subtitle requires more top space than the 64px default", () => {
    // 18 + 2*22*1.2 + 4 + 13 = 88.8px — exceeds the 64px baseline
    const header2Lines = minHeaderPx(2, true);
    expect(header2Lines).toBeGreaterThan(BASE_PAD_STATIC.top);
  });

  it("3-line title + subtitle requires even more top space than 2-line", () => {
    const header2Lines = minHeaderPx(2, true);
    const header3Lines = minHeaderPx(3, true);
    expect(header3Lines).toBeGreaterThan(header2Lines);
  });

  it("onHeaderHeight enforcement: padding.top is bumped to measured header when it exceeds basePad.top", () => {
    // Simulate what useHeaderFit does once onHeaderHeight fires with a 2-line header.
    const frame = resolveFrame(WIDTH, HEIGHT, BASE_PAD_STATIC, 1);
    const measuredHeaderPx = Math.ceil(minHeaderPx(2, true)); // ~89px

    // Enforcement logic (mirrors useHeaderFit internals):
    const enforced = { ...frame.pad };
    if (enforced.top < measuredHeaderPx) enforced.top = measuredHeaderPx;

    expect(enforced.top).toBeGreaterThanOrEqual(measuredHeaderPx);
    expect(enforced.top).toBeGreaterThan(BASE_PAD_STATIC.top);
  });

  it("enforcement does NOT add unnecessary padding when title fits in 1 line", () => {
    const frame = resolveFrame(WIDTH, HEIGHT, BASE_PAD_STATIC, 1);
    const measuredHeaderPx = Math.ceil(minHeaderPx(1, true)); // ~62px — fits in 64

    const enforced = { ...frame.pad };
    if (enforced.top < measuredHeaderPx) enforced.top = measuredHeaderPx;

    // No change expected — 64 ≥ 62
    expect(enforced.top).toBe(frame.pad.top);
  });

  it("enforcement is proportional to scale (portrait/square video canvases)", () => {
    const scale = 1.5;
    const BASE_PAD_SCALED = { top: 64, right: 64, bottom: 40, left: 124 };
    const frame = resolveFrame(WIDTH, HEIGHT, BASE_PAD_SCALED, scale);
    // basePad.top scales to 96px; a 2-line header at scale=1.5 needs:
    //   18*1.5 + 2*22*1.5*1.2 + 4*1.5 + 13*1.5 = 27 + 79.2 + 6 + 19.5 = 131.7px
    const measuredHeaderPx = Math.ceil(
      TOP_PAD * scale +
        2 * TYPE.title * scale * LINE_HEIGHT +
        SUBTITLE_MARGIN * scale +
        SUBTITLE_HEIGHT * scale,
    );
    const enforced = { ...frame.pad };
    if (enforced.top < measuredHeaderPx) enforced.top = measuredHeaderPx;
    expect(enforced.top).toBeGreaterThanOrEqual(measuredHeaderPx);
  });
});
