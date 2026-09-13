/**
 * The Remotion composition: `ChoroplethFrame` at the current frame, drawn only once the embedded faces are
 * in, every frame's words read back against those faces and against the widths Bun measured
 * (`useEmbeddedFaces`, `skills/map-beat/assets/embedded-faces.ts`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "../../skills/map-beat/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/map-beat/assets/face-coverage";
import { ChoroplethFrame, type ChoroplethFrameProps } from "./ChoroplethFrame";

export type DirectedChoroplethVideoProps = ChoroplethFrameProps & {
  faces: EmbeddedFace[];
};

export function DirectedChoroplethVideo(props: DirectedChoroplethVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return (
    <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>
      {ready ? <ChoroplethFrame {...props} at={frame} svgRef={ref} /> : null}
    </AbsoluteFill>
  );
}
