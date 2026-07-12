import { validateChartSpec, type ChartSpec } from "./chart-spec";
import { specToMetadata, resolveData } from "./spec-to-metadata";
import { assertLocalizedSourceMetadata } from "./furniture-i18n";
import {
  createChart,
  setData,
  patchChart,
  publishChart,
  exportPng,
} from "./datawrapper";
import { checkResponsive } from "./label-safety";
import { checkValueLabelContrast } from "./value-label-safety";
import { channelToExportSize } from "./export-aspect";

// The single-format-produce-export redesign's vocabulary, restricted to the two
// values dw-chart actually builds differently (it has no video/scrolly — see
// Task 3's brief). Kept as a plain string union (not imported from
// ../../atelier/src/channel.ts) to avoid a cross-skill runtime dependency for a
// hosted producer that is otherwise self-contained.
export type DwChartFormat = "static" | "interactive";

export interface ProduceResult {
  chartId: string;
  embed: string;
  // Present only when format "static" was built (the media export). Absent for
  // "interactive" — the deliverable there is the hosted embed (`embed`/`publicUrl`),
  // no local PNG is produced.
  pngPath?: string;
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
  opts: { skipLabelSafety?: boolean; format?: DwChartFormat } = {},
): Promise<ProduceResult> {
  // Defaults to "static" — every existing caller (make-proof.ts, produce-all-types.ts,
  // the pre-single-format test suite) calls produceChart with no format at all and
  // expects the PNG on disk, so an absent format must keep producing it (back-compat).
  const format = opts.format ?? "static";
  const v = validateChartSpec(spec);
  if (!v.ok) throw new Error(`invalid chart spec: ${v.errors.join("; ")}`);

  // EXPORT ASPECT (FINDING 2): size the static PNG to the CADRAGE channel — feed →
  // square, social/vertical → portrait, web/article → landscape (default). TYPE-AWARE
  // (export-aspect.ts): row-count-driven horizontal types (bars/dot/arrow/range/tables)
  // get the channel WIDTH but a content-driven height (no pinned height) so DW never
  // CROPS overflowing rows; fixed-aspect types get the full channel box. The resulting
  // aspect is fed to the responsive guardrail below so annotation placement is validated
  // at the aspect the reader actually receives — when the height is natural we leave the
  // aspect undefined so the guardrail falls back to its default landscape aspect.
  //
  // Resolved HERE, before createChart — channelToExportSize is fail-closed on a garbled
  // spec.channel (normalizeChannel throws), and it used to run only AFTER createChart/
  // setData/patchChart/publishChart, so the throw left an ORPHANED live Datawrapper
  // chart behind. Its inputs (spec.channel, spec.type) are read-only from this point
  // on, so hoisting is behavior-preserving for every valid channel; a garbled one now
  // fails with zero API side effects.
  const exportSize = channelToExportSize(spec.channel, spec.type);
  const exportAspect = exportSize.height
    ? exportSize.height / exportSize.width
    : undefined;

  const patch = specToMetadata(spec);
  // i18n FURNITURE GATE (P5) — fail loud BEFORE any API call if a non-English chart's
  // outgoing metadata would ship the English/double "Source:" caption: annotate.notes
  // must carry the localized "Source : X" line and describe.source-name/source-url
  // must be blank (see src/furniture-i18n.ts; the invariant the localized-source fix
  // established, now asserted so a regression fails the produce instead of shipping).
  assertLocalizedSourceMetadata(patch, spec);
  // Fail loud BEFORE any API call if the metadata would ship a value label below
  // WCAG 4.5:1 (a white label inside a coloured bar/column). The safe mapper never
  // trips this; it guards against a future regression re-enabling inside labels.
  // F2 (policy b): a failure in a journalist-chosen brand colour is KEPT and recorded
  // as a concern (never a hard failure); every other failure still throws.
  const brandColors =
    spec.brandExplicit && spec.baseColor ? [spec.baseColor] : [];
  const contrast = checkValueLabelContrast(patch, { brandColors });
  const hard = contrast.filter((c) => !c.concern);
  const concerns = contrast.filter((c) => c.concern);
  for (const c of concerns)
    console.warn(`[dw-chart] value-label brand concern: ${c.message}`);
  if (hard.length)
    throw new Error(
      `value-label contrast guardrail failed:\n  - ` +
        hard.map((c) => c.message).join("\n  - "),
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
    let result = await checkResponsive(publicUrl, { aspect: exportAspect });
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
      result = await checkResponsive(publicUrl, { aspect: exportAspect });
      tries += 1;
    }
    if (!result.ok)
      throw new Error(
        `responsive label-safety guardrail failed for ${publicUrl} ` +
          `(checked ${result.byWidth.map((b) => `${b.width}px`).join(", ")}):\n  - ` +
          result.violations.join("\n  - "),
      );
  }

  // Build ONLY what the format needs (single-format-produce-export design): "static"
  // exports the media file; "interactive" delivers the hosted embed alone — no PNG is
  // rendered/written for it. The publish above (createChart/setData/patchChart/
  // publishChart) is unconditional either way: dw-chart is HOSTED, so even the
  // "static" PNG can only be exported FROM a published chart — that step is
  // unavoidable infrastructure, not a produced deliverable of its own.
  const builtPngPath = format === "static" ? pngPath : undefined;
  if (builtPngPath) {
    await exportPng(id, builtPngPath, exportSize.width, exportSize.height);
  }

  const embed =
    `<iframe title="${spec.title}" src="${publicUrl}" scrolling="no" frameborder="0" ` +
    `style="width:0;min-width:100%;border:none;" height="400"></iframe>`;
  return { chartId: id, embed, pngPath: builtPngPath, publicUrl };
}
