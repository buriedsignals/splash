/**
 * The Remotion composition: `FlowFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "../../skills/map-beat/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/map-beat/assets/face-coverage";
import { FlowFrame, type FlowFrameProps } from "./FlowFrame";

export type DirectedFlowMapVideoProps = FlowFrameProps & { faces: EmbeddedFace[] };

export function DirectedFlowMapVideo(props: DirectedFlowMapVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <FlowFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
