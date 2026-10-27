/** The multiples family's Remotion composition: the frame at the current frame, once the embedded faces are in. */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { useEmbeddedFaces } from "#shared/chart-video/embedded-faces.ts";
import { GestureMultiplesFrame } from "./GestureMultiplesFrame.tsx";

export function GestureMultiplesVideo(props: any) {
  const frame = useCurrentFrame();
  const { ready, ref } = useEmbeddedFaces<SVGSVGElement>(props.faces);
  return <AbsoluteFill style={{ backgroundColor: props.colours?.ground }}>{ready ? <GestureMultiplesFrame {...props} at={frame} svgRef={ref} /> : null}</AbsoluteFill>;
}
