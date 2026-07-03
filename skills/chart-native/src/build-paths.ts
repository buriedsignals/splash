// Single source of truth for the per-chart build output dir. `vite.config.ts` WRITES
// the web build here and `scripts/snap-proof.mjs` READS it back to snap the static +
// interactive PNGs. They MUST agree — when they drifted (the snap hard-coded
// `dist/<chart>/<sub>` while vite special-cased `line` to `dist/<sub>`), the snap
// served a STALE build for line charts and the injected CONFIG never reached the
// render (F4). Both now import this helper, so the two paths cannot diverge again.
//
// The `line` chart is the "worked exemplar" and builds to the bare `dist/<sub>`;
// every other chart nests under `dist/<chart>/<sub>`.
export function chartDistSub(
  chart: string,
  sub: "static" | "interactive",
): string {
  return chart === "line" ? `dist/${sub}` : `dist/${chart}/${sub}`;
}
