/**
 * The Remotion composition: `GestureStackFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import { GestureStackFrame, type GestureStackFrameProps } from "./GestureStackFrame";

export type GestureStackVideoProps = GestureStackFrameProps & { faces: EmbeddedFace[] };

export function GestureStackVideo(props: GestureStackVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <GestureStackFrame {...(props as any)} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
