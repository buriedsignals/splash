/**
 * The Remotion composition of a PAIRED gesture video: `GesturePairedFrame` at the current frame, drawn only once the
 * embedded faces are in (`useEmbeddedFaces`).
 */

import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import type { EmbeddedFace } from "#shared/chart-video/face-coverage.ts";
import { GesturePairedFrame, type GesturePairedFrameProps } from "./GesturePairedFrame";

export type GesturePairedVideoProps = GesturePairedFrameProps & { faces: EmbeddedFace[] };

export function GesturePairedVideo(props: GesturePairedVideoProps) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: (props.colours as any)?.ground }}>{ready ? <GesturePairedFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
