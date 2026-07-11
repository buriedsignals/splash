import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BarChart, type BarConfig } from "../src/BarChart";

// A VERTICAL (column) bar chart on a narrow/portrait (9:16) canvas divides the
// available width into one band per category. A fixed single-line truncate()
// clipped any category name wider than its own band to a stub with an ellipsis
// ("Apple Mu…", "Amazon M…", "Tencent…", "YouTube…") — render-confirmed on a
// music-streaming ranking (BarPortrait, 1080x1920, scale 1.7, frame 140). The fix
// wraps a long category label onto up to 2 lines (mirrors the horizontal bar's
// gutter-wrap fix — same `wrapLabel` helper) instead of truncating, and reserves
// the extra line's height in the bottom margin.
const STREAMING: BarConfig = {
  title:
    "Spotify still leads global music-streaming platforms by a wide margin",
  source: { name: "Industry estimates", url: "https://example.org/streaming" },
  unit: "monthly active users (millions)",
  catField: "platform",
  valField: "users",
  orientation: "vertical",
  sort: "desc",
  rows: [
    { platform: "Spotify", users: 640 },
    { platform: "Apple Music", users: 110 },
    { platform: "Amazon Music", users: 100 },
    { platform: "Tencent Music", users: 90 },
    { platform: "YouTube Music", users: 80 },
  ],
};

// BarPortrait composition geometry (remotion/src/Root.tsx): 1080x1920, scale 1.7 —
// the exact canvas the bug was render-confirmed on.
const W = 1080;
const H = 1920;
const SCALE = 1.7;

function renderMarkup() {
  return renderToStaticMarkup(
    <BarChart
      config={STREAMING}
      responsive={false}
      width={W}
      height={H}
      scale={SCALE}
    />,
  );
}

/** Every category-label <text> (marked cat-label), in document order.
 * React renders JSX `className` as the DOM `class` attribute in the SVG output. */
function catLabelTexts(svg: string): string[] {
  const re = /<text\b[^>]*\bclass="cat-label"[^>]*>([^<]*)<\/text>/g;
  return [...svg.matchAll(re)].map((m) => m[1]);
}

// Rebuild each bar's full label from its (possibly wrapped) lines. There are
// exactly as many lines as there are cat-label <text> nodes for that bar's index —
// group consecutive lines back into one string per row using the SAME order the
// component renders bars in (sort:"desc" → rows sorted by value, matching STREAMING
// which is already sorted desc by users).
function reconstructLabels(svg: string, nBars: number): string[] {
  const lines = catLabelTexts(svg);
  // one or two lines per bar; a bar's lines are consecutive in the markup.
  // Recover the grouping from wrapLabel's own contract: a line never ends the
  // block unless the NEXT text belongs to a new bar. Since we know the exact
  // (sorted-desc) label per bar independently, just reassemble by consuming
  // lines until they match each row's word sequence.
  const rows = [...STREAMING.rows].sort(
    (a, b) => Number(b.users) - Number(a.users),
  );
  expect(rows.length).toBe(nBars);
  let cursor = 0;
  const out: string[] = [];
  for (const row of rows) {
    const words = String(row.platform).split(/\s+/);
    let consumed = "";
    let consumedWords = 0;
    while (consumedWords < words.length && cursor < lines.length) {
      consumed = consumed ? `${consumed} ${lines[cursor]}` : lines[cursor];
      consumedWords += lines[cursor].split(/\s+/).length;
      cursor++;
    }
    out.push(consumed);
  }
  return out;
}

describe("BarChart — vertical (portrait) category labels are never truncated", () => {
  it("renders every long platform name in full, with no ellipsis anywhere", () => {
    const svg = renderMarkup();
    expect(svg).not.toContain("…");
  });

  it("reconstructs every category label exactly (no dropped/clipped characters)", () => {
    const svg = renderMarkup();
    const labels = reconstructLabels(svg, STREAMING.rows.length);
    const expected = [...STREAMING.rows]
      .sort((a, b) => Number(b.users) - Number(a.users))
      .map((r) => String(r.platform));
    expect(labels).toEqual(expected);
  });

  it("actually wraps the long names onto 2 lines (proves the wrap path, not a lucky fit)", () => {
    const svg = renderMarkup();
    // 5 bars; short "Spotify" fits on 1 line, the 4 long names need 2 —
    // so there must be more cat-label texts than bars.
    expect(catLabelTexts(svg).length).toBeGreaterThan(STREAMING.rows.length);
  });

  it("keeps a short-label vertical bar chart single-line (no regression)", () => {
    const short: BarConfig = {
      ...STREAMING,
      rows: [
        { platform: "USA", users: 52 },
        { platform: "JAM", users: 22 },
        { platform: "GBR", users: 14 },
      ],
    };
    const svg = renderToStaticMarkup(
      <BarChart
        config={short}
        responsive={false}
        width={W}
        height={H}
        scale={SCALE}
      />,
    );
    expect(catLabelTexts(svg).length).toBe(short.rows.length);
  });
});
