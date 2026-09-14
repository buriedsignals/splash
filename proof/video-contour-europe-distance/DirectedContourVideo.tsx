/**
 * The Remotion composition: `ContourFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "../../skills/map-beat/assets/embedded-faces";
import type { EmbeddedFace } from "../../skills/map-beat/assets/face-coverage";
import { ContourFrame, type ContourFrameProps } from "./ContourFrame";

export type DirectedContourVideoProps = ContourFrameProps & { faces: EmbeddedFace[] };

export function DirectedContourVideo(props: DirectedContourVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <ContourFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
