/**
 * The Remotion composition: `SankeyFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "../../skills/chart-video/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/chart-video/assets/face-coverage";
import { SankeyFrame, type SankeyFrameProps } from "./SankeyFrame";

export type DirectedSankeyVideoProps = SankeyFrameProps & {
  faces: EmbeddedFace[];
};

export function DirectedSankeyVideo(props: DirectedSankeyVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return (
    <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>
      {ready ? <SankeyFrame {...props} at={frame} svgRef={ref} /> : null}
    </AbsoluteFill>
  );
}
