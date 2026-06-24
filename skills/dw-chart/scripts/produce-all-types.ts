import { CHART_TYPES, MULTI_SERIES_TYPES, PART_TO_WHOLE_TYPES, type ChartType } from '../src/chart-spec';
import { produceChart } from '../src/produce';
import { deleteChart } from '../src/datawrapper';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function sampleData(t: ChartType): string {
  if (MULTI_SERIES_TYPES.has(t)) return 'year,A,B\n2018,5,3\n2020,6,4\n2022,7,5';
  if ((['d3-scatter-plot','dual-axis','d3-range-plot','d3-arrow-plot','d3-bars-bullet'] as string[]).includes(t)) return 'label,v1,v2\nA,3,6\nB,5,9\nC,7,12';
  if (PART_TO_WHOLE_TYPES.has(t)) return 'cat,v\nA,5\nB,3\nC,2';
  return 'cat,v\nA,5\nB,3\nC,2';
}

const results: string[] = [];
for (const t of CHART_TYPES) {
  try {
    const out = join(tmpdir(), `alltypes-${t}.png`);
    const res = await produceChart({ type: t, title: `${t} renders`, data: sampleData(t), altInsight: 'sample' } as any, out);
    results.push(`OK   ${t.padEnd(24)} ${res.publicUrl}`);
    await deleteChart(res.chartId);
  } catch (e: any) {
    results.push(`FAIL ${t.padEnd(24)} ${String(e.message).slice(0, 80)}`);
  }
}
console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('OK')).length}/${CHART_TYPES.length} types produced`);
