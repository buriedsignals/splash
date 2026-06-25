import { Composition } from "remotion";
import { LineReveal } from "./LineReveal";
import { BarReveal } from "./BarReveal";
import { ScatterReveal } from "./ScatterReveal";
import { PieReveal } from "./PieReveal";
import { StackedBarReveal } from "./StackedBarReveal";

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
    </>
  );
};
