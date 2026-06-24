import { Composition } from "remotion";
import { LineReveal } from "./LineReveal";

// 8 s @ 30fps = 240 frames. Duration is the speed knob — longer = slower,
// smoother line draw (more frames per pixel).
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LineReveal"
      component={LineReveal}
      durationInFrames={240}
      fps={30}
      width={840}
      height={480}
    />
  );
};
