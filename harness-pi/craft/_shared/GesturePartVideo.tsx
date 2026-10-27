/**
 * The Remotion composition of a Part-to-whole GESTURE video: `GesturePartFrame` at the current frame, drawn only once
 * the embedded faces are in, every frame's words read back against those faces and the widths Bun measured.
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import {
  GesturePartFrame,
  type GesturePartFrameProps,
} from "./GesturePartFrame";

export type GesturePartVideoProps = GesturePartFrameProps & {
  faces: EmbeddedFace[];
};

export function GesturePartVideo(props: GesturePartVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return (
    <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>
      {ready ? <GesturePartFrame {...props} at={frame} svgRef={ref} /> : null}
    </AbsoluteFill>
  );
}
