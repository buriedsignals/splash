// Shared live-render reader for the two surviving published-chart e2e tests
// (legend-unit-e2e, tooltip-unit-e2e). NOT a test file — bun test only picks up
// `*.test.ts`; this is the one place the publish→CDN→render→hover read chain lives.
//
// Same deterministic sibling-path playwright import as the e2e tests (map-dw ships no
// node_modules of its own — it rides dw-chart's pinned install; a bare "playwright"
// import would fall back to bun's network-dependent auto-install cache).
import { chromium } from "../../../dw-chart/node_modules/playwright/index.mjs";

// CDN/THROTTLE RESILIENCE. A freshly published Datawrapper chart can lag its published
// HTML (and 404 its assets) for a short CDN-propagation window right after publish —
// the documented review-gate rule ("Probing a published Datawrapper chart — propagation
// lag is not a data defect", skills/atelier/references/render-review.md) already
// mandates ONE retry after `DW_DATASET_PROPAGATION_RETRY_MS` (30 000 ms,
// skills/atelier/src/review-gate.ts) before treating a probe failure as real. The same
// class of failure stalls THIS read chain in the sequential root gate: by the time
// map-dw runs, the earlier dw-chart suites have published ~15 live charts and DW
// throttling/CDN lag can leave the embed un-rendered or hover-dead on first load.
// 15 000 ms suffices here (vs the review-gate's 30 000) because the FAILED first read
// attempt itself already spends up to ~60 s (navigation timeout) plus the settle+sweep
// inside the propagation window — the named delay only adds margin on top, and keeping
// it short caps the worst-case stall this retry can add to the gate.
export const DW_CDN_RETRY_DELAY_MS = 15_000;

// One navigation attempt's budget. Generous (CDN under throttle), but bounded so a
// dead embed fails the attempt and hands control to the single retry instead of
// eating the whole outer test timeout.
const NAVIGATION_TIMEOUT_MS = 60_000;

// Post-load settle before reading the DOM — the DW embed hydrates its legend and
// canvas after networkidle.
const RENDER_SETTLE_MS = 4_000;

export interface LiveRenderRead {
  /** Whitespace-normalized innerText of the embed's `.color-legend` (choropleth /
   *  symbol continuous color legend). */
  legendText: string;
  /** innerText of the first visible `.dw-tooltip` found by the hover sweep. */
  tooltipText: string;
}

// A single publish→CDN→render→hover read: load the published embed, read the color
// legend, then sweep the (canvas-drawn, no per-region DOM) map area until a hover
// tooltip appears. THROWS when either read comes back empty — that is the CDN-lag /
// throttling signature (page or hover surface not rendered yet), the retryable case.
// Content assertions (what the legend/tooltip SAY) belong in the calling test, OUTSIDE
// the retry: a wrong-content read is a genuine RED and must fail immediately, never
// burn the retry re-confirming it.
export async function readLiveRender(url: string): Promise<LiveRenderRead> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 900, height: 700 },
    });
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    await page.waitForTimeout(RENDER_SETTLE_MS);

    const legendText = await page.evaluate(() => {
      const el = document.querySelector(".color-legend");
      return el ? (el as HTMLElement).innerText.trim().replace(/\s+/g, " ") : "";
    });
    if (!legendText)
      throw new Error(
        "live render read incomplete: .color-legend empty/absent (CDN-lagged embed?)",
      );

    // Hover sweep — regions are canvas-drawn (no per-region DOM), so probe a grid of
    // mouse positions until a visible .dw-tooltip appears.
    let tooltipText = "";
    outer: for (let y = 120; y <= 520; y += 40) {
      for (let x = 80; x <= 820; x += 40) {
        await page.mouse.move(x, y);
        await page.waitForTimeout(120);
        const tip = await page.evaluate(() => {
          for (const el of Array.from(
            document.querySelectorAll(".dw-tooltip"),
          )) {
            const t = (el as HTMLElement).innerText?.trim();
            const st = getComputedStyle(el as HTMLElement);
            if (t && st.display !== "none" && st.visibility !== "hidden")
              return t;
          }
          return null;
        });
        if (tip) {
          tooltipText = tip;
          break outer;
        }
      }
    }
    if (!tooltipText)
      throw new Error(
        "live render read incomplete: no hover tooltip after the full sweep (CDN-lagged embed?)",
      );

    return { legendText, tooltipText };
  } finally {
    await browser.close();
  }
}

// The bounded resilience wrapper: exactly ONE retry, after the named delay, when the
// read fails or times out (see DW_CDN_RETRY_DELAY_MS above for why once + 15 s). The
// second failure propagates — a read that fails twice ~75+ s after publish is a real
// defect, not propagation lag.
export async function readLiveRenderWithRetry(
  url: string,
): Promise<LiveRenderRead> {
  try {
    return await readLiveRender(url);
  } catch (err) {
    console.warn(
      `live render read failed, retrying once in ${DW_CDN_RETRY_DELAY_MS} ms (CDN propagation): ${String(err)}`,
    );
    await new Promise((r) => setTimeout(r, DW_CDN_RETRY_DELAY_MS));
    return await readLiveRender(url);
  }
}
