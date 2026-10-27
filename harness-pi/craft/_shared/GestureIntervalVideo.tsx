/**
 * The interval family's Remotion composition: `GestureIntervalFrame` at the current frame, drawn only once the
 * embedded faces are in (`useEmbeddedFaces`).
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import { GestureIntervalFrame } from "./GestureIntervalFrame.tsx";

export function GestureIntervalVideo(props: any) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <GestureIntervalFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
