import { validateChartSpec, type ChartSpec } from "./chart-spec";
import { specToMetadata, resolveData } from "./spec-to-metadata";
import {
  createChart,
  setData,
  patchChart,
  publishChart,
  exportPng,
} from "./datawrapper";
import { checkResponsive, EXPORT_WIDTH } from "./label-safety";
import { checkValueLabelContrast } from "./value-label-safety";

export interface ProduceResult {
  chartId: string;
  embed: string;
  pngPath: string;
  publicUrl: string;
}

// Pull the numeric y-range the metadata pinned (custom-range-y = [min,max] strings)
// so remediation can widen it. Returns null when the chart has no pinned range.
function readRange(patch: {
  metadata: { visualize: Record<string, unknown> };
}): [number, number] | null {
  const r = patch.metadata.visualize["custom-range-y"] as string[] | undefined;
  if (!r || r.length !== 2) return null;
  const lo = Number(r[0]);
  const hi = Number(r[1]);
  return Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : null;
}

export async function produceChart(
  spec: ChartSpec,
  pngPath: string,
  opts: { skipLabelSafety?: boolean } = {},
): Promise<ProduceResult> {
  const v = validateChartSpec(spec);
  if (!v.ok) throw new Error(`invalid chart spec: ${v.errors.join("; ")}`);

  const patch = specToMetadata(spec);
  // Fail loud BEFORE any API call if the metadata would ship a value label below
  // WCAG 4.5:1 (a white label inside a coloured bar/column). The safe mapper never
  // trips this; it guards against a future regression re-enabling inside labels.
  const contrast = checkValueLabelContrast(patch);
  if (contrast.length)
    throw new Error(
      `value-label contrast guardrail failed:\n  - ` +
        contrast.map((c) => c.message).join("\n  - "),
    );
  const id = await createChart(spec.title, spec.type);
  // Same resolved CSV (renamed headers + sort) that the metadata mapping saw.
  const csv = resolveData(spec);
  await setData(id, csv);
  // `language` localizes DW's own number/date formatting (fr-FR → "1 900,5"); include
  // it whenever the spec set a language, else DW uses its default (en-US).
  await patchChart(id, {
    type: patch.type,
    metadata: patch.metadata,
    ...(patch.language ? { language: patch.language } : {}),
  });
  let publicUrl = await publishChart(id);

  // RESPONSIVE LABEL-SAFETY. `specToMetadata` places every annotation in DATA space
  // (anchor at x,y; align picks a curve-clear quadrant; axis headroom gives it
  // whitespace) — width-invariant by construction, so it is normally clean at all
  // widths on the first publish. The remediation below is the measured safety net:
  // if the frac-estimated headroom turns out too small at some width (a real label is
  // taller than estimated, or DW's mobile layout is shorter), WIDEN the pinned y-range
  // and re-publish. More range compresses the plotted line, giving every label more
  // clearance from the curve AND from the frame — one lever that monotonically fixes
  // both clip and on-line. Bounded; if still failing, the guardrail throws.
  const hasAnnotations = Array.isArray(
    patch.metadata.visualize["text-annotations"],
  );
  if (!opts.skipLabelSafety && hasAnnotations) {
    let result = await checkResponsive(publicUrl);
    let tries = 0;
    while (!result.ok && tries < 3) {
      const range = readRange(patch);
      if (!range) break; // nothing to widen (non-line chart) → fall through to throw
      const [lo, hi] = range;
      const step = 0.12 * (hi - lo || 1); // one widening increment
      patch.metadata.visualize["custom-range-y"] = [
        String(Math.round(lo - step)),
        String(Math.round(hi + step)),
      ];
      await patchChart(id, {
        type: patch.type,
        metadata: patch.metadata,
        ...(patch.language ? { language: patch.language } : {}),
      });
      publicUrl = await publishChart(id);
      result = await checkResponsive(publicUrl);
      tries += 1;
    }
    if (!result.ok)
      throw new Error(
        `responsive label-safety guardrail failed for ${publicUrl} ` +
          `(checked ${result.byWidth.map((b) => `${b.width}px`).join(", ")}):\n  - ` +
          result.violations.join("\n  - "),
      );
  }

  await exportPng(id, pngPath, EXPORT_WIDTH);

  const embed =
    `<iframe title="${spec.title}" src="${publicUrl}" scrolling="no" frameborder="0" ` +
    `style="width:0;min-width:100%;border:none;" height="400"></iframe>`;
  return { chartId: id, embed, pngPath, publicUrl };
}
