import { Composition } from "remotion";
import { LineReveal } from "./LineReveal";
import { BarReveal } from "./BarReveal";
import { ScatterReveal } from "./ScatterReveal";
import { PieReveal } from "./PieReveal";
import { StackedBarReveal } from "./StackedBarReveal";
import { SlopeReveal } from "./SlopeReveal";
import { GroupedBarReveal } from "./GroupedBarReveal";
import { DumbbellReveal } from "./DumbbellReveal";
import { StackedAreaReveal } from "./StackedAreaReveal";
import { HeatmapReveal } from "./HeatmapReveal";
import { HistogramReveal } from "./HistogramReveal";
import { DivergingBarReveal } from "./DivergingBarReveal";
import { WaterfallReveal } from "./WaterfallReveal";
import { LollipopReveal } from "./LollipopReveal";
import { PopulationPyramidReveal } from "./PopulationPyramidReveal";
import { BulletReveal } from "./BulletReveal";

// 8 s @ 30fps = 240 frames. Duration is the speed knob — longer = slower,
// smoother build (more frames per pixel of motion).
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LineReveal"
        component={LineReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="LineSquare"
        component={LineReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="LinePortrait"
        component={LineReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="BarReveal"
        component={BarReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={460}
      />
      <Composition
        id="BarSquare"
        component={BarReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="BarPortrait"
        component={BarReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="ScatterReveal"
        component={ScatterReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="ScatterSquare"
        component={ScatterReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="ScatterPortrait"
        component={ScatterReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="PieReveal"
        component={PieReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="PieSquare"
        component={PieReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="PiePortrait"
        component={PieReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="StackedBarReveal"
        component={StackedBarReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={460}
      />
      <Composition
        id="StackedBarSquare"
        component={StackedBarReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="StackedBarPortrait"
        component={StackedBarReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="SlopeReveal"
        component={SlopeReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="SlopeSquare"
        component={SlopeReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="SlopePortrait"
        component={SlopeReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="GroupedBarReveal"
        component={GroupedBarReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={460}
      />
      <Composition
        id="GroupedBarSquare"
        component={GroupedBarReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="GroupedBarPortrait"
        component={GroupedBarReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="DumbbellReveal"
        component={DumbbellReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="DumbbellSquare"
        component={DumbbellReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="DumbbellPortrait"
        component={DumbbellReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="StackedAreaReveal"
        component={StackedAreaReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="StackedAreaSquare"
        component={StackedAreaReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="StackedAreaPortrait"
        component={StackedAreaReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="HeatmapReveal"
        component={HeatmapReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="HeatmapSquare"
        component={HeatmapReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="HeatmapPortrait"
        component={HeatmapReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="HistogramReveal"
        component={HistogramReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="HistogramSquare"
        component={HistogramReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="HistogramPortrait"
        component={HistogramReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="DivergingBarReveal"
        component={DivergingBarReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="DivergingBarSquare"
        component={DivergingBarReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="DivergingBarPortrait"
        component={DivergingBarReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="WaterfallReveal"
        component={WaterfallReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="WaterfallSquare"
        component={WaterfallReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="WaterfallPortrait"
        component={WaterfallReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="LollipopReveal"
        component={LollipopReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="LollipopSquare"
        component={LollipopReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="LollipopPortrait"
        component={LollipopReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="PyramidReveal"
        component={PopulationPyramidReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="PyramidSquare"
        component={PopulationPyramidReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="PyramidPortrait"
        component={PopulationPyramidReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="BulletReveal"
        component={BulletReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
      <Composition
        id="BulletSquare"
        component={BulletReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="BulletPortrait"
        component={BulletReveal}
        defaultProps={{ scale: 1.7 }}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1350}
      />
    </>
  );
};
