// Remotion composition wrapping the SAME StreamgraphChart. Linear master timeline
// (the grow-from-centre ease in the component); short blank lead-in + end hold.
// Frame N is a pure function of the frame.
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import {
  StreamgraphChart,
  type StreamgraphConfig,
} from "../../src/StreamgraphChart";
import sample from "../../assets/sample-data/streamgraph.json";

const config = sample as unknown as StreamgraphConfig;

const HOLD_IN = 0.02;
const HOLD_OUT = 0.12;

export const StreamgraphReveal: React.FC<{ scale?: number }> = ({
  scale = 1,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / (durationInFrames - 1);
  const progress = interpolate(t, [HOLD_IN, 1 - HOLD_OUT], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ width, height, background: "#FFFFFF" }}>
      <StreamgraphChart
        config={config}
        progress={progress}
        width={width}
        height={height}
        scale={scale}
      />
    </div>
  );
};
