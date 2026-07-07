// The type-id → component maps for BOTH the audit/static path and the interactive
// path, extracted from mount.tsx so they carry NO DOM side effects and can be
// asserted equal to NATIVE_TYPES (tests/native-types.test.ts). mount.tsx imports
// these; it keeps the createRoot() mounting. Keys are the render ids of NATIVE_TYPES.
import { LineChart } from "./LineChart";
import { InteractiveLineChart } from "./InteractiveLineChart";
import { BarChart } from "./BarChart";
import { InteractiveBarChart } from "./InteractiveBarChart";
import { ScatterChart } from "./ScatterChart";
import { InteractiveScatterChart } from "./InteractiveScatterChart";
import { PieChart } from "./PieChart";
import { InteractivePieChart } from "./InteractivePieChart";
import { StackedBarChart } from "./StackedBarChart";
import { InteractiveStackedBarChart } from "./InteractiveStackedBarChart";
import { SlopeChart } from "./SlopeChart";
import { InteractiveSlopeChart } from "./InteractiveSlopeChart";
import { GroupedBarChart } from "./GroupedBarChart";
import { InteractiveGroupedBarChart } from "./InteractiveGroupedBarChart";
import { DumbbellChart } from "./DumbbellChart";
import { InteractiveDumbbellChart } from "./InteractiveDumbbellChart";
import { StackedAreaChart } from "./StackedAreaChart";
import { InteractiveStackedAreaChart } from "./InteractiveStackedAreaChart";
import { HeatmapChart } from "./HeatmapChart";
import { InteractiveHeatmapChart } from "./InteractiveHeatmapChart";
import { HistogramChart } from "./HistogramChart";
import { InteractiveHistogramChart } from "./InteractiveHistogramChart";
import { DivergingBarChart } from "./DivergingBarChart";
import { InteractiveDivergingBarChart } from "./InteractiveDivergingBarChart";
import { WaterfallChart } from "./WaterfallChart";
import { InteractiveWaterfallChart } from "./InteractiveWaterfallChart";
import { LollipopChart } from "./LollipopChart";
import { InteractiveLollipopChart } from "./InteractiveLollipopChart";
import { PopulationPyramidChart } from "./PopulationPyramidChart";
import { InteractivePopulationPyramidChart } from "./InteractivePopulationPyramidChart";
import { BulletChart } from "./BulletChart";
import { InteractiveBulletChart } from "./InteractiveBulletChart";
import { ConnectedScatterChart } from "./ConnectedScatterChart";
import { InteractiveConnectedScatterChart } from "./InteractiveConnectedScatterChart";
import { MarimekkoChart } from "./MarimekkoChart";
import { InteractiveMarimekkoChart } from "./InteractiveMarimekkoChart";
import { RadarChart } from "./RadarChart";
import { InteractiveRadarChart } from "./InteractiveRadarChart";
import { BoxplotChart } from "./BoxplotChart";
import { InteractiveBoxplotChart } from "./InteractiveBoxplotChart";
import { BumpChart } from "./BumpChart";
import { InteractiveBumpChart } from "./InteractiveBumpChart";
import { BeeswarmChart } from "./BeeswarmChart";
import { InteractiveBeeswarmChart } from "./InteractiveBeeswarmChart";
import { TreemapChart } from "./TreemapChart";
import { InteractiveTreemapChart } from "./InteractiveTreemapChart";
import { DivergingStackedChart } from "./DivergingStackedChart";
import { InteractiveDivergingStackedChart } from "./InteractiveDivergingStackedChart";
import { SankeyChart } from "./SankeyChart";
import { InteractiveSankeyChart } from "./InteractiveSankeyChart";
import { StreamgraphChart } from "./StreamgraphChart";
import { InteractiveStreamgraphChart } from "./InteractiveStreamgraphChart";
import { GanttChart } from "./GanttChart";
import { InteractiveGanttChart } from "./InteractiveGanttChart";
import { FanChart } from "./FanChart";
import { InteractiveFanChart } from "./InteractiveFanChart";
import { CalendarChart } from "./CalendarChart";
import { InteractiveCalendarChart } from "./InteractiveCalendarChart";
import { WaffleChart } from "./WaffleChart";
import { InteractiveWaffleChart } from "./InteractiveWaffleChart";
import { LorenzChart } from "./LorenzChart";
import { InteractiveLorenzChart } from "./InteractiveLorenzChart";
import { CandlestickChart } from "./CandlestickChart";
import { InteractiveCandlestickChart } from "./InteractiveCandlestickChart";
import { ChordChart } from "./ChordChart";
import { InteractiveChordChart } from "./InteractiveChordChart";
import { SunburstChart } from "./SunburstChart";
import { InteractiveSunburstChart } from "./InteractiveSunburstChart";
import { ParallelChart } from "./ParallelChart";
import { InteractiveParallelChart } from "./InteractiveParallelChart";
import { DotStripChart } from "./DotStripChart";
import { InteractiveDotStripChart } from "./InteractiveDotStripChart";
import { ViolinChart } from "./ViolinChart";
import { InteractiveViolinChart } from "./InteractiveViolinChart";
import { ArcChart } from "./ArcChart";
import { InteractiveArcChart } from "./InteractiveArcChart";
import { RadialBarChart } from "./RadialBarChart";
import { InteractiveRadialBarChart } from "./InteractiveRadialBarChart";
import { ComboChart } from "./ComboChart";
import { InteractiveComboChart } from "./InteractiveComboChart";
import { PictogramChart } from "./PictogramChart";
import { InteractivePictogramChart } from "./InteractivePictogramChart";

