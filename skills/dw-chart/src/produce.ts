import { validateChartSpec, type ChartSpec } from "./chart-spec";
import {
  specToMetadata,
  resolveData,
  annotationXFrac,
} from "./spec-to-metadata";
import {
  createChart,
  setData,
  patchChart,
  publishChart,
  exportPng,
} from "./datawrapper";
import {
  checkPublishedChart,
  measureChart,
  resolveAnchorPlacement,
  anchorOnSeries,
  EXPORT_WIDTH,
  EXPORT_HEIGHT,
} from "./label-safety";

export interface ProduceResult {
  chartId: string;
  embed: string;
  pngPath: string;
  publicUrl: string;
}

export async function produceChart(
  spec: ChartSpec,
  pngPath: string,
  opts: { skipLabelSafety?: boolean } = {},
): Promise<ProduceResult> {
  const v = validateChartSpec(spec);
  if (!v.ok) throw new Error(`invalid chart spec: ${v.errors.join("; ")}`);

  const patch = specToMetadata(spec);
  const id = await createChart(spec.title, spec.type);
  // Same resolved CSV (renamed headers + sort) that the metadata mapping saw.
  const csv = resolveData(spec);
  await setData(id, csv);
  await patchChart(id, { type: patch.type, metadata: patch.metadata });
  let publicUrl = await publishChart(id);

  // RENDER-TIME PLACEMENT CORRECTION, measured at the DELIVERED export width.
  // The spec's fractional placement predicts an off-line position, but DW's real
  // pixel geometry shifts with subtitle length / axis-label width AND with export
  // width (annotation dx/dy are absolute px that do NOT scale). So we MEASURE the
  // render at exactly EXPORT_WIDTH — the width the PNG is exported and delivered at
  // — and re-place each annotation into the nearest clear whitespace NEXT TO ITS
  // ANCHOR (never on the series, never overlapping another label, never clipped),
  // with a short connector. Validated == delivered because both run at this width.
  const anns = patch.metadata.visualize?.["text-annotations"] as
    Array<Record<string, unknown>> | undefined;
  if (!opts.skipLabelSafety && anns && anns.length) {
    const g = await measureChart(publicUrl, {
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
    });
    const annRects = g.rects.filter((r) => r.kind !== "furniture");
    // Furniture (axis ticks, title, source) is an obstacle for placement too: the
    // guardrail flags an annotation overlapping ANY text rect, so a label dropped
    // onto the x-axis tick row is a fail. Feed the ticks in as obstacles so the
    // placement avoids that band — but only the ticks that sit inside the plot's
    // vertical span (title/source live outside and never constrain placement).
    const furniture = g.rects.filter(
      (r) =>
        r.kind === "furniture" &&
        r.y + r.h > g.content.y &&
        r.y < g.content.y + g.content.h,
    );
    // The measured series x-extent: the annotation's data-x fraction maps linearly
    // onto this span to give the true on-curve ANCHOR x-pixel — independent of any
    // dx the label carries and of the export width. (Width-independent by design.)
    let sxMin = Infinity;
    let sxMax = -Infinity;
    for (const line of g.series)
      for (const p of line) {
        if (p.x < sxMin) sxMin = p.x;
        if (p.x > sxMax) sxMax = p.x;
      }
    // Placed rects (post-shift) so a second annotation is offset off the first.
    const placed: typeof annRects = [];
    let corrected = false;
    for (const [i, ann] of anns.entries()) {
      const rect = annRects.find((r) => r.text === String(ann.text).trim());
      if (!rect) continue;
      // ANCHOR = the point on the curve this annotation describes (DW draws the
      // connector from there). Map the spec annotation's data-x fraction onto the
      // measured series x-extent, then read the curve's y at that x.
      const specAnn = spec.annotations?.[i];
      const xFrac = Number.isFinite(sxMin)
        ? annotationXFrac(csv, specAnn?.x)
        : 0.5;
      const anchorX = Number.isFinite(sxMin)
        ? sxMin + xFrac * (sxMax - sxMin)
        : rect.x + rect.w / 2;
      const anchor = anchorOnSeries(g.series, anchorX) ?? {
        x: anchorX,
        y: rect.y + rect.h / 2,
      };
      // Other annotations already placed this pass, plus the not-yet-placed ones at
      // their current measured spot, so we never shift onto a neighbour.
      const others = [
        ...placed,
        ...annRects.filter((r) => r !== rect && !placed.includes(r)),
        ...furniture,
      ];
      const { dx, dy } = resolveAnchorPlacement(
        rect,
        anchor,
        g.series,
        g.content,
        others,
      );
      if (dx !== 0 || dy !== 0) {
        ann.dx = (Number(ann.dx) || 0) + dx;
        ann.dy = (Number(ann.dy) || 0) + dy;
        corrected = true;
      }
      // A connector always points the (now off-anchor) label back to its data point.
      ann.connectorLine = {
        enabled: true,
        type: "straight",
        arrowHead: "none",
      };
      // Record where this label now sits so the next one avoids it.
      placed.push({ ...rect, x: rect.x + dx, y: rect.y + dy });
    }
    if (corrected) {
      await patchChart(id, { type: patch.type, metadata: patch.metadata });
      publicUrl = await publishChart(id);
    }
  }

  await exportPng(id, pngPath, EXPORT_WIDTH);

  // GUARDRAIL: a clipped/overlapping label, or a label ON the plotted series line,
  // is a publishable-blocker. Load the published chart, enumerate every text rect
  // plus the sampled series polyline, and fail loud if any annotation is clipped by
  // the content box, intersects another text rect, or sits on the data line. This
  // is what stops the defect recurring.
  if (!opts.skipLabelSafety) {
    const safety = await checkPublishedChart(publicUrl, {
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
    });
    if (!safety.ok)
      throw new Error(
        `label-safety guardrail failed for ${publicUrl}:\n  - ${safety.violations.join("\n  - ")}`,
      );
  }

  const embed =
    `<iframe title="${spec.title}" src="${publicUrl}" scrolling="no" frameborder="0" ` +
    `style="width:0;min-width:100%;border:none;" height="400"></iframe>`;
  return { chartId: id, embed, pngPath, publicUrl };
}
