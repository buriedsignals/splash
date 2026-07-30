// filter → prune → simplify → encode (D5). Every cut is a real bunx mapshaper invocation — no
// mock, per repo convention (real APIs, real failures). Tolerance is ALWAYS an absolute metre
// value derived from render width, never a percentage: -simplify 5% (a number that "sounds
// prudent") moves the Swiss border by 64px at 1200px width (spec D5, measured).
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";

export function toleranceMetersFor(
  mapExtentMeters: number,
  renderWidthPx: number,
): number {
  return mapExtentMeters / renderWidthPx;
}

export type SubsetInput = {
  sourcePath: string;
  outPath: string;
  featureIds: string[];
  idProperty: string;
  keepProperties: string[];
  toleranceMeters: number;
};

export async function subsetGeometry(
  input: SubsetInput,
): Promise<{ bytes: number }> {
  const idList = JSON.stringify(input.featureIds);
  const filterExpr = `${idList}.includes(${input.idProperty})`;
  const args = [
    "mapshaper",
    input.sourcePath,
    "-filter",
    filterExpr,
    "-filter-fields",
    `fields=${input.keepProperties.join(",")}`,
    "-simplify",
    "visvalingam",
    `interval=${input.toleranceMeters}m`,
    "-o",
    input.outPath,
    "format=topojson",
    "quantization=1e5",
    "force",
  ];
  const r = spawnSync("bunx", args, { encoding: "utf8" });
  if (r.status !== 0)
    throw new Error(
      `subsetGeometry: bunx mapshaper failed (exit ${r.status}): ${r.stderr}`,
    );
  return { bytes: statSync(input.outPath).size };
}
