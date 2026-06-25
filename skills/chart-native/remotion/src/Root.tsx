import { Composition } from "remotion";
import { LineReveal } from "./LineReveal";
import { BarReveal } from "./BarReveal";
import { ScatterReveal } from "./ScatterReveal";

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
        id="BarReveal"
        component={BarReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={460}
      />
      <Composition
        id="ScatterReveal"
        component={ScatterReveal}
        durationInFrames={240}
        fps={30}
        width={840}
        height={480}
      />
    </>
  );
};
