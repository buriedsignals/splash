// Browser entry shared by the static and interactive builds, for either chart.
//  - __CHART__   : "line" | "bar"  (Vite define)
//  - __INTERACTIVE__ : static (fixed, progress=1) vs interactive (responsive +
//    intro reveal). Per-format reveal trigger via ANIMATE_ON.
import { createRoot } from "react-dom/client";
import { LineChart, type ChartConfig } from "./LineChart";
import { InteractiveLineChart, type AnimateOn } from "./InteractiveLineChart";
import { BarChart, type BarConfig } from "./BarChart";
import { InteractiveBarChart } from "./InteractiveBarChart";
import { ScatterChart, type ScatterConfig } from "./ScatterChart";
import { InteractiveScatterChart } from "./InteractiveScatterChart";
import { PieChart, type PieConfig } from "./PieChart";
import { InteractivePieChart } from "./InteractivePieChart";
import { StackedBarChart, type StackedConfig } from "./StackedBarChart";
import { InteractiveStackedBarChart } from "./InteractiveStackedBarChart";
import { SlopeChart, type SlopeConfig } from "./SlopeChart";
import { InteractiveSlopeChart } from "./InteractiveSlopeChart";
import { GroupedBarChart, type GroupedConfig } from "./GroupedBarChart";
import { InteractiveGroupedBarChart } from "./InteractiveGroupedBarChart";
import { DumbbellChart, type DumbbellConfig } from "./DumbbellChart";
import { InteractiveDumbbellChart } from "./InteractiveDumbbellChart";
import { StackedAreaChart, type StackedAreaConfig } from "./StackedAreaChart";
import { InteractiveStackedAreaChart } from "./InteractiveStackedAreaChart";
import { HeatmapChart, type HeatmapConfig } from "./HeatmapChart";
import { InteractiveHeatmapChart } from "./InteractiveHeatmapChart";
import { HistogramChart, type HistogramConfig } from "./HistogramChart";
import { InteractiveHistogramChart } from "./InteractiveHistogramChart";
import {
  DivergingBarChart,
  type DivergingBarConfig,
} from "./DivergingBarChart";
import { InteractiveDivergingBarChart } from "./InteractiveDivergingBarChart";
import { WaterfallChart, type WaterfallConfig } from "./WaterfallChart";
import { InteractiveWaterfallChart } from "./InteractiveWaterfallChart";
import { LollipopChart, type LollipopConfig } from "./LollipopChart";
import { InteractiveLollipopChart } from "./InteractiveLollipopChart";
import {
  PopulationPyramidChart,
  type PopulationPyramidConfig,
} from "./PopulationPyramidChart";
import { InteractivePopulationPyramidChart } from "./InteractivePopulationPyramidChart";
import { BulletChart, type BulletConfig } from "./BulletChart";
import { InteractiveBulletChart } from "./InteractiveBulletChart";
import {
  ConnectedScatterChart,
  type ConnectedScatterConfig,
} from "./ConnectedScatterChart";
import { InteractiveConnectedScatterChart } from "./InteractiveConnectedScatterChart";
import { MarimekkoChart, type MarimekkoConfig } from "./MarimekkoChart";
import { InteractiveMarimekkoChart } from "./InteractiveMarimekkoChart";
import { RadarChart, type RadarConfig } from "./RadarChart";
import { InteractiveRadarChart } from "./InteractiveRadarChart";
import { BoxplotChart, type BoxplotConfig } from "./BoxplotChart";
import { InteractiveBoxplotChart } from "./InteractiveBoxplotChart";
import { BumpChart, type BumpConfig } from "./BumpChart";
import { InteractiveBumpChart } from "./InteractiveBumpChart";
import { BeeswarmChart, type BeeswarmConfig } from "./BeeswarmChart";
import { InteractiveBeeswarmChart } from "./InteractiveBeeswarmChart";
import { TreemapChart, type TreemapConfig } from "./TreemapChart";
import { InteractiveTreemapChart } from "./InteractiveTreemapChart";
import {
  DivergingStackedChart,
  type DivergingStackedConfig,
} from "./DivergingStackedChart";
import { InteractiveDivergingStackedChart } from "./InteractiveDivergingStackedChart";
import { SankeyChart, type SankeyConfig } from "./SankeyChart";
import { InteractiveSankeyChart } from "./InteractiveSankeyChart";
import { StreamgraphChart, type StreamgraphConfig } from "./StreamgraphChart";
import { InteractiveStreamgraphChart } from "./InteractiveStreamgraphChart";
import { GanttChart, type GanttConfig } from "./GanttChart";
import { InteractiveGanttChart } from "./InteractiveGanttChart";
import { FanChart, type FanConfig } from "./FanChart";
import { InteractiveFanChart } from "./InteractiveFanChart";
import { CalendarChart, type CalendarConfig } from "./CalendarChart";
import { InteractiveCalendarChart } from "./InteractiveCalendarChart";
import { WaffleChart, type WaffleConfig } from "./WaffleChart";
import { InteractiveWaffleChart } from "./InteractiveWaffleChart";
import { LorenzChart, type LorenzConfig } from "./LorenzChart";
import { InteractiveLorenzChart } from "./InteractiveLorenzChart";
import { CandlestickChart, type CandlestickConfig } from "./CandlestickChart";
import { InteractiveCandlestickChart } from "./InteractiveCandlestickChart";
import { ChordChart, type ChordConfig } from "./ChordChart";
import { InteractiveChordChart } from "./InteractiveChordChart";
import { SunburstChart, type SunburstConfig } from "./SunburstChart";
import { InteractiveSunburstChart } from "./InteractiveSunburstChart";
import { ParallelChart, type ParallelConfig } from "./ParallelChart";
import { InteractiveParallelChart } from "./InteractiveParallelChart";
import { DotStripChart, type DotStripConfig } from "./DotStripChart";
import { InteractiveDotStripChart } from "./InteractiveDotStripChart";
import { ViolinChart, type ViolinConfig } from "./ViolinChart";
import { InteractiveViolinChart } from "./InteractiveViolinChart";
import { ArcChart, type ArcConfig } from "./ArcChart";
import { InteractiveArcChart } from "./InteractiveArcChart";
import { RadialBarChart, type RadialBarConfig } from "./RadialBarChart";
import { InteractiveRadialBarChart } from "./InteractiveRadialBarChart";
import { ComboChart, type ComboConfig } from "./ComboChart";
import { InteractiveComboChart } from "./InteractiveComboChart";
import { PictogramChart, type PictogramConfig } from "./PictogramChart";
import { InteractivePictogramChart } from "./InteractivePictogramChart";
import { AUDIT_REGISTRY, INTERACTIVE_REGISTRY } from "./component-registry";
import lineSample from "../assets/sample-data/series.json";
import barSample from "../assets/sample-data/bars.json";
import scatterSample from "../assets/sample-data/scatter.json";
import pieSample from "../assets/sample-data/pie.json";
import stackedSample from "../assets/sample-data/stacked.json";
import slopeSample from "../assets/sample-data/slope.json";
import groupedSample from "../assets/sample-data/grouped.json";
import dumbbellSample from "../assets/sample-data/dumbbell.json";
import stackedAreaSample from "../assets/sample-data/stacked-area.json";
import heatmapSample from "../assets/sample-data/heatmap.json";
import histogramSample from "../assets/sample-data/histogram.json";
import divergingSample from "../assets/sample-data/diverging-bar.json";
import waterfallSample from "../assets/sample-data/waterfall.json";
import lollipopSample from "../assets/sample-data/lollipop.json";
import pyramidSample from "../assets/sample-data/population-pyramid.json";
import bulletSample from "../assets/sample-data/bullet.json";
import connectedScatterSample from "../assets/sample-data/connected-scatter.json";
import marimekkoSample from "../assets/sample-data/marimekko.json";
import radarSample from "../assets/sample-data/radar.json";
import boxplotSample from "../assets/sample-data/boxplot.json";
import bumpSample from "../assets/sample-data/bump.json";
import beeswarmSample from "../assets/sample-data/beeswarm.json";
import treemapSample from "../assets/sample-data/treemap.json";
import divergingStackedSample from "../assets/sample-data/diverging-stacked.json";
import sankeySample from "../assets/sample-data/sankey.json";
import streamgraphSample from "../assets/sample-data/streamgraph.json";
import ganttSample from "../assets/sample-data/gantt.json";
import fanSample from "../assets/sample-data/fan.json";
import calendarSample from "../assets/sample-data/calendar.json";
import waffleSample from "../assets/sample-data/waffle.json";
import lorenzSample from "../assets/sample-data/lorenz.json";
import candlestickSample from "../assets/sample-data/candlestick.json";
import chordSample from "../assets/sample-data/chord.json";
import sunburstSample from "../assets/sample-data/sunburst.json";
import parallelSample from "../assets/sample-data/parallel.json";
import dotStripSample from "../assets/sample-data/dot-strip.json";
import violinSample from "../assets/sample-data/violin.json";
import arcSample from "../assets/sample-data/arc.json";
import radialBarSample from "../assets/sample-data/radial-bar.json";
import comboSample from "../assets/sample-data/combo.json";
import pictogramSample from "../assets/sample-data/pictogram.json";

