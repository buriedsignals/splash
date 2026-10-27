/**
 * The Remotion composition of a Position GESTURE video: `GesturePositionFrame` at the current frame, drawn only once
 * the embedded faces are in (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import { GesturePositionFrame, type GesturePositionFrameProps } from "./GesturePositionFrame";

export type GesturePositionVideoProps = GesturePositionFrameProps & { faces: EmbeddedFace[] };

export function GesturePositionVideo(props: GesturePositionVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <GesturePositionFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
