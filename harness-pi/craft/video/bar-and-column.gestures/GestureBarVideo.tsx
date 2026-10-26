/**
 * The Remotion composition: `GestureBarFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
// The shared copies (`shared/chart-video/`): the Remotion bundle resolves `#shared/*` from the root's package.json.
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import { GestureBarFrame, type GestureBarFrameProps } from "./GestureBarFrame";

export type GestureBarVideoProps = GestureBarFrameProps & { faces: EmbeddedFace[] };

export function GestureBarVideo(props: GestureBarVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <GestureBarFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