declare const __INTERACTIVE__: boolean;
declare const __CHART__: string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const __CONFIG__: any;
const interactive =
  typeof __INTERACTIVE__ !== "undefined" ? __INTERACTIVE__ : false;
const chart = typeof __CHART__ !== "undefined" ? __CHART__ : "line";
// injected arbitrary config (produce() path) — null when rendering the sample
const injectedConfig = typeof __CONFIG__ !== "undefined" ? __CONFIG__ : null;

const ANIMATE_ON: AnimateOn = "scroll";
const el = document.getElementById("root")!;
const root = createRoot(el);

if (injectedConfig && chart !== "audit") {
  // produce() path: render the injected config for ANY type via the registries
  const Comp = AUDIT_REGISTRY[chart];
  const Inter = INTERACTIVE_REGISTRY[chart];
  if (!Comp) throw new Error(`mount: unknown chart "${chart}"`);
  root.render(
    interactive && Inter ? (
      <Inter config={injectedConfig} animateOn={ANIMATE_ON} />
    ) : (
      <Comp config={injectedConfig} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "audit") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).renderAudit = (
    type: string,
    config: unknown,
    w: number,
    h: number,
    responsive: boolean,
    scaleProp: number,
    progress: number,
    interactive = false,
  ) => {
    const Comp = AUDIT_REGISTRY[type];
    if (!Comp) throw new Error(`audit: unknown chart "${type}"`);
    root.render(
      <Comp
        config={config}
        progress={progress}
        width={w}
        height={h}
        responsive={responsive}
        scale={scaleProp}
        interactive={interactive}
      />,
    );
  };
} else if (chart === "parallel") {
  const config = parallelSample as unknown as ParallelConfig;
  root.render(
    interactive ? (
      <InteractiveParallelChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <ParallelChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "dot-strip") {
  const config = dotStripSample as unknown as DotStripConfig;
  root.render(
    interactive ? (
      <InteractiveDotStripChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <DotStripChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "violin") {
  const config = violinSample as unknown as ViolinConfig;
  root.render(
    interactive ? (
      <InteractiveViolinChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <ViolinChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "arc") {
  const config = arcSample as unknown as ArcConfig;
  root.render(
    interactive ? (
      <InteractiveArcChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <ArcChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "radial-bar") {
  const config = radialBarSample as unknown as RadialBarConfig;
  root.render(
    interactive ? (
      <InteractiveRadialBarChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <RadialBarChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "combo") {
  const config = comboSample as unknown as ComboConfig;
  root.render(
    interactive ? (
      <InteractiveComboChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <ComboChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "pictogram") {
  const config = pictogramSample as unknown as PictogramConfig;
  root.render(
    interactive ? (
      <InteractivePictogramChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <PictogramChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "sunburst") {
  const config = sunburstSample as unknown as SunburstConfig;
  root.render(
    interactive ? (
      <InteractiveSunburstChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <SunburstChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "chord") {
  const config = chordSample as unknown as ChordConfig;
  root.render(
    interactive ? (
      <InteractiveChordChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <ChordChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "candlestick") {
  const config = candlestickSample as unknown as CandlestickConfig;
  root.render(
    interactive ? (
      <InteractiveCandlestickChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <CandlestickChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "lorenz") {
  const config = lorenzSample as unknown as LorenzConfig;
  root.render(
    interactive ? (
      <InteractiveLorenzChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <LorenzChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "waffle") {
  const config = waffleSample as unknown as WaffleConfig;
  root.render(
    interactive ? (
      <InteractiveWaffleChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <WaffleChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "calendar") {
  const config = calendarSample as unknown as CalendarConfig;
  root.render(
    interactive ? (
      <InteractiveCalendarChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <CalendarChart config={config} progress={1} width={840} height={420} />
    ),
  );
} else if (chart === "fan") {
  const config = fanSample as unknown as FanConfig;
  root.render(
    interactive ? (
      <InteractiveFanChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <FanChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "gantt") {
  const config = ganttSample as unknown as GanttConfig;
  root.render(
    interactive ? (
      <InteractiveGanttChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <GanttChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "streamgraph") {
  const config = streamgraphSample as unknown as StreamgraphConfig;
  root.render(
    interactive ? (
      <InteractiveStreamgraphChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <StreamgraphChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "sankey") {
  const config = sankeySample as unknown as SankeyConfig;
  root.render(
    interactive ? (
      <InteractiveSankeyChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <SankeyChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "diverging-stacked") {
  const config = divergingStackedSample as unknown as DivergingStackedConfig;
  root.render(
    interactive ? (
      <InteractiveDivergingStackedChart
        config={config}
        animateOn={ANIMATE_ON}
      />
    ) : (
      <DivergingStackedChart
        config={config}
        progress={1}
        width={840}
        height={480}
      />
    ),
  );
} else if (chart === "treemap") {
  const config = treemapSample as unknown as TreemapConfig;
  root.render(
    interactive ? (
      <InteractiveTreemapChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <TreemapChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "beeswarm") {
  const config = beeswarmSample as unknown as BeeswarmConfig;
  root.render(
    interactive ? (
      <InteractiveBeeswarmChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <BeeswarmChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "bump") {
  const config = bumpSample as unknown as BumpConfig;
  root.render(
    interactive ? (
      <InteractiveBumpChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <BumpChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "boxplot") {
  const config = boxplotSample as unknown as BoxplotConfig;
  root.render(
    interactive ? (
      <InteractiveBoxplotChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <BoxplotChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "radar") {
  const config = radarSample as unknown as RadarConfig;
  root.render(
    interactive ? (
      <InteractiveRadarChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <RadarChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "marimekko") {
  const config = marimekkoSample as unknown as MarimekkoConfig;
  root.render(
    interactive ? (
      <InteractiveMarimekkoChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <MarimekkoChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "connected-scatter") {
  const config = connectedScatterSample as unknown as ConnectedScatterConfig;
  root.render(
    interactive ? (
      <InteractiveConnectedScatterChart
        config={config}
        animateOn={ANIMATE_ON}
      />
    ) : (
      <ConnectedScatterChart
        config={config}
        progress={1}
        width={840}
        height={480}
      />
    ),
  );
} else if (chart === "bullet") {
  const config = bulletSample as unknown as BulletConfig;
  root.render(
    interactive ? (
      <InteractiveBulletChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <BulletChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "pyramid") {
  const config = pyramidSample as unknown as PopulationPyramidConfig;
  root.render(
    interactive ? (
      <InteractivePopulationPyramidChart
        config={config}
        animateOn={ANIMATE_ON}
      />
    ) : (
      <PopulationPyramidChart
        config={config}
        progress={1}
        width={840}
        height={480}
      />
    ),
  );
} else if (chart === "lollipop") {
  const config = lollipopSample as unknown as LollipopConfig;
  root.render(
    interactive ? (
      <InteractiveLollipopChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <LollipopChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "waterfall") {
  const config = waterfallSample as unknown as WaterfallConfig;
  root.render(
    interactive ? (
      <InteractiveWaterfallChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <WaterfallChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "diverging") {
  const config = divergingSample as unknown as DivergingBarConfig;
  root.render(
    interactive ? (
      <InteractiveDivergingBarChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <DivergingBarChart
        config={config}
        progress={1}
        width={840}
        height={480}
      />
    ),
  );
} else if (chart === "histogram") {
  const config = histogramSample as unknown as HistogramConfig;
  root.render(
    interactive ? (
      <InteractiveHistogramChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <HistogramChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "heatmap") {
  const config = heatmapSample as unknown as HeatmapConfig;
  root.render(
    interactive ? (
      <InteractiveHeatmapChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <HeatmapChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "stacked-area") {
  const config = stackedAreaSample as unknown as StackedAreaConfig;
  root.render(
    interactive ? (
      <InteractiveStackedAreaChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <StackedAreaChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "dumbbell") {
  const config = dumbbellSample as unknown as DumbbellConfig;
  root.render(
    interactive ? (
      <InteractiveDumbbellChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <DumbbellChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "grouped") {
  const config = groupedSample as unknown as GroupedConfig;
  root.render(
    interactive ? (
      <InteractiveGroupedBarChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <GroupedBarChart config={config} progress={1} width={840} height={460} />
    ),
  );
} else if (chart === "slope") {
  const config = slopeSample as unknown as SlopeConfig;
  root.render(
    interactive ? (
      <InteractiveSlopeChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <SlopeChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "stacked") {
  const config = stackedSample as unknown as StackedConfig;
  root.render(
    interactive ? (
      <InteractiveStackedBarChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <StackedBarChart config={config} progress={1} width={840} height={460} />
    ),
  );
} else if (chart === "pie") {
  const config = pieSample as unknown as PieConfig;
  root.render(
    interactive ? (
      <InteractivePieChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <PieChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "scatter") {
  const config = scatterSample as unknown as ScatterConfig;
  root.render(
    interactive ? (
      <InteractiveScatterChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <ScatterChart config={config} progress={1} width={840} height={480} />
    ),
  );
} else if (chart === "bar") {
  const config = barSample as unknown as BarConfig;
  root.render(
    interactive ? (
      <InteractiveBarChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <BarChart config={config} progress={1} width={840} height={460} />
    ),
  );
} else {
  const config = lineSample as unknown as ChartConfig;
  root.render(
    interactive ? (
      <InteractiveLineChart config={config} animateOn={ANIMATE_ON} />
    ) : (
      <LineChart config={config} progress={1} width={840} height={480} />
    ),
  );
}
