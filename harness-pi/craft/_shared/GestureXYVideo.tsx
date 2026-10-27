/**
 * The Remotion composition of an XY gesture video: `GestureXYFrame` at the current frame, drawn only once the embedded
 * faces are in, every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import { GestureXYFrame, type GestureXYFrameProps } from "./GestureXYFrame";

export type GestureXYVideoProps = GestureXYFrameProps & { faces: EmbeddedFace[] };

export function GestureXYVideo(props: GestureXYVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <GestureXYFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
