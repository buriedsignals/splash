/**
 * The Remotion composition: `GestureUnitsFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import { GestureUnitsFrame, type GestureUnitsFrameProps } from "./GestureUnitsFrame";

export type GestureUnitsVideoProps = GestureUnitsFrameProps & { faces: EmbeddedFace[] };

export function GestureUnitsVideo(props: GestureUnitsVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <GestureUnitsFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
