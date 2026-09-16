/**
 * The Remotion composition: `RadarFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "../../skills/chart-video/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/chart-video/assets/face-coverage";
import { RadarFrame, type RadarFrameProps } from "./RadarFrame";

export type DirectedRadarVideoProps = RadarFrameProps & { faces: EmbeddedFace[] };

export function DirectedRadarVideo(props: DirectedRadarVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <RadarFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