// Audit entry: renders ANY chart from an arbitrary config + progress so the
// layout audit (scripts/audit.mjs) can stress-test collisions across datasets.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AUDIT_REGISTRY: Record<string, any> = {
  line: LineChart,
  bar: BarChart,
  scatter: ScatterChart,
  pie: PieChart,
  stacked: StackedBarChart,
  slope: SlopeChart,
  grouped: GroupedBarChart,
  dumbbell: DumbbellChart,
  "stacked-area": StackedAreaChart,
  heatmap: HeatmapChart,
  histogram: HistogramChart,
  diverging: DivergingBarChart,
  waterfall: WaterfallChart,
  lollipop: LollipopChart,
  pyramid: PopulationPyramidChart,
  bullet: BulletChart,
  "connected-scatter": ConnectedScatterChart,
  marimekko: MarimekkoChart,
  radar: RadarChart,
  boxplot: BoxplotChart,
  bump: BumpChart,
  beeswarm: BeeswarmChart,
  treemap: TreemapChart,
  "diverging-stacked": DivergingStackedChart,
  sankey: SankeyChart,
  streamgraph: StreamgraphChart,
  gantt: GanttChart,
  fan: FanChart,
  calendar: CalendarChart,
  waffle: WaffleChart,
  lorenz: LorenzChart,
  candlestick: CandlestickChart,
  chord: ChordChart,
  sunburst: SunburstChart,
  parallel: ParallelChart,
  "dot-strip": DotStripChart,
  violin: ViolinChart,
  arc: ArcChart,
  "radial-bar": RadialBarChart,
  combo: ComboChart,
  pictogram: PictogramChart,
};

// type → Interactive binding, for the produce() injection path (mirrors AUDIT_REGISTRY)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const INTERACTIVE_REGISTRY: Record<string, any> = {
  line: InteractiveLineChart,
  bar: InteractiveBarChart,
  scatter: InteractiveScatterChart,
  pie: InteractivePieChart,
  stacked: InteractiveStackedBarChart,
  slope: InteractiveSlopeChart,
  grouped: InteractiveGroupedBarChart,
  dumbbell: InteractiveDumbbellChart,
  "stacked-area": InteractiveStackedAreaChart,
  heatmap: InteractiveHeatmapChart,
  histogram: InteractiveHistogramChart,
  diverging: InteractiveDivergingBarChart,
  waterfall: InteractiveWaterfallChart,
  lollipop: InteractiveLollipopChart,
  pyramid: InteractivePopulationPyramidChart,
  bullet: InteractiveBulletChart,
  "connected-scatter": InteractiveConnectedScatterChart,
  marimekko: InteractiveMarimekkoChart,
  radar: InteractiveRadarChart,
  boxplot: InteractiveBoxplotChart,
  bump: InteractiveBumpChart,
  beeswarm: InteractiveBeeswarmChart,
  treemap: InteractiveTreemapChart,
  "diverging-stacked": InteractiveDivergingStackedChart,
  sankey: InteractiveSankeyChart,
  streamgraph: InteractiveStreamgraphChart,
  gantt: InteractiveGanttChart,
  fan: InteractiveFanChart,
  calendar: InteractiveCalendarChart,
  waffle: InteractiveWaffleChart,
  lorenz: InteractiveLorenzChart,
  candlestick: InteractiveCandlestickChart,
  chord: InteractiveChordChart,
  sunburst: InteractiveSunburstChart,
  parallel: InteractiveParallelChart,
  "dot-strip": InteractiveDotStripChart,
  violin: InteractiveViolinChart,
  arc: InteractiveArcChart,
  "radial-bar": InteractiveRadialBarChart,
  combo: InteractiveComboChart,
  pictogram: InteractivePictogramChart,
};
