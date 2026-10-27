/**
 * The Remotion composition for the AREA maps: `GestureGeoAreaFrame` at the current frame, drawn only once the embedded
 * faces are in, every frame's words read back against those faces and the widths Bun measured (`useEmbeddedFaces`).
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import { GestureGeoAreaFrame, type GestureGeoAreaFrameProps } from "./GestureGeoAreaFrame";

export type GestureGeoAreaVideoProps = GestureGeoAreaFrameProps & { faces: EmbeddedFace[] };

export function GestureGeoAreaVideo(props: GestureGeoAreaVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: (props.colours as any)?.ground }}>{ready ? <GestureGeoAreaFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
