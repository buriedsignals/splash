import { Composition } from "remotion";
import { LineReveal } from "./LineReveal";

// 6 s @ 30fps = 180 frames. Duration is the speed knob.
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LineReveal"
      component={LineReveal}
      durationInFrames={180}
      fps={30}
      width={840}
      height={480}
    />
  );
};
