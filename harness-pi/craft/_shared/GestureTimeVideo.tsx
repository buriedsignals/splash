/**
 * The Remotion composition: `GestureTimeFrame` at the current frame, drawn only once the embedded faces are in,
 * every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import {
  GestureTimeFrame,
  type GestureTimeFrameProps,
} from "./GestureTimeFrame";

export type GestureTimeVideoProps = GestureTimeFrameProps & {
  faces: EmbeddedFace[];
};

export function GestureTimeVideo(props: GestureTimeVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return (
    <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>
      {ready ? <GestureTimeFrame {...props} at={frame} svgRef={ref} /> : null}
    </AbsoluteFill>
  );
}
