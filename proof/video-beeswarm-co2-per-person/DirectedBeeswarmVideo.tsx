/**
 * The Remotion composition: `BeeswarmFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "../../skills/chart-video/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/chart-video/assets/face-coverage";
import { BeeswarmFrame, type BeeswarmFrameProps } from "./BeeswarmFrame";

export type DirectedBeeswarmVideoProps = BeeswarmFrameProps & { faces: EmbeddedFace[] };

export function DirectedBeeswarmVideo(props: DirectedBeeswarmVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <BeeswarmFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
