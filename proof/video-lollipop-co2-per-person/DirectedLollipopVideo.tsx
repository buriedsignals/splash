/**
 * The Remotion composition: `LollipopFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "../../skills/chart-video/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/chart-video/assets/face-coverage";
import { LollipopFrame, type LollipopFrameProps } from "./LollipopFrame";

export type DirectedLollipopVideoProps = LollipopFrameProps & { faces: EmbeddedFace[] };

export function DirectedLollipopVideo(props: DirectedLollipopVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <LollipopFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
