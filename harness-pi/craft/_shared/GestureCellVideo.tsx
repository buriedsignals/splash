/**
 * The Remotion composition of a Cell-grid gesture video: `GestureCellFrame` at the current frame, drawn only once the
 * embedded faces are in (`useEmbeddedFaces`), every frame's words read back against those faces.
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import { GestureCellFrame, type GestureCellFrameProps } from "./GestureCellFrame";

export type GestureCellVideoProps = GestureCellFrameProps & { faces: EmbeddedFace[] };

export function GestureCellVideo(props: GestureCellVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: (props.colours as any)?.ground }}>{ready ? <GestureCellFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
